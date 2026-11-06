# SPDX-License-Identifier: AGPL-3.0-only
"""Independent, finite standard-library host for the packaged framed service.

This is a qualification host, not a second JSON data parser or product adapter.
JSON decoding below is confined to bounded protocol controls.
"""

import ctypes
import hashlib
import json
import os
import queue
import struct
import subprocess
import sys
import threading
import time
import uuid
from pathlib import Path


class NativeError(Exception):
    def __init__(self, control):
        self.control = control
        super().__init__(control["code"])


def exact(stream, size):
    result = bytearray()
    while len(result) < size:
        part = stream.read(size - len(result))
        if not part:
            raise EOFError("Truncated native response")
        result.extend(part)
    return bytes(result)


class Host:
    def __init__(self, executable, parent, manifest):
        self.scratch = parent / ("stdio-" + uuid.uuid4().hex)
        self.process = subprocess.Popen(
            [str(executable), str(self.scratch)],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            bufsize=0,
        )
        self.deadline = threading.Timer(120, self.process.kill)
        self.deadline.start()
        self.frames = queue.Queue(maxsize=4)
        self.stderr = bytearray()
        self.sequence = 0
        self.reply_fragments = 0
        self.control_fragment_size = 7
        self.reader = threading.Thread(target=self.read_frames, daemon=True)
        self.errors = threading.Thread(target=self.read_errors, daemon=True)
        self.reader.start()
        self.errors.start()
        try:
            hello = self.receive("J")
            self.protocol_version = manifest["cohort"]["nativeProtocolVersion"]
            assert hello["protocolVersion"] == self.protocol_version
            assert hello["sourceInputsSha256"] == manifest["sourceInputsSha256"]
            for field, component in [
                ("icu", "icuVersion"),
                ("unicode", "unicodeVersion"),
                ("sqlite", "sqliteVersion"),
            ]:
                assert hello[field] == manifest["components"][component]
            self.owner = hello["owner"]
            assert len(self.owner) == 32 and all(
                c in "0123456789abcdef" for c in self.owner
            )
        except BaseException as error:  # noqa: BLE001 - Settle every startup failure and preserve its original cause.
            self.fail(error, "startup")

    def fail(self, error, phase):
        self.deadline.cancel()
        cleanup_errors = []
        for operation in (
            lambda: self.process.kill() if self.process.poll() is None else None,
            lambda: self.process.wait(timeout=10),
            lambda: self.deadline.join(timeout=2),
            lambda: self.reader.join(timeout=2),
            lambda: self.errors.join(timeout=2),
            self.process.stdin.close,
            self.process.stdout.close,
            self.process.stderr.close,
        ):
            try:
                operation()
            except Exception as cleanup_error:  # noqa: BLE001 - Preserve the original protocol failure while settling every owned resource.
                cleanup_errors.append(repr(cleanup_error))
        failure = RuntimeError(
            f"Native {phase} failed (exit {self.process.returncode}): "
            + self.stderr.decode("utf-8", errors="replace")
        )
        for cleanup_error in cleanup_errors:
            failure.add_note("Failure settlement: " + cleanup_error)
        raise failure from error

    def read_frames(self):
        try:
            while True:
                header = exact(self.process.stdout, 5)
                length = struct.unpack("<I", header[1:])[0]
                assert length <= 65536
                self.frames.put((chr(header[0]), exact(self.process.stdout, length)))
        except BaseException as error:  # noqa: BLE001 - Relay reader-thread failures to its supervisor.
            self.frames.put(error)

    def read_errors(self):
        while True:
            part = self.process.stderr.read(4096)
            if not part:
                return
            self.stderr.extend(part)
            if len(self.stderr) > 65536:
                self.process.kill()
                return

    def receive(self, kind):
        frame = self.frames.get(timeout=120)
        parts = bytearray()
        while kind == "J" and not isinstance(frame, BaseException) and frame[0] == "j":
            parts.extend(frame[1])
            self.reply_fragments += 1
            self.frame("R")
            frame = self.frames.get(timeout=120)
        if isinstance(frame, BaseException):
            raise frame
        if frame[0] == "E" and kind != "E":
            raise NativeError(json.loads(frame[1]))
        assert frame[0] == kind, ("Unexpected frame kind", frame[0], kind)
        if kind in ("D", "j"):
            return frame[1]
        parts.extend(frame[1])
        return json.loads(parts)

    def write(self, value):
        view = memoryview(value)
        while view:
            count = self.process.stdin.write(view)
            assert count
            view = view[count:]

    def frame(self, kind, body=b""):
        assert len(body) <= 65536
        self.write(kind.encode("ascii") + struct.pack("<I", len(body)) + body)

    def request(self, command, *, data=False, **fields):
        self.sequence += 1
        request = dict(
            fields,
            protocolVersion=self.protocol_version,
            owner=self.owner,
            requestId=str(self.sequence),
            command=command,
        )
        body = json.dumps(request, separators=(",", ":")).encode()
        # Fragment controls as well as raw data; there is no per-C acknowledgement.
        size = self.control_fragment_size
        for offset in range(0, len(body), size):
            self.frame(
                "c" if offset + size >= len(body) else "C", body[offset : offset + size]
            )
        payload = self.receive("D") if data else None
        response = self.receive("J")
        assert response["requestId"] == str(self.sequence)
        return (response, payload) if data else response

    def settle(self, expected):
        if not self.process.stdin.closed:
            self.process.stdin.close()
        code = self.process.wait(timeout=10)
        self.deadline.cancel()
        self.reader.join(timeout=2)
        self.errors.join(timeout=2)
        self.process.stdout.close()
        self.process.stderr.close()
        assert code == expected, (code, bytes(self.stderr))
        assert not self.stderr
        assert not self.scratch.exists(), "Unsettled owned scratch: " + str(
            self.scratch
        )

    def close(self):
        try:
            assert self.request("close")["type"] == "closed"
            self.settle(0)
        except BaseException as error:  # noqa: BLE001 - Settle every close failure and preserve its original cause.
            self.fail(error, "close")


