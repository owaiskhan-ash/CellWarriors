#!/usr/bin/env python3
"""Knock the black background out of the logo without eating the black inside it.

Flood-fills darkness from the image edges only, so outlines and shading inside the
lettering survive. Then crops to content and writes a transparent PNG for the UI.

Usage: python3 scripts/logo-alpha.py
"""
from collections import deque

from PIL import Image

SRC = "images/logo-anime-title.png"
OUT = "images/logo-transparent.png"
LUMA_CUT = 34  # anything darker than this, connected to the edge, is background


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    w, h = img.size
    px = img.load()

    dark = [[max(px[x, y]) < LUMA_CUT for x in range(w)] for y in range(h)]

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
        for x in range(w):
            if seen[y][x]:
                opx[x, y] = (0, 0, 0, 0)

    bbox = out.getbbox()
    if bbox:
        pad = 8
        left, top, right, bottom = bbox
        out = out.crop(
            (max(0, left - pad), max(0, top - pad), min(w, right + pad), min(h, bottom + pad))
        )

    out.save(OUT)
    print(f"{OUT} · {out.size[0]}x{out.size[1]} · alpha kept inside the lettering")


if __name__ == "__main__":
    main()
