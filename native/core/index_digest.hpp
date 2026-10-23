// SPDX-License-Identifier: AGPL-3.0-only
// Digest indexes only narrow equality candidates. Tests can force every bucket
// to collide; exact stored bytes remain the final identity authority.
#pragma once
#include <string>
inline std::string indexDigest(const std::string &digest) {
#ifdef JSON_QUALITY_TEST_COLLISION_DIGEST
  return std::string(64, '0');
#else
  return digest;
#endif
}
