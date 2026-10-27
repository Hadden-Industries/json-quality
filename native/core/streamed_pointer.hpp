// SPDX-License-Identifier: AGPL-3.0-only
// RFC 6901 framing over an identified pointer stream. Giant decoded segments
// belong to the same adaptive store; exact indexed selection is shared.
#pragma once
#include "unicode_normalization.hpp"
#include "value_index.hpp"
#include <array>

inline std::optional<Value> resolveStreamedPointer(Streams &streams, std::uint64_t root,
                                                   Stream pointer) {
  // Existing ICU-backed UTF-8 admission owns validity across fragment splits.
  points(streams, pointer, [](Point) {});
  std::optional<Value> value = valueDescriptor(streams, root);
  StreamReader input(streams, pointer);
  auto byte = input.get();
  if (byte < 0)
    return value;
  require(byte == '/', "pointer-contract");
  while (true) {
    auto part = streams.create();
    Sha256 hash;
    std::array<unsigned char, 65536> buffer{};
    std::size_t size = 0;
    std::uint64_t length = 0, ordinal = 0;
    bool validOrdinal = true, leadingZero = false;
    auto flush = [&]() {
      if (size && value) {
        auto view = std::span(buffer.data(), size);
        hash.update(view);
        streams.append(part, view);
      }
      size = 0;
      streams.store.checkCancellation();
    };
    while ((byte = input.get()) >= 0 && byte != '/') {
      if (byte == '~') {
        byte = input.get();
        require(byte == '0' || byte == '1', "pointer-escape");
        byte = byte == '0' ? '~' : '/';
      }
      if (!length)
        leadingZero = byte == '0';
      else if (leadingZero)
        validOrdinal = false;
      ++length;
      if (byte < '0' || byte > '9' ||
          ordinal > (std::uint64_t(INT64_MAX) - unsigned(byte - '0')) / 10)
        validOrdinal = false;
      else if (validOrdinal)
        ordinal = ordinal * 10 + unsigned(byte - '0');
      if (value)
        buffer[size++] = static_cast<unsigned char>(byte);
      if (size == buffer.size())
        flush();
    }
    flush();
    if (value)
      value = lookupPointerChild(
          streams, *value, indexDigest(Sha256::hex(hash.finish())),
          [&](Stream key) { return streams.equal(key, part); },
          validOrdinal && length ? std::optional<std::uint64_t>(ordinal) : std::nullopt);
    if (byte < 0)
      return value;
  }
}
