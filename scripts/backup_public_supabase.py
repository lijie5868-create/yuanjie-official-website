#!/usr/bin/env python3
"""Export the website's publicly readable Supabase content and Storage files.

This intentionally uses only the frontend publishable key. It does not export
Auth users, secrets, private tables, or Edge Function source code.
"""

from __future__ import annotations

import json
import pathlib
import re
import urllib.parse
import urllib.request


ROOT = pathlib.Path(__file__).resolve().parents[1]
CONFIG = ROOT / "dist" / "admin" / "config.js"
BACKUP = ROOT / "backups" / "supabase-public"
TABLES = (
    "published_pages",
    "published_posts",
    "published_navigation",
)


def request(url: str, key: str, *, method: str = "GET", body: bytes | None = None):
    req = urllib.request.Request(
        url,
        data=body,
        method=method,
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as response:
        return response.read()


def load_config():
    text = CONFIG.read_text(encoding="utf-8")
    url = re.search(r'supabaseUrl:"([^"]+)"', text)
    key = re.search(r'publishableKey:"([^"]+)"', text)
    if not url or not key:
        raise RuntimeError("Could not read the Supabase URL and publishable key")
    return url.group(1).rstrip("/"), key.group(1)


def safe_storage_path(name: str) -> pathlib.Path:
    path = pathlib.PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError(f"Unsafe Storage object path: {name}")
    return pathlib.Path(*path.parts)


def list_storage(base_url: str, key: str, prefix: str = ""):
    payload = json.dumps({"prefix": prefix, "limit": 1000, "offset": 0}).encode()
    raw = request(
        f"{base_url}/storage/v1/object/list/site-media",
        key,
        method="POST",
        body=payload,
    )
    items = json.loads(raw)
    files = []
    for item in items:
        name = item.get("name", "")
        full_name = f"{prefix}/{name}".strip("/")
        if item.get("id") is None:
            files.extend(list_storage(base_url, key, full_name))
        else:
            files.append({**item, "path": full_name})
    return files


def main():
    base_url, key = load_config()
    BACKUP.mkdir(parents=True, exist_ok=True)
    counts = {}

    for table in TABLES:
        raw = request(f"{base_url}/rest/v1/{table}?select=*", key)
        records = json.loads(raw)
        (BACKUP / f"{table}.json").write_text(
            json.dumps(records, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        counts[table] = len(records)

    storage_files = list_storage(base_url, key)
    storage_root = BACKUP / "storage" / "site-media"
    for item in storage_files:
        relative = safe_storage_path(item["path"])
        destination = storage_root / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        encoded = urllib.parse.quote(item["path"], safe="/")
        destination.write_bytes(
            request(f"{base_url}/storage/v1/object/public/site-media/{encoded}", key)
        )

    manifest = {
        "project_ref": urllib.parse.urlparse(base_url).hostname.split(".")[0],
        "scope": "public Data API tables and public site-media Storage bucket",
        "tables": counts,
        "storage_bucket": "site-media",
        "storage_object_count": len(storage_files),
        "storage_objects": storage_files,
        "excludes": [
            "Auth users and sessions",
            "private draft tables",
            "admin activity audit log",
            "project secrets",
            "Edge Function source code",
        ],
    }
    (BACKUP / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({"tables": counts, "storage_objects": len(storage_files)}))


if __name__ == "__main__":
    main()
