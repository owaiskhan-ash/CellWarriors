#!/usr/bin/env python3
"""
CELL WARRIORS — APK asset packer
================================
The repo keeps full-resolution source art (104 MB) because it doubles as the
art bible. A phone does not need 2048px JPEGs, so the APK bundles a *derived*
copy:

  • only assets the game actually references are copied (dead art is dropped),
  • illustrations are re-encoded to a phone-appropriate resolution,
  • transparent character cut-outs keep their alpha but lose the dead margins,
  • everything is rewritten deterministically so builds are reproducible.

Nothing in the repo is modified; output goes to build/apk/assets/game/.

Usage: scripts/pack-assets.py <src-root> <dst-game-dir>
"""
import os
import re
import sys

from PIL import Image

SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
DST = sys.argv[2] if len(sys.argv) > 2 else 'build/apk/assets/game'

# Width caps (px). Card art is drawn at <=160 CSS px, so 2x-3x is plenty even
# on a 3x-density phone.
CAP = {
    'cards': 420,      # images/cards/**  (card illustrations)
    'cardflat': 420,   # images/card-*.jpg (legacy flat card art)
    'bg': 1280,        # images/bg-*.jpg  (full-screen backdrops)
    'cut': 760,        # images/*-cut.png (transparent combatants)
    'char': 760,       # images/char-*.png
    'icons': 128,      # images/icons/**
    'default': 900,
}
DQ = 80   # JPEG quality
PQ = 78   # PNG quantisation target

# html/css/js that decide which assets are live
SCAN = ['index.html', 'styles.css', 'styles-mobile.css', 'czn.css', 'fonts.css',
        'manifest.webmanifest', 'src', 'scripts']


def collect_refs():
    refs = set()
    files = []
    for entry in SCAN:
        p = os.path.join(SRC, entry)
        if os.path.isfile(p):
            files.append(p)
        elif os.path.isdir(p):
            for root, _, names in os.walk(p):
                for n in names:
                    if n.endswith(('.js', '.mjs', '.css', '.html', '.webmanifest', '.json')):
                        files.append(os.path.join(root, n))
    pat = re.compile(r'((?:images|assets)/[A-Za-z0-9_./-]+\.(?:jpg|jpeg|png|webp|svg))')
    for f in files:
        try:
            txt = open(f, encoding='utf-8', errors='ignore').read()
        except OSError:
            continue
        for m in pat.finditer(txt):
            refs.add(m.group(1))
    return refs


def cap_for(rel):
    if rel.startswith('images/cards/'):
        return CAP['cards']
    if rel.startswith('images/icons/'):
        return CAP['icons']
    name = os.path.basename(rel)
    if name.startswith('bg-'):
        return CAP['bg']
    if name.endswith('-cut.png'):
        return CAP['cut']
    if name.startswith('char-'):
        return CAP['char']
    if name.startswith('card-'):
        return CAP['cardflat']
    return CAP['default']


def save_jpg(im, out, maxw):
    im = im.convert('RGB')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    im.save(out, 'JPEG', quality=DQ, optimize=True, progressive=True)


def save_png(im, out, maxw):
    has_alpha = im.mode in ('RGBA', 'LA', 'P') and im.convert('RGBA').getextrema()[3][0] < 250
    if not has_alpha:
        # Opaque sprite: JPEG-in-PNG would be silly, but a quantised RGB PNG is
        # still smaller than the 2 MB source.
        im = im.convert('RGB')
        if im.width > maxw:
            im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
        im.quantize(colors=256, method=Image.MEDIANCUT).save(out, 'PNG', optimize=True)
        return
    im = im.convert('RGBA')
    if im.width > maxw:
        im = im.resize((maxw, round(im.height * maxw / im.width)), Image.LANCZOS)
    # Trim fully transparent margins — cut-out sprites carry a lot of them and
    # the game positions them with object-fit/contain, so nothing shifts.
    bbox = im.getbbox()
    if bbox and bbox != (0, 0, im.width, im.height):
        im = im.crop(bbox)
    # Quantise the alpha-heavy sprites: 8-bit palette + alpha is 3-5x smaller
    # and indistinguishable at phone size.
    q = im.quantize(colors=192, method=Image.FASTOCTREE)
    q.save(out, 'PNG', optimize=True)


def main():
    refs = collect_refs()
    stats = {'copied': 0, 'skipped': 0, 'src_bytes': 0, 'out_bytes': 0}
    skipped = []
    for rel in sorted(refs):
        src = os.path.join(SRC, rel)
        if not os.path.isfile(src):
            print(f'  !! referenced but missing: {rel}')
            sys.exit(1)
        out = os.path.join(DST, rel)
        os.makedirs(os.path.dirname(out), exist_ok=True)
        stats['copied'] += 1
        stats['src_bytes'] += os.path.getsize(src)
        if rel.endswith('.svg'):
            open(out, 'wb').write(open(src, 'rb').read())
        else:
            try:
                im = Image.open(src)
                im.load()
            except Exception as e:            # unreadable art: copy verbatim
                print(f'  !! could not decode {rel}: {e}')
                skipped.append(rel)
                open(out, 'wb').write(open(src, 'rb').read())
                continue
            maxw = cap_for(rel)
            # The filename the game requests is never changed — an APK is
            # opened read-only, so a .png stays a .png and a .jpg stays a .jpg.
            if rel.lower().endswith(('.png', '.webp')):
                save_png(im, out, maxw)
            else:
                save_jpg(im, out, maxw)
        if os.path.exists(out):
            stats['out_bytes'] += os.path.getsize(out)
    print(f"  {stats['copied']} assets: "
          f"{stats['src_bytes'] / 1e6:.1f} MB -> {stats['out_bytes'] / 1e6:.1f} MB")
    if skipped:
        print(f"  {len(skipped)} files copied without re-encoding")


if __name__ == '__main__':
    main()
