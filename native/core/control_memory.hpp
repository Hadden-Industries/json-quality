// SPDX-License-Identifier: AGPL-3.0-only
// Native PMR allocators charge control buffers/DOM to the same session budget.
// Boost still owns control parsing; this adapter owns allocation accounting only.
#pragma once
#include "allocation_ledger.hpp"
#include "failure.hpp"
#include <boost/json.hpp>
#include <memory_resource>

// Standard-library metadata copies may live until the reply is serialized.
// Hold their conservative workspace charge for the complete native exchange.
struct MetadataCopyScope {
  inline static thread_local MetadataCopyScope *current = nullptr;
  MetadataCopyScope *previous;
  SqliteMemoryOwner *owner;
  std::uint64_t bytes = 0;
  explicit MetadataCopyScope(SqliteMemoryOwner *account) : previous(current), owner(account) {
    owner->retain();
    current = this;
  }
  ~MetadataCopyScope() {
    current = previous;
    owner->external.fetch_sub(bytes);
    owner->release();
  }
  static void charge(std::size_t count) {
    // Existing frame-sized temporaries fit the fixed native workspace. Charge
    // the newly admitted growing copies without accumulating tiny row visits.
    if (count <= 65536)
      return;
    require(current, "metadata-copy-owner");
    if (!current->owner->acquireExternal(count))
      throw std::bad_alloc();
    current->bytes += count;
  }
};

inline std::string metadataString(const boost::json::string &text) {
  MetadataCopyScope::charge(text.size());
  return std::string(text);
}

struct ControlHeap {
  SqliteMemoryOwner *owner;
  explicit ControlHeap(SqliteMemoryOwner *account) : owner(account) { owner->retain(); }
  ~ControlHeap() { owner->release(); }
  void *allocate(std::size_t bytes, std::size_t alignment) {
    if (!owner->acquireExternal(bytes))
      throw std::bad_alloc();
    try {
      return std::pmr::new_delete_resource()->allocate(bytes, alignment);
    } catch (...) {
      owner->external.fetch_sub(bytes);
      throw;
    }
  }
  void deallocate(void *pointer, std::size_t bytes, std::size_t alignment) {
    std::pmr::new_delete_resource()->deallocate(pointer, bytes, alignment);
    owner->external.fetch_sub(bytes);
  }
};
struct ControlBytesResource : std::pmr::memory_resource {
  ControlHeap heap;
  explicit ControlBytesResource(SqliteMemoryOwner *owner) : heap(owner) {}
  void *do_allocate(std::size_t bytes, std::size_t alignment) override {
    return heap.allocate(bytes, alignment);
  }
  void do_deallocate(void *pointer, std::size_t bytes, std::size_t alignment) override {
    heap.deallocate(pointer, bytes, alignment);
  }
  bool do_is_equal(const std::pmr::memory_resource &other) const noexcept override {
    return this == &other;
  }
};
struct ControlJsonResource : boost::container::pmr::memory_resource {
  ControlHeap heap;
  explicit ControlJsonResource(SqliteMemoryOwner *owner) : heap(owner) {}
  void *do_allocate(std::size_t bytes, std::size_t alignment) override {
    return heap.allocate(bytes, alignment);
  }
  void do_deallocate(void *pointer, std::size_t bytes, std::size_t alignment) override {
    heap.deallocate(pointer, bytes, alignment);
  }
  bool do_is_equal(const boost::container::pmr::memory_resource &other) const noexcept override {
    return this == &other;
  }
};
