// SPDX-License-Identifier: AGPL-3.0-only
// Bounded SQLite statements and stable stream descriptors.
// Every statement is finalized before a store call can switch the backing DB.
#pragma once
#include "adaptive_store.hpp"
#include "resource_policy.hpp"
struct Statement {
  sqlite3_stmt *value = nullptr;
  Database::Entry *entry = nullptr;
  SqliteMemoryOwner *memory = nullptr;
  OperationControl *operation = nullptr;
  Statement(Database &database, const char *sql) {
    memory = database.memory;
    operation = database.operation;
    entry = &database.borrow(sql);
    value = entry->statement;
  }
  ~Statement() {
    if (value) {
      SqliteOwnerScope scope(memory);
      sqlite3_reset(value);
      sqlite3_clear_bindings(value);
      entry->active = false;
    }
  }
  void integer(int position, std::uint64_t number) {
    SqliteOwnerScope scope(memory);
    require(number <= INT64_MAX, "native-offset-limit");
    require(sqlite3_bind_int64(value, position, number) == SQLITE_OK, "integer-bind");
  }
  void text(int position, const std::string &text) {
    SqliteOwnerScope scope(memory);
    require(text.size() <= 65536, "metadata-cell-limit");
    require(sqlite3_bind_text(value, position, text.data(), static_cast<int>(text.size()),
                              SQLITE_TRANSIENT) == SQLITE_OK,
            "text-bind");
  }
  bool next() {
    SqliteOwnerScope scope(memory);
    int code = sqlite3_step(value);
    if (operation)
      operation->check();
    require(code == SQLITE_ROW || code == SQLITE_DONE, "statement-step");
    return code == SQLITE_ROW;
  }
  std::uint64_t integer(int column) const { return sqlite3_column_int64(value, column); }
  std::string text(int column) const {
    SqliteOwnerScope scope(memory);
    auto p = sqlite3_column_text(value, column);
    return p ? std::string(reinterpret_cast<const char *>(p), sqlite3_column_bytes(value, column))
             : std::string();
  }
  void finish() {
    SqliteOwnerScope scope(memory);
    int code = sqlite3_reset(value);
    sqlite3_clear_bindings(value);
    entry->active = false;
    value = nullptr;
    require(code == SQLITE_OK, "statement-reset");
  }
};
struct Stream {
  std::uint64_t id = 0, length = 0, begin = 0;
};
struct Streams {
  Store &store;
  std::uint64_t nextId = 1;
  std::uint64_t nextValueId = 1, nextEventId = 1, nextScopeId = 1, allocatedFindings = 0;
  std::uint64_t maxDiagnostics = 0, maxRecords = 0, maxNestingDepth = 0, recordsAdmitted = 0;
  struct Mapping {
    std::uint64_t stream = 0, logical = 0;
    Reference physical{};
  };
  std::array<Mapping, 8> mappings{};
  std::size_t nextMapping = 0;
  explicit Streams(Store &owner, const ResourcePolicy &resources = {}) : store(owner) {
    maxDiagnostics = resources.get(ResourcePolicy::Admission::maxDiagnostics);
    maxRecords = resources.get(ResourcePolicy::Admission::maxRecords);
    maxNestingDepth = resources.get(ResourcePolicy::Runtime::maxNestingDepth);
  }
  void remember(std::uint64_t stream, std::uint64_t logical, Reference physical) {
    mappings[nextMapping++ % mappings.size()] = {stream, logical, physical};
  }
  Stream create() {
    require(nextId < INT64_MAX, "stream-identity-limit");
    return {nextId++, 0};
  }
  void append(Stream &stream, std::span<const unsigned char> bytes) {
    require(stream.begin == 0, "read-only-stream-view");
    require(bytes.size() <= 65536 && stream.length <= INT64_MAX - bytes.size(),
            "stream-fragment-limit");
    if (bytes.empty())
      return;
    auto physical = store.append(bytes);
    store.prepare(32768);
    Statement insert(*store.database,
                     "INSERT INTO chunks(stream,logical,physical,length) VALUES(?,?,?,?)");
    insert.integer(1, stream.id);
    insert.integer(2, stream.length);
    insert.integer(3, physical.offset);
    insert.integer(4, bytes.size());
    require(!insert.next(), "chunk-insert");
    insert.finish();
    remember(stream.id, stream.length, physical);
    stream.length += bytes.size();
    store.observe();
    store.checkScratch();
  }
  Bytes read(const Stream &stream, std::uint64_t offset, std::size_t maximum = 65536) {

    require(offset <= stream.length && maximum <= 65536, "stream-read-boundary");
    auto wanted =
        static_cast<std::size_t>((std::min)(std::uint64_t(maximum), stream.length - offset));
    Bytes output;
    output.reserve(wanted);
    while (output.size() < wanted) {
      auto absolute = stream.begin + offset;
      Reference part{};
      std::uint64_t logical = 0;
      bool cached = false;
      for (const auto &mapping : mappings)
        if (mapping.stream == stream.id && absolute >= mapping.logical &&
            absolute - mapping.logical < mapping.physical.length) {
          part = mapping.physical;
          logical = mapping.logical;
          cached = true;
          break;
        }
      if (!cached) {
        Statement query(*store.database, "SELECT logical,physical,length FROM chunks WHERE "
                                         "stream=? AND logical<=? ORDER BY logical DESC LIMIT 1");
        query.integer(1, stream.id);
        query.integer(2, absolute);
        require(query.next(), "stream-gap");
        logical = query.integer(0);
        part = {store.owner, query.integer(1), query.integer(2)};
        query.finish();
        remember(stream.id, logical, part);
      }
      require(absolute >= logical && absolute - logical < part.length, "stream-range-gap");
      auto bytes = store.read(part, absolute - logical, wanted - output.size());
      require(!bytes.empty(), "stream-read-progress");
      output.insert(output.end(), bytes.begin(), bytes.end());
      offset += bytes.size();
    }
    return output;
  }
  bool equal(const Stream &left, const Stream &right) {
    if (left.length != right.length)
      return false;
    if (left.id == right.id && left.begin == right.begin)
      return true;
    for (std::uint64_t offset = 0; offset < left.length; offset += 65536)
      if (read(left, offset) != read(right, offset))
        return false;
    return true;
  }
};
struct StreamReader {
  Streams &streams;
  Stream source;
  std::uint64_t offset = 0;
  Bytes current;
  std::size_t position = 0;
  StreamReader(Streams &s, Stream input, std::uint64_t begin = 0)
      : streams(s), source(input), offset(begin) {}
  int get() {
    if (position == current.size()) {
      if (offset >= source.length)
        return -1;
      current = streams.read(source, offset);
      offset += current.size();
      position = 0;
    }
    return current[position++];
  }
  std::uint64_t consumed() const { return offset - current.size() + position; }
};
