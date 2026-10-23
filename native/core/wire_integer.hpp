// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "failure.hpp"
#include <boost/json.hpp>
#include <charconv>
#include <cstdint>

// Counts and ranges use canonical unsigned decimal strings on the wire.
inline std::uint64_t exactInteger(const boost::json::value &value) {
  require(value.is_string(), "integer-wire-form");
  const auto &text = value.as_string();
  require(!text.empty() && (text.size() == 1 || text[0] != '0'), "integer-wire-form");
  std::uint64_t output = 0;
  auto result = std::from_chars(text.data(), text.data() + text.size(), output);
  require(result.ec == std::errc{} && result.ptr == text.data() + text.size(),
          "integer-wire-range");
  return output;
}
