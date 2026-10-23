// SPDX-License-Identifier: AGPL-3.0-only
// Non-Node transport adapter for the exact same core service as Node-API.
#include "../core/session.hpp"
#include <cstdio>
#ifdef _WIN32
#include <fcntl.h>
#include <io.h>
#endif
static ProtocolFrame readFrame() {
  unsigned char header[5];
  auto count = std::fread(header, 1, 5, stdin);
  require(count == 5, count == 0 && std::feof(stdin) ? "transport-eof" : "truncated-frame-header");
  std::uint32_t length = header[1] | std::uint32_t(header[2]) << 8 |
                         std::uint32_t(header[3]) << 16 | std::uint32_t(header[4]) << 24;
  require(length <= 65536, "frame-size");
  Bytes body(length);
  require(std::fread(body.data(), 1, length, stdin) == length, "truncated-frame-body");
  return {static_cast<char>(header[0]), std::move(body)};
}
static void writeFrames(const std::vector<ProtocolFrame> &frames) {
  auto bytes = encodeFrames(frames);
  if (bytes.empty())
    return;
  require(std::fwrite(bytes.data(), 1, bytes.size(), stdout) == bytes.size() &&
              std::fflush(stdout) == 0,
          "transport-write");
}
#ifdef _WIN32
int wmain(int argc, wchar_t **argv) {
#else
int main(int argc, char **argv) {
#endif
#ifdef _WIN32
  _setmode(_fileno(stdin), _O_BINARY);
  _setmode(_fileno(stdout), _O_BINARY);
#endif
  try {
    require(argc == 2, "scratch-path-argument");
#ifdef _WIN32
    CoreSession core(pathToUtf8(fs::path(argv[1])));
#else
    CoreSession core(argv[1]);
#endif
    writeFrames({jsonFrame(core.hello())});
    while (!core.closed) {
      auto frame = readFrame();
      writeFrames(core.exchange(frame.kind, frame.bytes));
    }
    return 0;
  } catch (const std::exception &error) {
    // Operational failure is never converted into a successful terminal.
    try {
      writeFrames({jsonFrame(
          {{"type", "operational-error"}, {"code", error.what()}, {"complete", false}}, 'E')});
    } catch (...) {
    }
    return 2;
  }
}
