"""Package the complete licensed source fonts as compressed WOFF fallbacks.

The primary web fonts contain only characters present in the static HTML. CMS
content can introduce other characters, so those need the same font family.
"""
from pathlib import Path
import struct
import zlib


def ttf_to_woff(source: Path, destination: Path) -> None:
    data = source.read_bytes()
    flavor, count = struct.unpack_from(">IH", data)
    tables = []
    for index in range(count):
        tag, checksum, offset, length = struct.unpack_from(">4sIII", data, 12 + 16 * index)
        original = data[offset:offset + length]
        compressed = zlib.compress(original, 9)
        payload = compressed if len(compressed) < length else original
        tables.append((tag, checksum, length, payload))
    output = bytearray(44 + count * 20)
    cursor = len(output)
    for index, (tag, checksum, length, payload) in enumerate(tables):
        cursor = (cursor + 3) & ~3
        output.extend(b"\0" * (cursor - len(output)))
        struct.pack_into(">4sIIII", output, 44 + index * 20,
                         tag, cursor, len(payload), length, checksum)
        output.extend(payload)
        cursor += len(payload)
    major, minor = 1, 0
    struct.pack_into(">4sIIHHIHHIIIII", output, 0, b"wOFF", flavor,
                     len(output), count, 0, len(data), major, minor,
                     0, 0, 0, 0, 0)
    destination.write_bytes(output)


if __name__ == "__main__":
    root = Path(__file__).resolve().parent
    for weight in ("400", "600"):
        ttf_to_woff(root / "font-source" / f"noto-serif-tc-{weight}.ttf",
                    root / "dist" / "assets" / "fonts" / f"noto-serif-tc-{weight}-complete.woff")
