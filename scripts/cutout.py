#!/usr/bin/env python3
"""Cut solid-dark backgrounds out of character art, leaving a clean silhouette.

Flood-fills darkness from the edges only, so dark shading *inside* the character
survives. Writes <name>-cut.png next to the source, cropped to content.

Usage: python3 scripts/cutout.py images/cut-kaito.png [more files...]
"""
import sys
from collections import deque

from PIL import Image

TOLERANCE = 38  # colour distance from the corner colour that counts as background


def cut(path: str) -> None:
    img = Image.open(path).convert("RGB")
    w, h = img.size
    px = img.load()

    corners = [px[0, 0], px[w - 1, 0], px[0, h - 1], px[w - 1, h - 1]]
    bg = tuple(sum(c[i] for c in corners) // 4 for i in range(3))

    def is_bg(c):
        return sum(abs(c[i] - bg[i]) for i in range(3)) < TOLERANCE * 3

    dark = [[is_bg(px[x, y]) for x in range(w)] for y in range(h)]
    seen = [[False] * w for _ in range(h)]
    q = deque()

    for x in range(w):
        for y in (0, h - 1):
            if dark[y][x] and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if dark[y][x] and not seen[y][x]:
                seen[y][x] = True
                q.append((x, y))

    while q:
        x, y = q.popleft()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and dark[ny][nx] and not seen[ny][nx]:
                seen[ny][nx] = True
                q.append((nx, ny))

    out = img.convert("RGBA")
    opx = out.load()
    for y in range(h):
        row = seen[y]
        for x in range(w):
            if row[x]:
                opx[x, y] = (0, 0, 0, 0)

    bbox = out.getbbox()
    if bbox:
        pad = 6
        left, top, right, bottom = bbox
        out = out.crop(
            (max(0, left - pad), max(0, top - pad), min(w, right + pad), min(h, bottom + pad))
        )

    dest = path.replace(".png", "-cut.png")
    out.save(dest)
    print(f"{dest} · {out.size[0]}x{out.size[1]}")


if __name__ == "__main__":
    for p in sys.argv[1:]:
        cut(p)