def windows_peak(process=None, parent=False):
    if os.name != "nt":
        return None

    class Counters(ctypes.Structure):
        _fields_ = [("cb", ctypes.c_ulong), ("faults", ctypes.c_ulong)] + [
            (name, ctypes.c_size_t)
            for name in (
                "peak",
                "working",
                "pagedPeak",
                "paged",
                "nonpagedPeak",
                "nonpaged",
                "pagefile",
                "pagefilePeak",
            )
        ]

    counters = Counters()
    counters.cb = ctypes.sizeof(counters)
    query = ctypes.WinDLL("psapi").GetProcessMemoryInfo
    query.argtypes = [ctypes.c_void_p, ctypes.c_void_p, ctypes.c_ulong]
    query.restype = ctypes.c_int
    handle = int(process._handle) if process is not None else -1
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    if parent:
        kernel.OpenProcess.argtypes = [ctypes.c_ulong, ctypes.c_int, ctypes.c_ulong]
        kernel.OpenProcess.restype = ctypes.c_void_p
        handle = kernel.OpenProcess(0x410, False, int(sys.argv[4]))
        assert handle
    try:
        assert query(handle, ctypes.byref(counters), counters.cb)
        return counters.peak
    finally:
        if parent:
            kernel.CloseHandle.argtypes = [ctypes.c_void_p]
            assert kernel.CloseHandle(handle)


