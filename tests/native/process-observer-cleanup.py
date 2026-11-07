# SPDX-License-Identifier: AGPL-3.0-only
"""Cleanup fault injection, including real Windows sharing violations."""

import importlib.util
import io
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "process_observer",
    Path(__file__).resolve().parents[2] / "scripts/observe-process-tree.py",
)
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)
node, workload = sys.argv[1:3]
del sys.argv[1:3]


class Child:
    pid = 123
    returncode = 0

    def __init__(self):
        self.stdin = io.BytesIO()

    def poll(self):
        return self.returncode

    def wait(self, timeout):
        return self.returncode


class CleanupTests(unittest.TestCase):
    def setUp(self):
        self.scratch = []
        self.mkdtemp = observer.tempfile.mkdtemp
        self.rmtree = observer.shutil.rmtree
        self.locks = []

        def tracked_scratch(*args, **kwargs):
            path = self.mkdtemp(*args, **kwargs)
            self.scratch.append(Path(path))
            return path

        self.patch = patch.object(observer.tempfile, "mkdtemp", tracked_scratch)
        self.patch.start()

    def tearDown(self):
        self.patch.stop()
        for stream in self.locks:
            stream.close()
        for path in self.scratch:
            if path.exists():
                self.rmtree(path)

    def fake_observation(self, close=None, exit_code=0):
        child = Child()
        child.returncode = exit_code
        with (
            patch.object(observer.sys, "platform", "win32"),
            patch.object(observer.subprocess, "Popen", return_value=child),
            patch.object(
                observer,
                "windows_domain",
                return_value=(Mock(), lambda: (1, 0, 1), Mock(), close or Mock()),
            ),
        ):
            return observer.observe(["unused fixture command"], 1)

    def test_close_failure_still_removes_scratch(self):
        close = Mock(side_effect=OSError("Injected close failure"))
        report = self.fake_observation(close=close)
        close.assert_called_once()
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["cleanup"], "failed")
        self.assertEqual(report["failures"][0]["phase"], "close")
        self.assertFalse(self.scratch[0].exists())

    def test_read_failure_still_removes_scratch_and_preserves_both_errors(self):
        original_open = Path.open

        def unreadable(path, mode="r", *args, **kwargs):
            if path.name == "stderr" and mode == "rb":
                raise PermissionError("Injected readback failure")
            return original_open(path, mode, *args, **kwargs)

        with patch.object(Path, "open", unreadable):
            report = self.fake_observation()
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["cleanup"], "passed")
        self.assertEqual([e["phase"] for e in report["failures"]], ["observe", "stderr"])
        self.assertIn("Injected readback failure", report["error"])
        self.assertFalse(self.scratch[0].exists())

    def test_other_deletion_errors_are_not_retried(self):
        error = PermissionError("Injected access denial")
        error.winerror = 5
        with patch.object(observer.shutil, "rmtree", side_effect=error) as remove:
            report = self.fake_observation(exit_code=7)
        remove.assert_called_once()
        self.assertEqual(report["status"], "failed")
        self.assertEqual(report["cleanup"], "failed")
        self.assertIn("Workload failed", report["error"])
        self.assertEqual(report["failures"][-1]["phase"], "scratch")
        self.assertEqual(report["failures"][-1]["winerror"], 5)

    def test_sharing_violation_retry_expires_without_suppressing_error(self):
        error = PermissionError("Persistent sharing violation")
        error.winerror = 32
        clock = [0.0]

        def sleep(delay):
            self.assertGreater(delay, 0)
            self.assertLessEqual(delay, 0.05)
            clock[0] += delay

        with (
            patch.object(observer.sys, "platform", "win32"),
            patch.object(observer.shutil, "rmtree", side_effect=error) as remove,
            patch.object(observer.time, "monotonic", side_effect=lambda: clock[0]),
            patch.object(observer.time, "sleep", side_effect=sleep),
            self.assertRaises(PermissionError) as raised,
        ):
            observer.remove_scratch("unused owned fixture path")
        self.assertIs(raised.exception, error)
        self.assertEqual(clock[0], 0.5)
        self.assertLessEqual(remove.call_count, 12)

    @unittest.skipUnless(sys.platform == "win32", "Windows sharing semantics")
    def test_real_sharing_violations(self):
        for mode in ("survivor", "timeout"):
            for transient in (True, False):
                with self.subTest(mode=mode, transient=transient):
                    attempts = []
                    lock = None

                    def locked_remove(path):
                        nonlocal lock
                        attempts.append(observer.time.monotonic())
                        if len(attempts) == 1:
                            lock = (Path(path) / "stderr").open("rb")
                            self.locks.append(lock)
                        try:
                            self.rmtree(path)
                        except OSError as error:
                            self.assertEqual(error.winerror, 32)
                            if transient:
                                lock.close()
                            raise

                    with observer.tempfile.TemporaryDirectory() as root:
                        pid_path = Path(root) / "grandchild.pid"
                        with patch.object(observer.shutil, "rmtree", locked_remove):
                            report = observer.observe(
                                [node, workload, mode, str(pid_path)],
                                0.5 if mode == "timeout" else 5,
                            )
                        # Independent OS readback, rather than trusting cleanup fields.
                        pid = int(pid_path.read_text())
                        probe = observer.subprocess.run(
                            [
                                node,
                                "-e",
                                "try { process.kill(Number(process.argv[1]), 0); "
                                "process.exitCode = 1; } catch (error) { "
                                'if (error.code !== "ESRCH") throw error; }',
                                str(pid),
                            ],
                            capture_output=True,
                            text=True,
                            timeout=5,
                        )
                        self.assertEqual(probe.returncode, 0, probe.stderr)
                        self.assertEqual(report["status"], "failed")
                        self.assertEqual(report["timedOut"], mode == "timeout")
                        self.assertGreaterEqual(len(attempts), 2)
                        self.assertIn(
                            "timed out" if mode == "timeout" else "descendants survived",
                            report["error"],
                        )
                        scratch = self.scratch[-1]
                        if transient:
                            self.assertEqual(report["cleanup"], "passed")
                            self.assertFalse(scratch.exists())
                        else:
                            self.assertEqual(report["cleanup"], "failed")
                            self.assertEqual(report["failures"][-1]["phase"], "scratch")
                            self.assertEqual(report["failures"][-1]["winerror"], 32)
                            self.assertGreaterEqual(attempts[-1] - attempts[0], 0.49)
                            self.assertTrue(scratch.exists())
                        lock.close()


if __name__ == "__main__":
    unittest.main()
