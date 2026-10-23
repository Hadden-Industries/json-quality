// SPDX-License-Identifier: AGPL-3.0-only
// Reconcile independently enumerated memberships with frozen, fully delivered
// source checks. Discovery and archive-domain validation remain adapter-owned.
#pragma once
#include "indexed_streams.hpp"
#include <boost/json.hpp>
#include <unicode/ucasemap.h>

namespace json = boost::json;

// Repository identities are literal relative UTF-8 paths. ICU owns root-locale
// lowercasing, preserving the existing case-collision policy across platforms.
inline std::string censusPath(const json::value &input, const ResourcePolicy &resources) {
  require(input.is_string(), "census-path-contract");
  std::string path(input.as_string());
  require(!path.empty() && path.size() <= 65536 && path.front() != '/', "census-path-contract");
  std::size_t start = 0;
  std::uint64_t characters = 0;
  for (std::size_t i = 0; i <= path.size(); ++i) {
    if (i < path.size() && (static_cast<unsigned char>(path[i]) & 0xc0) != 0x80)
      require(++characters <= resources.get(ResourcePolicy::Admission::maxRequestPathCharacters),
              "request-path-capacity");
    if (i == path.size() || path[i] == '/') {
      auto length = i - start;
      require(length > 0 && !(length == 1 && path[start] == '.') &&
                  !(length == 2 && path[start] == '.' && path[start + 1] == '.'),
              "census-path-contract");
      start = i + 1;
    } else {
      auto byte = static_cast<unsigned char>(path[i]);
      require(byte >= 32 && byte != 127 && byte != '\\' && byte != ':', "census-path-contract");
    }
  }
  return path;
}

inline std::string lowercaseCensusPath(const std::string &path) {
  UErrorCode code = U_ZERO_ERROR;
  std::unique_ptr<UCaseMap, decltype(&ucasemap_close)> mapper(ucasemap_open("", 0, &code),
                                                              &ucasemap_close);
  require(U_SUCCESS(code) && bool(mapper), "census-path-unicode");
  auto length = ucasemap_utf8ToLower(mapper.get(), nullptr, 0, path.data(),
                                     static_cast<int32_t>(path.size()), &code);
  require(code == U_BUFFER_OVERFLOW_ERROR || U_SUCCESS(code), "census-path-unicode");
  require(length >= 0 && length <= 65536, "census-path-capacity");
  std::string folded(static_cast<std::size_t>(length), '\0');
  code = U_ZERO_ERROR;
  ucasemap_utf8ToLower(mapper.get(), folded.data(), length, path.data(),
                       static_cast<int32_t>(path.size()), &code);
  require(U_SUCCESS(code), "census-path-unicode");
  return folded;
}

// All growing membership, sighting and provider state belongs to Store's SQLite
// allocation ledger and backup transition. Requests and replies remain bounded.
struct SourceCensus {
  Store &store;
  const ResourcePolicy &resources;
  std::uint64_t files = 0, logical = 0;
  SourceCensus(Store &owner, const ResourcePolicy &policy) : store(owner), resources(policy) {
    store.prepare(131072);
    store.database->execute(R"SQL(
CREATE TABLE census_providers(id TEXT PRIMARY KEY,kind TEXT,minimum INTEGER,inventory_closed INTEGER,delivery_closed INTEGER,observation TEXT);
CREATE TABLE census_members(path TEXT PRIMARY KEY,folded TEXT UNIQUE,kind TEXT,provider TEXT,sha TEXT,length INTEGER,parent_source INTEGER,parent_value INTEGER,encoding TEXT,observation TEXT,origin_source INTEGER,origin_kind TEXT,origin_member TEXT,source INTEGER UNIQUE);
CREATE TABLE census_sightings(provider TEXT,path TEXT,PRIMARY KEY(provider,path));
CREATE TABLE census_directories(provider TEXT,path TEXT,state INTEGER,observation TEXT,PRIMARY KEY(provider,path));
CREATE INDEX census_directory_pending ON census_directories(provider,state,path);
CREATE TABLE census_authorities(path TEXT PRIMARY KEY,folded TEXT UNIQUE,source INTEGER UNIQUE,observation TEXT);
CREATE TABLE census_authority_providers(provider TEXT,path TEXT,PRIMARY KEY(provider,path));)SQL");
    store.observe();
  }

