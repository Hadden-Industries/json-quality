// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "value_index.hpp"

// A path retains bounded ancestry IDs, never a whole decoded member name.
// Derived pointer bytes share the adaptive store and are cached by value ID.
struct PathPart {
  std::uint64_t key = 0, ordinal = 0;
};
inline Value pathNode(Streams &streams, std::uint64_t id) {
  Statement query(*streams.store.database,
                  "SELECT parent,name,ordinal,kind FROM values_index WHERE id=? UNION ALL "
                  "SELECT parent,name,ordinal,kind FROM paths_index WHERE id=? LIMIT 1");
  query.integer(1, id);
  query.integer(2, id);
  require(query.next(), "value-path-unavailable");
  Value value;
  value.id = id;
  value.parent = query.integer(0);
  value.name = query.integer(1);
  value.ordinal = query.integer(2);
  value.kind = query.text(3);
  query.finish();
  return value;
}
inline std::vector<PathPart> valuePath(Streams &streams, Value value) {
  std::vector<PathPart> parts;
  while (value.parent) {
    require(parts.size() < 4096, "value-path-depth");
    auto parent = pathNode(streams, value.parent);
    parts.push_back({parent.kind == "array" ? 0
                     : value.kind == "key"  ? value.id
                                            : value.name,
                     value.ordinal});
    require(parent.kind == "array" || parts.back().key, "value-path-key");
    value = std::move(parent);
  }
  std::reverse(parts.begin(), parts.end());
  return parts;
}
inline Stream pathKey(Streams &streams, std::uint64_t id) {
  Statement query(*streams.store.database,
                  "SELECT decoded,length,decoded_begin FROM keys_index WHERE value=?");
  query.integer(1, id);
  require(query.next(), "value-path-key-unavailable");
  Stream result{query.integer(0), query.integer(1), query.integer(2)};
  query.finish();
  return result;
}
inline std::optional<Stream> cachedPointer(Streams &streams, std::uint64_t id) {
  Statement query(*streams.store.database, "SELECT stream,length FROM pointer_index WHERE value=?");
  query.integer(1, id);
  std::optional<Stream> result;
  if (query.next())
    result = Stream{query.integer(0), query.integer(1)};
  query.finish();
  return result;
}
inline std::uint64_t pointerLength(Streams &streams, const Value &value) {
  if (auto cached = cachedPointer(streams, value.id))
    return cached->length;
  std::uint64_t length = 0;
  const auto add = [&](std::uint64_t count) {
    require(count <= INT64_MAX - length, "value-path-capacity");
    length += count;
  };
  for (const auto &part : valuePath(streams, value)) {
    add(1);
    if (!part.key)
      add(std::to_string(part.ordinal).size());
    else {
      auto key = pathKey(streams, part.key);
      add(key.length);
      for (std::uint64_t offset = 0; offset < key.length; offset += 65536)
        for (auto byte : streams.read(key, offset))
          if (byte == '~' || byte == '/')
            add(1);
    }
  }
  return length;
}
inline Stream valuePointer(Streams &streams, const Value &value) {
  if (auto cached = cachedPointer(streams, value.id))
    return *cached;
  Stream result = streams.create();
  Bytes output;
  output.reserve(65536);
  const auto emit = [&](unsigned char byte) {
    output.push_back(byte);
    if (output.size() == 65536) {
      streams.append(result, output);
      output.clear();
    }
  };
  for (const auto &part : valuePath(streams, value)) {
    emit('/');
    if (!part.key)
      for (auto byte : std::to_string(part.ordinal))
        emit(static_cast<unsigned char>(byte));
    else {
      auto key = pathKey(streams, part.key);
      for (std::uint64_t offset = 0; offset < key.length; offset += 65536)
        for (auto byte : streams.read(key, offset)) {
          if (byte == '~' || byte == '/') {
            emit('~');
            emit(byte == '~' ? '0' : '1');
          } else
            emit(byte);
        }
    }
  }
  if (!output.empty())
    streams.append(result, output);
  streams.store.prepare(32768);
  Statement insert(*streams.store.database,
                   "INSERT INTO pointer_index(value,stream,length) VALUES(?,?,?)");
  insert.integer(1, value.id);
  insert.integer(2, result.id);
  insert.integer(3, result.length);
  require(!insert.next(), "value-pointer-insert");
  insert.finish();
  return result;
}
