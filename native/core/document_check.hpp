// SPDX-License-Identifier: AGPL-3.0-only
// Shared parser/checker seam. Boost is the only document grammar authority.
// Semantic events are provisional until the exact source terminal is observed.
#pragma once
#include "decimal_admission.hpp"
#include "event_log.hpp"
#include "index_digest.hpp"
#include "json_pointer.hpp"
#include "producer_presentation.hpp"
#include "sha256.hpp"
#include "unicode_normalization.hpp"
#include "value_index.hpp"
#include <boost/json/basic_parser_impl.hpp>
#include <boost/json/src.hpp>
#include <charconv>
#include <cstdio>
#include <optional>
#include <set>
using boost::json::string_view;
using boost::system::error_code;
namespace json = boost::json;
struct SpanObserver {
  StreamReader reader;
  std::uint64_t line = 1, column = 1, offset = 0, lastBegin = 0;
  int held = -2;
  bool priorCr = false;
  SpanObserver(Streams &streams, Stream source) : reader(streams, source) {}
  int peek() {
    if (held == -2)
      held = reader.get();
    return held;
  }
  int take() {
    int byte = peek();
    held = -2;
    if (byte < 0)
      return byte;
    ++offset;
    if (byte == '\r') {
      ++line;
      column = 1;
      priorCr = true;
    } else if (byte == '\n') {
      if (!priorCr)
        ++line;
      column = 1;
      priorCr = false;
    } else {
      priorCr = false;
      if ((byte & 0xc0) != 0x80)
        column += byte >= 0xf0 ? 2 : 1;
    }
    return byte;
  }
  static bool space(int byte) { return byte == ' ' || byte == 9 || byte == 10 || byte == 13; }
  Location token(char expected) {
    while (space(peek()) || peek() == ',' || peek() == ':')
      take();
    lastBegin = offset;
    Location result{line, column, line, column};
    int byte = take();
    require(byte == expected || (expected == 'n' && (byte == '-' || (byte >= '0' && byte <= '9'))),
            "parser-span-correlation");
    if (expected == '"') {
      bool escaped = false;
      while (true) {
        byte = take();
        if (byte < 0)
          break;
        if (!escaped && byte == '"')
          break;
        if (!escaped && byte == '\\')
          escaped = true;
        else
          escaped = false;
      }
    } else if (expected == 'n' || expected == 't' || expected == 'f' || expected == 'z') {
      while (peek() >= 0 && !space(peek()) && peek() != ',' && peek() != ']' && peek() != '}')
        take();
    }
    result.endLine = line;
    result.endColumn = column;
    return result;
  }
};
struct Frame {
  std::uint64_t id = 0, key = 0, ordinal = 0;
  char kind = 0;
  std::uint64_t parent = 0, name = 0, valueOrdinal = 0;
  bool pathSaved = false;
};
struct Checker;
struct Handler {
  static constexpr std::size_t max_array_size = std::size_t(-1), max_object_size = std::size_t(-1),
                               max_string_size = std::size_t(-1), max_key_size = std::size_t(-1);
  Checker *checker = nullptr;
  bool on_document_begin(error_code &) { return true; }
  bool on_document_end(error_code &) { return true; }
  bool on_array_begin(error_code &);
  bool on_array_end(std::size_t, error_code &);
  bool on_object_begin(error_code &);
  bool on_object_end(std::size_t, error_code &);
  bool on_string_part(string_view, std::size_t, error_code &);
  bool on_string(string_view, std::size_t, error_code &);
  bool on_key_part(string_view, std::size_t, error_code &);
  bool on_key(string_view, std::size_t, error_code &);
  bool on_number_part(string_view, error_code &);
  bool on_int64(std::int64_t, string_view, error_code &);
  bool on_uint64(std::uint64_t, string_view, error_code &);
  bool on_double(double, string_view, error_code &);
  bool on_bool(bool, error_code &);
  bool on_null(error_code &);
  bool on_comment_part(string_view, error_code &code) {
    code = boost::json::error::syntax;
    return false;
  }
  bool on_comment(string_view, error_code &code) {
    code = boost::json::error::syntax;
    return false;
  }
};
struct Checker {
  Streams &streams;
  Stream source;
  SpanObserver observer;
  json::object contract;
  std::vector<Frame> stack;
  std::unique_ptr<boost::json::basic_parser<Handler>> parser;
  std::uint64_t inputOffset = 0, nextValue = 1, eventCount = 0, nextEvent = 1, findings = 0,
                record = 0, maxDiagnostics;
  EventLog events;
  std::uint64_t rootValue = 0;
  bool parsed = false, ended = false, failed = false, normalization = true, duplicate = false,
       admitted = false, recordMode = false;
  Value current;
  bool scalarActive = false, scalarAscii = true;
  NumberFacts number;
  std::unique_ptr<Sha256> scalarHash;
  std::unique_ptr<Compare> comparison;
  PresentationHandler presentation;
  std::string presentationPolicy = "prettier-json";
  bool presentationChecked = false, presentationFinished = false, checkPresentation = true;
  bool pinsFinished = false;
  std::vector<bool> pinsSeen;
  std::vector<bool> recordSelections;
  bool recordPreservation = false;
  bool sourceUtf8Admitted = false;
  bool includeValueEvents = false;
  bool retainTree = false, sourceView = false;
  std::uint64_t lastFindingValue = 0;
  Checker(Streams &s, Stream bytes, json::object policy, bool values = false,
          std::uint64_t recordNumber = 0, bool utf8Admitted = false, bool retained = false)
      : streams(s), source(bytes), observer(s, bytes), contract(std::move(policy)),
        record(recordNumber), maxDiagnostics(s.maxDiagnostics), events(s), rootValue(s.nextValueId),
        sourceUtf8Admitted(utf8Admitted), includeValueEvents(values) {
    retainTree = values || retained || contract.if_contains("allowEmptyKeys") ||
                 contract.if_contains("preserveNfcValues");
    if (record)
      observer.line = record;
    if (auto item = contract.if_contains("normalization"))
      normalization = item->as_string() != "preserve";
    if (auto item = contract.if_contains("checkPresentation"))
      checkPresentation = item->as_bool();
    if (auto item = contract.if_contains("preserveNfcValues")) {
      pinsSeen.resize(item->as_array().size());
      recordSelections.resize(item->as_array().size());
      for (const auto &pin : item->as_array())
        recordPreservation |= pin.as_object().if_contains("record") != nullptr;
      require(!recordPreservation || record, "record-selective-pin-on-document");
    }
    if (auto item = contract.if_contains("formatContract"))
      presentationPolicy = std::string(item->as_string());
    require(presentationPolicy == "prettier-json" || presentationPolicy == "producer-json-body" ||
                presentationPolicy == "producer-json-indent" ||
                presentationPolicy == "producer-json-indent-body" ||
                presentationPolicy == "producer-json-compact" ||
                presentationPolicy == "producer-json-compact-body" ||
                presentationPolicy == "preserved-bytes",
            "presentation-policy");
    if (checkPresentation && (presentationPolicy.starts_with("producer-json-indent") ||
                              presentationPolicy.starts_with("producer-json-compact"))) {
      comparison =
          std::make_unique<Compare>(streams, source, presentationPolicy.ends_with("-body"));
      presentation.compare = comparison.get();
      presentation.pretty = !presentationPolicy.starts_with("producer-json-compact");
    }
    boost::json::parse_options options;
    options.max_depth = streams.maxNestingDepth;
    options.numbers = json::number_precision::none;
    require(options.max_depth > 0 && options.max_depth <= 4096, "nesting-depth-configuration");
    parser = std::make_unique<json::basic_parser<Handler>>(options);
    parser->handler().checker = this;
    stack.reserve((std::min)(std::size_t(options.max_depth), std::size_t(4096)));
  }
  void event(json::object object) { events.append(std::move(object)); }
  void finding(const Value &value, const char *rule, const char *message,
               const char *phase = "lint", json::object arguments = {}) {
    // Keep only the structural ancestors needed by findings on the ordinary
    // path. Key bytes already have exact references in keys_index.
    if (value.id)
      for (auto &frame : stack)
        if (frame.parent && !frame.pathSaved) {
          streams.store.prepare(32768);
          Statement insert(
              *streams.store.database,
              "INSERT OR IGNORE INTO paths_index(id,parent,name,ordinal,kind) VALUES(?,?,?,?,?)");
          insert.integer(1, frame.id);
          insert.integer(2, frame.parent);
          insert.integer(3, frame.name);
          insert.integer(4, frame.valueOrdinal);
          insert.text(5, frame.kind == '{' ? "object" : "array");
          require(!insert.next(), "finding-path-insert");
          insert.finish();
          frame.pathSaved = true;
        }
    if (value.id)
      lastFindingValue = value.id;
    require(streams.allocatedFindings < maxDiagnostics, "diagnostic-capacity");
    ++streams.allocatedFindings;
    ++findings;
    json::object result{{"type", "finding"},
                        {"severity", "error"},
                        {"value", std::to_string(value.id)},
                        {"phase", phase},
                        {"messageId", message},
                        {"line", std::to_string(value.location.line)},
                        {"column", std::to_string(value.location.column)},
                        {"endLine", std::to_string(value.location.endLine)},
                        {"endColumn", std::to_string(value.location.endColumn)}};
    if (value.id)
      arguments["value"] = json::object{
          {"id", std::to_string(value.id)},
          {"representation", value.kind == "number"                          ? "number-lexeme"
                             : value.kind == "string" || value.kind == "key" ? "decoded-utf8"
                                                                             : "source-json"}};
    result["arguments"] = std::move(arguments);
    if (rule)
      result["ruleId"] = rule;
    else
      result["ruleId"] = nullptr;
    if (record)
      result["record"] = std::to_string(record);
    events.append(std::move(result), true, value.location.line, value.location.column, rule,
                  message, phase);
  }
  void save(const Value &value) {
    streams.store.prepare(32768);
    Statement insert(
        *streams.store.database,
        "INSERT INTO "
        "values_index(id,parent,name,kind,decoded,normalized,length,digest,line,column_number,end_"
        "line,end_column,record,ordinal,source,raw_begin,raw_length,closed,decoded_begin,"
        "normalized_begin,normalized_length) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    insert.integer(1, value.id);
    insert.integer(2, value.parent);
    insert.integer(3, value.name);
    insert.text(4, value.kind);
    insert.integer(5, value.decoded.id);
    insert.integer(6, value.normalized.id);
    insert.integer(7, value.decoded.length);
    insert.text(8, value.digest);
    insert.integer(9, value.location.line);
    insert.integer(10, value.location.column);
    insert.integer(11, value.location.endLine);
    insert.integer(12, value.location.endColumn);
    insert.integer(13, record);
    insert.integer(14, value.ordinal);
    insert.integer(15, value.raw.id);
    insert.integer(16, value.raw.begin);
    insert.integer(17, value.raw.length);
    insert.integer(18, value.closed ? 1 : 0);
    insert.integer(19, value.decoded.begin);
    insert.integer(20, value.normalized.begin);
    insert.integer(21, value.normalized.length);
    require(!insert.next(), "value-insert");
    insert.finish();
  }
  Value descriptor(std::uint64_t id) { return valueDescriptor(streams, id); }
  bool pointerMatches(Value value, const json::string &pointer) {
    auto decoded = decodePointer(pointer);
    if (!decoded.withinDepth)
      return false;
    const auto &parts = decoded.segments;
    std::size_t index = parts.size();
    while (value.parent) {
      if (!index)
        return false;
      auto parent = descriptor(value.parent);
      const auto &part = parts[--index];
      if (parent.kind == "array") {
        if (std::to_string(value.ordinal) != part)
          return false;
      } else {
        auto key = value.kind == "key" ? value : descriptor(value.name);
        if (key.decoded.length != part.size())
          return false;
        for (std::uint64_t offset = 0; offset < key.decoded.length; offset += 65536) {
          auto bytes = streams.read(key.decoded, offset);
          if (!std::equal(bytes.begin(), bytes.end(),
                          reinterpret_cast<const unsigned char *>(part.data() + offset)))
            return false;
        }
      }
      value = std::move(parent);
    }
    return index == 0;
  }
  std::optional<Value> resolvePointer(const json::string &pointer) {
    return resolveValuePointer(streams, rootValue, pointer);
  }
  Value begin(char token, const char *kind, bool key = false) {
    Value value;
    value.id = streams.nextValueId++;
    value.record = record;
    value.kind = kind;
    value.location = observer.token(token);
    value.raw = {source.id, observer.offset - observer.lastBegin,
                 source.begin + observer.lastBegin};
    value.closed = value.kind != "object" && value.kind != "array";
    if (!stack.empty()) {
      value.parent = stack.back().id;
      if (!key) {
        value.name = stack.back().key;
        value.ordinal = stack.back().ordinal++;
        stack.back().key = 0;
      }
    }
    return value;
  }
  void publish(Value value) {
    if (retainTree || !value.parent || lastFindingValue == value.id)
      save(value);
    if (includeValueEvents)
      event(valueEvent(value));
  }
  void scalar(string_view part, bool key, bool end, bool numeric = false) {
    if (numeric)
      presentation.numberPart(part, end);
    else
      presentation.stringPart(part, key, end);
    if (!scalarActive) {
      current = begin(numeric ? 'n' : '"', numeric ? "number" : key ? "key" : "string", key);
      sourceView = true;
      current.decoded = {source.id, 0, current.raw.begin + (numeric ? 0 : 1)};
      if (scalarHash)
        scalarHash->restart();
      else
        scalarHash = std::make_unique<Sha256>();
      scalarActive = true;
      scalarAscii = true;
      number = NumberFacts{};
    }
    auto bytes = std::span(reinterpret_cast<const unsigned char *>(part.data()), part.size());
    if (!numeric && scalarAscii)
      scalarAscii =
          std::all_of(bytes.begin(), bytes.end(), [](unsigned char byte) { return byte < 0x80; });
    if (sourceView && !numeric) {
      Stream rawContent{source.id, current.raw.length >= 2 ? current.raw.length - 2 : 0,
                        current.raw.begin + 1};
      auto raw = streams.read(rawContent, current.decoded.length, bytes.size());
      if (raw.size() != bytes.size() || !std::equal(raw.begin(), raw.end(), bytes.begin())) {
        auto prefix = current.decoded;
        current.decoded = streams.create();
        for (std::uint64_t offset = 0; offset < prefix.length; offset += 65536)
          streams.append(current.decoded, streams.read(prefix, offset));
        sourceView = false;
      }
    }
    if (sourceView)
      current.decoded.length += bytes.size();
    else
      streams.append(current.decoded, bytes);
    scalarHash->update(bytes);
    if (numeric)
      number.append(bytes);
    if (!end)
      return;
    current.digest = Sha256::hex(scalarHash->finish());
    scalarActive = false;
    if (numeric) {
      auto result = number.finish();
      if (result.unsafeNumber)
        finding(current, "json/no-unsafe-values", "unsafeNumber");
      if (result.unsafeInteger)
        finding(current, "json/no-unsafe-values", "unsafeInteger");
      if (result.unsafeZero)
        finding(current, "json/no-unsafe-values", "unsafeZero");
      if (result.subnormal)
        finding(current, "json/no-unsafe-values", "subnormal");
      if (result.exactInteger)
        finding(current, "json-quality/interoperability", "integer");
    } else {
      bool allTrim = true, firstTrim = false, lastTrim = false, first = true;
      std::set<Point> noncharacters;
      auto inspect = [&](Point point) {
        bool trim = ecmaTrim(point);
        if (first)
          firstTrim = trim;
        lastTrim = trim;
        allTrim &= trim;
        first = false;
        if ((point >= 0xfdd0 && point <= 0xfdef) || (point & 0xffff) >= 0xfffe)
          noncharacters.insert(point);
      };
      // Every ASCII sequence is already NFC. This certificate covers the
      // decoded bytes (including escapes), not the source's spelling or size.
      // Keep the same inspection and collision checks over the shared stream.
      if (normalization && !scalarAscii)
        current.normalized = normalize(streams, current.decoded, inspect);
      else {
        if (scalarAscii)
          current.normalized = current.decoded;
        points(streams, current.decoded, inspect);
      }
      for (auto point : noncharacters) {
        // Persist the same Unicode scalar notation admitted by the expectation
        // schema. A decimal event argument cannot match an exact U+XXXX pin.
        char label[9];
        const auto length =
            std::snprintf(label, sizeof(label), "U+%04X", static_cast<unsigned>(point));
        require(length >= 6 && length <= 8, "code-point-label");
        finding(current, "json-quality/interoperability", "noncharacter", "lint",
                {{"codePoint", std::string(label, static_cast<std::size_t>(length))}});
      }
      if (key && (allTrim || firstTrim || lastTrim)) {
        bool allowed = false;
        if (current.decoded.length == 0)
          if (auto items = contract.if_contains("allowEmptyKeys"))
            for (const auto &pointer : items->as_array())
              if (pointerMatches(current, pointer.as_string()))
                allowed = true;
        if (!allowed) {
          bool exceptions = contract.if_contains("allowEmptyKeys") &&
                            !contract.at("allowEmptyKeys").as_array().empty();
          finding(current,
                  allTrim && !exceptions ? "json/no-empty-keys" : "json-quality/meaningful-keys",
                  allTrim ? (exceptions ? "empty" : "emptyKey") : "whitespace");
        }
      }
      bool preserved = false;
      if (!key && !recordPreservation)
        if (auto items = contract.if_contains("preserveNfcValues"))
          for (std::size_t i = 0; i < items->as_array().size(); ++i) {
            const auto &pin = items->as_array()[i].as_object();
            if (pointerMatches(current, pin.at("pointer").as_string())) {
              pinsSeen[i] = true;
              if (pin.at("sha256").as_string() == current.digest &&
                  exactInteger(pin.at("byteLength")) == current.decoded.length)
                preserved = true;
              else
                finding(current, "json-quality/normalized-strings", "preservationMismatch");
            }
          }
      if (normalization) {
        if (!preserved && !streams.equal(current.decoded, current.normalized)) {
          if (recordPreservation && !key) {
            streams.store.prepare(32768);
            Statement insert(*streams.store.database,
                             "INSERT INTO nfc_pending(scope,value) VALUES(?,?)");
            insert.integer(1, events.scope);
            insert.integer(2, current.id);
            require(!insert.next(), "nfc-pending-insert");
            insert.finish();
          } else
            finding(current, "json-quality/normalized-strings", "unnormalized");
        }
      }
      if (key) {
        // Digest narrows candidates; exact decoded/NFC bytes decide identity.
        std::string normalizedDigest = current.digest;
        if (normalization && current.normalized.id != current.decoded.id) {
          Sha256 digest;
          for (std::uint64_t p = 0; p < current.normalized.length; p += 65536)
            digest.update(streams.read(current.normalized, p));
          normalizedDigest = Sha256::hex(digest.finish());
        }
        normalizedDigest = indexDigest(normalizedDigest);
        std::uint64_t after = 0;
        bool repeated = false, latestNormalizedDifferent = false;
        while (true) {
          Value prior;
          {
            Statement query(
                *streams.store.database,
                "SELECT "
                "value,decoded,length,decoded_begin,normalized,normalized_length,normalized_begin "
                "FROM keys_index WHERE parent=? AND digest=? AND value>? ORDER BY value LIMIT 1");
            query.integer(1, current.parent);
            query.text(2, normalizedDigest);
            query.integer(3, after);
            if (query.next()) {
              prior.id = query.integer(0);
              prior.decoded = {query.integer(1), query.integer(2), query.integer(3)};
              prior.normalized = {query.integer(4), query.integer(5), query.integer(6)};
            }
            query.finish();
          }
          if (!prior.id)
            break;
          after = prior.id;
          bool sameDecoded = streams.equal(current.decoded, prior.decoded);
          repeated |= sameDecoded;
          if (normalization && streams.equal(current.normalized, prior.normalized))
            latestNormalizedDifferent = !sameDecoded;
        }
        if (repeated) {
          finding(current, "json/no-duplicate-keys", "duplicateKey");
          duplicate = true;
        }
        if (latestNormalizedDifferent)
          finding(current, "json-quality/normalized-strings", "collision");
        streams.store.prepare(32768);
        Statement insert(
            *streams.store.database,
            "INSERT INTO "
            "keys_index(parent,digest,raw_digest,value,decoded,decoded_begin,length,normalized,"
            "normalized_begin,normalized_length) VALUES(?,?,?,?,?,?,?,?,?,?)");
        insert.integer(1, current.parent);
        insert.text(2, normalizedDigest);
        insert.text(3, indexDigest(current.digest));
        insert.integer(4, current.id);
        insert.integer(5, current.decoded.id);
        insert.integer(6, current.decoded.begin);
        insert.integer(7, current.decoded.length);
        insert.integer(8, current.normalized.id);
        insert.integer(9, current.normalized.begin);
        insert.integer(10, current.normalized.length);
        require(!insert.next(), "key-insert");
        insert.finish();
        require(!stack.empty() && stack.back().kind == '{', "key-scope");
        stack.back().key = current.id;
      }
    }
    publish(current);
  }
  void container(char kind) {
    error_code code;
    if (kind == '{')
      presentation.on_object_begin(code);
    else
      presentation.on_array_begin(code);
    auto value = begin(kind, kind == '{' ? "object" : "array");
    publish(value);
    stack.push_back({value.id, 0, 0, kind, value.parent, value.name, value.ordinal, false});
  }
  void close(char kind) {
    require(!stack.empty() && stack.back().kind == kind, "container-scope");
    auto id = stack.back().id;
    auto location = observer.token(kind == '{' ? '}' : ']');
    if (retainTree || id == rootValue) {
      streams.store.prepare(32768);
      Statement update(*streams.store.database,
                       "UPDATE values_index SET "
                       "raw_length=?-raw_begin,end_line=?,end_column=?,closed=1 WHERE id=?");
      update.integer(1, source.begin + observer.offset);
      update.integer(2, location.endLine);
      update.integer(3, location.endColumn);
      update.integer(4, id);
      require(!update.next(), "container-close");
      update.finish();
    }
    stack.pop_back();
    presentation.close(kind == '{' ? '}' : ']');
  }
  void literal(char token, const char *kind) {
    error_code code;
    if (token == 't' || token == 'f')
      presentation.on_bool(token == 't', code);
    else
      presentation.on_null(code);
    auto value = begin(token, kind);
    publish(value);
  }
  void admit() {
    admitted = true;
    auto prefix = streams.read(source, 0, 3);
    if (prefix == Bytes{0xef, 0xbb, 0xbf})
      admitted = false;
    if (admitted && !sourceUtf8Admitted)
      try {
        points(streams, source, [](Point) {});
      } catch (const Fault &error) {
        if (std::string(error.what()) == "invalid-utf8" ||
            std::string(error.what()) == "truncated-utf8")
          admitted = false;
        else
          throw;
      }
    if (!admitted) {
      Value value;
      if (record)
        value.location = {record, 1, record, 1};
      finding(value, nullptr, "invalid-utf8-or-bom", "bytes");
      failed = true;
      ended = true;
    }
  }
  void advance() {
    if (!admitted && !ended) {
      admit();
      if (ended)
        return;
    }
    if (ended)
      return;
    auto bytes = streams.read(source, inputOffset);
    error_code code;
    bool more = inputOffset + bytes.size() < source.length;
    auto consumed =
        parser->write_some(more, reinterpret_cast<const char *>(bytes.data()), bytes.size(), code);
    inputOffset += consumed;
    if (!code && consumed != bytes.size()) {
      for (std::size_t i = consumed; i < bytes.size(); ++i)
        if (!SpanObserver::space(bytes[i])) {
          code = json::error::extra_data;
          break;
        }
      if (!code)
        inputOffset = source.length;
    }
    if (code) {
      if (code == json::error::too_deep)
        throw Fault("nesting-depth-capacity");
      std::uint64_t line = record ? record : 1, column = 1;
      bool priorCr = false;
      StreamReader reader(streams, source);
      for (std::uint64_t position = 0; position < inputOffset; ++position) {
        int byte = reader.get();
        require(byte >= 0, "syntax-position-range");
        if (byte == '\r') {
          ++line;
          column = 1;
          priorCr = true;
        } else if (byte == '\n') {
          if (!priorCr)
            ++line;
          column = 1;
          priorCr = false;
        } else {
          priorCr = false;
          if ((byte & 0xc0) != 0x80)
            column += byte >= 0xf0 ? 2 : 1;
        }
      }
      Value value;
      value.location = {line, column, line, column};
      finding(value, nullptr, "syntax", "syntax");
      failed = true;
      ended = true;
      return;
    }
    if (!more) {
      parsed = parser->done() && inputOffset == source.length;
      require(parsed, "missing-parser-eof");
      ended = true;
    }
  }
  void finalizePins() {
    if (recordPreservation) {
      const auto &pins = contract.at("preserveNfcValues").as_array();
      for (std::size_t i = 0; i < pins.size(); ++i) {
        const auto &pin = pins[i].as_object();
        const auto &selection = pin.at("record").as_object();
        auto selector = resolvePointer(selection.at("pointer").as_string());
        if (!selector || selector->kind != "string" ||
            !streamEqualsText(streams, selector->decoded,
                              std::string(selection.at("value").as_string())))
          continue;
        recordSelections[i] = true;
        auto target = resolvePointer(pin.at("pointer").as_string());
        if (target && target->kind == "string" && target->digest == pin.at("sha256").as_string() &&
            target->decoded.length == exactInteger(pin.at("byteLength"))) {
          streams.store.prepare(32768);
          Statement insert(*streams.store.database,
                           "INSERT OR IGNORE INTO nfc_preserved(scope,value) VALUES(?,?)");
          insert.integer(1, events.scope);
          insert.integer(2, target->id);
          require(!insert.next(), "nfc-preserved-insert");
          insert.finish();
        } else
          finding(target && target->kind == "string" ? *target : descriptor(rootValue),
                  "json-quality/normalized-strings", "preservationMismatch");
      }
      std::uint64_t after = 0;
      while (true) {
        std::uint64_t value = 0;
        bool preserved = false;
        {
          Statement query(*streams.store.database,
                          "SELECT p.value,EXISTS(SELECT 1 FROM nfc_preserved s WHERE "
                          "s.scope=p.scope AND s.value=p.value) FROM nfc_pending p WHERE p.scope=? "
                          "AND p.value>? ORDER BY p.value LIMIT 1");
          query.integer(1, events.scope);
          query.integer(2, after);
          if (query.next()) {
            value = query.integer(0);
            preserved = query.integer(1) != 0;
          }
          query.finish();
        }
        if (!value)
          break;
        after = value;
        if (!preserved)
          finding(descriptor(value), "json-quality/normalized-strings", "unnormalized");
      }
    } else
      for (bool seen : pinsSeen)
        if (!seen)
          finding(descriptor(rootValue), "json-quality/normalized-strings", "preservationMismatch");
  }
  json::value next() {
    while (!events.ready() && !ended)
      advance();
    if (ended && parsed && !pinsFinished) {
      pinsFinished = true;
      finalizePins();
    }
    if (ended && parsed && !presentationFinished) {
      presentationFinished = true;
      if (checkPresentation && presentationPolicy != "preserved-bytes") {
        bool matches;
        if (comparison) {
          comparison->emit("\n");
          comparison->end();
          matches = comparison->matches && presentation.indexOrder && !duplicate;
        } else
          matches = layout(streams, source, presentationPolicy.ends_with("-body"));
        presentationChecked = true;
        if (!matches) {
          Value value;
          if (record)
            value.location = {record, 1, record, 1};
          finding(value, nullptr, "format-contract", "presentation");
        }
      }
    }
    if (ended && !events.finalized) {
      events.finalize(parsed);
      findings = events.diagnosticCount;
    }
    if (events.ready())
      return events.pop();
    return json::object{{"type", "terminal"},
                        {"parserComplete", parsed},
                        {"rulesComplete", false},
                        {"ruleCoverage", "candidate-pins-and-expectations-pending"},
                        {"presentationChecked", presentationChecked},
                        {"diagnosticsComplete", true},
                        {"domainAdmission", "unassessed"},
                        {"qualityPassed", false},
                        {"findings", std::to_string(findings)}};
  }
};
inline bool Handler::on_array_begin(error_code &) {
  checker->container('[');
  return true;
}
inline bool Handler::on_array_end(std::size_t, error_code &) {
  checker->close('[');
  return true;
}
inline bool Handler::on_object_begin(error_code &) {
  checker->container('{');
  return true;
}
inline bool Handler::on_object_end(std::size_t, error_code &) {
  checker->close('{');
  return true;
}
inline bool Handler::on_string_part(string_view part, std::size_t, error_code &) {
  checker->scalar(part, false, false);
  return true;
}
inline bool Handler::on_string(string_view part, std::size_t, error_code &) {
  checker->scalar(part, false, true);
  return true;
}
inline bool Handler::on_key_part(string_view part, std::size_t, error_code &) {
  checker->scalar(part, true, false);
  return true;
}
inline bool Handler::on_key(string_view part, std::size_t, error_code &) {
  checker->scalar(part, true, true);
  return true;
}
inline bool Handler::on_number_part(string_view part, error_code &) {
  checker->scalar(part, false, false, true);
  return true;
}
inline bool Handler::on_int64(std::int64_t, string_view part, error_code &) {
  checker->scalar(part, false, true, true);
  return true;
}
inline bool Handler::on_uint64(std::uint64_t, string_view part, error_code &) {
  checker->scalar(part, false, true, true);
  return true;
}
inline bool Handler::on_double(double, string_view part, error_code &) {
  checker->scalar(part, false, true, true);
  return true;
}
inline bool Handler::on_bool(bool value, error_code &) {
  checker->literal(value ? 't' : 'f', value ? "true" : "false");
  return true;
}
inline bool Handler::on_null(error_code &) {
  checker->literal('n', "null");
  return true;
}
