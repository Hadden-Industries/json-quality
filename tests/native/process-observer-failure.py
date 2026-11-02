# SPDX-License-Identifier: AGPL-3.0-only
"""Rare observation failure oracle; no real process or process group is killed."""

import importlib.util
import io
import json
import sys
from pathlib import Path
from unittest.mock import patch

sys.dont_write_bytecode = True
spec = importlib.util.spec_from_file_location(
    "process_observer",
    Path(__file__).resolve().parents[2] / "scripts/observe-process-tree.py",
)
observer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(observer)
calls = []


class Child:
    pid = 123
    stdin = io.BytesIO()
    done = False

    def poll(self):
        return 0 if self.done else None

    def wait(self, timeout):
        calls.append(["wait", timeout])
        self.done = True
        return 0

    def kill(self):
        raise AssertionError("The admitted domain must use group teardown")


with (
    patch.object(observer.sys, "platform", "linux"),
    patch.object(observer.signal, "SIGKILL", 9, create=True),
    patch.object(observer.subprocess, "Popen", return_value=Child()),
    patch.object(
        observer, "linux_sample", side_effect=OSError("Observation unavailable")
    ),
    patch.object(
        observer.os,
        "killpg",
        side_effect=lambda group, sig: calls.append(["stop", group, sig]),
        create=True,
    ),
):
    result = observer.observe(["unused fixture command"], 1)

assert result["status"] == "failed"
assert (
    result["cleanup"] == "failed"
)  # Unavailable sampling cannot establish quiescence.
assert calls == [["stop", 123, 9], ["wait", 5]], calls
print(
    json.dumps(
        {
            "status": result["status"],
            "cleanup": result["cleanup"],
            "terminationAttempted": True,
        }
    )
)
