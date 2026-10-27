# SPDX-License-Identifier: AGPL-3.0-only
"""Build verified native artifacts in an explicit external producer workspace.

This is producer tooling. It neither installs a toolchain nor changes accepted
runtime manifests, npm acquisition, release rights or package publication.
"""

import argparse
import hashlib
import json
import os
import platform
import re
import shutil
import stat
import subprocess
import sys
import tarfile
import time
import urllib.request
import uuid
import zipfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
POLICY = json.loads((ROOT / "dependencies.json").read_text(encoding="utf-8"))
COHORT = json.loads((REPO / "schemas/contract-cohort.json").read_text(encoding="utf-8"))
FRAGMENT = 65536
CONTEXT = None


def digest(path):
    """Hash files incrementally, including large dependency and native artifacts."""
    with path.open("rb") as source:
        return hashlib.file_digest(source, "sha256").hexdigest()


def save(path, value):
    path.write_text(
        json.dumps(value, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
        newline="\n",
    )


def input_identities():
    """Bind build logic and first-party compile inputs without a commit-hash cycle."""
    paths = [
        ROOT / name
        for name in (
            "CMakeLists.txt",
            "dependencies.json",
            "icu-windows.props.in",
            "build.py",
        )
    ]
    paths += sorted((ROOT / "core").glob("*.hpp"))
    paths += sorted((ROOT / "bindings").glob("*.cpp"))
    paths += [
        REPO / "schemas" / name
        for name in (
            "configuration.schema.json",
            "source-contract.schema.json",
            "contract-cohort.json",
        )
    ]
    identities = {}
    for path in paths:
        data = path.read_bytes()
        if b"\r" in data:
            raise ValueError(
                "First-party native/control inputs require canonical LF before build: "
                + str(path)
            )
        identities[path.relative_to(REPO).as_posix()] = hashlib.sha256(data).hexdigest()
    return identities


def project_resources(destination):
    """Project existing schema annotations; never maintain native limit defaults separately."""
    schema = json.loads(
        (REPO / "schemas/configuration.schema.json").read_text(encoding="utf-8")
    )
    if (
        schema["properties"]["schemaVersion"]["const"]
        != COHORT["configurationSchemaVersion"]
        or POLICY["nodeApiVersion"] != COHORT["nodeApiVersion"]
    ):
        raise ValueError("Native dependency/control cohort drift")
    destination.mkdir()
    cohort_lines = [
        "// Generated from contract-cohort.json.",
        "#pragma once",
        "namespace ContractCohort {",
    ]
    for name, value in COHORT.items():
        if (
            not re.fullmatch(r"[a-z][A-Za-z0-9]*", name)
            or not isinstance(value, int)
            or value < 1
        ):
            raise ValueError("Invalid contract cohort declaration")
        cohort_lines.append(
            "inline constexpr unsigned " + name + " = " + str(value) + ";"
        )
    cohort_lines.append("}")
    (destination / "contract_cohort.hpp").write_text(
        "\n".join(cohort_lines) + "\n", encoding="utf-8"
    )
    source_schema = json.loads(
        (REPO / "schemas/source-contract.schema.json").read_text(encoding="utf-8")
    )
    if any(
        "enum" not in source_schema["properties"].get(name, {})
        for name in ("format", "formatContract", "normalization")
    ):
        raise ValueError("Selected-source controls require complete enum declarations")
    enum_lines = [
        "// Generated selected-source enums; source-contract.schema.json owns the values.",
        "#pragma once",
        "#include <boost/json.hpp>",
        "namespace SourceContractEnums {",
    ]
    for name, rule in source_schema["properties"].items():
        if "enum" not in rule:
            continue
        if not re.fullmatch(r"[a-z][A-Za-z0-9]*", name) or any(
            not re.fullmatch(r"[A-Za-z0-9-]+", item) for item in rule["enum"]
        ):
            raise ValueError("Unsupported source contract enum projection")
        enum_lines.append(
            "inline bool "
            + name
            + "(boost::json::string_view value) { return "
            + " || ".join('value == "' + item + '"' for item in rule["enum"])
            + "; }"
        )
    enum_lines.append("}")
    (destination / "source_contract_enums.hpp").write_text(
        "\n".join(enum_lines) + "\n", encoding="utf-8"
    )
    capacity = schema["$defs"]["capacityLimits"]["properties"]
    runtime = schema["$defs"]["runtimeControls"]["properties"]
    lines = [
        "// Generated from configuration.schema.json by the verified producer builder.",
        "#pragma once",
        "#include <array>",
        "#include <cstddef>",
        "#include <cstdint>",
        "#include <boost/json.hpp>",
        "namespace ResourceDefaults {",
        "struct Control { boost::json::string_view name; std::uint64_t value, minimum, maximum; };",
    ]
    for label, values in [("Admission", capacity), ("Runtime", runtime)]:
        lines.append(
            "enum class "
            + label
            + " : std::size_t { "
            + ", ".join(values)
            + ", count };"
        )
        lines.append(
            "inline constexpr std::array<Control, "
            + str(len(values))
            + "> "
            + label.lower()
            + " = {{"
        )
        for name, rule in values.items():
            if not re.fullmatch(r"[a-z][A-Za-z0-9]*", name) or rule["type"] != [
                "integer",
                "null",
            ]:
                raise ValueError("Unsupported resource schema projection")
            numbers = [rule[key] for key in ("default", "minimum", "maximum")]
            if any(
                type(number) is not int or not 1 <= number <= 9007199254740991
                for number in numbers
            ):
                raise ValueError(
                    "Resource schema must declare positive safe integer bounds and defaults"
                )
            if not numbers[1] <= numbers[0] <= numbers[2]:
                raise ValueError("Resource default outside declared bounds")
            lines.append(
                '  {"'
                + name
                + '", '
                + ", ".join(str(number) + "ULL" for number in numbers)
                + "},"
            )
        lines.append("}};")
    lines += ["}", ""]
    (destination / "resource_defaults.hpp").write_text(
        "\n".join(lines), encoding="utf-8", newline="\n"
    )


def command(args, directory, logs, label, timeout=900):
    """Retain finite build output externally; never capture document payloads."""
    logfile = logs / (str(len(list(logs.glob("*.log"))) + 1) + "-" + label + ".log")
    env = dict(os.environ)
    env["MSBUILDDISABLENODEREUSE"] = "1"
    temporary = logs.parent / "temporary"
    temporary.mkdir(exist_ok=True)
    env["TMP"] = env["TEMP"] = str(temporary)
    started = time.monotonic()
    print(json.dumps({"stage": label, "state": "started"}), file=sys.stderr, flush=True)
    with logfile.open("xb") as output:
        try:
            result = subprocess.run(
                [str(a) for a in args],
                cwd=directory,
                env=env,
                stdout=output,
                stderr=subprocess.STDOUT,
                timeout=timeout,
                check=False,
            )
        except subprocess.TimeoutExpired:
            save(
                logfile.with_suffix(".json"),
                {
                    "arguments": [str(a) for a in args],
                    "stage": label,
                    "timeoutSeconds": timeout,
                    "complete": False,
                },
            )
            raise
    facts = {
        "arguments": [str(a) for a in args],
        "stage": label,
        "exitCode": result.returncode,
        "seconds": time.monotonic() - started,
        "logSha256": digest(logfile),
        "logBytes": logfile.stat().st_size,
    }
    save(logfile.with_suffix(".json"), facts)
    print(
        json.dumps({k: v for k, v in facts.items() if k != "arguments"}),
        file=sys.stderr,
        flush=True,
    )
    if result.returncode:
        with logfile.open("rb") as source:
            source.seek(max(0, logfile.stat().st_size - 8192))
            print(
                json.dumps(
                    {
                        "stage": label,
                        "outputTail": source.read().decode("utf-8", "replace"),
                    }
                ),
                file=sys.stderr,
                flush=True,
            )
        raise RuntimeError("Native producer stage failed: " + label)


def acquire(name, spec, archives, override):
    """Reuse supplied archive bytes only after the committed digest is verified."""
    path = override.get(name)
    if path is None:
        path = archives / name
        request = urllib.request.Request(
            spec["url"], headers={"User-Agent": "json-quality-native-producer"}
        )
        with (
            urllib.request.urlopen(request, timeout=90) as response,
            path.open("xb") as output,
        ):
            total = 0
            while chunk := response.read(FRAGMENT):
                total += len(chunk)
                if total > spec["maximumArchiveBytes"]:
                    raise ValueError(
                        "Dependency archive exceeds declared bound: " + name
                    )
                output.write(chunk)
    metadata = path.lstat()
    if (
        not stat.S_ISREG(metadata.st_mode)
        or metadata.st_nlink != 1
        or path.is_symlink()
    ):
        raise ValueError("Dependency input must be one regular file: " + name)
    if metadata.st_size > spec["maximumArchiveBytes"] or digest(path) != spec["sha256"]:
        raise ValueError("Dependency input identity mismatch: " + name)
    return path


def selected(relative, spec):
    return any(
        relative == item or item.endswith("/") and relative.startswith(item)
        for item in spec["include"]
    )


def extract(archive, spec, destination, verify=False):
    """Extract selected regular members from already verified pinned archives."""
    if not verify:
        destination.mkdir()
    if spec["format"] == "file":
        target = destination / spec["filename"]
        if verify:
            if (
                target.is_symlink()
                or not target.is_file()
                or target.stat().st_nlink != 1
                or {p.name for p in destination.iterdir()} != {spec["filename"]}
                or digest(target) != spec["sha256"]
            ):
                raise ValueError("Reused dependency file mismatch")
        else:
            shutil.copyfile(archive, target)
        return
    prefix = spec["prefix"]
    seen = set()
    total = count = 0

    def member(name, size, regular, mode, opener):
        nonlocal prefix, total, count
        count += 1
        if count > 200000:
            raise ValueError("Dependency archive member count")
        if prefix == "single-directory":
            prefix = name.split("/")[0] + "/"
        if not name.startswith(prefix):
            return
        relative = name[len(prefix) :]
        if not selected(relative, spec):
            return
        path = PurePosixPath(relative)
        if (
            not regular
            or path.is_absolute()
            or any(p in ("", ".", "..") or ":" in p or "\\" in p for p in path.parts)
        ):
            raise ValueError("Unsafe selected dependency member: " + name)
        identity = relative.casefold()
        if identity in seen:
            raise ValueError("Duplicate dependency member: " + name)
        seen.add(identity)
        total += size
        if size > 67108864 or total > spec["maximumExtractedBytes"]:
            raise ValueError("Extracted dependency bound")
        target = destination.joinpath(*path.parts)
        if verify:
            if (
                not target.resolve(strict=True).is_relative_to(destination)
                or target.is_symlink()
                or not target.is_file()
                or target.stat().st_nlink != 1
            ):
                raise ValueError("Redirected or irregular reused dependency file")
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
        with opener() as source, target.open("rb" if verify else "xb") as output:
            copied = 0
            while chunk := source.read(FRAGMENT):
                copied += len(chunk)
                if copied > size:
                    raise ValueError("Dependency member size drift")
                if verify:
                    if output.read(len(chunk)) != chunk:
                        raise ValueError("Reused dependency bytes differ: " + relative)
                else:
                    output.write(chunk)
            if copied != size:
                raise ValueError("Truncated dependency member")
            if verify and output.read(1):
                raise ValueError("Reused dependency has trailing bytes")
        if os.name != "nt":
            executable_bits = mode & 0o111
            if verify:
                if stat.S_IMODE(target.stat().st_mode) & 0o111 != executable_bits:
                    raise ValueError(
                        "Reused dependency executable mode differs: " + relative
                    )
            else:
                # Keep the verified archive's executable bits for build scripts,
                # while never admitting set-id or group/world write permissions.
                target.chmod(0o644 | executable_bits)

    if spec["format"] == "zip":
        with zipfile.ZipFile(archive) as source:
            for entry in source.infolist():
                if entry.is_dir():
                    continue
                kind = stat.S_IFMT(entry.external_attr >> 16)
                member(
                    entry.filename,
                    entry.file_size,
                    kind in (0, stat.S_IFREG),
                    entry.external_attr >> 16,
                    lambda entry=entry: source.open(entry),
                )
    else:
        with tarfile.open(archive, mode="r|gz") as source:
            for entry in source:
                if entry.isdir():
                    continue
                member(
                    entry.name,
                    entry.size,
                    entry.isfile(),
                    entry.mode,
                    lambda entry=entry: source.extractfile(entry),
                )
    if not seen:
        raise ValueError("Empty dependency selection")
    if verify:
        found = set()
        for parent, directories, files in os.walk(destination, followlinks=False):
            if any((Path(parent) / name).is_symlink() for name in directories):
                raise ValueError("Redirected reused dependency directory")
            for name in files:
                found.add(
                    (Path(parent) / name).relative_to(destination).as_posix().casefold()
                )
        if found != seen:
            raise ValueError("Reused dependency membership differs")


def collect_notices(roots, output):
    """Retain original notice bytes and a readable rendering with file identities."""
    inventory, rendering = [], []
    notice_root = output / "notices"
    notice_root.mkdir()
    for name, base in roots.items():
        for parent, directories, files in os.walk(base, followlinks=False):
            directories[:] = sorted(
                d for d in directories if not (Path(parent) / d).is_symlink()
            )
            for filename in sorted(files):
                if not re.match(
                    r"(?i)^(licen[sc]e|copying|copyright|notice|authors)([.\-_]|$)",
                    filename,
                ):
                    continue
                path = Path(parent) / filename
                if path.is_symlink() or path.stat().st_size > 1048576:
                    raise ValueError(
                        "Notice requires explicit qualification: " + str(path)
                    )
                data = path.read_bytes()
                relative = Path(name) / path.relative_to(base)
                target = notice_root / relative
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                inventory.append(
                    {
                        "path": relative.as_posix(),
                        "sha256": digest(target),
                        "bytes": len(data),
                    }
                )
                rendering.append(
                    "\n===== "
                    + relative.as_posix()
                    + " =====\n"
                    + data.decode("utf-8-sig")
                )
    sqlite = roots["sqlite"] / "sqlite3.c"
    with sqlite.open("rb") as source:
        preamble = source.read(65536).split(b"*/", 1)[0] + b"*/\n"
    (notice_root / "sqlite-dedication.txt").write_bytes(preamble)
    inventory.append(
        {
            "path": "sqlite-dedication.txt",
            "sha256": digest(notice_root / "sqlite-dedication.txt"),
            "bytes": len(preamble),
        }
    )
    rendering.append(
        "\n===== SQLite original source dedication =====\n" + preamble.decode("utf-8")
    )
    (output / "THIRD-PARTY-NOTICES.txt").write_text(
        ("\n".join(rendering) + "\n").replace("\r\n", "\n").replace("\r", "\n"),
        encoding="utf-8",
        newline="\n",
    )
    save(
        output / "notice-inventory.json",
        {"schemaVersion": 1, "originalFiles": inventory},
    )


def main():
    global CONTEXT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", required=True, type=Path)
    parser.add_argument("--cmake", default="cmake")
    parser.add_argument("--archive", action="append", default=[], metavar="NAME=PATH")
    parser.add_argument(
        "--reuse-source",
        action="append",
        default=[],
        metavar="NAME=PATH",
        help="Verify every selected byte against the pinned archive before read-only reuse",
    )
    parser.add_argument("--jobs", type=int, default=2)
    args = parser.parse_args()
    host = ("win32" if os.name == "nt" else platform.system().lower()) + "-x64"
    if platform.machine().lower() not in ("amd64", "x86_64") or host not in (
        "win32-x64",
        "linux-x64",
    ):
        raise ValueError("Unsupported producer host")
    if not 1 <= args.jobs <= 4:
        raise ValueError("Producer concurrency must be 1..4")
    workspace = args.workspace.resolve(strict=True)
    if workspace.is_relative_to(REPO) or workspace.is_symlink():
        raise ValueError("Use an explicit external workspace")
    overrides = {}
    for value in args.archive:
        name, separator, path = value.partition("=")
        if not separator or name not in POLICY["sources"] or name in overrides:
            raise ValueError("Unknown or duplicate dependency archive override")
        overrides[name] = Path(path).resolve(strict=True)
    reused = {}
    for value in args.reuse_source:
        name, separator, path = value.partition("=")
        if not separator or name not in POLICY["sources"] or name in reused:
            raise ValueError("Unknown or duplicate reused dependency source")
        reused[name] = Path(path).resolve(strict=True)
    attempt = workspace / ("producer-" + uuid.uuid4().hex)
    attempt.mkdir()
    archives, source, output, logs = [
        attempt / name for name in ("archives", "sources", "artifacts", "logs")
    ]
    for path in (archives, source, output, logs):
        path.mkdir()
    inputs = input_identities()
    source_digest = hashlib.sha256(
        json.dumps(inputs, sort_keys=True, separators=(",", ":")).encode()
    ).hexdigest()
    CONTEXT = {"attempt": attempt, "inputs": inputs, "stage": "freeze-inputs"}
    with zipfile.ZipFile(
        attempt / "first-party-inputs.zip", "x", compression=zipfile.ZIP_DEFLATED
    ) as snapshot:
        for name, expected in inputs.items():
            path = REPO / name
            if digest(path) != expected:
                raise ValueError("Source drift before producer snapshot")
            snapshot.write(path, name)
    roots, verified_archives, dependencies = {}, {}, []
    for name, spec in POLICY["sources"].items():
        if spec.get("platform", host) != host:
            continue
        CONTEXT["stage"] = "acquire:" + name
        archive = acquire(name, spec, archives, overrides)
        destination = reused.get(name, source / name)
        CONTEXT["stage"] = (
            "verify-source:" + name if name in reused else "extract:" + name
        )
        extract(archive, spec, destination, verify=name in reused)
        roots[name] = destination
        verified_archives[name] = archive
        dependencies.append(
            {
                "name": name,
                "url": spec["url"],
                "sha256": spec["sha256"],
                "bytes": archive.stat().st_size,
                "role": spec["role"],
            }
        )
    collect_notices(roots, output)
    build = attempt / "build"
    generated = attempt / "generated"
    project_resources(generated)
    query = build / ".cmake/api/v1/query"
    query.mkdir(parents=True)
    (query / "toolchains-v1").touch()
    configure = [
        args.cmake,
        "-S",
        ROOT,
        "-B",
        build,
        "-DCMAKE_BUILD_TYPE=Release",
        "-DJSON_QUALITY_SOURCE_INPUTS_SHA256=" + source_digest,
        "-DJSON_QUALITY_GENERATED_ROOT=" + str(generated),
    ]
    if host == "win32-x64":
        configure += ["-A", "x64"]
    variables = {
        "BOOST": "boost",
        "ICU": "icu" if host == "win32-x64" else "icuLinux",
        "SQLITE": "sqlite",
        "DOUBLE_CONVERSION": "doubleConversion",
        "NODE_HEADERS": "nodeHeaders",
    }
    for variable, name in variables.items():
        configure.append("-DJSON_QUALITY_" + variable + "_ROOT=" + str(roots[name]))
    if host == "win32-x64":
        configure += [
            "-DJSON_QUALITY_ICU_TOOLS_ROOT=" + str(roots["icuWindowsTools"]),
            "-DJSON_QUALITY_NODE_IMPORT_LIBRARY="
            + str(roots["nodeImportLibrary"] / "node.lib"),
        ]
    CONTEXT["stage"] = "configure"
    command(configure, ROOT, logs, "configure")
    compile_args = [
        args.cmake,
        "--build",
        build,
        "--config",
        "Release",
        "--parallel",
        str(args.jobs),
    ]
    if host == "win32-x64":
        compile_args += ["--", "/nodeReuse:false"]
    CONTEXT["stage"] = "compile"
    command(compile_args, ROOT, logs, "compile", timeout=1800)
    CONTEXT["stage"] = "verify-build-source-integrity"
    for name, destination in roots.items():
        extract(
            verified_archives[name], POLICY["sources"][name], destination, verify=True
        )
    CONTEXT["stage"] = "stage-artifacts"
    command(
        [args.cmake, "--install", build, "--config", "Release", "--prefix", output],
        ROOT,
        logs,
        "stage-artifacts",
    )
    if input_identities() != inputs:
        raise ValueError("First-party source changed during producer build")
    reply = build / ".cmake/api/v1/reply"
    index = json.loads(next(reply.glob("index-*.json")).read_text(encoding="utf-8"))
    toolchain = json.loads(
        (reply / index["reply"]["toolchains-v1"]["jsonFile"]).read_text(
            encoding="utf-8"
        )
    )
    compilers = []
    for item in toolchain["toolchains"]:
        compiler = item["compiler"]
        identity = {
            "language": item["language"],
            "id": compiler.get("id"),
            "version": compiler.get("version"),
            "executableSha256": None,
        }
        if item["language"] in ("C", "CXX"):
            if not identity["id"] or not identity["version"]:
                raise ValueError("C/C++ compiler identity unavailable")
            identity["executableSha256"] = digest(Path(compiler["path"]))
        else:
            identity["scope"] = (
                "CMake auxiliary toolchain; identity fields may be unavailable"
            )
        compilers.append(identity)
    binaries = [
        "json-quality.node",
        "json-quality-native" + (".exe" if host == "win32-x64" else ""),
    ]
    artifacts = {
        name: {"sha256": digest(output / name), "bytes": (output / name).stat().st_size}
        for name in binaries
    }
    manifest = {
        "schemaVersion": COHORT["componentSchemaVersion"],
        "cohort": COHORT,
        "platform": host,
        "nodeApiVersion": POLICY["nodeApiVersion"],
        "sourceInputsSha256": source_digest,
        "artifacts": artifacts,
        "configurationSchemaSha256": inputs["schemas/configuration.schema.json"],
        "controlSchemas": {
            name: {
                "sha256": inputs["schemas/" + name],
                "bytes": (REPO / "schemas" / name).stat().st_size,
            }
            for name in (
                "configuration.schema.json",
                "source-contract.schema.json",
                "contract-cohort.json",
            )
        },
        "components": {key: value for key, value in POLICY.items() if key != "sources"},
    }
    save(output / "component.json", manifest)
    evidence = {
        "schemaVersion": 1,
        "status": "pending installed, rights and final review qualification",
        "sourceInputs": inputs,
        "sourceInputsSha256": source_digest,
        "platform": host,
        "dependencies": dependencies,
        "compilers": compilers,
        "generatedFiles": {p.name: digest(p) for p in sorted(generated.iterdir())},
        "artifactFiles": {
            p.relative_to(output).as_posix(): digest(p)
            for p in sorted(output.rglob("*"))
            if p.is_file()
        },
    }
    save(output / "build-evidence.json", evidence)
    print(
        json.dumps(
            {
                "state": "built",
                "platform": host,
                "artifacts": str(output),
                "sourceInputsSha256": source_digest,
                "qualification": evidence["status"],
            }
        ),
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        if CONTEXT is not None:
            save(
                CONTEXT["attempt"] / "failure.json",
                {
                    "schemaVersion": 1,
                    "stage": CONTEXT["stage"],
                    "errorType": type(error).__name__,
                    "message": str(error),
                    "sourceInputs": CONTEXT["inputs"],
                    "complete": False,
                },
            )
        raise
