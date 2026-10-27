# SPDX-License-Identifier: AGPL-3.0-only
"""Create one bounded deterministic transport ZIP, excluding diagnostic copies."""
import pathlib
import stat
import sys
import zipfile


def pack(source, destination, maximum):
    root = pathlib.Path(source).resolve(strict=True)
    if not root.is_dir():
        raise ValueError("Artifact source must be a directory")
    entries, total = [], 0
    for path in sorted(root.rglob("*")):
        if (path.is_symlink() or path.is_junction()
                or not path.resolve().is_relative_to(root)):
            raise ValueError("Redirected artifact member")
        info = path.lstat()
        if stat.S_ISDIR(info.st_mode):
            continue
        if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
            raise ValueError("Unsupported artifact member")
        name = path.relative_to(root).as_posix()
        if (len(name) > 512 or path.suffix == ".log"
                or any(part in ("node_modules", "logs", "diagnostics")
                       for part in path.relative_to(root).parts)):
            raise ValueError("Artifact has no admitted transport purpose")
        total += info.st_size
        entries.append((path, name, info))
        if len(entries) > 4096 or total > maximum:
            raise ValueError("Artifact transport budget exceeded")
    if not entries:
        raise ValueError("Empty artifact transport")
    with zipfile.ZipFile(destination, "x", compression=zipfile.ZIP_STORED) as output:
        for path, name, before in entries:
            entry = zipfile.ZipInfo(name, date_time=(2000, 1, 1, 0, 0, 0))
            permissions = 0o755 if before.st_mode & 0o111 else 0o644
            entry.external_attr = (stat.S_IFREG | permissions) << 16
            written = 0
            with path.open("rb") as reader, output.open(entry, "w", force_zip64=True) as writer:
                while block := reader.read(65536):
                    written += len(block)
                    if written > before.st_size:
                        raise ValueError("Artifact grew during packing")
                    writer.write(block)
            after = path.lstat()
            if ((before.st_dev, before.st_ino, before.st_size, before.st_mtime_ns)
                    != (after.st_dev, after.st_ino, after.st_size, after.st_mtime_ns)):
                raise ValueError("Artifact input changed during packing")


if __name__ == "__main__":
    pack(sys.argv[1], sys.argv[2], int(sys.argv[3]))
