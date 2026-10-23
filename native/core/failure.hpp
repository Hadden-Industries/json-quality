// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include <stdexcept>

// Operational failures never become successful quality outcomes.
struct Fault : std::runtime_error {
  using std::runtime_error::runtime_error;
};
inline void require(bool condition, const char *message) {
  if (!condition)
    throw Fault(message);
}
