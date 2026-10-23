// SPDX-License-Identifier: AGPL-3.0-only
// Explicit writer candidate census. Payloads, plans and derived linkage remain
// in the execution's one adaptive store; this owner never performs file writes.
#pragma once
#include "source_analysis.hpp"
#include "source_census.hpp"
#include "streamed_pointer.hpp"
#include "value_pointer.hpp"

inline Value correspondingValue(Streams &streams, std::uint64_t originalValue,
                                std::uint64_t candidateSource) {
  const auto original = valueDescriptor(streams, originalValue);
  std::uint64_t root = 0;
  {
    Statement closure(*streams.store.database,
                      "SELECT root,parsed,retained FROM source_closures WHERE source=?");
    closure.integer(1, candidateSource);
    require(closure.next() && closure.integer(1) && closure.integer(2),
            "rewrite-container-not-retained");
    root = closure.integer(0);
    closure.finish();
  }
  if (!root) {
    Statement record(*streams.store.database,
                     "SELECT id FROM values_index WHERE source=? AND parent=0 AND record=?");
    record.integer(1, candidateSource);
    record.integer(2, original.record);
    require(record.next(), "rewrite-container-record-missing");
    root = record.integer(0);
    record.finish();
  }
  const auto selected = resolveStreamedPointer(streams, root, valuePointer(streams, original));
  require(selected.has_value(), "rewrite-logical-pointer-missing");
  return *selected;
}

