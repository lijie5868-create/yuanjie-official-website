#!/usr/bin/env python3
"""Create a checksum inventory and verify local website asset references."""

from __future__ import annotations

import hashlib
import json
import pathlib
import re


ROOT = pathlib.Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "backups" / "local-files-manifest.json"
TEXT_EXTENSIONS = {
    ".css", ".html", ".js", ".json", ".md", ".py", ".sql", ".txt", ".yml", ".yaml"
}
IMAGE_EXTENSIONS = {".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"}
ASSET_EXTENSIONS = IMAGE_EXTENSIONS | {".otf", ".ttf", ".woff", ".woff2"}
SKIP_DIRS = {".git", ".DS_Store", "backups"}
REFERENCE_RE = re.compile(
    r"(?:src|href)=[\"']([^\"'#?]+)|url\([\"']?([^\"')?#]+)", re.IGNORECASE
)


def sha256(path: pathlib.Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def included(path: pathlib.Path) -> bool:
    relative = path.relative_to(ROOT)
    if any(part in SKIP_DIRS for part in relative.parts):
        return False
    return path.suffix.lower() in TEXT_EXTENSIONS | IMAGE_EXTENSIONS


def main():
    files = sorted(path for path in ROOT.rglob("*") if path.is_file() and included(path))
    records = []
    for path in files:
        relative = path.relative_to(ROOT).as_posix()
        records.append(
            {
                "path": relative,
                "type": "image" if path.suffix.lower() in IMAGE_EXTENSIONS else "text",
                "bytes": path.stat().st_size,
                "sha256": sha256(path),
            }
        )

    missing = []
    checked_references = 0
    for source in sorted((ROOT / "dist").rglob("*")):
        if not source.is_file() or source.suffix.lower() not in {".css", ".html", ".js"}:
            continue
        content = source.read_text(encoding="utf-8", errors="replace")
        for match in REFERENCE_RE.finditer(content):
            reference = next(value for value in match.groups() if value)
            if reference.startswith(("http://", "https://", "data:", "mailto:", "tel:", "#")):
                continue
            if reference.endswith((".html", ".js", ".css")):
                continue
            if pathlib.PurePosixPath(reference).suffix.lower() not in ASSET_EXTENSIONS:
                continue
            checked_references += 1
            candidate = (source.parent / reference).resolve()
            if not candidate.is_relative_to(ROOT.resolve()) or not candidate.exists():
                missing.append({"source": source.relative_to(ROOT).as_posix(), "reference": reference})

    manifest = {
        "scope": "local text, source, generated website and image files",
        "text_file_count": sum(item["type"] == "text" for item in records),
        "image_file_count": sum(item["type"] == "image" for item in records),
        "total_bytes": sum(item["bytes"] for item in records),
        "checked_local_asset_references": checked_references,
        "missing_local_asset_references": missing,
        "files": records,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "text_files": manifest["text_file_count"],
                "image_files": manifest["image_file_count"],
                "checked_references": checked_references,
                "missing_references": len(missing),
            }
        )
    )
    raise SystemExit(1 if missing else 0)


if __name__ == "__main__":
    main()
