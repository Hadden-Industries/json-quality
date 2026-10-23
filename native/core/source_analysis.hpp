// SPDX-License-Identifier: AGPL-3.0-only
// Retained source facts and exact ordered meaning comparisons for explicit
// transformations. No source text, tree or collection is materialized here.
#pragma once
#include "value_index.hpp"

struct SourceAnalysis {
  std::uint64_t length, root, values;
};
inline SourceAnalysis analyzeRetainedSource(Streams &streams, std::uint64_t source,
                                            bool positiveQuality = true) {
  SourceAnalysis result{};
  {
    Statement query(*streams.store.database,
                    "SELECT s.length,c.root,c.parsed,c.quality,c.retained FROM "
                    "source_captures s JOIN source_closures c ON c.source=s.source "
                    "WHERE s.source=?");
    query.integer(1, source);
    require(query.next(), "source-not-admitted");
    require(query.integer(2) == 1 && (!positiveQuality || query.integer(3) == 1) &&
                query.integer(4) == 1 && query.integer(1) > 0,
            "source-not-positive-retained-document");
    result.length = query.integer(0);
    result.root = query.integer(1);
    query.finish();
  }
  Statement count(*streams.store.database, "SELECT COUNT(*) FROM values_index WHERE source=?");
  count.integer(1, source);
  require(count.next(), "source-value-count");
  result.values = count.integer(0);
  count.finish();
  return result;
}
inline std::optional<Value> nextRetainedValue(Streams &streams, std::uint64_t source,
                                              std::uint64_t after) {
  std::uint64_t id = 0;
  {
    Statement query(*streams.store.database,
                    "SELECT id FROM values_index WHERE source=? AND id>? ORDER BY id LIMIT 1");
    query.integer(1, source);
    query.integer(2, after);
    if (query.next())
      id = query.integer(0);
    query.finish();
  }
  return id ? std::optional<Value>(valueDescriptor(streams, id)) : std::nullopt;
}
inline bool sameSourceMeaning(Streams &streams, std::uint64_t first, std::uint64_t second) {
  const auto left = analyzeRetainedSource(streams, first),
             right = analyzeRetainedSource(streams, second);
  if (left.values != right.values)
    return false;
  std::uint64_t firstAfter = 0, secondAfter = 0;
  const auto relative = [](std::uint64_t id, std::uint64_t root) { return id ? id - root + 1 : 0; };
  while (true) {
    streams.store.checkCancellation();
    auto a = nextRetainedValue(streams, first, firstAfter),
         b = nextRetainedValue(streams, second, secondAfter);
    if (!a || !b)
      return !a && !b;
    if (a->kind != b->kind || a->ordinal != b->ordinal || a->record != b->record ||
        relative(a->parent, left.root) != relative(b->parent, right.root) ||
        relative(a->name, left.root) != relative(b->name, right.root))
      return false;
    if (a->kind != "array" && a->kind != "object") {
      bool literal = a->kind == "boolean" || a->kind == "null";
      if (!streams.equal(literal ? a->raw : a->decoded, literal ? b->raw : b->decoded))
        return false;
    }
    firstAfter = a->id;
    secondAfter = b->id;
  }
}