struct SourceRewrites {
  SourceCensus &census;
  Streams &streams;
  Store &store;
  bool normalize, admitted = false;
  SourceRewrites(SourceCensus &inventory, Streams &values, bool nfc)
      : census(inventory), streams(values), store(values.store), normalize(nfc) {
    require(census.status().at("complete").as_bool(), "rewrite-needs-complete-census");
    store.prepare(131072);
    store.database->execute(
        "CREATE TABLE rewrite_candidates(path TEXT PRIMARY KEY,parent INTEGER UNIQUE,"
        "source INTEGER UNIQUE,selected INTEGER,changed INTEGER,written INTEGER DEFAULT "
        "0,written_observation TEXT);");
    store.observe();
  }
  std::uint64_t mapped(std::uint64_t parent) {
    Statement query(*store.database, "SELECT source FROM rewrite_candidates WHERE parent=?");
    query.integer(1, parent);
    const auto result = query.next() ? query.integer(0) : parent;
    query.finish();
    require(result != 0, "rewrite-parent-not-checked");
    return result;
  }
  void select(const std::string &path) {
    require(!admitted, "rewrite-already-admitted");
    const auto member = census.next(path, true);
    require(!member.is_null() && member.at("kind") == "physical",
            "rewrite-physical-source-required");
    {
      Statement authority(*store.database, "SELECT 1 FROM census_authorities WHERE folded=?");
      authority.text(1, lowercaseCensusPath(path));
      require(!authority.next(), "rewrite-native-authority-protected");
      authority.finish();
    }
    const auto parent = exactInteger(member.at("source"));
    analyzeRetainedSource(streams, parent, false);
    {
      Statement closure(*store.database,
                        "SELECT repair_format,repair_nfc FROM source_closures WHERE source=?");
      closure.integer(1, parent);
      require(closure.next() && closure.integer(normalize ? 1 : 0), "rewrite-unsafe-source");
      closure.finish();
    }
    store.prepare(32768);
    Statement insert(
        *store.database,
        "INSERT INTO rewrite_candidates(path,parent,selected,changed) VALUES(?,?,1,0)");
    insert.text(1, path);
    insert.integer(2, parent);
    require(!insert.next(), "rewrite-selection-insert");
    insert.finish();
  }
  void bind(const std::string &path, std::uint64_t source) {
    require(!admitted, "rewrite-already-admitted");
    const auto member = census.next(path, true);
    require(!member.is_null(), "rewrite-member-missing");
    const auto &object = member.as_object();
    const bool physical = object.at("kind") == "physical";
    require(physical || object.at("kind") == "logical", "rewrite-member-kind");
    const auto parent = exactInteger(object.at("source"));
    std::string sha;
    std::uint64_t length = 0, origin = 0, originValue = 0;
    std::string encoding;
    {
      Statement checked(
          *store.database,
          "SELECT c.sha,c.length,c.parent_source,c.parent_value,c.encoding,"
          "s.contract_satisfied,s.quality FROM source_captures c JOIN source_closures s "
          "USING(source) WHERE c.source=?");
      checked.integer(1, source);
      require(checked.next() && checked.integer(5) && (!physical || checked.integer(6)),
              "rewrite-candidate-not-accepted");
      sha = checked.text(0);
      length = checked.integer(1);
      origin = checked.integer(2);
      originValue = checked.integer(3);
      encoding = checked.text(4);
      checked.finish();
    }
    if (physical) {
      std::uint64_t cursor = source;
      for (unsigned depth = 0; cursor != parent; ++depth) {
        require(depth < 4096, "rewrite-transform-depth");
        Statement ancestor(*store.database,
                           "SELECT parent_source,encoding FROM source_captures WHERE source=?");
        ancestor.integer(1, cursor);
        require(ancestor.next() && ancestor.text(1) == "transform", "rewrite-unrelated-candidate");
        const auto next = ancestor.integer(0);
        require(next > 0 && next < cursor, "rewrite-unrelated-candidate");
        cursor = next;
        ancestor.finish();
      }
      Statement selected(
          *store.database,
          "SELECT 1 FROM rewrite_candidates WHERE path=? AND selected=1 AND source IS NULL");
      selected.text(1, path);
      require(selected.next(), "rewrite-selection-required");
      selected.finish();
    } else {
      const auto &link = object.at("linkage").as_object();
      const auto container = mapped(exactInteger(link.at("containerSource")));
      const auto value = correspondingValue(streams, exactInteger(link.at("value")), container);
      require(origin == container && originValue == value.id &&
                  encoding == link.at("encoding").as_string(),
              "rewrite-candidate-linkage-mismatch");
    }
    const bool changed =
        sha != object.at("sha256").as_string() || length != exactInteger(object.at("byteLength"));
    store.prepare(32768);
    Statement update(*store.database,
                     physical
                         ? "UPDATE rewrite_candidates SET source=?,changed=? WHERE path=?"
                         : "INSERT INTO rewrite_candidates(source,changed,path,parent,selected) "
                           "VALUES(?,?,?,?,0)");
    update.integer(1, source);
    update.integer(2, changed);
    update.text(3, path);
    if (!physical)
      update.integer(4, parent);
    require(!update.next(), "rewrite-candidate-bind");
    update.finish();
  }
  json::value dependent() {
    Statement query(
        *store.database,
        "SELECT m.path FROM census_members m JOIN rewrite_candidates p ON "
        "p.parent=m.parent_source LEFT JOIN rewrite_candidates r ON r.path=m.path "
        "WHERE m.kind='logical' AND p.changed=1 AND r.path IS NULL ORDER BY m.source LIMIT 1");
    std::string path;
    if (query.next())
      path = query.text(0);
    query.finish();
    return path.empty() ? json::value(nullptr) : census.next(path, true);
  }
  void admit() {
    require(!admitted && dependent().is_null(), "rewrite-logical-candidates-incomplete");
    Statement query(*store.database,
                    "SELECT 1 FROM census_members m LEFT JOIN rewrite_candidates r USING(path) "
                    "LEFT JOIN source_closures c ON c.source=COALESCE(r.source,m.source) "
                    "WHERE c.contract_satisfied<>1 OR c.source IS NULL OR "
                    "(r.selected=1 AND r.source IS NULL) LIMIT 1");
    require(!query.next(), "rewrite-peer-preflight-failed");
    query.finish();
    admitted = true;
  }
  json::value next(const std::string &after, bool exact = false) {
    std::string sql =
        "SELECT r.path,r.source,c.sha,c.length,r.changed,r.written,r.written_observation FROM "
        "rewrite_candidates r LEFT JOIN source_captures c USING(source) WHERE r.selected=1 AND ";
    sql += exact ? "r.path=?" : "r.path>? ORDER BY r.path LIMIT 1";
    Statement query(*store.database, sql.c_str());
    query.text(1, after);
    json::value result;
    if (query.next())
      result = json::object{{"path", query.text(0)},
                            {"source", std::to_string(query.integer(1))},
                            {"sha256", query.text(2)},
                            {"byteLength", std::to_string(query.integer(3))},
                            {"changed", query.integer(4) != 0},
                            {"written", query.integer(5) != 0},
                            {"observation", query.text(6)}};
    query.finish();
    return result;
  }
  void written(const std::string &path, const std::string &observation) {
    require(admitted, "rewrite-preflight-required");
    require(!observation.empty() && observation.size() <= 65536, "rewrite-write-observation");
    store.prepare(32768);
    Statement update(
        *store.database,
        "UPDATE rewrite_candidates SET written=1,written_observation=? WHERE path=? AND selected=1 "
        "AND changed=1 AND written=0");
    update.text(1, observation);
    update.text(2, path);
    require(!update.next() && sqlite3_changes(store.database->value) == 1, "rewrite-write-state");
    update.finish();
  }
  json::object status() {
    Statement query(*store.database,
                    "SELECT count(*),COALESCE(sum(changed),0),COALESCE(sum(written),0) FROM "
                    "rewrite_candidates WHERE selected=1");
    require(query.next(), "rewrite-count");
    const auto selected = query.integer(0), changed = query.integer(1), written = query.integer(2);
    query.finish();
    return {
        {"type", "rewrite-status"},           {"selected", std::to_string(selected)},
        {"changed", std::to_string(changed)}, {"written", std::to_string(written)},
        {"preflightComplete", admitted},      {"writesComplete", admitted && changed == written}};
  }
  json::value directory(const std::string &path) {
    Statement query(
        *store.database,
        "SELECT observation FROM census_directories WHERE provider='tree' AND path=? AND state=2");
    query.text(1, path);
    json::value result;
    if (query.next())
      result = query.text(0);
    query.finish();
    return result;
  }
};
