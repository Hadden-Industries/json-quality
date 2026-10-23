// SPDX-License-Identifier: AGPL-3.0-only
// Private quota VFS. The default SQLite VFS retains OS I/O authority.
// Observe/reserve every extension before the underlying write; metadata queries
// on Windows can report stale sizes while another handle remains open.
#pragma once
#include "failure.hpp"
#include <algorithm>
#include <atomic>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <map>
#include <sqlite3.h>
#include <string>
struct Quota {
  std::uint64_t limit, total = 0, peak = 0;
  std::map<std::string, std::uint64_t> files;
  explicit Quota(std::uint64_t capacity) : limit(capacity) {}
  bool resize(const std::string &path, std::uint64_t size) {
    auto found = files.find(path);
    if (found == files.end() && files.size() >= 16)
      return false;
    auto before = found == files.end() ? 0 : found->second;
    if (size > before && size - before > limit - total)
      return false;
    total = total - before + size;
    files[path] = size;
    peak = (std::max)(peak, total);
    return true;
  }
  void erase(const std::string &path) {
    auto found = files.find(path);
    if (found != files.end()) {
      total -= found->second;
      files.erase(found);
    }
  }
};
struct QuotaVfs {
  struct File {
    sqlite3_file base;
    sqlite3_file *native;
    QuotaVfs *owner;
    char *path;
  };
  sqlite3_vfs adapter{};
  sqlite3_vfs *native;
  Quota &quota;
  inline static std::atomic<std::uint64_t> nextIdentity{0};
  std::string name;
  explicit QuotaVfs(Quota &q, std::size_t ownedPathBytes = 0)
#ifdef _WIN32
      : native(sqlite3_vfs_find("win32-longpath")), quota(q) {
#else
      : native(sqlite3_vfs_find(nullptr)), quota(q) {
#endif
    require(native != nullptr, "sqlite-native-vfs");
    name = "json-quality-owned-" + std::to_string(++nextIdentity);
    adapter = *native;
#ifdef _WIN32
    // The maintained long-path VFS supplies the OS operations. Keep SQLite's
    // internal pathname reservation proportional to this owned directory,
    // rather than charging its full platform maximum to every small check.
    auto ordinary = sqlite3_vfs_find(nullptr);
    require(ordinary != nullptr &&
                ownedPathBytes <= static_cast<std::size_t>(native->mxPathname) - 128,
            "scratch-path-capacity");
    adapter.mxPathname = (std::max)(ordinary->mxPathname, static_cast<int>(ownedPathBytes + 128));
#else
    (void)ownedPathBytes;
#endif
    adapter.zName = name.c_str();
    adapter.szOsFile = sizeof(File) + native->szOsFile;
    adapter.pAppData = this;
    adapter.xOpen = open;
    adapter.xDelete = remove;
    // Default callbacks expect their original VFS pointer. All wrappers below
    // forward that exact pointer, rather than a copied pAppData.
    adapter.xAccess = access;
    adapter.xFullPathname = fullpath;
    adapter.xDlOpen = dlopen;
    adapter.xDlError = dlerror;
    adapter.xDlSym = dlsym;
    adapter.xDlClose = dlclose;
    adapter.xRandomness = randomness;
    adapter.xSleep = sleep;
    adapter.xCurrentTime = time;
    adapter.xGetLastError = error;
    adapter.xCurrentTimeInt64 = time64;
    adapter.xSetSystemCall = nullptr;
    adapter.xGetSystemCall = nullptr;
    adapter.xNextSystemCall = nullptr;
    adapter.iVersion = 2;
    sqlite3_vfs_register(&adapter, 0);
  }
  ~QuotaVfs() { sqlite3_vfs_unregister(&adapter); }
  static QuotaVfs *self(sqlite3_vfs *v) { return static_cast<QuotaVfs *>(v->pAppData); }
  static File *file(sqlite3_file *f) { return reinterpret_cast<File *>(f); }
  static int open(sqlite3_vfs *v, const char *name, sqlite3_file *output, int flags,
                  int *outFlags) {
    auto f = file(output);
    auto owner = self(v);
    f->base.pMethods = nullptr;
    f->native =
        reinterpret_cast<sqlite3_file *>(reinterpret_cast<unsigned char *>(output) + sizeof(File));
    f->owner = owner;
    f->path = nullptr;
    if (!name)
      return SQLITE_CANTOPEN; // unowned temporary-file creation is forbidden
    int result = owner->native->xOpen(owner->native, name, f->native, flags, outFlags);
    if (result != SQLITE_OK)
      return result;
    f->path = sqlite3_mprintf("%s", name);
    if (!f->path) {
      f->native->pMethods->xClose(f->native);
      return SQLITE_NOMEM;
    }
    sqlite3_int64 size = 0;
    result = f->native->pMethods->xFileSize(f->native, &size);
    if (result != SQLITE_OK || !owner->quota.resize(name, size)) {
      f->native->pMethods->xClose(f->native);
      sqlite3_free(f->path);
      return SQLITE_FULL;
    }
    f->base.pMethods = &methods;
    return SQLITE_OK;
  }
  static int close(sqlite3_file *output) {
    auto f = file(output);
    int result = f->native->pMethods->xClose(f->native);
    sqlite3_free(f->path);
    f->path = nullptr;
    f->base.pMethods = nullptr;
    return result;
  }
  static int read(sqlite3_file *output, void *buf, int n, sqlite3_int64 offset) {
    auto f = file(output);
    return f->native->pMethods->xRead(f->native, buf, n, offset);
  }
  static int write(sqlite3_file *output, const void *buf, int n, sqlite3_int64 offset) {
    auto f = file(output);
    if (offset < 0 || n < 0 || offset > INT64_MAX - n)
      return SQLITE_FULL;
    auto current = f->owner->quota.files[f->path];
    if (!f->owner->quota.resize(f->path, (std::max)(current, std::uint64_t(offset) + n)))
      return SQLITE_FULL;
    return f->native->pMethods->xWrite(f->native, buf, n, offset);
  }
  static int truncate(sqlite3_file *output, sqlite3_int64 size) {
    auto f = file(output);
    if (size < 0)
      return SQLITE_FULL;
    auto before = f->owner->quota.files.at(f->path);
    if (std::uint64_t(size) > before && !f->owner->quota.resize(f->path, size))
      return SQLITE_FULL;
    int result = f->native->pMethods->xTruncate(f->native, size);
    // A failed shrink does not release bytes that may still exist on disk.
    if (result == SQLITE_OK && std::uint64_t(size) < before)
      f->owner->quota.resize(f->path, size);
    return result;
  }
  static int sync(sqlite3_file *o, int flags) {
    auto f = file(o);
    return f->native->pMethods->xSync(f->native, flags);
  }
  static int size(sqlite3_file *o, sqlite3_int64 *n) {
    auto f = file(o);
    return f->native->pMethods->xFileSize(f->native, n);
  }
  static int lock(sqlite3_file *o, int n) {
    auto f = file(o);
    return f->native->pMethods->xLock(f->native, n);
  }
  static int unlock(sqlite3_file *o, int n) {
    auto f = file(o);
    return f->native->pMethods->xUnlock(f->native, n);
  }
  static int reserved(sqlite3_file *o, int *n) {
    auto f = file(o);
    return f->native->pMethods->xCheckReservedLock(f->native, n);
  }
  static int control(sqlite3_file *o, int n, void *p) {
    auto f = file(o);
    // Advisory preallocation/chunking can extend a file without xWrite.
    // Reject those optional hints; actual extensions go through the ledger.
    if (n == SQLITE_FCNTL_SIZE_HINT || n == SQLITE_FCNTL_CHUNK_SIZE)
      return SQLITE_NOTFOUND;
    return f->native->pMethods->xFileControl(f->native, n, p);
  }
  static int sector(sqlite3_file *o) {
    auto f = file(o);
    return f->native->pMethods->xSectorSize(f->native);
  }
  static int characteristics(sqlite3_file *o) {
    auto f = file(o);
    return f->native->pMethods->xDeviceCharacteristics(f->native);
  }
  static int remove(sqlite3_vfs *v, const char *path, int syncDir) {
    auto owner = self(v);
    int result = owner->native->xDelete(owner->native, path, syncDir);
    if (result == SQLITE_OK)
      owner->quota.erase(path);
    return result;
  }
  static int access(sqlite3_vfs *v, const char *p, int flags, int *out) {
    auto x = self(v);
    return x->native->xAccess(x->native, p, flags, out);
  }
  static int fullpath(sqlite3_vfs *v, const char *p, int n, char *out) {
    auto x = self(v);
    return x->native->xFullPathname(x->native, p, n, out);
  }
  static void *dlopen(sqlite3_vfs *v, const char *p) {
    auto x = self(v);
    return x->native->xDlOpen(x->native, p);
  }
  static void dlerror(sqlite3_vfs *v, int n, char *out) {
    auto x = self(v);
    x->native->xDlError(x->native, n, out);
  }
  static void (*dlsym(sqlite3_vfs *v, void *p, const char *n))(void) {
    auto x = self(v);
    return x->native->xDlSym(x->native, p, n);
  }
  static void dlclose(sqlite3_vfs *v, void *p) {
    auto x = self(v);
    x->native->xDlClose(x->native, p);
  }
  static int randomness(sqlite3_vfs *v, int n, char *out) {
    auto x = self(v);
    return x->native->xRandomness(x->native, n, out);
  }
  static int sleep(sqlite3_vfs *v, int n) {
    auto x = self(v);
    return x->native->xSleep(x->native, n);
  }
  static int time(sqlite3_vfs *v, double *t) {
    auto x = self(v);
    return x->native->xCurrentTime(x->native, t);
  }
  static int error(sqlite3_vfs *v, int n, char *out) {
    auto x = self(v);
    return x->native->xGetLastError(x->native, n, out);
  }
  static int time64(sqlite3_vfs *v, sqlite3_int64 *t) {
    auto x = self(v);
    return x->native->xCurrentTimeInt64(x->native, t);
  }
  inline static const sqlite3_io_methods methods = {
      1,    close,  read,     write,   truncate, sync,           size,
      lock, unlock, reserved, control, sector,   characteristics};
};
