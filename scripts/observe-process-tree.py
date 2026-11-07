# SPDX-License-Identifier: AGPL-3.0-only
"""Fresh process-domain observation; platform methods adapted from Markdown Quality
qualify-performance.py at fa1188a867b29bddd0b972a080b7fcd0261bdec3.
The controller is outside the domain; a gated Python worker is inside it before
any workload starts. No product resource limit is imposed by these observations.
"""

import argparse
import ctypes
import json
import os
import shutil
import signal
import subprocess
import sys
import tempfile
import time
from pathlib import Path


def windows_domain():
    from ctypes import wintypes

    kernel = ctypes.WinDLL("kernel32", use_last_error=True)

    class Basic(ctypes.Structure):
        _fields_ = [
            ("process_time", ctypes.c_int64),
            ("job_time", ctypes.c_int64),
            ("flags", wintypes.DWORD),
            ("working_min", ctypes.c_size_t),
            ("working_max", ctypes.c_size_t),
            ("active_limit", wintypes.DWORD),
            ("affinity", ctypes.c_size_t),
            ("priority", wintypes.DWORD),
            ("scheduling", wintypes.DWORD),
        ]

    class Io(ctypes.Structure):
        _fields_ = [
            (name, ctypes.c_uint64)
            for name in (
                "read_ops",
                "write_ops",
                "other_ops",
                "read_bytes",
                "write_bytes",
                "other_bytes",
            )
        ]

    class Extended(ctypes.Structure):
        _fields_ = [
            ("basic", Basic),
            ("io", Io),
            ("process_limit", ctypes.c_size_t),
            ("job_limit", ctypes.c_size_t),
            ("peak_process", ctypes.c_size_t),
            ("peak_job", ctypes.c_size_t),
        ]

    class Accounting(ctypes.Structure):
        _fields_ = [
            ("user", ctypes.c_int64),
            ("kernel", ctypes.c_int64),
            ("period_user", ctypes.c_int64),
            ("period_kernel", ctypes.c_int64),
            ("faults", wintypes.DWORD),
            ("processes", wintypes.DWORD),
            ("active", wintypes.DWORD),
            ("terminated", wintypes.DWORD),
        ]

    for name, arguments, result in (
        ("CreateJobObjectW", [ctypes.c_void_p, wintypes.LPCWSTR], wintypes.HANDLE),
        ("AssignProcessToJobObject", [wintypes.HANDLE, wintypes.HANDLE], wintypes.BOOL),
        (
            "QueryInformationJobObject",
            [
                wintypes.HANDLE,
                ctypes.c_int,
                ctypes.c_void_p,
                wintypes.DWORD,
                ctypes.c_void_p,
            ],
            wintypes.BOOL,
        ),
        (
            "SetInformationJobObject",
            [wintypes.HANDLE, ctypes.c_int, ctypes.c_void_p, wintypes.DWORD],
            wintypes.BOOL,
        ),
        ("TerminateJobObject", [wintypes.HANDLE, wintypes.UINT], wintypes.BOOL),
        ("CloseHandle", [wintypes.HANDLE], wintypes.BOOL),
    ):
        function = getattr(kernel, name)
        function.argtypes, function.restype = arguments, result

    def checked(value):
        if not value:
            raise ctypes.WinError(ctypes.get_last_error())
        return value

    job = checked(kernel.CreateJobObjectW(None, None))
    try:
        policy = Extended()
        policy.basic.flags = 0x2000  # Kill on close; breakaway is not permitted.
        checked(
            kernel.SetInformationJobObject(
                job, 9, ctypes.byref(policy), ctypes.sizeof(policy)
            )
        )
    except BaseException:
        kernel.CloseHandle(job)
        raise

    def sample():
        memory, accounting = Extended(), Accounting()
        for number, record in ((9, memory), (1, accounting)):
            checked(
                kernel.QueryInformationJobObject(
                    job, number, ctypes.byref(record), ctypes.sizeof(record), None
                )
            )
        return memory.peak_job, accounting.active, accounting.processes

    return (
        lambda child: checked(kernel.AssignProcessToJobObject(job, int(child._handle))),
        sample,
        lambda: checked(kernel.TerminateJobObject(job, 2)),
        lambda: checked(kernel.CloseHandle(job)),
    )


