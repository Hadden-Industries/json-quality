// SPDX-License-Identifier: AGPL-3.0-only
// Physical-LF framing over the identified source; no record string materialization.
// Whole-source UTF-8/BOM admission precedes every record count and finding.
#pragma once
#include "document_check.hpp"
struct RecordChecker {
  Streams &streams;
  Stream source;
  json::object contract;
  bool includeValues = false, retainValues = false;
  StreamReader framing;
  std::unique_ptr<EventLog> events;
  std::unique_ptr<Checker> current;
  std::uint64_t position = 0, recordCount = 0, maxRecords, maxDiagnostics, findings = 0;
  std::vector<std::uint64_t> pinMatches;
  bool admitted = false, admissionDone = false, framingDone = false, done = false, parsed = true,
       presentationChecked = true, closureChecked = false;
  RecordChecker(Streams &s, Stream input, json::object policy, bool values = false,
                bool retained = false)
      : streams(s), source(input), contract(std::move(policy)), includeValues(values),
        retainValues(retained), framing(s, input), events(std::make_unique<EventLog>(s)),
        maxRecords(s.maxRecords), maxDiagnostics(s.maxDiagnostics) {
    auto policyName = contract.if_contains("formatContract");
    std::string name =
        policyName ? std::string(policyName->as_string()) : "producer-json-compact-body";
    require(name == "producer-json-compact-body" || name == "preserved-bytes",
            "json-lines-presentation-policy");
    contract["formatContract"] = name;
    presentationChecked = name != "preserved-bytes";
    if (auto selected = contract.if_contains("checkPresentation"))
      presentationChecked &= selected->as_bool();
    if (auto pins = contract.if_contains("preserveNfcValues")) {
      pinMatches.resize(pins->as_array().size());
      for (const auto &pin : pins->as_array())
        require(pin.as_object().if_contains("record") != nullptr, "json-lines-pin-needs-record");
    }
  }
  void finding(const char *message, const char *phase, std::uint64_t line = 1,
               bool record = false) {
    if (events->finalized) {
      require(!events->ready(), "undelivered-framing-finding");
      events = std::make_unique<EventLog>(streams);
    }
    require(streams.allocatedFindings < maxDiagnostics, "diagnostic-capacity");
    ++streams.allocatedFindings;
    json::object object{{"type", "finding"},
                        {"severity", "error"},
                        {"arguments", json::object{}},
                        {"value", "0"},
                        {"phase", phase},
                        {"ruleId", nullptr},
                        {"messageId", message},
                        {"line", std::to_string(line)},
                        {"column", "1"},
                        {"endLine", std::to_string(line)},
                        {"endColumn", "1"}};
    if (record)
      object["record"] = std::to_string(line);
    events->append(std::move(object), true, line, 1, nullptr, message, phase);
    events->finalize(true);
    ++findings;
  }
  void admit() {
    admissionDone = true;
    admitted = true;
    auto prefix = streams.read(source, 0, 3);
    if (prefix == Bytes{0xef, 0xbb, 0xbf})
      admitted = false;
    if (admitted)
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
      finding("invalid-utf8-or-bom", "bytes");
      parsed = false;
      framingDone = true;
      done = true;
    }
  }
  bool ready() const { return events->ready() || (current && current->events.ready()); }
  bool startRecord() {
    if (position >= source.length) {
      framingDone = true;
      return false;
    }
    require(streams.recordsAdmitted < maxRecords, "record-capacity");
    auto begin = position;
    bool delimiter = false;
    while (position < source.length) {
      int byte = framing.get();
      require(byte >= 0, "record-framing-source");
      ++position;
      if (byte == '\n') {
        delimiter = true;
        break;
      }
    }
    auto length = position - begin - (delimiter ? 1 : 0);
    Stream view{source.id, length, source.begin + begin};
    bool blank = visitPoints(streams, view, [](Point point) { return ecmaTrim(point); });
    ++recordCount;
    ++streams.recordsAdmitted;
    if (blank) {
      finding("blank-json-line", "framing", recordCount, true);
      parsed = false;
      return true;
    }
    if (length &&
        streams.read(Stream{source.id, 1, source.begin + begin + length - 1}, 0, 1) == Bytes{'\r'})
      --view.length;
    current = std::make_unique<Checker>(streams, view, json::object(contract, contract.storage()),
                                        includeValues, recordCount, true, retainValues);
    return true;
  }
  json::value next() {
    if (!admissionDone)
      admit();
    if (events->ready())
      return events->pop();
    while (!done) {
      if (current) {
        auto event = current->next();
        if (event.as_object().at("type") != "terminal")
          return event;
        parsed &= current->parsed;
        presentationChecked &= current->presentationChecked;
        findings += current->findings;
        for (std::size_t i = 0; i < pinMatches.size(); ++i)
          pinMatches[i] += current->recordSelections[i] ? 1 : 0;
        current.reset();
      }
      if (!framingDone && startRecord()) {
        if (events->ready())
          return events->pop();
        continue;
      }
      if (!closureChecked) {
        closureChecked = true;
        if (recordCount == 0) {
          finding("empty-json-lines", "framing");
          parsed = false;
        }
        if (std::any_of(pinMatches.begin(), pinMatches.end(),
                        [](auto count) { return count != 1; }))
          finding("nfc-record-identity-mismatch", "expectation");
      }
      done = true;
    }
    if (events->ready())
      return events->pop();
    return json::object{{"type", "terminal"},
                        {"parserComplete", parsed && admitted},
                        {"rulesComplete", false},
                        {"ruleCoverage", "candidate-expectations-pending"},
                        {"diagnosticsComplete", true},
                        {"domainAdmission", "unassessed"},
                        {"qualityPassed", false},
                        {"presentationChecked", presentationChecked && parsed},
                        {"findings", std::to_string(findings)},
                        {"recordCount", admitted ? json::value(std::to_string(recordCount))
                                                 : json::value(nullptr)}};
  }
};
