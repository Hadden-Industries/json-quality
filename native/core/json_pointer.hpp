// SPDX-License-Identifier: AGPL-3.0-only
// One decoded JSON Pointer authority for the native indexed tree.
// Pointer controls are bounded separately from arbitrarily large source keys.
#pragma once
#include "failure.hpp"
#include <boost/json.hpp>
#include <string>
#include <vector>
struct PointerParts {
  std::vector<std::string> segments;
};
inline PointerParts decodePointer(const boost::json::string &pointer) {
  PointerParts result;
  if (pointer.empty())
    return result;
  require(pointer[0] == '/', "pointer-contract");
  std::string part;
  for (std::size_t i = 1; i <= pointer.size(); ++i) {
    if (i == pointer.size() || pointer[i] == '/') {
      result.segments.push_back(std::move(part));
      part.clear();
    } else if (pointer[i] == '~') {
      require(i + 1 < pointer.size() && (pointer[i + 1] == '0' || pointer[i + 1] == '1'),
              "pointer-escape");
      char decoded = pointer[++i] == '0' ? '~' : '/';
      part.push_back(decoded);
    } else
      part.push_back(pointer[i]);
  }
  return result;
}