def scalar(executable, parent, manifest, mib):
    host = Host(executable, parent, manifest)
    started = time.monotonic()
    length = mib * 1048576 if mib else 4096
    try:
        configured = host.request(
            "configure",
            maxManagedMemoryBytes="16777216",
            maxSourceBytes=None,
            maxTotalSourceBytes=None,
        )
        assert configured["type"] == "configured"
        ready = host.request(
            "begin-source",
            contract={"formatContract": "producer-json-compact-body"},
            retainValues=True,
            includeValueEvents=True,
        )
        assert ready["type"] == "source-ready"
        digest = hashlib.sha256()
        fragment = b"x" * 65536
        for part in [b'"']:
            digest.update(part)
            host.frame("B", part)
        for offset in range(0, length, 65536):
            part = fragment[: min(65536, length - offset)]
            digest.update(part)
            host.frame("B", part)
        digest.update(b'"')
        host.frame("B", b'"')
        host.frame("F")
        captured = host.receive("J")
        assert captured["type"] == "source-captured"
        assert captured["requestId"] == ready["requestId"]
        assert captured["source"] == ready["source"]
        assert captured["sha256"] == digest.hexdigest()
        assert captured["byteLength"] == str(length + 2)
        value = None
        while True:
            events = host.request("next")
            assert events["type"] == "events"
            for event in events["events"]:
                assert event["source"] == captured["source"]
                if event["type"] == "value" and event["kind"] == "string":
                    value = event["id"]
                if event["type"] == "terminal":
                    assert event["contractSatisfied"] is True
                    assert event["qualityPassed"] is True
                    break
            else:
                continue
            break
        assert value is not None
        # Verify exact retained bytes at both ends without materializing the value.
        maximum = min(length, 65536)
        for offset in [0, length - maximum]:
            response, payload = host.request(
                "read-value",
                data=True,
                value=value,
                representation="decoded-utf8",
                byteOffset=str(offset),
                maximumBytes=str(maximum),
            )
            assert response["byteLength"] == str(maximum)
            assert payload == fragment[:maximum]
        metrics = host.request("metrics")
        assert int(metrics["managedPeakBytes"]) <= 16777216
        assert metrics["spillTransitionCount"] == ("1" if mib else "0")
        assert (int(metrics["scratchPeakBytes"]) > 0) == bool(mib)
        if not mib:
            assert not host.scratch.exists()
        peak = windows_peak(host.process)
        host_peak, driver_peak = windows_peak(), windows_peak(parent=True)
        host.close()
        return {
            "mebibytes": mib,
            "sha256": digest.hexdigest(),
            "metrics": metrics,
            "peakWorkingSetBytes": peak,
            "pythonHostPeakWorkingSetBytes": host_peak,
            "testDriverPeakWorkingSetBytes": driver_peak,
            "conservativeProcessPeakSumBytes": (peak + host_peak + driver_peak)
            if peak
            else None,
            "seconds": time.monotonic() - started,
        }
    finally:
        if host.process.poll() is None:
            host.process.kill()
            host.process.wait(timeout=10)
        host.deadline.cancel()


def fault(executable, parent, manifest, name, expected):
    host = Host(executable, parent, manifest)
    try:
        if name == "foreign-owner":
            host.owner = "0" * 32
            try:
                host.request("configure")
                raise AssertionError("Foreign owner received a J reply")
            except NativeError as error:
                response = error.control
        else:
            if name == "missing-source-eof":
                host.request("configure")
                host.request("begin-source", contract={})
                host.frame("B", b"0")
            elif name == "truncated-header":
                host.write(b"c\x01")
            elif name == "truncated-body":
                host.write(b"c\x02\x00\x00\x00{")
            elif name == "oversized-frame":
                host.write(b"c" + struct.pack("<I", 65537))
            host.process.stdin.close()
            response = host.receive("E")
        assert response["type"] == "operational-error"
        assert response["complete"] is False
        assert response["code"] == expected, response
        host.settle(2)
        return {"case": name, "code": response["code"]}
    finally:
        if host.process.poll() is None:
            host.process.kill()
            host.process.wait(timeout=10)
        host.deadline.cancel()


