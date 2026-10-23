// SPDX-License-Identifier: AGPL-3.0-only
// Typed admission of the bounded source controls at both native transports.
// This admits JSON Quality's controls, never consumer domain schemas or payloads.
#pragma once
#include "source_contract_enums.hpp"
#include "unicode_normalization.hpp"
#include "wire_integer.hpp"
#include <initializer_list>
namespace json = boost::json;

inline void closedControl(const json::object &object,
                          std::initializer_list<json::string_view> names) {
  for (const auto &entry : object)
    require(std::find(names.begin(), names.end(), entry.key()) != names.end(),
            "unknown-source-contract-field");
}
inline bool sourcePointer(json::string_view text) {
  if (!text.empty() && text.front() != '/')
    return false;
  for (std::size_t index = 0; index < text.size(); ++index)
    if (text[index] == '~' &&
        (++index == text.size() || (text[index] != '0' && text[index] != '1')))
      return false;
  return true;
}
inline bool ownerText(const json::value *item) {
  if (!item || !item->is_string())
    return false;
  const auto &text = item->as_string();
  int32_t offset = 0;
  while (offset < static_cast<int32_t>(text.size())) {
    UChar32 point;
    U8_NEXT(text.data(), offset, static_cast<int32_t>(text.size()), point);
    if (point >= 0 && !ecmaTrim(point))
      return true;
  }
  return false;
}
inline void sourceDigest(const json::value &item) {
  require(item.is_string(), "source-contract-digest");
  const auto &text = item.as_string();
  require(text.size() == 64 && text.find_first_not_of("0123456789abcdef") == json::string::npos,
          "source-contract-digest");
}
inline void sourceDiagnostic(const json::value &item) {
  require(item.is_object(), "source-contract-diagnostic");
  const auto &object = item.as_object();
  closedControl(object, {"severity", "phase", "ruleId", "messageId", "line", "column", "endLine",
                         "endColumn", "record", "codePoint"});
  require(object.at("severity").is_string() && object.at("severity").as_string() == "error" &&
              object.at("phase").is_string(),
          "source-contract-diagnostic");
  const auto &phase = object.at("phase").as_string();
  require(phase == "bytes" || phase == "syntax" || phase == "lint" || phase == "framing",
          "source-contract-diagnostic");
  require(object.at("ruleId").is_null() || object.at("ruleId").is_string(),
          "source-contract-diagnostic");
  require(object.at("messageId").is_string() && !object.at("messageId").as_string().empty(),
          "source-contract-diagnostic");
  for (const char *field : {"line", "column", "endLine", "endColumn"})
    require(exactInteger(object.at(field)) > 0, "source-contract-location");
  if (auto record = object.if_contains("record"))
    require(exactInteger(*record) > 0, "source-contract-location");
  if (auto point = object.if_contains("codePoint")) {
    require(point->is_string(), "source-contract-code-point");
    const auto &text = point->as_string();
    require(text.size() >= 6 && text.size() <= 8 && text[0] == 'U' && text[1] == '+' &&
                text.find_first_not_of("0123456789ABCDEF", 2) == json::string::npos,
            "source-contract-code-point");
  }
}
inline void admitSourceContract(const json::object &contract) {
  closedControl(contract, {"path", "format", "formatContract", "normalization", "allowEmptyKeys",
                           "allowFormatWrites", "owner", "reason", "preserveNfcValues", "expected",
                           "checkPresentation", "exclude", "exceptions"});
  for (const char *field : {"allowFormatWrites", "checkPresentation", "exclude"})
    if (auto item = contract.if_contains(field))
      require(item->is_bool(), "source-check-contract");
  if (auto item = contract.if_contains("path"))
    require(item->is_string() && !item->as_string().empty(), "source-check-contract");
  for (const char *field : {"owner", "reason"})
    if (auto item = contract.if_contains(field))
      require(ownerText(item), "source-check-contract");
  if (auto item = contract.if_contains("format"))
    require(item->is_string() && SourceContractEnums::format(item->as_string()),
            "unsupported-source-format");
  if (auto item = contract.if_contains("formatContract"))
    require(item->is_string() && SourceContractEnums::formatContract(item->as_string()),
            "presentation-policy");
  if (auto item = contract.if_contains("normalization"))
    require(item->is_string() && SourceContractEnums::normalization(item->as_string()),
            "source-check-contract");
  if (auto items = contract.if_contains("allowEmptyKeys")) {
    require(items->is_array(), "source-check-contract");
    for (const auto &item : items->as_array())
      require(item.is_string() && sourcePointer(item.as_string()), "source-contract-pointer");
  }
  if (auto expected = contract.if_contains("expected")) {
    require(expected->is_object(), "source-check-contract");
    const auto &object = expected->as_object();
    closedControl(object, {"sha256", "byteLength", "diagnostics"});
    sourceDigest(object.at("sha256"));
    exactInteger(object.at("byteLength"));
    require(object.at("diagnostics").is_array(), "source-check-contract");
    for (const auto &item : object.at("diagnostics").as_array())
      sourceDiagnostic(item);
  }
  if (auto items = contract.if_contains("exceptions")) {
    require(items->is_array(), "source-check-contract");
    for (const auto &item : items->as_array()) {
      require(item.is_object(), "source-check-contract");
      closedControl(item.as_object(), {"owner", "reason"});
      require(ownerText(item.as_object().if_contains("owner")) &&
                  ownerText(item.as_object().if_contains("reason")),
              "source-check-contract");
    }
  }
  if (auto items = contract.if_contains("preserveNfcValues")) {
    require(items->is_array() && !items->as_array().empty(), "nfc-preservation-contract");
    bool attributed =
        ownerText(contract.if_contains("owner")) && ownerText(contract.if_contains("reason"));
    if (auto exceptions = contract.if_contains("exceptions"))
      attributed |= !exceptions->as_array().empty();
    auto writes = contract.if_contains("allowFormatWrites"),
         normalization = contract.if_contains("normalization"),
         expected = contract.if_contains("expected");
    require(attributed && writes && !writes->as_bool() &&
                (!normalization || normalization->as_string() != "preserve") &&
                (!expected || expected->as_object().at("diagnostics").as_array().empty()),
            "nfc-preservation-contract");
    for (const auto &item : items->as_array()) {
      require(item.is_object(), "nfc-preservation-contract");
      const auto &pin = item.as_object();
      closedControl(pin, {"pointer", "sha256", "byteLength", "record"});
      require(pin.at("pointer").is_string() && sourcePointer(pin.at("pointer").as_string()),
              "source-contract-pointer");
      sourceDigest(pin.at("sha256"));
      require(exactInteger(pin.at("byteLength")) > 0, "nfc-preservation-contract");
      if (auto record = pin.if_contains("record")) {
        require(record->is_object(), "nfc-preservation-contract");
        const auto &selector = record->as_object();
        closedControl(selector, {"pointer", "value"});
        require(selector.at("pointer").is_string() &&
                    sourcePointer(selector.at("pointer").as_string()) &&
                    selector.at("value").is_string() && !selector.at("value").as_string().empty(),
                "nfc-preservation-contract");
      }
    }
  }
}
