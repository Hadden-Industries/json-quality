// SPDX-License-Identifier: AGPL-3.0-only
// Shared native service. Both transports exchange these exact bounded frames.
#pragma once
#include "contract_cohort.hpp"
#include "control_memory.hpp"
#include "json_lines.hpp"
#include "linked_bytes.hpp"
#include "source_analysis.hpp"
#include "source_census.hpp"
#include "source_contract.hpp"
#include "source_outcome.hpp"
#include "source_rewrites.hpp"
#include "streamed_pointer.hpp"
#include "value_pointer.hpp"
#include <atomic>
#include <charconv>
#include <optional>
#ifndef _WIN32
#include <cerrno>
#include <sys/random.h>
#endif
struct ProtocolFrame {
  char kind;
  Bytes bytes;
};
inline std::string newNonce() {
  std::array<unsigned char, 16> bytes{};
#ifdef _WIN32
  require(BCryptGenRandom(nullptr, bytes.data(), static_cast<ULONG>(bytes.size()),
                          BCRYPT_USE_SYSTEM_PREFERRED_RNG) >= 0,
          "session-entropy");
#else
  std::size_t offset = 0;
  while (offset < bytes.size()) {
    auto count = ::getrandom(bytes.data() + offset, bytes.size() - offset, 0);
    if (count < 0 && errno == EINTR)
      continue;
    require(count > 0, "session-entropy");
    offset += static_cast<std::size_t>(count);
  }
#endif
  constexpr char alphabet[] = "0123456789abcdef";
  std::string nonce;
  for (auto byte : bytes) {
    nonce.push_back(alphabet[byte >> 4]);
    nonce.push_back(alphabet[byte & 15]);
  }
  return nonce;
}
inline ProtocolFrame jsonFrame(json::object object, char kind = 'J') {
  auto text = json::serialize(object);
  require(text.size() <= 65536, "output-frame-size");
  return {kind, Bytes(text.begin(), text.end())};
}
inline Bytes encodeFrames(const std::vector<ProtocolFrame> &frames) {
  Bytes bytes;
  require(frames.size() <= 2, "response-frame-capacity");
  for (const auto &frame : frames) {
    std::uint32_t length = static_cast<std::uint32_t>(frame.bytes.size());
    require(length <= 65536, "frame-size");
    bytes.push_back(frame.kind);
    for (unsigned shift = 0; shift < 32; shift += 8)
      bytes.push_back(static_cast<unsigned char>(length >> shift));
    bytes.insert(bytes.end(), frame.bytes.begin(), frame.bytes.end());
  }
  return bytes;
}
struct CoreSession {
  ResourcePolicy resources;
  OperationControl operation;
  std::atomic<bool> &cancelled = operation.cancelled;
  SqliteOwner memory{ResourcePolicy::minimum(ResourcePolicy::Runtime::managedMemoryTargetBytes)};
  ControlBytesResource controlResource{memory.value};
  json::storage_ptr controlStorage = json::make_shared_resource<ControlJsonResource>(memory.value);
  std::string nonce = newNonce(), scratch, lastRequestId = "0", uploadRequestId, sourceDigest;
  std::pmr::vector<unsigned char> control{&controlResource};
  bool uploading = false, closed = false, terminal = false, configured = false;
  bool includeValueEvents = false, retainValues = false;
  std::unique_ptr<Store> store;
  std::unique_ptr<Streams> streams;
  std::unique_ptr<SourceCensus> census;
  std::unique_ptr<SourceRewrites> rewrites;
  std::unique_ptr<Checker> checker;
  std::unique_ptr<RecordChecker> records;
  std::unique_ptr<SourceOutcome> outcome;
  std::unique_ptr<EventLog> supplemental;
  std::optional<json::value> deferredTerminal;
  std::unique_ptr<Sha256> sourceHash;
  json::object contract{controlStorage}, linkage{controlStorage};
  Stream source;
  std::uint64_t materializationBytes = 0, controlStateBytes = 0;
  std::string materializationId;
  std::string declaredDigest;
  std::optional<std::uint64_t> declaredLength;
  std::optional<json::value> pendingEvent;
  std::uint64_t totalBytes = 0, physicalSources = 0, logicalSources = 0, outputBytes = 0;
  std::uint64_t
      &managedTarget =
          resources
              .runtime[static_cast<std::size_t>(ResourcePolicy::Runtime::managedMemoryTargetBytes)],
      &temporaryLimit =
          resources.runtime[static_cast<std::size_t>(ResourcePolicy::Runtime::maxTemporaryBytes)],
      &maxFileBytes =
          resources.admission[static_cast<std::size_t>(ResourcePolicy::Admission::maxFileBytes)];
  std::string sourceKind;
  std::uint64_t transformParent = 0;
  explicit CoreSession(std::string location) : scratch(std::move(location)) {
    scratch = pathToUtf8(pathFromUtf8(scratch));
    memory.value->fixed.store(Store::reserve);
    initializeUnicode();
    UVersionInfo actual, unicode;
    u_getVersion(actual);
    u_getUnicodeVersion(unicode);
    require(actual[0] == 79 && actual[1] == 1 && unicode[0] == 18, "native-unicode-cohort");
    require(std::string(sqlite3_libversion()) == "3.54.1", "native-sqlite-cohort");
  }
  ~CoreSession() {
    try {
      close();
    } catch (...) {
    }
  }
  json::object hello() const {
    return {{"type", "hello"},
            {"protocolVersion", ContractCohort::nativeProtocolVersion},
            {"icu", "79.1"},
            {"unicode", "18.0"},
            {"sqlite", "3.54.1"},
            {"owner", nonce},
            {"sourceInputsSha256", JSON_QUALITY_SOURCE_INPUTS_SHA256}};
  }
  void close() {
    if (controlStateBytes) {
      memory.value->external.fetch_sub(controlStateBytes);
      controlStateBytes = 0;
    }
    if (!materializationId.empty()) {
      memory.value->external.fetch_sub(materializationBytes);
      materializationBytes = 0;
      materializationId.clear();
    }
    outcome.reset();
    supplemental.reset();
    deferredTerminal.reset();
    records.reset();
    checker.reset();
    rewrites.reset();
    census.reset();
    streams.reset();
    sourceHash.reset();
    if (store) {
      if (operation.failure())
        store->state = Store::State::aborted;
      store->close();
      store.reset();
    }
    contract.clear();
    linkage.clear();
    control.clear();
    control.shrink_to_fit();
    pendingEvent.reset();
    closed = true;
  }
  Stream representation(const json::object &request, bool describeOnly = false) {
    require(bool(streams), "source-not-open");
    auto value = valueDescriptor(*streams, exactInteger(request.at("value")));
    auto name = request.at("representation").as_string();
    if (name == "source-json") {
      require(value.closed, "provisional-container-range");
      return value.raw;
    }
    if ((name == "decoded-utf8" && (value.kind == "string" || value.kind == "key")) ||
        (name == "number-lexeme" && value.kind == "number"))
      return value.decoded;
    if (name == "nfc-utf8" && value.normalized.id)
      return value.normalized;
    if (name == "json-pointer") {
      if (describeOnly)
        return {0, pointerLength(*streams, value)};
      return valuePointer(*streams, value);
    }
    throw Fault("value-representation");
  }
  json::value nextSourceEvent() {
    auto event = deferredTerminal ? std::move(*deferredTerminal)
                 : records        ? records->next()
                                  : checker->next();
    deferredTerminal.reset();
    if (event.as_object().at("type") == "terminal") {
      if (outcome->mismatch() && !supplemental) {
        auto limit = streams->maxDiagnostics;
        require(streams->allocatedFindings < limit, "diagnostic-capacity");
        ++streams->allocatedFindings;
        deferredTerminal = std::move(event);
        supplemental = std::make_unique<EventLog>(*streams);
        supplemental->append(outcome->mismatchFinding().as_object(), true, 1, 1, nullptr,
                             "expected-bytes-or-diagnostics-mismatch", "expectation");
        supplemental->finalize(true);
        event = supplemental->pop();
        outcome->observe(event, true);
        return event;
      }
      outcome->finish(event.as_object());
      return event;
    }
    outcome->observe(event);
    return event;
  }
  void beginSource(const json::object &request, const std::string &requestId, bool linked = false,
                   std::uint64_t transformedFrom = 0) {
    require(configured && (!source.id || terminal), "source-already-open-or-unconfigured");
    for (const auto &item : ResourceDefaults::admission)
      require(!request.at("contract").as_object().if_contains(item.name),
              "resource-control-in-quality-contract");
    for (const auto &item : ResourceDefaults::runtime)
      require(!request.at("contract").as_object().if_contains(item.name),
              "resource-control-in-quality-contract");
    admitSourceContract(request.at("contract").as_object());
    if (auto path = request.at("contract").as_object().if_contains("path")) {
      auto limit = resources.get(ResourcePolicy::Admission::maxRequestPathCharacters);
      std::uint64_t characters = 0;
      for (unsigned char byte : path->as_string())
        if ((byte & 0xc0) != 0x80)
          require(++characters <= limit, "request-path-capacity");
    }
    auto kind = request.if_contains("sourceKind");
    std::string selectedKind = transformedFrom ? "transformed"
                               : linked        ? "logical"
                               : kind          ? std::string(kind->as_string())
                                               : "physical";
    require(selectedKind == "physical" || selectedKind == "logical" || selectedKind == "native" ||
                selectedKind == "authority" || (transformedFrom && selectedKind == "transformed"),
            "source-kind");
    if (selectedKind == "physical" || selectedKind == "native")
      require(physicalSources < resources.get(ResourcePolicy::Admission::maxFiles),
              "source-count-capacity");
    if (selectedKind == "logical" || selectedKind == "native" || selectedKind == "transformed")
      require(logicalSources < resources.get(ResourcePolicy::Admission::maxLogicalDocuments),
              "logical-count-capacity");
    std::string expectedDigest;
    std::optional<std::uint64_t> expectedLength;
    if (auto identity = request.if_contains("identity")) {
      const auto &object = identity->as_object();
      expectedDigest = std::string(object.at("sha256").as_string());
      require(object.size() == 2 && expectedDigest.size() == 64 &&
                  expectedDigest.find_first_not_of("0123456789abcdef") == std::string::npos,
              "source-identity-contract");
      expectedLength = exactInteger(object.at("byteLength"));
      require(*expectedLength <= maxFileBytes, "source-byte-capacity");
      require(*expectedLength <=
                  resources.get(ResourcePolicy::Admission::maxTotalBytes) - totalBytes,
              "total-source-byte-capacity");
    }
    outcome.reset();
    supplemental.reset();
    deferredTerminal.reset();
    records.reset();
    checker.reset();
    pendingEvent.reset();
    terminal = false;
    includeValueEvents = false;
    retainValues = false;
    ensureStore();
    source = streams->create();
    sourceHash = std::make_unique<Sha256>();
    declaredDigest = std::move(expectedDigest);
    declaredLength = expectedLength;
    contract = request.at("contract").as_object();
    linkage.clear();
    sourceKind = selectedKind;
    transformParent = transformedFrom;
    if (selectedKind == "physical" || selectedKind == "native")
      ++physicalSources;
    if (selectedKind == "logical" || selectedKind == "native" || selectedKind == "transformed")
      ++logicalSources;
    uploading = true;
    uploadRequestId = requestId;
    if (auto value = request.if_contains("includeValueEvents"))
      includeValueEvents = value->as_bool();
    if (auto value = request.if_contains("retainValues"))
      retainValues = value->as_bool();
    retainValues |= includeValueEvents;
    require(selectedKind != "authority" || declaredLength.has_value(), "authority-needs-identity");
  }
  // Census may precede the first source; both share this single store owner.
  void ensureStore() {
    require(configured, "resources-not-configured");
    if (!store) {
      std::uint64_t owner = 0;
      auto converted = std::from_chars(nonce.data(), nonce.data() + 16, owner, 16);
      require(converted.ec == std::errc{}, "storage-owner");
      store = std::make_unique<Store>(owner, managedTarget, 65536, temporaryLimit,
                                      pathFromUtf8(scratch), std::string(), memory.value);
      store->operation = &operation;
      store->database->bindOperation(&operation);
      streams = std::make_unique<Streams>(*store, resources);
    }
  }
  void appendSource(std::span<const unsigned char> bytes) {
    operation.check();
    require(bytes.size() <= maxFileBytes - source.length, "source-byte-capacity");
    require(bytes.size() <= resources.get(ResourcePolicy::Admission::maxTotalBytes) - totalBytes,
            "total-source-byte-capacity");
    if (declaredLength)
      require(source.length <= *declaredLength && bytes.size() <= *declaredLength - source.length,
              "source-identity-length");
    streams->append(source, bytes);
    sourceHash->update(bytes);
    totalBytes += bytes.size();
  }
  std::vector<ProtocolFrame> finishSource() {
    sourceDigest = Sha256::hex(sourceHash->finish());
    sourceHash.reset();
    uploading = false;
    require(!declaredLength || source.length == *declaredLength, "source-identity-length");
    require(declaredDigest.empty() || sourceDigest == declaredDigest, "source-identity-digest");
    store->prepare(32768);
    {
      Statement capture(
          *store->database,
          "INSERT INTO source_captures(source,length,sha,kind,parent_source,parent_value,encoding) "
          "VALUES(?,?,?,?,?,?,?)");
      capture.integer(1, source.id);
      capture.integer(2, source.length);
      capture.text(3, sourceDigest);
      capture.text(4, sourceKind);
      capture.integer(5, transformParent   ? transformParent
                         : linkage.empty() ? 0
                                           : exactInteger(linkage.at("containerSource")));
      capture.integer(6, linkage.empty() ? 0 : exactInteger(linkage.at("value")));
      capture.text(7, transformParent   ? "transform"
                      : linkage.empty() ? ""
                                        : std::string(linkage.at("encoding").as_string()));
      require(!capture.next(), "source-capture-insert");
      capture.finish();
    }
    if (sourceKind == "authority") {
      // Binary storage/authority provenance is immutable capture evidence. Only
      // JSON members receive grammar/rule claims through a separate check.
      terminal = true;
      return {jsonFrame({{"type", "source-captured"},
                         {"source", std::to_string(source.id)},
                         {"byteLength", std::to_string(source.length)},
                         {"sha256", sourceDigest},
                         {"captureOnly", true},
                         {"requestId", uploadRequestId}})};
    }
    bool jsonLines = false;
    if (auto format = contract.if_contains("format")) {
      require(format->is_string() &&
                  (format->as_string() == "json" || format->as_string() == "jsonl"),
              "source-format-contract");
      jsonLines = format->as_string() == "jsonl";
    }
    outcome = std::make_unique<SourceOutcome>(contract, sourceDigest, source.length);
    if (jsonLines) {
      records =
          std::make_unique<RecordChecker>(*streams, source, json::object(contract, controlStorage),
                                          includeValueEvents, retainValues);
    } else
      checker = std::make_unique<Checker>(*streams, source, json::object(contract, controlStorage),
                                          includeValueEvents, 0, false, retainValues);
    return {jsonFrame({{"type", "source-captured"},
                       {"source", std::to_string(source.id)},
                       {"byteLength", std::to_string(source.length)},
                       {"sha256", sourceDigest},
                       {"requestId", uploadRequestId}})};
  }
  std::vector<ProtocolFrame> exchange(char kind, std::span<const unsigned char> bytes) {
    auto result = dispatch(kind, bytes);
    if (!closed) {
      operation.check();
      std::uint64_t count = 0;
      for (const auto &frame : result)
        count += frame.bytes.size() + 5;
      require(count <= resources.get(ResourcePolicy::Admission::maxToolOutputBytes) - outputBytes,
              "native-output-byte-capacity");
      outputBytes += count;
    }
    return result;
  }
  std::vector<ProtocolFrame> dispatch(char kind, std::span<const unsigned char> bytes) {
    SqliteOwnerScope memoryScope(memory.value);
    require(!closed, "closed-session");
    require(bytes.size() <= 65536, "input-frame-size");
    if (uploading && (kind == 'B' || kind == 'F')) {
      operation.check();
      if (kind == 'B') {
        appendSource(bytes);
        return {};
      }
      require(kind == 'F' && bytes.empty(), "source-frame-type");
      return finishSource();
    }
    require(kind == 'C' || kind == 'c', "control-frame-type");
    require(control.size() + bytes.size() <= (configured ? 1048576 : 4096),
            "control-envelope-size");
    control.insert(control.end(), bytes.begin(), bytes.end());
    if (kind == 'C')
      return {};
    auto request =
        json::parse(string_view(reinterpret_cast<const char *>(control.data()), control.size()),
                    controlStorage)
            .as_object();
    auto requestBytes = control.size();
    control.clear();
    require(request.at("protocolVersion").to_number<unsigned>() ==
                ContractCohort::nativeProtocolVersion,
            "unsupported-protocol-version");
    std::string requestId(request.at("requestId").as_string()),
        command(request.at("command").as_string());
    require(!requestId.empty() && requestId.size() <= 64 && requestId[0] != '0' &&
                requestId.find_first_not_of("0123456789") == std::string::npos,
            "request-sequence");
    require(requestId.size() > lastRequestId.size() ||
                (requestId.size() == lastRequestId.size() && requestId > lastRequestId),
            "request-replay");
    lastRequestId = requestId;
    require(request.at("owner").as_string() == nonce, "session-authority");
    if (command != "close") {
      require(requestBytes <= resources.get(ResourcePolicy::Admission::maxRequestBytes),
              "request-byte-capacity");
      require(requestId.size() <= resources.get(ResourcePolicy::Admission::maxRequestIdCharacters),
              "request-id-capacity");
      operation.check();
    }
    require(!uploading || command == "close", "source-upload-incomplete");
    auto reply = [&](json::object object) {
      object["requestId"] = requestId;
      return jsonFrame(std::move(object));
    };
    if (command == "configure") {
      require(!configured && !store, "resources-already-configured");
      auto selected = resources;
      selected.configure(request);
      require(Store::reserve + memory.value->external.load() + memory.value->bytes.load() <=
                  selected.get(ResourcePolicy::Runtime::managedMemoryTargetBytes),
              "control-memory-target");
      resources = selected;
      memory.value->limit = managedTarget;
      operation.start(resources.get(ResourcePolicy::Runtime::maxCheckTimeMs));
      configured = true;
      return {reply({{"type", "configured"},
                     {"managedMemoryTargetBytes", std::to_string(managedTarget)},
                     {"resources", resources.effective()},
                     {"workingReserveBytes", std::to_string(Store::reserve)}})};
    }
    if (command == "adopt-control-state") {
      try {
        require(configured && !store && !controlStateBytes, "control-state-lifecycle");
        auto reservation = exactInteger(request.at("byteLength"));
        require(reservation > 0 && memory.value->acquireExternal(reservation),
                "control-state-budget");
        controlStateBytes = reservation;
        return {reply(
            {{"type", "control-state-adopted"}, {"byteLength", std::to_string(reservation)}})};
      } catch (const Fault &error) {
        return {reply({{"type", "request-refused"}, {"code", error.what()}})};
      }
    }
    if (command == "resize-control-state") {
      try {
        require(configured, "control-state-lifecycle");
        auto next = exactInteger(request.at("byteLength"));
        require(next > 0 && next <= managedTarget - Store::reserve, "control-state-budget");
        if (next > controlStateBytes) {
          auto additional = next - controlStateBytes;
          if (store)
            store->prepare(additional);
          require(memory.value->acquireExternal(additional), "control-state-budget");
        } else
          memory.value->external.fetch_sub(controlStateBytes - next);
        controlStateBytes = next;
        if (store)
          store->observe();
        return {reply({{"type", "control-state-resized"}, {"byteLength", std::to_string(next)}})};
      } catch (const Fault &error) {
        if (std::string(error.what()) == "control-state-budget")
          return {reply({{"type", "request-refused"}, {"code", error.what()}})};
        throw;
      }
    }
    if (command == "source-statistics" || command == "compare-sources") {
      try {
        require(bool(streams), "source-not-open");
        if (command == "source-statistics") {
          auto selectedSource = exactInteger(request.at("source"));
          const auto facts = analyzeRetainedSource(*streams, selectedSource);
          return {reply({{"type", "source-statistics"},
                         {"source", std::to_string(selectedSource)},
                         {"byteLength", std::to_string(facts.length)},
                         {"indexedValues", std::to_string(facts.values)}})};
        }
        auto first = exactInteger(request.at("first")), second = exactInteger(request.at("second"));
        return {reply({{"type", "source-comparison"},
                       {"sameMeaning", sameSourceMeaning(*streams, first, second)}})};
      } catch (const Fault &error) {
        std::string code = error.what();
        if (code == "source-not-open" || code == "source-not-admitted" ||
            code == "source-not-positive-retained-document" || code == "integer-wire-form" ||
            code == "integer-wire-range" || code == "native-offset-limit")
          return {reply({{"type", "request-refused"}, {"code", code}})};
        throw;
      }
    }
    if (command == "begin-source" || command == "begin-source-transform") {
      std::uint64_t parent = 0;
      if (command == "begin-source-transform") {
        require(bool(streams), "source-not-open");
        parent = exactInteger(request.at("parentSource"));
        analyzeRetainedSource(*streams, parent, false);
      }
      beginSource(request, requestId, false, parent);
      return {reply({{"type", "source-ready"}, {"source", std::to_string(source.id)}})};
    }
    if (command.starts_with("rewrite-")) {
      require(census && streams, "rewrite-needs-complete-census");
      if (command == "rewrite-start") {
        require(!rewrites, "rewrite-already-started");
        const auto mode = request.at("operation").as_string();
        require(mode == "format" || mode == "normalize", "rewrite-operation");
        rewrites = std::make_unique<SourceRewrites>(*census, *streams, mode == "normalize");
      } else {
        require(bool(rewrites), "rewrite-not-started");
        if (command == "rewrite-select")
          rewrites->select(censusPath(request.at("path"), resources));
        else if (command == "rewrite-bind")
          rewrites->bind(censusPath(request.at("path"), resources),
                         exactInteger(request.at("source")));
        else if (command == "rewrite-next")
          return {
              reply({{"type", "rewrite-candidate"},
                     {"candidate", rewrites->next(std::string(request.at("after").as_string()))}})};
        else if (command == "rewrite-get")
          return {reply(
              {{"type", "rewrite-candidate"},
               {"candidate", rewrites->next(censusPath(request.at("path"), resources), true)}})};
        else if (command == "rewrite-directory") {
          const auto &path = request.at("path");
          return {reply(
              {{"type", "rewrite-directory"},
               {"observation", rewrites->directory(
                                   path.as_string().empty() ? "" : censusPath(path, resources))}})};
        } else if (command == "rewrite-dependent")
          return {reply({{"type", "rewrite-dependent"}, {"member", rewrites->dependent()}})};
        else if (command == "rewrite-map-source")
          return {reply(
              {{"type", "rewrite-source"},
               {"source", std::to_string(rewrites->mapped(exactInteger(request.at("source"))))}})};
        else if (command == "rewrite-corresponding-value")
          return {reply(
              {{"type", "rewrite-value"},
               {"value", valueEvent(correspondingValue(*streams, exactInteger(request.at("value")),
                                                       exactInteger(request.at("source"))))}})};
        else if (command == "rewrite-admit")
          rewrites->admit();
        else if (command == "rewrite-written")
          rewrites->written(censusPath(request.at("path"), resources),
                            std::string(request.at("observation").as_string()));
        else if (command != "rewrite-status")
          throw Fault("unknown-command");
      }
      store->observe();
      return {reply(rewrites->status())};
    }
    if (command.starts_with("census-")) {
      ensureStore();
      if (!census)
        census = std::make_unique<SourceCensus>(*store, resources);
      if (command == "census-provider")
        census->addProvider(request);
      else if (command == "census-authority")
        return {
            reply({{"type", "census-authority"}, {"authority", census->addAuthority(request)}})};
      else if (command == "census-get-authority")
        return {
            reply({{"type", "census-authority"},
                   {"authority", census->authority(censusPath(request.at("path"), resources))}})};
      else if (command == "census-add")
        census->add(request);
      else if (command == "census-next-authority")
        return {reply({{"type", "census-authority"},
                       {"authority",
                        census->authority(std::string(request.at("after").as_string()), true)}})};
      else if (command == "census-get")
        return {reply({{"type", "census-member"},
                       {"member", census->next(censusPath(request.at("path"), resources), true)}})};
      else if (command == "census-bind")
        census->bind(request);
      else if (command == "census-close-inventory" || command == "census-close-provider")
        census->closeProvider(
            std::string(request.at("provider").as_string()), command == "census-close-inventory",
            request.if_contains("observation") ? std::string(request.at("observation").as_string())
                                               : "");
      else if (command == "census-provider-observation")
        return {reply(
            {{"type", "census-observation"},
             {"observation",
              census->provider(std::string(request.at("provider").as_string())).observation}})};
      else if (command == "census-next-closed-directory")
        return {
            reply({{"type", "census-directory"}, {"directory", census->nextDirectory(request)}})};
      else if (command == "census-status")
        return {reply(census->status())};
      else if (command == "census-enqueue-directory" || command == "census-take-directory" ||
               command == "census-close-directory")
        return {reply(
            {{"type", "census-directory"}, {"directory", census->directory(request, command)}})};
      else if (command == "census-next")
        return {reply({{"type", "census-member"},
                       {"member", census->next(std::string(request.at("after").as_string()))}})};
      else
        throw Fault("unknown-command");
      store->observe();
      return {reply({{"type", "census-accepted"}})};
    }
    if (command == "begin-linked-source") {
      require(configured && store && terminal, "linked-source-needs-closed-container");
      auto value = valueDescriptor(*streams, exactInteger(request.at("value")));
      require(value.kind == "string" && value.closed, "linked-source-needs-string");
      auto encoding = request.at("encoding").as_string();
      require(encoding == "utf8" || encoding == "base64", "linked-source-encoding");
      {
        Statement closure(*store->database, "SELECT parsed FROM source_closures WHERE source=?");
        closure.integer(1, value.raw.id);
        require(closure.next() && closure.integer(0) == 1, "linked-source-container-incomplete");
        closure.finish();
      }
      bool base64 = encoding == "base64";
      beginSource(request, requestId, true);
      linkage = {{"containerSource", std::to_string(value.raw.id)},
                 {"value", std::to_string(value.id)},
                 {"encoding", base64 ? "base64" : "utf8"}};
      linkedBytes(*streams, value.decoded, base64,
                  [&](const Bytes &fragment) { appendSource(fragment); });
      return finishSource();
    }
    if (command == "next") {
      require((checker || records) && !terminal, "source-not-readable");
      json::array events;
      std::size_t encoded = 128;
      while (true) {
        auto event = pendingEvent ? std::move(*pendingEvent) : nextSourceEvent();
        pendingEvent.reset();
        event.as_object()["source"] = std::to_string(source.id);
        auto size = json::serialize(event).size() + 1;
        if (!events.empty() && encoded + size > 65000) {
          pendingEvent = std::move(event);
          break;
        }
        require(encoded + size <= 65000, "event-frame-capacity");
        encoded += size;
        if (event.as_object().at("type") == "terminal") {
          terminal = true;
          auto &result = event.as_object();
          store->prepare(32768);
          Statement closure(*store->database, "INSERT INTO "
                                              "source_closures(source,parsed,quality,contract_"
                                              "satisfied,root,retained,repair_format,repair_nfc) "
                                              "VALUES(?,?,?,?,?,?,?,?)");
          closure.integer(1, source.id);
          closure.integer(2, result.at("parserComplete").as_bool());
          closure.integer(3, result.at("qualityPassed").as_bool());
          closure.integer(4, result.at("contractSatisfied").as_bool());
          closure.integer(5, checker ? checker->rootValue : 0);
          closure.integer(6, retainValues);
          closure.integer(7,
                          result.at("parserComplete").as_bool() && outcome->presentationRepairable);
          closure.integer(8, result.at("parserComplete").as_bool() && outcome->nfcRepairable);
          require(!closure.next(), "source-closure-insert");
          closure.finish();
          result["sourceSha256"] = sourceDigest;
          if (!linkage.empty())
            result["linkage"] = linkage;
          store->observe();
          result["managedPeakBytes"] = std::to_string(store->managedPeak);
          result["transitions"] = std::to_string(store->transitions);
          result["scratchPeakBytes"] = std::to_string(store->quota.peak);
        }
        events.push_back(std::move(event));
        if (terminal || !(records ? records->ready() : checker->events.ready()))
          break;
      }
      return {reply({{"type", "events"}, {"events", std::move(events)}})};
    }
    if (command == "read-source") {
      try {
        require(bool(store), "source-not-open");
        for (const char *field : {"source", "offset", "maximum"}) {
          auto item = request.if_contains(field);
          require(item && item->is_string(), "invalid-range-request");
        }
        auto id = exactInteger(request.at("source")), offset = exactInteger(request.at("offset")),
             maximum = exactInteger(request.at("maximum"));
        require(maximum > 0 && maximum <= 65536, "range-capacity");
        Stream captured;
        {
          Statement query(*store->database, "SELECT length FROM source_captures WHERE source=?");
          query.integer(1, id);
          require(query.next(), "unknown-source");
          captured = {id, query.integer(0)};
          query.finish();
        }
        require(offset <= captured.length, "stream-read-boundary");
        auto result = streams->read(captured, offset, static_cast<std::size_t>(maximum));
        auto size = result.size();
        return {{'D', std::move(result)},
                reply({{"type", "range"},
                       {"source", std::to_string(id)},
                       {"offset", std::to_string(offset)},
                       {"byteLength", std::to_string(size)},
                       {"totalByteLength", std::to_string(captured.length)}})};
      } catch (const Fault &error) {
        std::string code = error.what();
        if (code == "source-not-open" || code == "unknown-source" ||
            code == "invalid-range-request" || code == "range-capacity" ||
            code == "stream-read-boundary" || code == "integer-wire-form" ||
            code == "integer-wire-range" || code == "native-offset-limit")
          return {reply({{"type", "request-refused"}, {"code", code}})};
        throw;
      }
    }
    if (command == "next-child") {
      try {
        require(bool(streams), "source-not-open");
        auto id = request.if_contains("value"), ordinal = request.if_contains("ordinal");
        require(id && id->is_string() && ordinal && ordinal->is_string(),
                "invalid-value-selection");
        auto parent = valueDescriptor(*streams, exactInteger(*id));
        require(parent.kind == "object" || parent.kind == "array", "value-not-container");
        {
          Statement closure(*store->database,
                            "SELECT parsed,retained FROM source_closures WHERE source=?");
          closure.integer(1, parent.raw.id);
          require(closure.next() && closure.integer(0) == 1, "source-not-admitted");
          require(closure.integer(1) == 1, "source-values-not-retained");
          closure.finish();
        }
        std::uint64_t child = 0;
        {
          // The parent/ordinal index makes each bounded step independent of
          // earlier siblings and their arbitrarily large decoded payloads.
          Statement query(*store->database,
                          "SELECT id FROM values_index WHERE parent=? AND ordinal>=? AND "
                          "kind!='key' ORDER BY ordinal,id LIMIT 1");
          query.integer(1, parent.id);
          query.integer(2, exactInteger(*ordinal));
          if (query.next())
            child = query.integer(0);
          query.finish();
        }
        return {reply({{"type", "child"},
                       {"value", child ? json::value(valueEvent(valueDescriptor(*streams, child)))
                                       : json::value(nullptr)}})};
      } catch (const Fault &error) {
        std::string code = error.what();
        if (code == "source-not-open" || code == "unknown-value" ||
            code == "invalid-value-selection" || code == "value-not-container" ||
            code == "source-not-admitted" || code == "source-values-not-retained" ||
            code == "integer-wire-form" || code == "integer-wire-range" ||
            code == "native-offset-limit")
          return {reply({{"type", "request-refused"}, {"code", code}})};
        throw;
      }
    }
    if (command == "describe-value") {
      try {
        require(bool(streams), "source-not-open");
        auto id = request.if_contains("value");
        require(id && id->is_string(), "invalid-value-selection");
        return {reply({{"type", "value-description"},
                       {"value", valueEvent(valueDescriptor(*streams, exactInteger(*id)))}})};
      } catch (const Fault &error) {
        std::string code = error.what();
        if (code == "source-not-open" || code == "unknown-value" ||
            code == "invalid-value-selection" || code == "integer-wire-form" ||
            code == "integer-wire-range" || code == "native-offset-limit")
          return {reply({{"type", "request-refused"}, {"code", code}})};
        throw;
      }
    }
    if (command == "select-value" || command == "select-value-pointer-source") {
      try {
        require(bool(store), "source-not-open");
        auto sourceId = request.if_contains("source"), pointer = request.if_contains("pointer");
        bool streamed = command == "select-value-pointer-source";
        auto pointerSource = request.if_contains("pointerSource");
        require(sourceId && sourceId->is_string() &&
                    (streamed ? pointerSource && pointerSource->is_string()
                              : pointer && pointer->is_string()),
                "invalid-value-selection");
        Stream pointerBytes;
        if (streamed) {
          Statement captured(*store->database,
                             "SELECT length,kind FROM source_captures WHERE source=?");
          auto id = exactInteger(*pointerSource);
          captured.integer(1, id);
          require(captured.next() && captured.text(1) == "authority", "invalid-value-selection");
          pointerBytes = {id, captured.integer(0)};
          captured.finish();
        }
        std::uint64_t selectedSource = exactInteger(*sourceId), root = 0;
        {
          Statement closure(*store->database,
                            "SELECT parsed,root,retained FROM source_closures WHERE source=?");
          closure.integer(1, selectedSource);
          require(closure.next() && closure.integer(0) == 1, "source-not-admitted");
          root = closure.integer(1);
          require(closure.integer(2) != 0 ||
                      (streamed ? pointerBytes.length == 0 : pointer->as_string().empty()),
                  "source-values-not-retained");
          closure.finish();
        }
        auto record = request.if_contains("record");
        if (!root) {
          require(record && record->is_string() && exactInteger(*record) > 0,
                  "invalid-value-selection");
          Statement query(
              *store->database,
              "SELECT id FROM values_index WHERE source=? AND record=? AND parent=0 LIMIT 1");
          query.integer(1, selectedSource);
          query.integer(2, exactInteger(*record));
          require(query.next(), "pointer-not-found");
          root = query.integer(0);
          query.finish();
        } else
          require(!record || exactInteger(*record) == 0, "invalid-value-selection");
        auto value = streamed ? resolveStreamedPointer(*streams, root, pointerBytes)
                              : resolveValuePointer(*streams, root, pointer->as_string());
        require(value.has_value(), "pointer-not-found");
        return {reply({{"type", "selected-value"}, {"value", valueEvent(*value)}})};
      } catch (const Fault &error) {
        std::string code = error.what();
        if (code == "source-not-open" || code == "source-not-admitted" ||
            code == "source-values-not-retained" || code == "invalid-value-selection" ||
            code == "pointer-not-found" || code == "pointer-ambiguous" ||
            code == "pointer-contract" || code == "pointer-escape" || code == "invalid-utf8" ||
            code == "truncated-utf8" || code == "integer-wire-form" ||
            code == "integer-wire-range" || code == "native-offset-limit")
          return {reply({{"type", "request-refused"}, {"code", code}})};
        throw;
      }
    }
    if (command == "read-value" || command == "reserve-materialization" ||
        command == "reserve-control-materialization" || command == "release-materialization") {
      try {
        if (command == "release-materialization") {
          auto reservation = request.if_contains("reservation");
          require(reservation && reservation->is_string() && !materializationId.empty() &&
                      reservation->as_string() == materializationId,
                  "materialization-authority");
          memory.value->external.fetch_sub(materializationBytes);
          materializationBytes = 0;
          materializationId.clear();
          return {reply({{"type", "materialization-released"}})};
        }
        for (const char *field : {"value", "representation", "maximum"}) {
          auto item = request.if_contains(field);
          require(item && item->is_string(), "invalid-range-request");
        }
        if (command == "read-value") {
          auto offset = request.if_contains("offset");
          require(offset && offset->is_string(), "invalid-range-request");
        }
        auto maximum = exactInteger(request.at("maximum"));
        std::uint64_t offset = 0;
        if (command == "read-value") {
          offset = exactInteger(request.at("offset"));
          require(maximum > 0 && maximum <= 65536, "range-capacity");
        }
        auto stream = representation(request, true);
        if (command == "reserve-materialization" || command == "reserve-control-materialization") {
          require(stream.length <= maximum, "materialization-capacity");
          require(materializationId.empty(), "materialization-already-reserved");
          auto reservationBytes = stream.length;
          if (command == "reserve-control-materialization") {
            require(request.at("representation").as_string() == "source-json",
                    "control-materialization-source");
            auto value = valueDescriptor(*streams, exactInteger(request.at("value")));
            bool rootValue = false;
            {
              Statement closure(
                  *store->database,
                  "SELECT parsed,quality,root,retained FROM source_closures WHERE source=?");
              closure.integer(1, value.raw.id);
              require(closure.next() && closure.integer(0) && closure.integer(1) &&
                          closure.integer(3),
                      "control-materialization-source");
              rootValue = closure.integer(2) == value.id;
              closure.finish();
            }
            // Every subtree value starts at a distinct raw byte. This finite
            // upper bound avoids scanning or charging unrelated sibling nodes.
            // Preserve the tighter existing whole-source count for policy roots.
            auto nodes = stream.length;
            if (rootValue) {
              Statement count(*store->database, "SELECT count(*) FROM values_index WHERE source=?");
              count.integer(1, value.raw.id);
              require(count.next(), "control-materialization-source");
              nodes = count.integer(0);
              count.finish();
            }
            // Explicit conservative SDK bookkeeping: raw bytes, UTF-16 parse
            // text/string storage, and object/property slots. V8/OS heap overhead
            // is measured separately; this is not a process heap/RSS guarantee.
            require(stream.length <= UINT64_MAX / 5 &&
                        nodes <= (UINT64_MAX - stream.length * 5) / 256,
                    "materialization-budget");
            reservationBytes = stream.length * 5 + nodes * 256;
          }
          require(memory.value->acquireExternal(reservationBytes), "materialization-budget");
          try {
            materializationId = requestId;
          } catch (...) {
            memory.value->external.fetch_sub(reservationBytes);
            throw;
          }
          materializationBytes = reservationBytes;
          store->observe();
          return {reply({{"type", "materialization-reserved"},
                         {"reservation", materializationId},
                         {"byteLength", std::to_string(stream.length)},
                         {"managedReservationBytes", std::to_string(reservationBytes)}})};
        }
        require(offset <= stream.length, "stream-read-boundary");
        if (request.at("representation").as_string() == "json-pointer")
          stream = representation(request);
        auto result = streams->read(stream, offset, maximum);
        auto size = result.size();
        return {{'D', std::move(result)},
                reply({{"type", "range"},
                       {"offset", std::to_string(offset)},
                       {"byteLength", std::to_string(size)},
                       {"totalByteLength", std::to_string(stream.length)}})};
      } catch (const Fault &error) {
        std::string code = error.what();
        if (code == "unknown-value" || code == "value-representation" ||
            code == "provisional-container-range" || code == "range-capacity" ||
            code == "stream-read-boundary" || code == "materialization-capacity" ||
            code == "materialization-budget" || code == "control-materialization-source" ||
            code == "materialization-already-reserved" || code == "materialization-authority" ||
            code == "invalid-range-request" || code == "integer-wire-form" ||
            code == "integer-wire-range" || code == "source-not-open" ||
            code == "value-path-unavailable")
          return {reply({{"type", "request-refused"}, {"code", code}})};
        throw;
      }
    }
    if (command == "metrics") {
      require(bool(store), "source-not-open");
      store->observe();
      return {reply({{"type", "metrics"},
                     {"managedBytes", std::to_string(store->managed())},
                     {"controlStateReservationBytes", std::to_string(controlStateBytes)},
                     {"managedPeakBytes", std::to_string(store->managedPeak)},
                     {"sourceBytes", std::to_string(totalBytes)},
                     {"nativeOutputBytes", std::to_string(outputBytes)},
                     {"physicalSources", std::to_string(physicalSources)},
                     {"logicalSources", std::to_string(logicalSources)},
                     {"recordsAdmitted", std::to_string(streams->recordsAdmitted)},
                     {"transitions", std::to_string(store->transitions)},
                     {"scratchPeakBytes", std::to_string(store->quota.peak)}})};
    }
    if (command == "close") {
      close();
      return {reply({{"type", "closed"}})};
    }
    throw Fault("unknown-command");
  }
};