def late_utf8(executable, parent, manifest):
    host = Host(executable, parent, manifest)
    try:
        host.request("configure")
        host.request(
            "begin-source", contract={"formatContract": "producer-json-compact-body"}
        )
        for part in (b"0", b" ", b"\xff"):
            host.frame("B", part)
        host.frame("F")
        capture = host.receive("J")
        assert capture["sha256"] == hashlib.sha256(b"0 \xff").hexdigest()
        while True:
            response = host.request("next")
            terminal = next(
                (e for e in response["events"] if e["type"] == "terminal"), None
            )
            if terminal:
                assert terminal["qualityPassed"] is False
                assert terminal["contractSatisfied"] is False
                host.close()
                return terminal
    finally:
        if host.process.poll() is None:
            host.process.kill()
            host.process.wait(timeout=10)
        host.deadline.cancel()


def cancellation(executable, parent, manifest):
    host = Host(executable, parent, manifest)
    try:
        host.request("configure")
        host.request("begin-source", contract={})
        host.frame("B", b'"incomplete')
        started = time.monotonic()
        host.process.kill()
        host.process.wait(timeout=5)
        elapsed = time.monotonic() - started
        assert host.process.returncode != 0
        # Forced termination is incomplete; it cannot create a successful terminal.
        assert not host.scratch.exists()
        return {
            "seconds": elapsed,
            "returncode": host.process.returncode,
            "complete": False,
            "scratchResidual": False,
        }
    finally:
        if host.process.poll() is None:
            host.process.kill()
            host.process.wait(timeout=10)
        host.deadline.cancel()
        host.process.stdin.close()
        host.reader.join(timeout=2)
        host.errors.join(timeout=2)
        host.process.stdout.close()
        host.process.stderr.close()


def ordinary(executable, parent, manifest):
    """Use the same admitted executable directly, without a Node source bridge."""
    schema = json.loads(
        (
            Path(__file__).resolve().parents[2] / "schemas/configuration.schema.json"
        ).read_text(encoding="utf-8")
    )
    controls = {
        name: None
        for group in ("capacityLimits", "runtimeControls")
        for name in schema["$defs"][group]["properties"]
    }
    host = Host(executable, parent, manifest)
    try:
        configured = host.request("configure", **controls)
        assert all(
            value is None
            for group in configured["resources"].values()
            for value in group.values()
        )
        ready = host.request(
            "begin-source",
            contract={"formatContract": "producer-json-compact-body"},
            retainValues=True,
        )
        depth = 4097
        payload = b"[" * depth + b"0" + b"]" * depth
        for offset in range(0, len(payload), 31):
            host.frame("B", payload[offset : offset + 31])
        host.frame("F")
        captured = host.receive("J")
        assert captured["source"] == ready["source"]
        assert captured["sha256"] == hashlib.sha256(payload).hexdigest()
        assert captured["byteLength"] == str(len(payload))
        terminal = None
        while terminal is None:
            for event in host.request("next")["events"]:
                assert event["type"] != "finding"
                if event["type"] == "terminal":
                    terminal = event
        assert terminal["contractSatisfied"] is True
        assert terminal["diagnosticsComplete"] is True
        selected = host.request(
            "select-value", source=captured["source"], pointer="/0" * depth
        )["value"]
        response, value = host.request(
            "read-value",
            data=True,
            value=selected["id"],
            representation="number-lexeme",
            byteOffset="0",
            maximumBytes="1",
        )
        assert response["byteLength"] == "1" and value == b"0"
        host.close()
        return {
            "depth": depth,
            "contractSatisfied": True,
            "fragmentBytes": 31,
            "pythonExecutable": sys.executable,
            "returncode": host.process.returncode,
        }
    except BaseException as error:  # noqa: BLE001 - Settle the child and preserve every original protocol failure, including interruption.
        host.fail(error, "unlimited ordinary read")


