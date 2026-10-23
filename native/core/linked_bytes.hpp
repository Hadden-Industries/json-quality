// SPDX-License-Identifier: AGPL-3.0-only
#pragma once
#include "indexed_streams.hpp"

// Canonical RFC 4648 base64 only: no whitespace, omitted padding, surplus
// padding or nonzero unused bits. The residual codec keeps four input bytes
// and one output fragment, independently of the linked document's size.
template <typename Emit>
void linkedBytes(Streams &streams, Stream encoded, bool base64, const Emit &emit) {
  if (!base64) {
    for (std::uint64_t offset = 0; offset < encoded.length; offset += 65536)
      emit(streams.read(encoded, offset));
    return;
  }
  require(encoded.length % 4 == 0, "linked-base64-framing");
  StreamReader input(streams, encoded);
  Bytes output;
  output.reserve(65536);
  const auto digit = [](int byte) -> unsigned {
    if (byte >= 'A' && byte <= 'Z')
      return static_cast<unsigned>(byte - 'A');
    if (byte >= 'a' && byte <= 'z')
      return static_cast<unsigned>(byte - 'a' + 26);
    if (byte >= '0' && byte <= '9')
      return static_cast<unsigned>(byte - '0' + 52);
    if (byte == '+')
      return 62;
    if (byte == '/')
      return 63;
    throw Fault("linked-base64-alphabet");
  };
  for (std::uint64_t offset = 0; offset < encoded.length; offset += 4) {
    if ((offset & 65535) == 0)
      streams.store.checkCancellation();
    int a = input.get(), b = input.get(), c = input.get(), d = input.get();
    auto first = digit(a), second = digit(b);
    output.push_back(static_cast<unsigned char>((first << 2) | (second >> 4)));
    if (c == '=') {
      require(d == '=' && offset + 4 == encoded.length && (second & 15) == 0,
              "linked-base64-padding");
    } else {
      auto third = digit(c);
      output.push_back(static_cast<unsigned char>((second << 4) | (third >> 2)));
      if (d == '=')
        require(offset + 4 == encoded.length && (third & 3) == 0, "linked-base64-padding");
      else
        output.push_back(static_cast<unsigned char>((third << 6) | digit(d)));
    }
    if (output.size() >= 65532) {
      emit(output);
      output.clear();
    }
  }
  if (!output.empty())
    emit(output);
}
