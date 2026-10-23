// SPDX-License-Identifier: AGPL-3.0-only
// Exact expected-negative admission is distinct from intrinsic quality.
// Findings remain visible; only stable diagnostic identities enter expectations.
#pragma once
#include "document_check.hpp"
inline json::object diagnosticIdentity(const json::object &finding) {
  json::object result;
  for (const char *key : {"severity", "phase", "ruleId", "messageId", "line", "column", "endLine",
                          "endColumn", "record"})
    if (auto field = finding.if_contains(key))
      result[key] = *field;
  // Noncharacter multiplicity needs its exact scalar argument. Value references
  // are ephemeral session authority and never persisted in expected metadata.
  if (auto arguments = finding.if_contains("arguments"))
    if (auto point = arguments->as_object().if_contains("codePoint"))
      result["codePoint"] = *point;
  return result;
}
struct SourceOutcome {
  const json::object &contract;
  std::string sourceDigest;
  std::uint64_t sourceLength, findings = 0, qualityFindings = 0, presentationFindings = 0,
                              expectedIndex = 0;
  bool exactIdentity = false, diagnosticsMatch = true, finished = false,
       presentationRepairable = true, nfcRepairable = true;
  Sha256 diagnosticHash;
  explicit SourceOutcome(const json::object &policy, std::string digest, std::uint64_t length)
      : contract(policy), sourceDigest(std::move(digest)), sourceLength(length) {
    if (auto expected = contract.if_contains("expected")) {
      const auto &object = expected->as_object();
      exactIdentity = object.at("sha256").as_string() == sourceDigest &&
                      exactInteger(object.at("byteLength")) == length;
      require(!object.if_contains("linkedDocuments"), "linked-expectations-need-census");
    } else {
      auto presentation = contract.if_contains("formatContract");
      require(!presentation || presentation->as_string() != "preserved-bytes",
              "preserved-presentation-needs-byte-identity");
    }
  }
  void observe(const json::value &event, bool generatedMismatch = false) {
    const auto &object = event.as_object();
    if (object.at("type") != "finding")
      return;
    ++findings;
    const bool presentation = object.at("phase") == "presentation";
    presentationRepairable &= presentation;
    nfcRepairable &= presentation || (object.at("phase") == "lint" &&
                                      object.at("ruleId") == "json-quality/normalized-strings" &&
                                      object.at("messageId") == "unnormalized");
    auto bytes = json::serialize(object);
    require(bytes.size() <= 65536, "diagnostic-frame-capacity");
    diagnosticHash.update(
        std::span(reinterpret_cast<const unsigned char *>(bytes.data()), bytes.size()));
    const unsigned char lf = '\n';
    diagnosticHash.update(std::span(&lf, 1));
    // Our own admission failure is delivered and hashed, but is neither source
    // quality evidence nor a candidate capable of satisfying its expectation.
    if (generatedMismatch)
      return;
    ++qualityFindings;
    if (object.at("phase") == "presentation") {
      ++presentationFindings;
      return;
    }
    if (auto expected = contract.if_contains("expected")) {
      const auto &list = expected->as_object().at("diagnostics").as_array();
      if (expectedIndex >= list.size() || list[expectedIndex] != diagnosticIdentity(object))
        diagnosticsMatch = false;
      ++expectedIndex;
    }
  }
  bool matched() const {
    auto expected = contract.if_contains("expected");
    return expected && exactIdentity && diagnosticsMatch &&
           expectedIndex == expected->as_object().at("diagnostics").as_array().size();
  }
  bool mismatch() const { return contract.if_contains("expected") && !matched(); }
  json::value mismatchFinding() const {
    return json::object{{"type", "finding"},
                        {"severity", "error"},
                        {"arguments", json::object{}},
                        {"value", "0"},
                        {"phase", "expectation"},
                        {"ruleId", nullptr},
                        {"messageId", "expected-bytes-or-diagnostics-mismatch"},
                        {"line", "1"},
                        {"column", "1"},
                        {"endLine", "1"},
                        {"endColumn", "1"}};
  }
  void finish(json::object &terminal) {
    require(!finished, "source-outcome-already-closed");
    finished = true;
    bool parsed = terminal.at("parserComplete").as_bool();
    terminal.erase("ruleCoverage");
    terminal["rulesComplete"] = true;
    terminal["semanticRulesApplicable"] = parsed;
    auto presentation = contract.if_contains("checkPresentation");
    terminal["presentationSelected"] = !presentation || presentation->as_bool();
    terminal["qualityPassed"] = parsed && qualityFindings == 0;
    terminal["expectedMatched"] =
        contract.if_contains("expected") ? json::value(matched()) : json::value(nullptr);
    terminal["contractSatisfied"] = contract.if_contains("expected")
                                        ? matched() && presentationFindings == 0
                                        : parsed && qualityFindings == 0;
    terminal["findings"] = std::to_string(findings);
    terminal["diagnosticSha256"] = Sha256::hex(diagnosticHash.finish());
  }
};