  struct Provider {
    std::string kind;
    std::uint64_t minimum = 0;
    bool inventoryClosed = false, deliveryClosed = false;
    std::string observation;
  };
  Provider provider(const std::string &id) {
    Statement query(
        *store.database,
        "SELECT kind,minimum,inventory_closed,delivery_closed,observation FROM census_providers "
        "WHERE id=?");
    query.text(1, id);
    require(query.next(), "census-provider-unknown");
    Provider result{query.text(0), query.integer(1), query.integer(2) != 0, query.integer(3) != 0,
                    query.text(4)};
    query.finish();
    return result;
  }

  // Provider registration precedes inventory and delivery. The independent
  // iterator's end closes only inventory; actual checked members close delivery.
  void addProvider(const json::object &request) {
    std::string id(request.at("id").as_string()), kind(request.at("kind").as_string());
    require(!id.empty() && id.size() <= 128 &&
                id.find_first_not_of(
                    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_.") ==
                    std::string::npos,
            "census-provider-contract");
    require(kind == "physical" || kind == "logical" || kind == "native", "census-provider-kind");
    auto minimum = exactInteger(request.at("minimum"));
    store.prepare(32768);
    Statement query(*store.database, "SELECT 1 FROM census_providers WHERE id=?");
    query.text(1, id);
    require(!query.next(), "census-provider-duplicate");
    query.finish();
    Statement insert(
        *store.database,
        "INSERT INTO census_providers(id,kind,minimum,inventory_closed,delivery_closed) "
        "VALUES(?,?,?,0,0)");
    insert.text(1, id);
    insert.text(2, kind);
    insert.integer(3, minimum);
    require(!insert.next(), "census-provider-insert");
    insert.finish();
  }

  // Binary provenance is frozen independently of checked JSON membership.
  // Sharing an authority requires an explicit association for each provider.
  json::value authority(const std::string &path, bool after = false) {
    std::string sql = "SELECT a.source,c.sha,c.length,a.observation,a.path FROM census_authorities "
                      "a JOIN source_captures c USING(source) ";
    sql += after ? "WHERE a.path>? ORDER BY a.path LIMIT 1" : "WHERE a.path=?";
    Statement query(*store.database, sql.c_str());
    query.text(1, path);
    json::value result;
    if (query.next())
      result = json::object{{"path", query.text(4)},
                            {"source", std::to_string(query.integer(0))},
                            {"sha256", query.text(1)},
                            {"byteLength", std::to_string(query.integer(2))},
                            {"observation", query.text(3)}};
    query.finish();
    return result;
  }
  json::value addAuthority(const json::object &request) {
    std::string id(request.at("provider").as_string());
    auto selected = provider(id);
    require(selected.kind == "native" && !selected.inventoryClosed, "census-authority-provider");
    auto path = censusPath(request.at("path"), resources), folded = lowercaseCensusPath(path);
    auto source = exactInteger(request.at("source"));
    const auto &identity = request.at("identity").as_object();
    auto length = exactInteger(identity.at("byteLength"));
    std::string sha(identity.at("sha256").as_string());
    std::string observation;
    if (auto item = request.if_contains("observation"))
      observation = std::string(item->as_string());
    store.prepare(131072);
    {
      Statement captured(*store.database,
                         "SELECT kind,sha,length FROM source_captures WHERE source=?");
      captured.integer(1, source);
      require(captured.next() && captured.text(0) == "authority" && captured.text(1) == sha &&
                  captured.integer(2) == length,
              "census-authority-identity");
      captured.finish();
    }
    bool exists;
    {
      Statement prior(*store.database,
                      "SELECT path,source,observation FROM census_authorities WHERE folded=?");
      prior.text(1, folded);
      exists = prior.next();
      if (exists)
        require(prior.text(0) == path && prior.integer(1) == source &&
                    (observation.empty() || prior.text(2) == observation),
                "census-authority-conflict");
      prior.finish();
    }
    {
      Statement prior(*store.database,
                      "SELECT 1 FROM census_authority_providers WHERE provider=? AND path=?");
      prior.text(1, id);
      prior.text(2, path);
      require(!prior.next(), "census-authority-duplicate");
      prior.finish();
    }
    if (!exists) {
      Statement insert(
          *store.database,
          "INSERT INTO census_authorities(path,folded,source,observation) VALUES(?,?,?,?)");
      insert.text(1, path);
      insert.text(2, folded);
      insert.integer(3, source);
      insert.text(4, observation);
      require(!insert.next(), "census-authority-insert");
      insert.finish();
    }
    Statement insert(*store.database,
                     "INSERT INTO census_authority_providers(provider,path) VALUES(?,?)");
    insert.text(1, id);
    insert.text(2, path);
    require(!insert.next(), "census-authority-provider-insert");
    insert.finish();
    return authority(path);
  }

  // A path can have independent physical sightings. Every individual provider
  // must enumerate it once; derived/native identities have exactly one owner.
  void add(const json::object &request) {
    std::string id(request.at("provider").as_string());
    auto selected = provider(id);
    require(!selected.inventoryClosed, "census-inventory-closed");
    auto path = censusPath(request.at("path"), resources), folded = lowercaseCensusPath(path);
    std::string sha, encoding, observation;
    if (auto item = request.if_contains("observation")) {
      require(item->is_string() && item->as_string().size() <= 65536,
              "census-observation-contract");
      observation = std::string(item->as_string());
    }
    std::uint64_t length = 0, parentSource = 0, parentValue = 0, originSource = 0;
    std::string originKind, originMember;
    if (auto identity = request.if_contains("identity")) {
      const auto &object = identity->as_object();
      sha = std::string(object.at("sha256").as_string());
      require(object.size() == 2 && sha.size() == 64 &&
                  sha.find_first_not_of("0123456789abcdef") == std::string::npos,
              "census-member-identity");
      length = exactInteger(object.at("byteLength"));
      require(length <= resources.get(ResourcePolicy::Admission::maxFileBytes),
              "source-byte-capacity");
    }
    require(selected.kind == "physical" || !sha.empty(), "census-member-identity");
    if (selected.kind == "native") {
      const auto &origin = request.at("origin").as_object();
      originSource = exactInteger(origin.at("source"));
      originKind = std::string(origin.at("kind").as_string());
      require(originKind == "archive-member" || originKind == "content-addressed",
              "census-native-origin");
      Statement authority(*store.database,
                          "SELECT a.path,c.sha,c.length FROM census_authorities a JOIN "
                          "census_authority_providers p USING(path) "
                          "JOIN source_captures c USING(source) WHERE a.source=? AND p.provider=?");
      authority.integer(1, originSource);
      authority.text(2, id);
      require(authority.next(), "census-native-authority-missing");
      require(censusPath(origin.at("path"), resources) == authority.text(0) &&
                  origin.at("sha256").as_string() == authority.text(1) &&
                  exactInteger(origin.at("byteLength")) == authority.integer(2),
              "census-native-origin-identity");
      if (originKind == "archive-member") {
        originMember = censusPath(origin.at("memberPath"), resources);
        require(path == authority.text(0) + "!/" + originMember, "census-native-member-path");
      } else {
        require(path == authority.text(0) && sha == authority.text(1) &&
                    length == authority.integer(2),
                "census-content-addressed-identity");
      }
      authority.finish();
    }
    if (selected.kind == "logical") {
      parentSource = exactInteger(request.at("containerSource"));
      parentValue = exactInteger(request.at("value"));
      encoding = std::string(request.at("encoding").as_string());
      require(parentSource && parentValue && (encoding == "utf8" || encoding == "base64"),
              "census-logical-linkage");
    }
    store.prepare(262144);
    {
      Statement sighting(*store.database,
                         "SELECT 1 FROM census_sightings WHERE provider=? AND path=?");
      sighting.text(1, id);
      sighting.text(2, path);
      require(!sighting.next(), "census-member-duplicate");
      sighting.finish();
    }
    bool exists = false;
    std::uint64_t boundSource = 0;
    {
      Statement prior(*store.database, "SELECT path,kind,provider,sha,length,source,observation "
                                       "FROM census_members WHERE folded=?");
      prior.text(1, folded);
      if ((exists = prior.next())) {
        require(prior.text(0) == path, "census-case-collision");
        require(prior.text(1) == "physical" && selected.kind == "physical",
                "census-member-duplicate");
        require(sha.empty() || prior.text(3).empty() ||
                    (prior.text(3) == sha && prior.integer(4) == length),
                "census-member-identity");
        boundSource = prior.integer(5);
        require(observation.empty() || prior.text(6).empty() || prior.text(6) == observation,
                "census-source-observation-changed");
      }
      prior.finish();
    }
    if (boundSource && !sha.empty()) {
      Statement capture(*store.database, "SELECT sha,length FROM source_captures WHERE source=?");
      capture.integer(1, boundSource);
      require(capture.next() && capture.text(0) == sha && capture.integer(1) == length,
              "census-member-source-mismatch");
      capture.finish();
    }
    if (!exists) {
      if (selected.kind != "logical")
        require(files < resources.get(ResourcePolicy::Admission::maxFiles), "census-file-capacity");
      if (selected.kind != "physical")
        require(logical < resources.get(ResourcePolicy::Admission::maxLogicalDocuments),
                "census-logical-capacity");
      Statement insert(*store.database,
                       "INSERT INTO census_members(path,folded,kind,provider,sha,length,"
                       "parent_source,parent_value,encoding,observation,origin_source,origin_kind,"
                       "origin_member) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)");
      insert.text(1, path);
      insert.text(2, folded);
      insert.text(3, selected.kind);
      insert.text(4, id);
      insert.text(5, sha);
      insert.integer(6, length);
      insert.integer(7, parentSource);
      insert.integer(8, parentValue);
      insert.text(9, encoding);
      insert.text(10, observation);
      insert.integer(11, originSource);
      insert.text(12, originKind);
      insert.text(13, originMember);
      require(!insert.next(), "census-member-insert");
      insert.finish();
      files += selected.kind != "logical";
      logical += selected.kind != "physical";
    } else if (!sha.empty()) {
      Statement update(*store.database, "UPDATE census_members SET sha=?,length=? WHERE path=?");
      update.text(1, sha);
      update.integer(2, length);
      update.text(3, path);
      require(!update.next(), "census-member-update");
      update.finish();
    }
    if (exists && !observation.empty()) {
      Statement update(*store.database, "UPDATE census_members SET observation=? WHERE path=?");
      update.text(1, observation);
      update.text(2, path);
      require(!update.next(), "census-observation-update");
      update.finish();
    }
    Statement insert(*store.database, "INSERT INTO census_sightings(provider,path) VALUES(?,?)");
    insert.text(1, id);
    insert.text(2, path);
    require(!insert.next(), "census-sighting-insert");
    insert.finish();
    store.observe();
  }

  // Binding consumes an already-delivered native terminal, never an adapter's
  // success assertion. Negative syntax/quality evidence still counts as checked.
  void bind(const json::object &request) {
    auto path = censusPath(request.at("path"), resources);
    auto source = exactInteger(request.at("source"));
    store.prepare(32768);
    std::string kind, sha, encoding;
    std::uint64_t length = 0, parentSource = 0, parentValue = 0;
    {
      Statement member(*store.database,
                       "SELECT kind,sha,length,parent_source,parent_value,encoding,source "
                       "FROM census_members WHERE path=?");
      member.text(1, path);
      require(member.next(), "census-member-unexpected");
      require(member.integer(6) == 0, "census-member-duplicate");
      kind = member.text(0);
      sha = member.text(1);
      length = member.integer(2);
      parentSource = member.integer(3);
      parentValue = member.integer(4);
      encoding = member.text(5);
      member.finish();
    }
    {
      Statement capture(
          *store.database,
          "SELECT c.kind,c.sha,c.length,c.parent_source,c.parent_value,c.encoding "
          "FROM source_captures c JOIN source_closures s USING(source) WHERE c.source=?");
      capture.integer(1, source);
      require(capture.next(), "census-source-incomplete");
      require(capture.text(0) == kind &&
                  (sha.empty() || (capture.text(1) == sha && capture.integer(2) == length)),
              "census-member-source-mismatch");
      if (kind == "logical")
        require(capture.integer(3) == parentSource && capture.integer(4) == parentValue &&
                    capture.text(5) == encoding,
                "census-logical-linkage");
      capture.finish();
    }
    {
      Statement prior(*store.database, "SELECT 1 FROM census_members WHERE source=?");
      prior.integer(1, source);
      require(!prior.next(), "census-source-duplicate");
      prior.finish();
    }
    Statement update(*store.database, "UPDATE census_members SET source=? WHERE path=?");
    update.integer(1, source);
    update.text(2, path);
    require(!update.next(), "census-source-bind");
    update.finish();
  }

  void closeProvider(const std::string &id, bool inventoryOnly,
                     const std::string &observation = {}) {
    auto selected = provider(id);
    require(inventoryOnly ? !selected.inventoryClosed
                          : selected.inventoryClosed && !selected.deliveryClosed,
            "census-provider-state");
    if (inventoryOnly) {
      Statement pending(*store.database,
                        "SELECT 1 FROM census_directories WHERE provider=? AND state<>2 LIMIT 1");
      pending.text(1, id);
      require(!pending.next(), "census-directory-incomplete");
      pending.finish();
    }
    if (!inventoryOnly) {
      Statement query(*store.database,
                      "SELECT count(*),sum(m.source IS NULL) FROM census_sightings s JOIN "
                      "census_members m USING(path) WHERE s.provider=?");
      query.text(1, id);
      require(query.next(), "census-provider-count");
      require(query.integer(0) >= selected.minimum, "census-provider-minimum");
      require(query.integer(1) == 0, "census-member-missing");
      query.finish();
      if (selected.kind == "native") {
        Statement authorities(*store.database,
                              "SELECT 1 FROM census_authority_providers WHERE provider=? LIMIT 1");
        authorities.text(1, id);
        require(authorities.next(), "census-native-authority-missing");
        authorities.finish();
      }
    }
    store.prepare(32768);
    Statement update(*store.database,
                     inventoryOnly
                         ? "UPDATE census_providers SET inventory_closed=1,observation=? WHERE id=?"
                         : "UPDATE census_providers SET delivery_closed=1 WHERE id=?");
    if (inventoryOnly)
      update.text(1, observation);
    update.text(inventoryOnly ? 2 : 1, id);
    require(!update.next(), "census-provider-close");
    update.finish();
  }

  // The filesystem owner opens only the returned directory and explicitly
  // acknowledges its completed read. An interrupted lease prevents closure.
  json::value directory(const json::object &request, const std::string &command) {
    std::string id(request.at("provider").as_string());
    auto selected = provider(id);
    require(selected.kind == "physical" && !selected.inventoryClosed, "census-directory-state");
    std::string path;
    if (command != "census-take-directory") {
      const auto &item = request.at("path");
      require(item.is_string(), "census-path-contract");
      path = item.as_string().empty() ? "" : censusPath(item, resources);
    }
    store.prepare(131072);
    if (command == "census-enqueue-directory") {
      Statement prior(*store.database,
                      "SELECT 1 FROM census_directories WHERE provider=? AND path=?");
      prior.text(1, id);
      prior.text(2, path);
      require(!prior.next(), "census-directory-duplicate");
      prior.finish();
      Statement insert(*store.database,
                       "INSERT INTO census_directories(provider,path,state) VALUES(?,?,0)");
      insert.text(1, id);
      insert.text(2, path);
      require(!insert.next(), "census-directory-insert");
      insert.finish();
      return nullptr;
    }
    if (command == "census-take-directory") {
      {
        Statement active(*store.database,
                         "SELECT 1 FROM census_directories WHERE provider=? AND state=1 LIMIT 1");
        active.text(1, id);
        require(!active.next(), "census-directory-lease-open");
        active.finish();
      }
      Statement next(*store.database,
                     "SELECT path FROM census_directories WHERE provider=? AND state=0 "
                     "ORDER BY path LIMIT 1");
      next.text(1, id);
      if (!next.next()) {
        next.finish();
        return nullptr;
      }
      path = next.text(0);
      next.finish();
    } else {
      Statement active(*store.database,
                       "SELECT state FROM census_directories WHERE provider=? AND path=?");
      active.text(1, id);
      active.text(2, path);
      require(active.next() && active.integer(0) == 1, "census-directory-lease-unknown");
      active.finish();
    }
    std::string observation;
    if (auto item = request.if_contains("observation"))
      observation = std::string(item->as_string());
    Statement update(
        *store.database,
        "UPDATE census_directories SET state=?,observation=? WHERE provider=? AND path=?");
    update.integer(1, command == "census-take-directory" ? 1 : 2);
    update.text(2, observation);
    update.text(3, id);
    update.text(4, path);
    require(!update.next(), "census-directory-update");
    update.finish();
    return json::value(path);
  }

  // Replay bounded closed-directory observations for the filesystem owner's
  // final freshness check; no open statement survives a backing transition.
  json::value nextDirectory(const json::object &request) {
    const auto &after = request.at("after");
    require(after.is_null() || after.is_string(), "census-directory-cursor");
    Statement query(*store.database,
                    "SELECT path,observation FROM census_directories WHERE provider=? AND state=2 "
                    "AND (?=1 OR path>?) ORDER BY path LIMIT 1");
    query.text(1, std::string(request.at("provider").as_string()));
    query.integer(2, after.is_null());
    query.text(3, after.is_null() ? "" : std::string(after.as_string()));
    json::value result;
    if (query.next())
      result = json::object{{"path", query.text(0)}, {"observation", query.text(1)}};
    query.finish();
    return result;
  }

  json::object status() {
    std::uint64_t members = 0, missing = 0, qualityFailures = 0, contractFailures = 0;
    {
      Statement query(
          *store.database,
          "SELECT count(*),sum(m.source IS NULL),sum(s.quality=0),"
          "sum(s.contract_satisfied=0) FROM census_members m LEFT JOIN source_closures s "
          "USING(source)");
      require(query.next(), "census-count");
      members = query.integer(0);
      missing = query.integer(1);
      qualityFailures = query.integer(2);
      contractFailures = query.integer(3);
      query.finish();
    }
    Statement providers(*store.database,
                        "SELECT count(*),sum(delivery_closed=0) FROM census_providers");
    require(providers.next(), "census-provider-count");
    bool complete =
        members > 0 && missing == 0 && providers.integer(0) > 0 && providers.integer(1) == 0;
    providers.finish();
    return {{"type", "census-status"},
            {"complete", complete},
            {"members", std::to_string(members)},
            {"missing", std::to_string(missing)},
            {"qualityPassed", complete && qualityFailures == 0},
            {"contractSatisfied", complete && contractFailures == 0}};
  }

  // Keyset iteration is deterministic and retains neither an open statement nor
  // a growing result array between requests or backing transitions.
  json::value next(const std::string &after, bool exact = false) {
    std::string sql =
        "SELECT "
        "m.path,m.kind,m.provider,m.source,COALESCE(c.sha,m.sha),COALESCE(c.length,m.length),m."
        "observation,m.origin_source,m.origin_"
        "kind,m.origin_member,m.parent_source,m.parent_value,m.encoding FROM census_members m LEFT "
        "JOIN source_captures c USING(source) ";
    sql += exact ? "WHERE m.path=?" : "WHERE m.path>? ORDER BY m.path LIMIT 1";
    Statement query(*store.database, sql.c_str());
    query.text(1, after);
    json::value result;
    if (query.next()) {
      result = json::object{
          {"path", query.text(0)},       {"kind", query.text(1)},
          {"provider", query.text(2)},   {"source", std::to_string(query.integer(3))},
          {"sha256", query.text(4)},     {"byteLength", std::to_string(query.integer(5))},
          {"observation", query.text(6)}};
      if (query.integer(7))
        result.as_object()["origin"] = json::object{{"source", std::to_string(query.integer(7))},
                                                    {"kind", query.text(8)},
                                                    {"memberPath", query.text(9)}};
      if (query.integer(10))
        result.as_object()["linkage"] =
            json::object{{"containerSource", std::to_string(query.integer(10))},
                         {"value", std::to_string(query.integer(11))},
                         {"encoding", query.text(12)}};
    }
    query.finish();
    return result;
  }
};
