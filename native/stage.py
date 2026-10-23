# SPDX-License-Identifier: AGPL-3.0-only
"""Stage one exact producer component as a package asset, without building it.

The producer invokes this explicitly; consumer installation never runs it.
Updates are fail-closed while individual files are copied, with component.json
published last. An interrupted update can be repeated with --replace after the
same bounded input verification. No unknown members are removed or overwritten.
"""

import argparse
import hashlib
import json
import shutil
import stat
import sys
from pathlib import Path

sys.dont_write_bytecode = True
import build


def regular(path):
    info = path.lstat()
    if (
        not stat.S_ISREG(info.st_mode)
        or info.st_nlink != 1
        or getattr(info, "st_file_attributes", 0) & 1024
    ):
        raise ValueError(
            "Expected one regular unredirected package asset: " + str(path)
        )
    return info


def directory(path):
    if path.exists():
        info = path.lstat()
        if (
            not stat.S_ISDIR(info.st_mode)
            or getattr(info, "st_file_attributes", 0) & 1024
        ):
            raise ValueError("Redirected package asset directory")
    else:
        path.mkdir()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--replace", action="store_true")
    args = parser.parse_args()
    source = args.artifacts.resolve(strict=True)
    if source != args.artifacts.absolute() or not source.is_dir():
        raise ValueError(
            "Supply an exact absolute unredirected producer artifact directory"
        )
    manifest = json.loads((source / "component.json").read_text(encoding="utf-8"))
    evidence = json.loads((source / "build-evidence.json").read_text(encoding="utf-8"))
    inputs = build.input_identities()
    expected = hashlib.sha256(
        json.dumps(inputs, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    if (
        manifest["cohort"] != build.COHORT
        or manifest["sourceInputsSha256"] != expected
        or evidence["sourceInputsSha256"] != expected
        or evidence["sourceInputs"] != inputs
    ):
        raise ValueError(
            "Producer component does not match the current native/control inputs"
        )
    platform = manifest["platform"]
    if platform not in ("win32-x64", "linux-x64"):
        raise ValueError("Unsupported component platform")
    members = {}
    total = 0
    for path in sorted(source.rglob("*")):
        if path.is_dir():
            directory(path)
            continue
        info = regular(path)
        total += info.st_size
        if len(members) >= 128 or info.st_size > 134217728 or total > 268435456:
            raise ValueError(
                "Producer asset group exceeds its finite package capability"
            )
        name = path.relative_to(source).as_posix()
        digest = build.digest(path)
        if (
            name != "build-evidence.json"
            and evidence["artifactFiles"].get(name) != digest
        ):
            raise ValueError("Producer artifact drift: " + name)
        members[name] = (path, digest)
    if set(members) != set(evidence["artifactFiles"]) | {"build-evidence.json"}:
        raise ValueError("Incomplete producer artifact census")
    for name, identity in manifest["artifacts"].items():
        if (
            members[name][1] != identity["sha256"]
            or regular(source / name).st_size != identity["bytes"]
        ):
            raise ValueError("Manifest binary identity differs")
    parent = build.ROOT / "prebuilt"
    directory(parent)
    destination = parent / platform
    if destination.exists() and not args.replace:
        raise ValueError("Component already exists; use explicit --replace")
    directory(destination)
    for path in destination.rglob("*"):
        if path.is_dir():
            directory(path)
        elif path.relative_to(destination).as_posix() not in members:
            raise ValueError(
                "Unknown existing package asset; preserved without modification"
            )
        else:
            regular(path)
    order = sorted(members, key=lambda name: (name == "component.json", name))
    for name in order:
        original, digest = members[name]
        target = destination / name
        for ancestor in reversed(target.parents):
            if ancestor == destination or ancestor.is_relative_to(destination):
                directory(ancestor)
        if target.exists():
            regular(target)
        if build.digest(original) != digest:
            raise ValueError("Producer source changed during staging")
        shutil.copyfile(original, target)
        target.chmod(stat.S_IMODE(regular(original).st_mode))
        if build.digest(target) != digest:
            raise ValueError("Package asset readback mismatch")
    print(
        json.dumps(
            {
                "state": "staged",
                "destination": str(destination),
                "platform": platform,
                "sourceInputsSha256": expected,
                "files": len(members),
                "bytes": total,
                "qualification": "Pending installed, final review and rights qualification",
            }
        )
    )


if __name__ == "__main__":
    main()
