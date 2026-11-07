// SPDX-License-Identifier: AGPL-3.0-only
// Compile bounded preservation selectors once. SQLite owns growing trie state
// under the same allocation/spill ledger as values; digests only narrow matches.
#pragma once
#include "value_index.hpp"

struct NfcPinIndex {
  Streams &streams;
  std::uint64_t scope, nextNode = 2;
  NfcPinIndex(Streams &owner, std::uint64_t eventScope, const json::array &pins)
      : streams(owner), scope(eventScope) {
    for (std::size_t ordinal = 0; ordinal < pins.size(); ++ordinal) {
      const auto &pointer = pins[ordinal].as_object().at("pointer").as_string();
      // The shared decoder owns its grammar. Reserve both decoded bytes and
      // segment-vector workspace before constructing its temporary result.
      MetadataCopyScope::charge(2 * pointer.size() + 2 * sizeof(std::string) *
          std::count(pointer.begin(), pointer.end(), '/'));
      auto parts = decodePointer(pointer);
      std::uint64_t node = 1;
      for (const auto &part : parts.segments) {
        auto digest = hash(part);
        auto selected = child(node, part, digest);
        if (!selected) {
          selected = nextNode++;
          streams.store.prepare(32768);
          Statement insert(*streams.store.database,
                           "INSERT INTO nfc_pin_nodes(scope,node,parent,digest,segment) VALUES(?,?,?,?,?)");
          insert.integer(1, scope);
          insert.integer(2, selected);
          insert.integer(3, node);
          insert.text(4, digest);
          insert.text(5, part);
          require(!insert.next(), "nfc-pin-node-insert");
          insert.finish();
        }
        node = selected;
      }
      streams.store.prepare(32768);
      Statement insert(*streams.store.database,
                       "INSERT INTO nfc_pin_targets(scope,node,ordinal) VALUES(?,?,?)");
      insert.integer(1, scope);
      insert.integer(2, node);
      insert.integer(3, ordinal);
      require(!insert.next(), "nfc-pin-target-insert");
      insert.finish();
    }
  }
  static std::string hash(const std::string &text) {
    Sha256 digest;
    digest.update(std::span(reinterpret_cast<const unsigned char *>(text.data()), text.size()));
    return indexDigest(Sha256::hex(digest.finish()));
  }
  std::uint64_t child(std::uint64_t parent, const std::string &segment, const std::string &digest) {
    Statement query(*streams.store.database,
                    "SELECT node FROM nfc_pin_nodes WHERE scope=? AND parent=? AND digest=? AND segment=?");
    query.integer(1, scope);
    query.integer(2, parent);
    query.text(3, digest);
    query.text(4, segment);
    auto node = query.next() ? query.integer(0) : 0;
    query.finish();
    return node;
  }
  std::uint64_t child(std::uint64_t parent, std::uint64_t ordinal) {
    auto segment = std::to_string(ordinal);
    return child(parent, segment, hash(segment));
  }
  std::uint64_t child(std::uint64_t parent, const Value &key) {
    std::uint64_t after = 0;
    while (true) {
      std::string segment;
      std::uint64_t node = 0;
      {
        Statement query(*streams.store.database,
                        "SELECT node,segment FROM nfc_pin_nodes WHERE scope=? AND parent=? AND digest=? AND node>? ORDER BY node LIMIT 1");
        query.integer(1, scope);
        query.integer(2, parent);
        query.text(3, indexDigest(key.digest));
        query.integer(4, after);
        if (query.next()) {
          node = query.integer(0);
          segment = query.text(1);
        }
        query.finish();
      }
      if (!node || streamEqualsText(streams, key.decoded, segment)) return node;
      after = node;
    }
  }
  // Return ordinal+1 so zero can represent exhaustion, including root pins.
  std::uint64_t next(std::uint64_t node, std::uint64_t after) {
    Statement query(*streams.store.database,
                    "SELECT ordinal FROM nfc_pin_targets WHERE scope=? AND node=? AND ordinal>=? ORDER BY ordinal LIMIT 1");
    query.integer(1, scope);
    query.integer(2, node);
    query.integer(3, after);
    auto ordinal = query.next() ? query.integer(0) + 1 : 0;
    query.finish();
    return ordinal;
  }
};
