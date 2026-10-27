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
  Clock::time_point began = Clock::now();
  std::uint64_t maximumMilliseconds = UINT64_MAX;
  void start(std::uint64_t milliseconds) {
    require(milliseconds > 0, "check-time-configuration");
    maximumMilliseconds = milliseconds;
    began = Clock::now();
  }
  const char *failure() const noexcept {
    if (cancelled.load())
      return "cancelled";
    if (maximumMilliseconds != UINT64_MAX &&
        static_cast<std::uint64_t>(
            std::chrono::duration_cast<std::chrono::milliseconds>(Clock::now() - began).count()) >=
            maximumMilliseconds)
      return "check-time-capacity";
    return nullptr;
  }
  void check() const {
    if (auto code = failure())
      throw Fault(code);
  }
};
