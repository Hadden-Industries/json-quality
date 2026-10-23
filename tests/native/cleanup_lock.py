# SPDX-License-Identifier: AGPL-3.0-only
"""Hold an owned test scratch directory against removal until stdin closes."""

import ctypes
import os
import sys
from pathlib import Path

marker = Path(sys.argv[1])
if marker.name != "owner" or not marker.is_file():
    raise ValueError("Expected an existing owned scratch marker")
kind = sys.argv[2]
if kind not in {"member", "directory"}:
    raise ValueError("Expected member or directory removal trial")
if os.name == "nt":
    kernel = ctypes.WinDLL("kernel32", use_last_error=True)
    kernel.CreateFileW.argtypes = [
        ctypes.c_wchar_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
        ctypes.c_uint32,
        ctypes.c_uint32,
        ctypes.c_void_p,
    ]
    kernel.CreateFileW.restype = ctypes.c_void_p
    kernel.CloseHandle.argtypes = [ctypes.c_void_p]
    kernel.CloseHandle.restype = ctypes.c_int
    target = marker.parent / "payload" if kind == "member" else marker.parent
    flags = 0x80 if kind == "member" else 0x02000000
    native = str(target.resolve())
    if not native.startswith("\\\\?\\"):
        native = (
            "\\\\?\\UNC\\" + native[2:]
            if native.startswith("\\\\")
            else "\\\\?\\" + native
        )
    handle = kernel.CreateFileW(native, 0x80000000, 3, None, 3, flags, None)
    if handle == ctypes.c_void_p(-1).value:
        raise ctypes.WinError(ctypes.get_last_error())
    try:
        print("locked", flush=True)
        sys.stdin.buffer.read(1)
    finally:
        if not kernel.CloseHandle(handle):
            raise ctypes.WinError(ctypes.get_last_error())
else:
    if os.geteuid() == 0:
        raise RuntimeError("Cleanup permission trial requires an unprivileged user")
    if kind == "member":
        # Leave SQLite's journal directory writable through COMMIT/close.
        target = marker.parent / "cleanup-blocked-child"
        target.mkdir(mode=0o700)
        (target / "held").write_bytes(b"owned cleanup fixture")
    else:
        target = marker.parent.parent
    original = target.stat().st_mode & 0o777
    target.chmod(0o500)
    try:
        print("locked", flush=True)
        sys.stdin.buffer.read(1)
    finally:
        target.chmod(original)