def linux_sample(group, seen):
    rss, active = 0, 0
    for path in Path("/proc").iterdir():
        if not path.name.isdecimal():
            continue
        try:
            fields = (path / "stat").read_text().rsplit(")", 1)[1].split()
            if int(fields[2]) != group:
                continue
            seen.add((int(path.name), fields[19]))  # PID plus start time.
            if fields[0] != "Z":
                active += 1
            rss += int(fields[21]) * os.sysconf("SC_PAGE_SIZE")
        except (FileNotFoundError, ProcessLookupError):
            continue
    return rss, active, len(seen)


def remove_scratch(path):
    deadline = time.monotonic() + 0.5
    while True:
        try:
            shutil.rmtree(path)
            return
        except OSError as error:
            remaining = deadline - time.monotonic()
            if (
                sys.platform != "win32"
                or getattr(error, "winerror", None) != 32
                or remaining <= 0
            ):
                raise
            time.sleep(min(0.05, remaining))


def observe(command, timeout):
    began = time.monotonic()
    result = {
        "schemaVersion": 1,
        "status": "failed",
        "platform": sys.platform,
        "units": "bytes",
        "peakBytes": 0,
        "samples": 0,
        "sampleIntervalMs": 10,
        "processCount": 0,
        "driverIncluded": True,
        "controllerIncluded": False,
        "timedOut": False,
        "cancelled": False,
        "quiescence": "unknown",
        "cleanup": "unknown",
        "exitCode": None,
    }
    child = None
    close = None
    sample = None
    stop = None
    scratch = None
    admitted = False

    def failure(phase, error, cleanup=False):
        detail = {"phase": phase, "type": type(error).__name__, "message": str(error)}
        for key in ("errno", "winerror"):
            value = getattr(error, key, None)
            if value is not None:
                detail[key] = value
        result.setdefault("failures", []).append(detail)
        result["status"] = "failed"
        result.setdefault(
            "cleanupError" if cleanup else "error", f"{type(error).__name__}: {error}"
        )
        if cleanup:
            result["cleanup"] = "failed"

    try:
        if sys.platform == "win32":
            assign, sample, stop, close = windows_domain()
            result.update(
                method="windows-job",
                metric="peak-committed-bytes",
                processCountMeaning="total processes including gated worker",
            )
        elif sys.platform == "linux":
            result.update(
                method="linux-process-group",
                metric="sampled-sum-rss-bytes",
                processCountMeaning="sampled PID/start-time identities including gated worker; short processes may be missed",
                limitations="10 ms sampling may miss peaks; shared pages may be counted multiple times; product children must remain in this session/group",
            )
        else:
            raise RuntimeError("Unsupported process observer platform")
        scratch = tempfile.mkdtemp(prefix="json-tree-")
        stdout, stderr = Path(scratch) / "stdout", Path(scratch) / "stderr"
        with stdout.open("wb") as out, stderr.open("wb") as err:
            child = subprocess.Popen(
                [sys.executable, __file__, "--worker", *command],
                stdin=subprocess.PIPE,
                stdout=out,
                stderr=err,
                start_new_session=sys.platform == "linux",
            )
            result["domainLeader"] = child.pid
            if sys.platform == "win32":
                assign(child)  # Worker cannot create children until this succeeds.
            else:
                seen = set()
                sample = lambda: linux_sample(child.pid, seen)

                def stop():
                    try:
                        os.killpg(child.pid, signal.SIGKILL)
                    except ProcessLookupError:
                        pass

            admitted = True

            child.stdin.write(b"go\n")
            child.stdin.close()

            def record():
                peak, active, count = sample()
                result["peakBytes"] = max(result["peakBytes"], peak)
                result["processCount"] = max(result["processCount"], count)
                result["samples"] += 1
                return active

            while True:
                record()
                if stdout.stat().st_size + stderr.stat().st_size > 4 * 1024 * 1024:
                    raise RuntimeError("Workload output exceeds observation bound")
                if child.poll() is not None:
                    break
                if time.monotonic() - began >= timeout:
                    result["timedOut"] = True
                    raise TimeoutError("Workload observation timed out")
                time.sleep(0.01)
            result["exitCode"] = child.returncode
            if record() != 0:
                raise RuntimeError("Owned descendants survived the workload")
            result["quiescence"] = "passed"
            if child.returncode != 0:
                raise RuntimeError("Workload failed")
            result["stdout"] = stdout.read_bytes()[: 4 * 1024 * 1024].decode(
                "utf-8", errors="strict"
            )
            result["stderr"] = stderr.read_bytes()[: 4 * 1024 * 1024].decode(
                "utf-8", errors="strict"
            )
            result["status"] = "passed"
    except BaseException as error:  # noqa: BLE001 -- Cancellation must retain the failed observation and clean the owned domain.
        failure("observe", error)
        result["cancelled"] = isinstance(error, KeyboardInterrupt)
    finally:
        try:
            if child:
                if not admitted and child.poll() is None:
                    child.kill()
                if sample and stop:
                    if result["status"] != "passed":
                        # Observation itself may be permanently unavailable.
                        # Containment teardown cannot depend on another sample.
                        stop()
                    elif sample()[1]:
                        stop()
                    child.wait(timeout=5)
                    deadline = time.monotonic() + 5
                    while sample()[1] and time.monotonic() < deadline:
                        time.sleep(0.01)
                    if sample()[1]:
                        raise RuntimeError("Owned processes remain after cleanup")
                elif child.poll() is None:
                    child.kill()  # Ungated worker only; no workload was started.
                    child.wait(timeout=5)
            result["cleanup"] = "passed"
        except BaseException as error:  # noqa: BLE001 -- Cleanup failure must remain visible even during cancellation.
            failure("processes", error, cleanup=True)
        try:
            if close:
                close()
        except BaseException as error:  # noqa: BLE001 -- Continue scratch cleanup and preserve the report.
            failure("close", error, cleanup=True)
        if scratch:
            for name in ("stdout", "stderr"):
                try:
                    path = Path(scratch) / name
                    if path.exists() and name not in result:
                        with path.open("rb") as stream:
                            result[name] = stream.read(4 * 1024 * 1024).decode(
                                "utf-8", errors="replace"
                            )
                except BaseException as error:  # noqa: BLE001 -- Readback failure must not prevent deletion or report delivery.
                    failure(name, error)
            try:
                remove_scratch(scratch)
            except BaseException as error:  # noqa: BLE001 -- Permanent cleanup failure is a failed structured observation.
                failure("scratch", error, cleanup=True)
        result["elapsedMs"] = (time.monotonic() - began) * 1000
    return result


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--worker":
        if sys.stdin.buffer.readline() != b"go\n":
            sys.exit(2)
        sys.exit(subprocess.call(sys.argv[2:]))
    parser = argparse.ArgumentParser()
    parser.add_argument("--timeout", type=float, default=180)
    parser.add_argument("command", nargs=argparse.REMAINDER)
    args = parser.parse_args()
    command = args.command[1:] if args.command[:1] == ["--"] else args.command
    if not command or not 0 < args.timeout <= 180:
        parser.error("A command and a timeout in (0, 180] are required")
    if sys.platform == "linux":

        def cancelled(_signal, _frame):
            raise KeyboardInterrupt("Observation cancelled")

        signal.signal(signal.SIGTERM, cancelled)
    report = observe(command, args.timeout)
    print(json.dumps(report), flush=True)
    sys.exit(0 if report["status"] == "passed" else 1)
