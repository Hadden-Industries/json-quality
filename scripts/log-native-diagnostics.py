# SPDX-License-Identifier: AGPL-3.0-only
"""Send bounded producer diagnostics to native job logs, never an artifact."""
import json
import pathlib
import sys


def emit(root):
    paths = list(root.glob("producer-*/logs/*.log"))
    paths += list(root.glob("producer-*/failure.json"))
    paths += [path for path in root.glob("native-sanitizer-*") if path.is_file()]
    remaining = 8 * 1024 * 1024
    for path in sorted(paths):
        if path.is_symlink() or not path.resolve().is_relative_to(root.resolve()):
            raise ValueError("Redirected native diagnostic")
        with path.open("rb") as source:
            while remaining:
                block = source.read(min(65536, remaining))
                if not block:
                    break
                remaining -= len(block)
                print(json.dumps({"nativeLog": path.name,
                                  "text": block.decode("utf-8", "replace")}))
            if source.read(1):
                print(json.dumps({"nativeLog": path.name, "truncated": True}))


if __name__ == "__main__":
    for argument in sys.argv[1:]:
        emit(pathlib.Path(argument))
