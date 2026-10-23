// SPDX-License-Identifier: AGPL-3.0-only
// Maintained platform SHA-256 with bounded update fragments.
// Caller owns returned hex text; update accepts bounded fragments only.
#pragma once
#include <array>
#include <cstdint>
#include <span>
#include <stdexcept>
#include <string>
#ifdef _WIN32
#include <Windows.h>
#include <bcrypt.h>
#else
#include <cstring>
#include <linux/if_alg.h>
#include <sys/socket.h>
#include <unistd.h>
#endif
class Sha256 {
#ifdef _WIN32
  BCRYPT_HASH_HANDLE hash = nullptr;
  static BCRYPT_ALG_HANDLE algorithm() {
    static BCRYPT_ALG_HANDLE provider = []() {
      BCRYPT_ALG_HANDLE handle = nullptr;
      if (BCryptOpenAlgorithmProvider(&handle, BCRYPT_SHA256_ALGORITHM, nullptr,
                                      BCRYPT_HASH_REUSABLE_FLAG) < 0)
        throw std::runtime_error("sha256-provider");
      return handle;
    }();
    return provider;
  }
#else
  int socket = -1, operation = -1;
#endif
  bool complete = false;

public:
  Sha256() {
#ifdef _WIN32
    if (BCryptCreateHash(algorithm(), &hash, nullptr, 0, nullptr, 0, BCRYPT_HASH_REUSABLE_FLAG) < 0)
      throw std::runtime_error("sha256-create");
#else
    socket = ::socket(AF_ALG, SOCK_SEQPACKET, 0);
    sockaddr_alg address{};
    address.salg_family = AF_ALG;
    std::memcpy(address.salg_type, "hash", 5);
    std::memcpy(address.salg_name, "sha256", 7);
    if (socket < 0 || bind(socket, reinterpret_cast<sockaddr *>(&address), sizeof(address)) < 0) {
      if (socket >= 0)
        ::close(socket);
      throw std::runtime_error("sha256-provider");
    }
    operation = accept(socket, nullptr, nullptr);
    if (operation < 0) {
      ::close(socket);
      throw std::runtime_error("sha256-create");
    }
#endif
  }
  Sha256(const Sha256 &) = delete;
  /** Restart only a completed message. Windows resets its maintained reusable
   * CNG object at finish; Linux accepts a fresh operation on the bound provider.
   * One scalar checker retains one bounded hash context, never one per value.
   */
  void restart() {
    if (!complete)
      throw std::runtime_error("sha256-message-incomplete");
#ifndef _WIN32
    ::close(operation);
    operation = accept(socket, nullptr, nullptr);
    if (operation < 0)
      throw std::runtime_error("sha256-create");
#endif
    complete = false;
  }
  ~Sha256() {
#ifdef _WIN32
    if (hash)
      BCryptDestroyHash(hash);
#else
    if (operation >= 0)
      ::close(operation);
    if (socket >= 0)
      ::close(socket);
#endif
  }
  void update(std::span<const unsigned char> bytes) {
    if (complete || bytes.size() > 65536)
      throw std::runtime_error("sha256-fragment");
#ifdef _WIN32
    if (BCryptHashData(hash, const_cast<PUCHAR>(bytes.data()), static_cast<ULONG>(bytes.size()),
                       0) < 0)
      throw std::runtime_error("sha256-update");
#else
    if (send(operation, bytes.data(), bytes.size(), MSG_MORE) != static_cast<ssize_t>(bytes.size()))
      throw std::runtime_error("sha256-update");
#endif
  }
  std::array<unsigned char, 32> finish() {
    if (complete)
      throw std::runtime_error("sha256-already-finished");
    complete = true;
    std::array<unsigned char, 32> digest{};
#ifdef _WIN32
    if (BCryptFinishHash(hash, digest.data(), static_cast<ULONG>(digest.size()), 0) < 0)
      throw std::runtime_error("sha256-finish");
#else
    if (send(operation, nullptr, 0, 0) < 0 ||
        ::read(operation, digest.data(), digest.size()) != digest.size())
      throw std::runtime_error("sha256-finish");
#endif
    return digest;
  }
  static std::string hex(const std::array<unsigned char, 32> &bytes) {
    static constexpr char alphabet[] = "0123456789abcdef";
    std::string result(64, '0');
    for (unsigned i = 0; i < 32; ++i) {
      result[2 * i] = alphabet[bytes[i] >> 4];
      result[2 * i + 1] = alphabet[bytes[i] & 15];
    }
    return result;
  }
};
