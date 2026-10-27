# SPDX-License-Identifier: AGPL-3.0-only
"""Extract one already digest-verified Actions ZIP within finite native bounds."""
import pathlib
import stat
import sys
import zipfile


def extract(archive, destination, maximum):
    requested = pathlib.Path(destination)
    if requested.is_symlink() or requested.is_junction():
        raise ValueError("Redirected artifact destination")
    root = requested.resolve(strict=True)
    if any(root.iterdir()):
        raise ValueError("Artifact destination must be an empty owned directory")
    with zipfile.ZipFile(archive) as source:
        entries = source.infolist()
        if not 0 < len(entries) <= 4096:
            raise ValueError("Artifact member count exceeded")
        seen, total = set(), 0
        for entry in entries:
            name = entry.filename
            path = pathlib.PurePosixPath(name)
            mode = entry.external_attr >> 16
            total += entry.file_size
            if (not name or len(name) > 512 or "\\" in name or ":" in name
                    or any(ord(character) < 32 for character in name)
                    or path.is_absolute() or any(part in (".", "..", "") for part in name.rstrip("/").split("/"))
                    or any(part.endswith((".", " ")) or part.split(".")[0].upper()
                           in {"CON", "PRN", "AUX", "NUL", *[f"COM{i}" for i in range(1, 10)],
                               *[f"LPT{i}" for i in range(1, 10)]} for part in path.parts)
                    or name.casefold() in seen or entry.flag_bits & 1
                    or stat.S_IFMT(mode) not in (0, stat.S_IFREG, stat.S_IFDIR)
                    or entry.file_size > maximum or total > maximum):
                raise ValueError("Unsafe or excessive artifact archive")
            seen.add(name.casefold())
        for entry in entries:
            target = root.joinpath(*pathlib.PurePosixPath(entry.filename).parts)
            if not target.is_relative_to(root):
                raise ValueError("Artifact path escaped its destination")
            if entry.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            written = 0
            with source.open(entry) as reader, target.open("xb") as output:
                while block := reader.read(65536):
                    written += len(block)
                    if written > entry.file_size:
                        raise ValueError("Artifact expansion differs from inventory")
                    output.write(block)
            if written != entry.file_size:
                raise ValueError("Incomplete artifact member")
            # Preserve executable payloads without restoring special mode bits.
            target.chmod(0o755 if (entry.external_attr >> 16) & 0o111 else 0o644)


if __name__ == "__main__":
    extract(sys.argv[1], sys.argv[2], int(sys.argv[3]))
