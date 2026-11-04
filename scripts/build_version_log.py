#!/usr/bin/env python3
"""Build the admin-facing engineering version log from public Git history."""

from __future__ import annotations

import json
import pathlib
import subprocess


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "dist" / "admin" / "version-log.json"


def main():
    raw = subprocess.check_output(
        [
            "git",
            "log",
            "-50",
            "--date=iso-strict",
            "--pretty=format:%H%x1f%h%x1f%cI%x1f%s%x1e",
        ],
        cwd=ROOT,
        text=True,
    )
    versions = []
    for record in raw.strip("\x1e\n").split("\x1e"):
        if not record.strip():
            continue
        commit, short_commit, committed_at, summary = record.strip().split("\x1f", 3)
        versions.append(
            {
                "commit": commit,
                "short_commit": short_commit,
                "committed_at": committed_at,
                "summary": summary,
            }
        )
    OUTPUT.write_text(
        json.dumps(versions, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(versions)} website versions to {OUTPUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
