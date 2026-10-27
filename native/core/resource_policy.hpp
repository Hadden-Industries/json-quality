// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "resource_defaults.hpp"
#include "wire_integer.hpp"
#include <algorithm>

// Schema annotations own names, defaults and representable bounds. Null removes
// a selected quota; bounded transport buffers remain independent of quotas.
struct ResourcePolicy {
  using Admission = ResourceDefaults::Admission;
  using Runtime = ResourceDefaults::Runtime;
  std::array<std::uint64_t, ResourceDefaults::admission.size()> admission{};
  std::array<std::uint64_t, ResourceDefaults::runtime.size()> runtime{};
  ResourcePolicy() {
    for (std::size_t i = 0; i < admission.size(); ++i)
      admission[i] = ResourceDefaults::admission[i].value;
    for (std::size_t i = 0; i < runtime.size(); ++i)
      runtime[i] = ResourceDefaults::runtime[i].value;
  }
  std::uint64_t get(Admission field) const { return admission[static_cast<std::size_t>(field)]; }
  std::uint64_t get(Runtime field) const { return runtime[static_cast<std::size_t>(field)]; }
  static constexpr std::uint64_t minimum(Runtime field) {
    return ResourceDefaults::runtime[static_cast<std::size_t>(field)].minimum;
  }
  static constexpr std::uint64_t defaultValue(Runtime field) {
    return ResourceDefaults::runtime[static_cast<std::size_t>(field)].value;
  }
  void configure(const boost::json::object &request) {
    const auto assign = [&](auto &values, const auto &specs, bool nullable) {
      for (std::size_t i = 0; i < specs.size(); ++i) {
        const auto &spec = specs[i];
        if (auto item = request.if_contains(spec.name)) {
          if (nullable && item->is_null())
            values[i] = UINT64_MAX;
          else {
            auto value = exactInteger(*item);
            require(value >= spec.minimum && value <= spec.maximum, "resource-configuration");
            values[i] = value;
          }
        }
      }
    };
    for (const auto &entry : request) {
      auto key = entry.key();
      bool envelope =
          key == "command" || key == "requestId" || key == "owner" || key == "protocolVersion";
      const auto named = [&](const auto &specs) {
        return std::any_of(specs.begin(), specs.end(),
                           [&](const auto &spec) { return spec.name == key; });
      };
      require(envelope || named(ResourceDefaults::admission) || named(ResourceDefaults::runtime),
              "unknown-resource-control");
    }
    assign(admission, ResourceDefaults::admission, true);
    assign(runtime, ResourceDefaults::runtime, true);
  }
  boost::json::object effective() const {
    boost::json::object capacities, working;
    for (std::size_t i = 0; i < admission.size(); ++i)
      capacities[ResourceDefaults::admission[i].name] =
          admission[i] == UINT64_MAX ? boost::json::value(nullptr)
                                     : boost::json::value(std::to_string(admission[i]));
    for (std::size_t i = 0; i < runtime.size(); ++i)
      working[ResourceDefaults::runtime[i].name] =
          runtime[i] == UINT64_MAX ? boost::json::value(nullptr)
                                   : boost::json::value(std::to_string(runtime[i]));
    return {{"admission", std::move(capacities)}, {"runtime", std::move(working)}};
  }
};
