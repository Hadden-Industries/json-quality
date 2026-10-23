// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "failure.hpp"
#include <atomic>
#include <chrono>
#include <cstdint>

// One elapsed-time deadline covers capture, checking, delivery and reference
// consumption. Cleanup remains available after either interruption condition.
struct OperationControl {
  using Clock = std::chrono::steady_clock;
  std::atomic<bool> cancelled{false};
  Clock::time_point deadline = Clock::time_point::max();
  void start(std::uint64_t milliseconds) {
    require(milliseconds > 0 && milliseconds <= 86400000, "check-time-configuration");
    deadline = Clock::now() + std::chrono::milliseconds(milliseconds);
  }
  const char *failure() const noexcept {
    if (cancelled.load())
      return "cancelled";
    if (Clock::now() >= deadline)
      return "check-time-capacity";
    return nullptr;
  }
  void check() const {
    if (auto code = failure())
      throw Fault(code);
  }
};
