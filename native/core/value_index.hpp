// SPDX-License-Identifier: AGPL-3.0-only
// Shared value metadata and exact pointer lookup, independent of parser lifetime.
#pragma once
#include "index_digest.hpp"
#include "indexed_streams.hpp"
#include "json_pointer.hpp"
#include "sha256.hpp"
#include <boost/json.hpp>
#include <charconv>
#include <optional>
namespace json = boost::json;
struct Location {
  std::uint64_t line = 1, column = 1, endLine = 1, endColumn = 1;
};
struct Value {
  std::uint64_t id = 0, parent = 0, name = 0, ordinal = 0, record = 0;
  std::string kind, digest;
  Stream decoded, normalized;
  Stream raw;
  bool closed = true;
  Location location;
};
inline json::object valueEvent(const Value &value) {
  json::object result{
      {"type", "value"},
      {"id", std::to_string(value.id)},
      {"source", std::to_string(value.raw.id)},
      {"parent", std::to_string(value.parent)},
      {"name", std::to_string(value.name)},
      {"ordinal", std::to_string(value.ordinal)},
      {"kind", value.kind},
      {"byteLength", std::to_string(value.decoded.length)},
      {"sha256", value.digest.empty() ? json::value(nullptr) : json::value(value.digest)},
      {"closed", value.closed},
      {"rawByteLength", std::to_string(value.raw.length)},
      {"sourceByteOffset", std::to_string(value.raw.begin)},
      {"nfcAvailable", value.normalized.id != 0}};
  if (value.normalized.id)
    result["nfcByteLength"] = std::to_string(value.normalized.length);
  if (value.record)
    result["record"] = std::to_string(value.record);
  return result;
}
inline Value valueDescriptor(Streams &streams, std::uint64_t id) {
  Statement query(*streams.store.database,
                  "SELECT "
                  "id,parent,name,kind,decoded,normalized,length,digest,line,column_number,end_"
                  "line,end_column,ordinal,record,source,raw_begin,raw_length,closed,decoded_begin,"
                  "normalized_begin,normalized_length FROM values_index WHERE id=?");
  query.integer(1, id);
  require(query.next(), "unknown-value");
  Value value;
  value.id = query.integer(0);
  value.parent = query.integer(1);
  value.name = query.integer(2);
  value.kind = query.text(3);
  value.decoded = {query.integer(4), query.integer(6)};
  value.normalized = {query.integer(5), query.integer(20), query.integer(19)};
  value.decoded.begin = query.integer(18);
  value.digest = query.text(7);
  value.location = {query.integer(8), query.integer(9), query.integer(10), query.integer(11)};
  value.ordinal = query.integer(12);
  value.record = query.integer(13);
  value.raw = {query.integer(14), query.integer(16), query.integer(15)};
  value.closed = query.integer(17) != 0;
  query.finish();
  return value;
}
inline bool streamEqualsText(Streams &streams, Stream value, const std::string &text) {
  if (value.length != text.size())
    return false;
  for (std::uint64_t offset = 0; offset < value.length; offset += 65536) {
    auto bytes = streams.read(value, offset);
    if (!std::equal(bytes.begin(), bytes.end(),
                    reinterpret_cast<const unsigned char *>(text.data() + offset)))
      return false;
  }
  return true;
}
// Control pointers and streamed giant segments use the same exact indexed
// child selection, including full byte equality after every digest match.
template <class Matches>
inline std::optional<Value> lookupPointerChild(Streams &streams, const Value &value,
                                               const std::string &digest, const Matches &matches,
                                               std::optional<std::uint64_t> ordinal) {
  std::uint64_t selected = 0;
  if (value.kind == "object") {
    std::uint64_t before = INT64_MAX;
    while (true) {
      std::uint64_t key = 0;
      {
        Statement query(*streams.store.database,
                        "SELECT value FROM keys_index WHERE parent=? AND raw_digest=? AND "
                        "value<? ORDER BY value DESC LIMIT 1");
        query.integer(1, value.id);
        query.text(2, digest);
        query.integer(3, before);
        if (query.next())
          key = query.integer(0);
        query.finish();
      }
      if (!key)
        break;
      before = key;
      if (matches(valueDescriptor(streams, key).decoded)) {
        // RFC 6901 section 4 requires unique decoded names. A completed
        // negative fixture may retain duplicates, but its pointer is ambiguous.
        // https://www.rfc-editor.org/rfc/rfc6901.html#section-4
        require(selected == 0, "pointer-ambiguous");
        Statement query(
            *streams.store.database,
            "SELECT id FROM values_index WHERE parent=? AND name=? ORDER BY id DESC LIMIT 1");
        query.integer(1, value.id);
        query.integer(2, key);
        if (query.next())
          selected = query.integer(0);
        query.finish();
      }
    }
  } else if (value.kind == "array") {
    if (!ordinal)
      return {};
    Statement query(*streams.store.database,
                    "SELECT id FROM values_index WHERE parent=? AND ordinal=? AND kind!='key' "
                    "ORDER BY id DESC LIMIT 1");
    query.integer(1, value.id);
    query.integer(2, *ordinal);
    if (query.next())
      selected = query.integer(0);
    query.finish();
  } else
    return {};
  if (!selected)
    return {};
  return valueDescriptor(streams, selected);
}
inline std::optional<Value> resolveValuePointer(Streams &streams, std::uint64_t rootValue,
                                                const json::string &pointer) {
  auto decoded = decodePointer(pointer);
  if (!decoded.withinDepth)
    return {};
  Value value = valueDescriptor(streams, rootValue);
  for (const auto &part : decoded.segments) {
    Sha256 hash;
    hash.update(std::span(reinterpret_cast<const unsigned char *>(part.data()), part.size()));
    std::uint64_t index = 0;
    auto converted = std::from_chars(part.data(), part.data() + part.size(), index);
    std::optional<std::uint64_t> ordinal;
    if (!part.empty() && !(part.size() > 1 && part[0] == '0') && converted.ec == std::errc{} &&
        converted.ptr == part.data() + part.size() && index <= INT64_MAX)
      ordinal = index;
    auto selected = lookupPointerChild(
        streams, value, indexDigest(Sha256::hex(hash.finish())),
        [&](Stream key) { return streamEqualsText(streams, key, part); }, ordinal);
    if (!selected)
      return {};
    value = *selected;
  }
  return value;
}
