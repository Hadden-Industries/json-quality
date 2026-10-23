// SPDX-License-Identifier: AGPL-3.0-only
// Per-session SQLite allocation ownership around its maintained allocator.
// Headers carry the original owner across worker changes and delayed frees.
// Requested allocator bytes are managed; OS heap overhead is measured as RSS.
#pragma once
#include <atomic>
#include <climits>
#include <cstddef>
#include <cstdint>
#include <mutex>
#include <new>
#include <sqlite3.h>
#include <stdexcept>
struct SqliteMemoryOwner {
  std::atomic<std::uint64_t> references{1}, bytes{0}, peak{0}, fixed{0}, external{0},
      managedPeak{0};
  std::uint64_t limit;
  bool permanent = false;
  explicit SqliteMemoryOwner(std::uint64_t capacity, bool persistent = false)
      : limit(capacity), permanent(persistent) {}
  void retain() noexcept {
    if (!permanent)
      references.fetch_add(1);
  }
  void release() noexcept {
    if (!permanent && references.fetch_sub(1) == 1)
      delete this;
  }
  bool acquire(std::uint64_t count) noexcept {
    auto current = bytes.load();
    while (true) {
      auto reserved = fixed.load() + external.load();
      if (reserved > limit || current > limit - reserved || count > limit - reserved - current)
        return false;
      if (bytes.compare_exchange_weak(current, current + count))
        break;
    }
    auto observed = peak.load();
    while (observed < current + count && !peak.compare_exchange_weak(observed, current + count)) {
    }
    observe();
    return true;
  }
  bool acquireExternal(std::uint64_t count) noexcept {
    auto current = external.load();
    while (true) {
      auto reserved = fixed.load() + bytes.load();
      if (reserved > limit || current > limit - reserved || count > limit - reserved - current)
        return false;
      if (external.compare_exchange_weak(current, current + count))
        break;
    }
    observe();
    return true;
  }
  void observe() noexcept {
    auto total = fixed.load() + external.load() + bytes.load(), observed = managedPeak.load();
    while (observed < total && !managedPeak.compare_exchange_weak(observed, total)) {
    }
  }
  void returned(std::uint64_t count) noexcept { bytes.fetch_sub(count); }
};
struct SqliteMemory {
  inline static sqlite3_mem_methods native{};
  inline static std::once_flag initialization;
  inline static SqliteMemoryOwner runtime{1048576, true};
  inline static thread_local SqliteMemoryOwner *current = nullptr;
  struct alignas(std::max_align_t) Header {
    SqliteMemoryOwner *owner;
    int allocated;
  };
  static int rounded(int payload) noexcept {
    if (payload <= 0 || payload > INT_MAX - static_cast<int>(sizeof(Header)) - 8)
      return 0;
    return native.xRoundup(payload + static_cast<int>(sizeof(Header)));
  }
  static void *allocate(int payload) noexcept {
    int allocated = rounded(payload);
    if (!allocated)
      return nullptr;
    auto owner = current ? current : &runtime;
    if (!owner->acquire(allocated))
      return nullptr;
    auto header = static_cast<Header *>(native.xMalloc(allocated));
    if (!header) {
      owner->returned(allocated);
      return nullptr;
    }
    owner->retain();
    header->owner = owner;
    header->allocated = allocated;
    return reinterpret_cast<unsigned char *>(header) + sizeof(Header);
  }
  static Header *header(void *pointer) noexcept {
    return reinterpret_cast<Header *>(static_cast<unsigned char *>(pointer) - sizeof(Header));
  }
  static void free(void *pointer) noexcept {
    if (!pointer)
      return;
    auto block = header(pointer);
    auto owner = block->owner;
    auto count = block->allocated;
    native.xFree(block);
    owner->returned(count);
    owner->release();
  }
  static void *resize(void *pointer, int payload) noexcept {
    if (!pointer)
      return allocate(payload);
    if (payload <= 0) {
      free(pointer);
      return nullptr;
    }
    auto old = header(pointer);
    auto owner = old->owner;
    int before = old->allocated, after = rounded(payload);
    if (!after)
      return nullptr;
    if (after > before && !owner->acquire(after - before))
      return nullptr;
    auto block = static_cast<Header *>(native.xRealloc(old, after));
    if (!block) {
      if (after > before)
        owner->returned(after - before);
      return nullptr;
    }
    block->owner = owner;
    block->allocated = after;
    if (after < before)
      owner->returned(before - after);
    return reinterpret_cast<unsigned char *>(block) + sizeof(Header);
  }
  static int size(void *pointer) noexcept {
    return pointer ? header(pointer)->allocated - static_cast<int>(sizeof(Header)) : 0;
  }
  static int roundPayload(int payload) noexcept {
    int count = rounded(payload);
    return count ? count - static_cast<int>(sizeof(Header)) : INT_MAX;
  }
  static int initializeNative(void *) noexcept {
    return native.xInit ? native.xInit(native.pAppData) : SQLITE_OK;
  }
  static void shutdownNative(void *) noexcept {
    if (native.xShutdown)
      native.xShutdown(native.pAppData);
  }
  static void initialize() {
    std::call_once(initialization, []() {
      if (sqlite3_config(SQLITE_CONFIG_GETMALLOC, &native) != SQLITE_OK)
        throw std::runtime_error("sqlite-allocator-discovery");
      sqlite3_mem_methods methods{allocate,         free,           resize, size, roundPayload,
                                  initializeNative, shutdownNative, nullptr};
      if (sqlite3_config(SQLITE_CONFIG_MALLOC, &methods) != SQLITE_OK ||
          sqlite3_initialize() != SQLITE_OK)
        throw std::runtime_error("sqlite-allocator-initialization");
    });
  }
};
struct SqliteOwner {
  SqliteMemoryOwner *value;
  explicit SqliteOwner(std::uint64_t limit, SqliteMemoryOwner *shared = nullptr) : value(nullptr) {
    SqliteMemory::initialize();
    if (shared) {
      value = shared;
      value->retain();
    } else
      value = new SqliteMemoryOwner(limit);
  }
  ~SqliteOwner() {
    if (value)
      value->release();
  }
  SqliteOwner(const SqliteOwner &) = delete;
};
struct SqliteOwnerScope {
  SqliteMemoryOwner *previous = SqliteMemory::current;
  SqliteMemoryOwner *owner;
  bool changed;
  explicit SqliteOwnerScope(SqliteMemoryOwner *value) : owner(value), changed(previous != value) {
    if (changed) {
      if (owner)
        owner->retain();
      SqliteMemory::current = owner;
    }
  }
  ~SqliteOwnerScope() {
    if (changed) {
      SqliteMemory::current = previous;
      if (owner)
        owner->release();
    }
  }
};
