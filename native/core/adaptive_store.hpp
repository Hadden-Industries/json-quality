// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
// Private adaptive storage for the shared checker.
// SQLite owns indexed metadata and backup; logical references survive the backing switch.
#include "allocation_ledger.hpp"
#include "failure.hpp"
#include "operation_control.hpp"
#include "scratch_quota_vfs.hpp"
#include <algorithm>
#include <array>
#include <atomic>
#include <chrono>
#include <cstdint>
#include <filesystem>
#include <fstream>
#include <iostream>
#include <memory>
#include <span>
#include <sqlite3.h>
#include <stdexcept>
#include <string>
#include <string_view>
#include <vector>
#ifndef _WIN32
#include <sys/stat.h>
#endif
namespace fs = std::filesystem;
using Bytes = std::vector<unsigned char>;
using Clock = std::chrono::steady_clock;
inline fs::path pathFromUtf8(const std::string &text) {
  require(text.find('\0') == std::string::npos && text.size() <= 131072, "scratch-path-capacity");
  auto path = fs::path(std::u8string(text.begin(), text.end()));
  require(path.is_absolute(), "scratch-path-absolute");
#ifdef _WIN32
  path = path.lexically_normal().make_preferred();
  auto native = path.native();
  require(native.rfind(L"\\\\.\\", 0) != 0, "scratch-path-device");
  if (native.rfind(L"\\\\?\\", 0) != 0) {
    if (native.rfind(L"\\\\", 0) == 0)
      native = L"\\\\?\\UNC\\" + native.substr(2);
    else
      native = L"\\\\?\\" + native;
  }
  require(native.size() <= 32767 - 64, "scratch-path-capacity");
  path = fs::path(native);
#endif
  return path;
}
inline std::string pathToUtf8(const fs::path &path) {
  auto text = path.u8string();
  return std::string(text.begin(), text.end());
}
inline fs::path ownedScratchPath(const fs::path &requested) {
  require(requested.is_absolute() && requested.has_filename() && requested.filename() != "." &&
              requested.filename() != "..",
          "scratch-path-contract");
  // Windows canonicalization may drop the extended-length path prefix.
  const auto parent = pathFromUtf8(pathToUtf8(fs::canonical(requested.parent_path())));
  require(fs::is_directory(parent), "scratch-parent-directory");
  return parent / requested.filename();
}
struct Database {
  struct Entry {
    std::string sql;
    sqlite3_stmt *statement = nullptr;
    bool active = false;
  };
  sqlite3 *value = nullptr;
  SqliteMemoryOwner *memory = nullptr;
  OperationControl *operation = nullptr;
  std::vector<Entry> statements;
  Database() = default;
  Database(const Database &) = delete;
  ~Database() {
    SqliteOwnerScope scope(memory);
    for (auto &entry : statements)
      if (entry.statement)
        sqlite3_finalize(entry.statement);
    if (value)
      sqlite3_close_v2(value);
  }
  Entry &borrow(const char *sql) {
    SqliteOwnerScope scope(memory);
    for (auto &entry : statements)
      if (entry.sql == sql) {
        require(!entry.active, "overlapping-statement");
        entry.active = true;
        return entry;
      }
    Entry *slot = nullptr;
    if (statements.size() == 32) {
      for (auto &entry : statements)
        if (!entry.active) {
          slot = &entry;
          break;
        }
      require(slot != nullptr, "statement-cache-capacity");
      int code = sqlite3_finalize(slot->statement);
      slot->statement = nullptr;
      slot->sql.clear();
      require(code == SQLITE_OK, "statement-finalize");
    }
    sqlite3_stmt *statement = nullptr;
    int code = sqlite3_prepare_v3(value, sql, -1, SQLITE_PREPARE_PERSISTENT, &statement, nullptr);
    std::unique_ptr<sqlite3_stmt, decltype(&sqlite3_finalize)> guard(statement, &sqlite3_finalize);
    if (operation)
      operation->check();
    require(code == SQLITE_OK, "statement-prepare");
    if (slot)
      *slot = {sql, statement, true};
    else {
      statements.push_back({sql, statement, true});
      slot = &statements.back();
    }
    guard.release();
    return *slot;
  }
  void clearStatements() {
    SqliteOwnerScope scope(memory);
    for (auto &entry : statements) {
      require(!entry.active, "active-statement-at-switch");
      int code = sqlite3_finalize(entry.statement);
      entry.statement = nullptr;
      require(code == SQLITE_OK, "statement-finalize");
    }
    statements.clear();
  }
  void open(const std::string &name, const char *vfs, SqliteMemoryOwner *owner) {
    memory = owner;
    SqliteOwnerScope scope(memory);
    statements.reserve(32);
    require(sqlite3_open_v2(name.c_str(), &value,
                            SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_NOMUTEX,
                            vfs) == SQLITE_OK,
            "database-open");
    // These private statements use fixed indexes. Value-sensitive planning
    // was recompiling every digest lookup after binding new parameters.
    int stable = 0;
    require(sqlite3_db_config(value, SQLITE_DBCONFIG_ENABLE_QPSG, 1, &stable) == SQLITE_OK &&
                stable == 1,
            "stable-query-plans");
    require(sqlite3_compileoption_used("OMIT_LOAD_EXTENSION"), "extension-loading-not-disabled");
    execute("PRAGMA temp_store=MEMORY; PRAGMA cache_size=-128; PRAGMA mmap_size=0;");
  }
  void execute(const char *sql) {
    SqliteOwnerScope scope(memory);
    auto result = sqlite3_exec(value, sql, nullptr, nullptr, nullptr);
    if (operation)
      operation->check();
    require(result == SQLITE_OK, "database-statement");
  }
  void bindOperation(OperationControl *control) {
    operation = control;
    sqlite3_progress_handler(
        value, control ? 1000 : 0,
        control ? +[](void *context)
                      -> int { return static_cast<OperationControl *>(context)->failure() ? 1 : 0; }
                : nullptr,
        control);
  }
  void close() {
    SqliteOwnerScope scope(memory);
    clearStatements();
    require(sqlite3_close(value) == SQLITE_OK, "database-close");
    value = nullptr;
  }
  std::array<std::uint64_t, 17> count() const {
    SqliteOwnerScope scope(memory);
    constexpr std::array<const char *, 17> tables = {"chunks",
                                                     "values_index",
                                                     "keys_index",
                                                     "events",
                                                     "nfc_pending",
                                                     "nfc_preserved",
                                                     "source_closures",
                                                     "paths_index",
                                                     "pointer_index",
                                                     "source_captures",
                                                     "census_members",
                                                     "census_providers",
                                                     "census_sightings",
                                                     "census_directories",
                                                     "census_authorities",
                                                     "census_authority_providers",
                                                     "rewrite_candidates"};
    const auto scalar = [&](const std::string &sql) {
      sqlite3_stmt *raw = nullptr;
      auto code = sqlite3_prepare_v2(value, sql.c_str(), -1, &raw, nullptr);
      std::unique_ptr<sqlite3_stmt, decltype(&sqlite3_finalize)> statement(raw, &sqlite3_finalize);
      require(code == SQLITE_OK && sqlite3_step(raw) == SQLITE_ROW, "count-prepare");
      auto result = sqlite3_column_int64(raw, 0);
      require(result >= 0 && sqlite3_step(raw) == SQLITE_DONE, "count-finish");
      return static_cast<std::uint64_t>(result);
    };
    std::array<std::uint64_t, 17> counts{};
    std::uint64_t present = 0;
    for (std::size_t index = 0; index < tables.size(); ++index) {
      if (operation)
        operation->check();
      const std::string name(tables[index]);
      if (scalar("SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name='" + name + "'")) {
        ++present;
        counts[index] = scalar("SELECT COUNT(*) FROM " + name);
      } else
        counts[index] = UINT64_MAX; // Missing is distinct from an empty table.
    }
    require(present == scalar("SELECT COUNT(*) FROM sqlite_schema WHERE type='table' AND name NOT "
                              "LIKE 'sqlite_%'"),
            "unrecognized-metadata-table");
    return counts;
  }
};
// An immutable schema image avoids reparsing the same DDL for every session.
// It contains no input data or reusable connection. The fixed image reservation
// belongs to the already bounded module-runtime ledger; every writable copy is
// allocated through the destination session's SQLite owner.
struct MetadataTemplate {
  std::array<unsigned char, 262144> bytes{};
  sqlite3_int64 length = 0;
  MetadataTemplate() {
    SqliteOwnerScope scope(&SqliteMemory::runtime);
    require(SqliteMemory::runtime.acquireExternal(bytes.size()), "schema-template-reservation");
    try {
      Database seed;
      seed.open(":memory:", nullptr, &SqliteMemory::runtime);
      seed.execute(
          R"SQL(CREATE TABLE chunks(stream INTEGER NOT NULL, logical INTEGER NOT NULL, physical INTEGER NOT NULL, length INTEGER NOT NULL, PRIMARY KEY(stream,logical));
CREATE TABLE values_index(id INTEGER PRIMARY KEY,parent INTEGER,name INTEGER,kind TEXT,decoded INTEGER,normalized INTEGER,length INTEGER DEFAULT 0,digest TEXT,line INTEGER,column_number INTEGER,end_line INTEGER,end_column INTEGER,record INTEGER,ordinal INTEGER,source INTEGER,raw_begin INTEGER,raw_length INTEGER,closed INTEGER,decoded_begin INTEGER,normalized_begin INTEGER,normalized_length INTEGER);
CREATE INDEX values_children ON values_index(parent,name,id);
CREATE INDEX values_elements ON values_index(parent,ordinal,id);
CREATE INDEX values_source_roots ON values_index(source,record,parent,id);
CREATE INDEX values_source_order ON values_index(source,id);
CREATE TABLE keys_index(parent INTEGER,digest TEXT,raw_digest TEXT,value INTEGER PRIMARY KEY,decoded INTEGER,decoded_begin INTEGER,length INTEGER,normalized INTEGER,normalized_begin INTEGER,normalized_length INTEGER);
CREATE INDEX keys_lookup ON keys_index(parent,digest,value);
CREATE INDEX keys_raw_lookup ON keys_index(parent,raw_digest,value);
CREATE TABLE events(id INTEGER PRIMARY KEY,offset INTEGER,length INTEGER,scope INTEGER,kind INTEGER,accepted INTEGER,line INTEGER,column_number INTEGER,rule TEXT,message TEXT,phase TEXT);
CREATE INDEX events_values ON events(scope,kind,id);
CREATE INDEX events_findings ON events(scope,kind,accepted,line,column_number,rule,message,id);
CREATE TABLE nfc_pending(scope INTEGER,value INTEGER,PRIMARY KEY(scope,value));
CREATE TABLE nfc_preserved(scope INTEGER,value INTEGER,PRIMARY KEY(scope,value));
CREATE TABLE source_closures(source INTEGER PRIMARY KEY,parsed INTEGER,quality INTEGER,contract_satisfied INTEGER,root INTEGER,retained INTEGER,repair_format INTEGER,repair_nfc INTEGER);
CREATE TABLE paths_index(id INTEGER PRIMARY KEY,parent INTEGER,name INTEGER,ordinal INTEGER,kind TEXT);
CREATE TABLE pointer_index(value INTEGER PRIMARY KEY,stream INTEGER,length INTEGER);
CREATE TABLE source_captures(source INTEGER PRIMARY KEY,length INTEGER,sha TEXT,kind TEXT,parent_source INTEGER,parent_value INTEGER,encoding TEXT);)SQL");
      std::unique_ptr<unsigned char, decltype(&sqlite3_free)> image(
          sqlite3_serialize(seed.value, "main", &length, 0), &sqlite3_free);
      require(image && length > 0 && static_cast<std::uint64_t>(length) + 20 <= bytes.size(),
              "schema-template-capacity");
      std::copy_n(image.get(), static_cast<std::size_t>(length), bytes.data());
    } catch (...) {
      SqliteMemory::runtime.external.fetch_sub(bytes.size());
      throw;
    }
  }
  ~MetadataTemplate() { SqliteMemory::runtime.external.fetch_sub(bytes.size()); }
};
inline void installMetadataTemplate(Database &database) {
  static const MetadataTemplate seed;
  SqliteOwnerScope scope(database.memory);
  // Only the fixed image is shared. Each invocation has its own read-only
  // connection, and the destination uses ordinary independently growing pages.
  // A writable deserialized image would require contiguous reallocations that
  // can exceed transition headroom before prepare() can spill the store.
  Database reader;
  reader.open(":memory:", nullptr, database.memory);
  require(sqlite3_deserialize(reader.value, "main", const_cast<unsigned char *>(seed.bytes.data()),
                              seed.length, seed.length + 20,
                              SQLITE_DESERIALIZE_READONLY) == SQLITE_OK,
          "schema-template-reader");
  auto backup = sqlite3_backup_init(database.value, "main", reader.value, "main");
  require(backup != nullptr, "schema-copy-init");
  const auto copied = sqlite3_backup_step(backup, -1);
  const auto finished = sqlite3_backup_finish(backup);
  require(copied == SQLITE_DONE && finished == SQLITE_OK, "schema-copy-install");
}
struct Reference {
  std::uint64_t owner, offset, length;
};
struct Store {
  enum class State { memory, transitioning, disk, aborted, closed };
  State state = State::memory;
  std::uint64_t owner, length = 0, target, segmentSize, temporaryLimit;
  std::uint64_t managedPeak = 0, scratchPeak = 0, copiedBytes = 0, transitions = 0;
  double transitionSeconds = 0;
  fs::path scratch;
  std::string fault;
  SqliteOwner memory;
  Quota quota;
  QuotaVfs quotaVfs;
  std::vector<Bytes> segments;
  std::unique_ptr<Database> database;
  std::fstream payload;
  bool ownsScratch = false;
  OperationControl *operation = nullptr;
  static constexpr std::uint64_t reserve = 8 * 1024 * 1024, transitionReserve = 1024 * 1024;
  Store(std::uint64_t identity, std::uint64_t memoryTarget, std::uint64_t segment,
        std::uint64_t quota, fs::path root, std::string injected = {},
        SqliteMemoryOwner *account = nullptr)
      : owner(identity), target(memoryTarget), segmentSize(segment), temporaryLimit(quota),
        scratch(ownedScratchPath(pathFromUtf8(pathToUtf8(root)))), fault(std::move(injected)),
        memory(memoryTarget, account), quota(quota),
        quotaVfs(this->quota, pathToUtf8(scratch).size()), database(std::make_unique<Database>()) {
    memory.value->fixed.store(reserve);
    SqliteOwnerScope memoryScope(memory.value);
    require(target >= 16 * 1024 * 1024, "minimum-target");
    database->open(":memory:", quotaVfs.name.c_str(), memory.value);
    installMetadataTemplate(*database);
    database->execute("BEGIN IMMEDIATE;");
    observe();
  }
  ~Store() {
    try {
      close();
    } catch (...) {
    }
  }
  std::uint64_t managed() const {
    std::uint64_t bytes = reserve + segments.capacity() * sizeof(Bytes);
    for (const auto &part : segments)
      bytes += part.capacity();
    memory.value->fixed.store(bytes);
    return bytes + memory.value->bytes.load() + memory.value->external.load();
  }
  void observe() {
    memory.value->observe();
    managedPeak = (std::max)((std::max)(managedPeak, managed()), memory.value->managedPeak.load());
  }
  std::uint64_t scratchBytes() const { return quota.total; }
  void checkScratch() {
    scratchPeak = (std::max)(scratchPeak, scratchBytes());
    require(scratchPeak <= temporaryLimit, "temporary-quota");
  }
  void injected(const std::string &point) {
    if (fault == point)
      throw Fault("injected-" + point);
  }
  void checkCancellation() const {
    if (operation)
      operation->check();
  }
  void active() const {
    checkCancellation();
    require(state == State::memory || state == State::disk, "inactive-session");
  }
  void transition() {
    active();
    if (state == State::disk)
      return;
    auto started = Clock::now();
    state = State::transitioning;
    try {
      database->clearStatements();
      database->execute("COMMIT;");
      injected("before-create");
      require(!fs::exists(scratch), "scratch-already-exists");
      require(quota.resize("owner", 32), "temporary-reservation");
#ifdef _WIN32
      require(fs::create_directory(scratch), "scratch-create");
#else
      require(::mkdir(scratch.c_str(), S_IRWXU) == 0, "scratch-create");
#endif
      ownsScratch = true;
      std::ofstream marker(scratch / "owner");
      marker << owner;
      marker.close();
      require(bool(marker), "marker-close");
      injected("before-copy");
      payload.open(scratch / "payload",
                   std::ios::binary | std::ios::in | std::ios::out | std::ios::trunc);
      require(bool(payload), "payload-open");
      std::uint64_t remaining = length;
      for (const auto &segment : segments) {
        checkCancellation();
        auto size = (std::min)(remaining, std::uint64_t(segment.size()));
        require(quota.resize("payload", copiedBytes + size), "temporary-reservation");
        payload.write(reinterpret_cast<const char *>(segment.data()), size);
        require(bool(payload), "payload-copy");
        copiedBytes += size;
        remaining -= size;
        injected("during-copy");
      }
      payload.flush();
      require(bool(payload), "payload-flush");
      require(remaining == 0 && fs::file_size(scratch / "payload") == length, "payload-boundaries");
      injected("before-backup");
      auto destination = std::make_unique<Database>();
      destination->open(pathToUtf8(scratch / "metadata.sqlite"), quotaVfs.name.c_str(),
                        memory.value);
      destination->bindOperation(operation);
      sqlite3_backup *backup =
          sqlite3_backup_init(destination->value, "main", database->value, "main");
      require(backup != nullptr, "backup-init");
      std::unique_ptr<sqlite3_backup, decltype(&sqlite3_backup_finish)> backupGuard(
          backup, &sqlite3_backup_finish);
      int code = SQLITE_OK;
      do {
        checkCancellation();
        code = sqlite3_backup_step(backup, 8);
        if (fault == "during-backup") {
          throw Fault("injected-during-backup");
        }
        observe();
        checkScratch();
      } while (code == SQLITE_OK);
      int finish = sqlite3_backup_finish(backupGuard.release());
      require(code == SQLITE_DONE && finish == SQLITE_OK, "backup-finish");
      injected("after-backup");
      require(destination->count() == database->count(), "metadata-count");
      injected("before-switch");
      // Writers/readers run on the owner thread. Logical references never hold backing cursors.
      database.swap(destination);
      state = State::disk;
      ++transitions;
      segments.clear();
      segments.shrink_to_fit();
      destination.reset();
      database->execute("BEGIN IMMEDIATE;");
      injected("after-switch");
      observe();
      checkScratch();
      transitionSeconds += std::chrono::duration<double>(Clock::now() - started).count();
    } catch (...) {
      state = State::aborted;
      throw;
    }
  }
  void prepare(std::uint64_t next) {
    active();
    if (state == State::memory && managed() + next + transitionReserve > target)
      transition();
  }
  Reference append(std::span<const unsigned char> bytes) {
    active();
    auto begin = length;
    try {
      for (std::size_t position = 0; position < bytes.size();) {
        auto size = (std::min)(bytes.size() - position, std::size_t(segmentSize));
        bool allocate = segments.empty() || segments.back().size() == segmentSize;
        prepare(allocate ? segmentSize : 0);
        if (state == State::memory) {
          if (allocate) {
            segments.emplace_back();
            segments.back().reserve(segmentSize);
          }
          size = (std::min)(size, std::size_t(segmentSize - segments.back().size()));
          segments.back().insert(segments.back().end(), bytes.begin() + position,
                                 bytes.begin() + position + size);
        } else {
          require(quota.resize("payload", length + size), "temporary-reservation");
          payload.clear();
          payload.seekp(length);
          payload.write(reinterpret_cast<const char *>(bytes.data() + position), size);
          require(bool(payload), "payload-write");
          payload.flush();
          require(bool(payload), "payload-flush");
        }
        length += size;
        position += size;
        observe();
      }
      observe();
      checkScratch();
      require(managed() <= target, "managed-target");
      return {owner, begin, std::uint64_t(bytes.size())};
    } catch (...) {
      state = State::aborted;
      throw;
    }
  }
  Bytes read(const Reference &ref, std::uint64_t position, std::size_t maximum) {

    active();
    require(ref.owner == owner, "foreign-reference");
    require(ref.offset <= length && ref.length <= length - ref.offset, "reference-boundary");
    require(position <= ref.length && maximum <= 65536, "read-boundary");
    auto count = (std::min)(std::uint64_t(maximum), ref.length - position);
    Bytes result(std::size_t(count), 0);
    std::uint64_t offset = ref.offset + position, done = 0;
    if (state == State::disk) {
      payload.clear();
      payload.seekg(offset);
      payload.read(reinterpret_cast<char *>(result.data()), count);
      auto actual = payload.gcount();
      require(actual >= 0 && static_cast<std::uint64_t>(actual) == count, "payload-read");
    } else
      while (done < count) {
        auto segment = offset / segmentSize, inside = offset % segmentSize;
        auto size = (std::min)(count - done, std::uint64_t(segments[segment].size()) - inside);
        require(size > 0, "read-progress");
        std::copy_n(segments[segment].begin() + inside, size, result.begin() + done);
        done += size;
        offset += size;
      }
    return result;
  }
  void close() {
    if (state == State::closed)
      return;
    const bool wasAborted = state == State::aborted;
    state = State::aborted;
    SqliteOwnerScope memoryScope(memory.value);
    if (database)
      database->bindOperation(nullptr);
    if (database)
      database->clearStatements();
    if (database && sqlite3_get_autocommit(database->value) == 0)
      database->execute(wasAborted ? "ROLLBACK;" : "COMMIT;");
    if (database)
      database->close();
    database.reset();
    require(memory.value->bytes.load() == 0, "sqlite-owned-allocation-retained");
    if (payload.is_open())
      payload.close();
    segments.clear();
    if (ownsScratch) {
      require(!fs::is_symlink(scratch), "cleanup-symlink");
      std::ifstream marker(scratch / "owner");
      std::uint64_t identity = 0;
      marker >> identity;
      require(identity == owner, "cleanup-owner");
      marker.close();
      std::error_code cleanupError;
      // Keep the authority marker until every other member is gone. A partial
      // remove_all must not destroy the identity needed by a later close.
      for (const auto &entry : fs::directory_iterator(scratch)) {
        if (entry.path().filename() == "owner")
          continue;
        fs::remove_all(entry.path(), cleanupError);
        require(!cleanupError, "cleanup-remove");
      }
      fs::remove(scratch / "owner", cleanupError);
      require(!cleanupError, "cleanup-remove");
      fs::remove(scratch, cleanupError);
      if (cleanupError) {
        // For example, a Windows handle may deny removal of the empty directory.
        // Restore its already-validated marker before returning the cleanup fault.
        require(!fs::is_symlink(scratch), "cleanup-symlink");
        std::ofstream restored(scratch / "owner");
        restored << owner;
        restored.close();
        require(bool(restored), "cleanup-remove-owner-restore");
        throw Fault("cleanup-remove");
      }
      ownsScratch = false;
    }
    state = State::closed;
  }
};