def metadata(executable, parent, manifest):
    """One real census record crosses the former path and metadata cell bounds."""
    schema = json.loads(
        (Path(__file__).resolve().parents[2] / "schemas/configuration.schema.json")
        .read_text(encoding="utf-8")
    )
    controls = {
        name: None
        for group in ("capacityLimits", "runtimeControls")
        for name in schema["$defs"][group]["properties"]
    }
    controls.update(maxManagedMemoryBytes="67108864", maxCheckTimeMs="60000")
    host = Host(executable, parent, manifest)
    host.control_fragment_size = 65536
    path, observation = "é" * 33000 + ".json", "observed-" * 9000
    try:
        host.request("configure", **controls)
        host.request("census-provider", id="paths", kind="physical", minimum="0")
        host.request("census-add", provider="paths", path=path, observation=observation)
        result = host.request("census-get", path=path)["member"]
        assert result["path"] == path and result["observation"] == observation
        fragments = host.reply_fragments
        assert fragments >= 2
        # Cleanup remains available when the consumer deliberately stops pulling.
        host.sequence += 1
        body = json.dumps(
            dict(
                command="census-get",
                path=path,
                protocolVersion=host.protocol_version,
                owner=host.owner,
                requestId=str(host.sequence),
            ),
            separators=(",", ":"),
        ).encode()
        for offset in range(0, len(body), 65536):
            host.frame(
                "c" if offset + 65536 >= len(body) else "C",
                body[offset : offset + 65536],
            )
        assert len(host.receive("j")) == 65536
        host.close()
    except BaseException as error:  # noqa: BLE001 - Preserve the owning native failure and settle the process.
        host.fail(error, "extended metadata")
    invalid = Host(executable, parent, manifest)
    try:
        invalid.request("configure", **controls)
        invalid.frame("R")
        error = invalid.receive("E")
        assert error["code"] == "response-read-state"
        invalid.settle(2)
    except BaseException as error:  # noqa: BLE001 - Preserve malformed transport evidence and settle the process.
        invalid.fail(error, "unexpected reply read")
    return dict(
        pathBytes=len(path.encode()),
        observationBytes=len(observation.encode()),
        fragments=fragments,
        partialReplyClosed=True,
        unexpectedReadRefused=True,
    )


def main():
    executable, manifest_path, parent = map(Path, sys.argv[1:4])
    assert os.getppid() == int(sys.argv[4]), (
        "An intermediate host process escaped measurement"
    )
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    identity = manifest["artifacts"][executable.name]
    with executable.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    assert digest == identity["sha256"]
    assert executable.stat().st_size == identity["bytes"]
    if len(sys.argv) == 6 and sys.argv[5] == "metadata":
        print(
            json.dumps(
                {
                    "metadata": metadata(executable, parent, manifest),
                    "executableSha256": digest,
                    "sourceInputsSha256": manifest["sourceInputsSha256"],
                }
            )
        )
        return
    if len(sys.argv) == 6 and sys.argv[5] == "ordinary":
        print(
            json.dumps(
                {
                    "ordinary": ordinary(executable, parent, manifest),
                    "executableSha256": digest,
                    "sourceInputsSha256": manifest["sourceInputsSha256"],
                }
            )
        )
        return
    scalars = [scalar(executable, parent, manifest, mib) for mib in (0, 8, 32, 128)]
    if os.name == "nt":
        assert (
            scalars[-1]["peakWorkingSetBytes"] - scalars[1]["peakWorkingSetBytes"]
            <= 33554432
        )
        assert (
            scalars[-1]["conservativeProcessPeakSumBytes"]
            - scalars[1]["conservativeProcessPeakSumBytes"]
            <= 33554432
        )
    faults = [
        fault(executable, parent, manifest, name, code)
        for name, code in (
            ("missing-source-eof", "transport-eof"),
            ("truncated-header", "truncated-frame-header"),
            ("truncated-body", "truncated-frame-body"),
            ("oversized-frame", "frame-size"),
            ("foreign-owner", "session-authority"),
        )
    ]
    print(
        json.dumps(
            {
                "sourceInputsSha256": manifest["sourceInputsSha256"],
                "executableSha256": digest,
                "scalars": scalars,
                "faults": faults,
                "pythonExecutable": sys.executable,
                "pythonVersion": sys.version,
                "lateUtf8": late_utf8(executable, parent, manifest),
                "cancellation": cancellation(executable, parent, manifest),
            }
        )
    )


if __name__ == "__main__":
    main()
