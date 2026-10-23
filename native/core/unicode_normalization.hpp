// SPDX-License-Identifier: AGPL-3.0-only
// Shared NFC orchestration over the adaptive stream store.
// ICU owns decomposition, class data and composition. Fixed point caches are part
// of the core's nonspillable reserve; payloads and derived queues use one store.
#pragma once
#include "indexed_streams.hpp"
#include <functional>
#include <memory>
#include <mutex>
#include <unicode/uchar.h>
#include <unicode/udata.h>
#include <unicode/unorm2.h>
#include <unicode/utf16.h>
#include <unicode/utf8.h>
using Point = UChar32;
using Emit = std::function<void(Point)>;
inline void initializeUnicode() {
  static std::once_flag once;
  std::call_once(once, [] {
    UErrorCode code = U_ZERO_ERROR;
    udata_setFileAccess(UDATA_NO_FILES, &code);
    require(U_SUCCESS(code), "icu-embedded-data-policy");
  });
}
inline bool ecmaTrim(Point point) {
  initializeUnicode();
  return u_charType(point) == U_SPACE_SEPARATOR || point == 9 || point == 11 || point == 12 ||
         point == 0xfeff || point == 10 || point == 13 || point == 0x2028 || point == 0x2029;
}
inline bool visitPoints(Streams &streams, Stream source, const std::function<bool(Point)> &visit) {
  StreamReader reader(streams, source);
  std::uint64_t observed = 0;
  while (true) {
    if ((observed++ & 4095) == 0)
      streams.store.checkCancellation();
    int lead = reader.get();
    if (lead < 0)
      break;
    unsigned char bytes[4] = {static_cast<unsigned char>(lead), 0, 0, 0};
    int needed = lead < 0x80                    ? 1
                 : lead >= 0xc2 && lead <= 0xdf ? 2
                 : lead >= 0xe0 && lead <= 0xef ? 3
                 : lead >= 0xf0 && lead <= 0xf4 ? 4
                                                : 0;
    require(needed > 0, "invalid-utf8");
    for (int i = 1; i < needed; ++i) {
      int next = reader.get();
      require(next >= 0, "truncated-utf8");
      bytes[i] = static_cast<unsigned char>(next);
    }
    int32_t at = 0;
    Point point;
    U8_NEXT(bytes, at, needed, point);
    require(point >= 0, "invalid-utf8");
    if (!visit(point))
      return false;
  }
  return true;
}
inline void points(Streams &streams, Stream source, const Emit &emit) {
  visitPoints(streams, source, [&](Point point) {
    emit(point);
    return true;
  });
}
struct PointQueue {
  Streams &streams;
  Stream backing;
  std::vector<Point> cache;
  static constexpr unsigned capacity = 1024;
  explicit PointQueue(Streams &s) : streams(s), backing(s.create()) {}
  void add(Point point) {
    cache.push_back(point);
    if (cache.size() == capacity)
      flush();
  }
  void flush() {
    if (cache.empty())
      return;
    streams.append(backing, std::span(reinterpret_cast<const unsigned char *>(cache.data()),
                                      cache.size() * sizeof(Point)));
    cache.clear();
  }
  void drain(const Emit &emit) {
    for (std::uint64_t offset = 0; offset < backing.length; offset += 65536) {
      auto bytes = streams.read(backing, offset);
      require(bytes.size() % sizeof(Point) == 0, "point-queue-boundary");
      for (std::size_t p = 0; p < bytes.size(); p += sizeof(Point)) {
        Point point;
        std::memcpy(&point, bytes.data() + p, sizeof(Point));
        emit(point);
      }
    }
    for (auto point : cache)
      emit(point);
    cache.clear();
    backing = streams.create();
  }
};
struct Normalizer {
  const UNormalizer2 *native = nullptr;
  Streams &streams;
  Emit emit;
  std::array<std::unique_ptr<PointQueue>, 256> buckets;
  std::array<bool, 256> active{};
  unsigned activeCount = 0;
  PointQueue tail;
  Point starter = -1;
  unsigned lastClass = 0;
  Normalizer(Streams &s, Emit e) : streams(s), emit(std::move(e)), tail(s) {

    initializeUnicode();
    UErrorCode code = U_ZERO_ERROR;
    native = unorm2_getNFCInstance(&code);
    require(U_SUCCESS(code), "icu-init");
  }
  void flushComposed() {
    if (starter >= 0) {
      emit(starter);
      starter = -1;
    }
    tail.drain(emit);
    lastClass = 0;
  }
  void ordered(Point point) {
    auto combiningClass = unorm2_getCombiningClass(native, point);
    if (starter < 0) {
      if (combiningClass == 0)
        starter = point;
      else
        emit(point);
      lastClass = combiningClass;
      return;
    }
    Point composite = -1;
    if (lastClass < combiningClass || lastClass == 0)
      composite = unorm2_composePair(native, starter, point);
    if (composite >= 0) {
      starter = composite;
      return;
    }
    if (combiningClass == 0) {
      flushComposed();
      starter = point;
    } else
      tail.add(point);
    lastClass = combiningClass;
  }
  void flushOrdered() {
    if (!activeCount)
      return;
    for (unsigned combiningClass = 1; combiningClass < 256; ++combiningClass)
      if (active[combiningClass]) {
        buckets[combiningClass]->drain([&](Point p) { ordered(p); });
        active[combiningClass] = false;
      }
    activeCount = 0;
  }
  void decomposed(Point point) {
    auto combiningClass = unorm2_getCombiningClass(native, point);
    if (combiningClass == 0) {
      flushOrdered();
      ordered(point);
      return;
    }
    if (!buckets[combiningClass])
      buckets[combiningClass] = std::make_unique<PointQueue>(streams);
    if (!active[combiningClass]) {
      active[combiningClass] = true;
      ++activeCount;
    }
    buckets[combiningClass]->add(point);
  }
  void add(Point point) {

    std::array<UChar, 32> mapping;
    UErrorCode code = U_ZERO_ERROR;
    int32_t size = unorm2_getDecomposition(native, point, mapping.data(),
                                           static_cast<int32_t>(mapping.size()), &code);
    if (code == U_BUFFER_OVERFLOW_ERROR) {
      require(size <= 32768, "icu-mapping-reserve");
      std::vector<UChar> extended(size);
      code = U_ZERO_ERROR;
      size = unorm2_getDecomposition(native, point, extended.data(), size, &code);
      require(U_SUCCESS(code), "icu-decomposition");
      for (int32_t at = 0; at < size;) {
        Point p;
        U16_NEXT(extended.data(), at, size, p);
        decomposed(p);
      }
    } else {
      require(U_SUCCESS(code), "icu-decomposition");
      if (size < 0)
        decomposed(point);
      else
        for (int32_t at = 0; at < size;) {
          Point p;
          U16_NEXT(mapping.data(), at, size, p);
          decomposed(p);
        }
    }
  }
  void finish() {
    flushOrdered();
    flushComposed();
  }
};
inline Stream normalize(Streams &streams, Stream input, const Emit &inspect = {}) {
  Stream output = streams.create();
  Bytes fragment;
  fragment.reserve(static_cast<std::size_t>((std::min)(input.length + 32, std::uint64_t(65536))));
  StreamReader original(streams, input);
  bool identical = true;
  std::uint64_t matchedPrefix = 0;
  auto copyPrefix = [&]() {
    for (std::uint64_t offset = 0; offset < matchedPrefix; offset += 65536) {
      auto bytes = streams.read(
          input, offset,
          static_cast<std::size_t>((std::min)(matchedPrefix - offset, std::uint64_t(65536))));
      streams.append(output, bytes);
    }
  };
  auto flush = [&]() {
    if (fragment.empty())
      return;
    if (identical) {
      for (auto byte : fragment)
        if (original.get() != byte) {
          identical = false;
          break;
        }
      if (identical) {
        matchedPrefix += fragment.size();
        fragment.clear();
        return;
      }
      copyPrefix();
    }
    streams.append(output, fragment);
    fragment.clear();
  };
  Normalizer normalizer(streams, [&](Point point) {
    unsigned char bytes[4];
    int32_t count = 0;
    U8_APPEND_UNSAFE(bytes, count, point);
    if (fragment.size() + count > 65536)
      flush();
    fragment.insert(fragment.end(), bytes, bytes + count);
  });
  points(streams, input, [&](Point point) {
    if (inspect)
      inspect(point);
    normalizer.add(point);
  });
  normalizer.finish();
  flush();
  if (identical) {
    if (original.get() < 0)
      return input;
    copyPrefix();
  }
  return output;
}
