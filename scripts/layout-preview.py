#!/usr/bin/env python3
"""
CELL WARRIORS — phone layout previews (block diagrams, at real CSS pixels)
==========================================================================
CI has no GPU browser, so this renders the *geometry* of each screen at the
real landscape-phone viewport (892x412) from the numbers in styles-mobile.css.
It is deliberately a wireframe, not a pixel render: it answers the questions a
screenshot would answer — does everything fit, is anything clipped, is a
control out of thumb reach, does the horizontal budget add up?

Output: docs/layout/*.png  (2x scale for legibility)
Run:    PYTHONPATH=<pillow> python3 scripts/layout-preview.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 892, 412
SAFE_T, SAFE_B, SAFE_L, SAFE_R = 0, 12, 0, 0
S = 2                       # render scale
OUT = 'docs/layout'

C = {
    'bg': (10, 4, 7), 'panel': (23, 10, 14), 'line': (58, 22, 32),
    'blood': (194, 24, 58), 'teal': (53, 208, 192), 'gold': (255, 201, 77),
    'text': (244, 230, 233), 'dim': (139, 147, 181), 'green': (70, 224, 138),
    'white': (255, 255, 255), 'black': (0, 0, 0), 'blue': (142, 210, 255),
    'paper': (242, 244, 245), 'ink': (26, 15, 20),
}


def font(size, bold=False):
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else ''),
              '/usr/share/fonts/truetype/liberation/LiberationSans%s.ttf' % ('-Bold' if bold else ''),
              '/usr/share/fonts/TTF/DejaVuSans%s.ttf' % ('-Bold' if bold else '')):
        if os.path.exists(p):
            return ImageFont.truetype(p, size * S)
    return ImageFont.load_default()


class Canvas:
    def __init__(self, title):
        self.im = Image.new('RGB', (W * S, H * S), C['bg'])
        self.d = ImageDraw.Draw(self.im, 'RGBA')
        self.title = title

    def rect(self, x, y, w, h, fill=None, outline=None, width=1, r=3, alpha=255, dash=False):
        box = [x * S, y * S, (x + w) * S, (y + h) * S]
        fill = fill + (alpha,) if fill and len(fill) == 3 else fill
        if dash:
            # dashed = "flexible / not a hard edge" in these diagrams
            step = 6 * S
            for i in range(int(box[0]), int(box[2]) - 1, step * 2):
                self.d.line([i, box[1], min(i + step, box[2]), box[1]], fill=outline, width=width * S)
                self.d.line([i, box[3], min(i + step, box[2]), box[3]], fill=outline, width=width * S)
            for j in range(int(box[1]), int(box[3]) - 1, step * 2):
                self.d.line([box[0], j, box[0], min(j + step, box[3])], fill=outline, width=width * S)
                self.d.line([box[2], j, box[2], min(j + step, box[3])], fill=outline, width=width * S)
            return
        self.d.rounded_rectangle(box, radius=r * S, fill=fill, outline=outline,
                                 width=width * S if outline else 0)

    def ellipse(self, cx, cy, rr, fill=None, outline=None, width=1):
        self.d.ellipse([(cx - rr) * S, (cy - rr) * S, (cx + rr) * S, (cy + rr) * S],
                       fill=fill + (255,) if fill and len(fill) == 3 else fill,
                       outline=outline, width=width * S)

    def text(self, x, y, t, size=9, fill=None, anchor='la', bold=False):
        fill = fill or C['text']
        f = font(size, bold)
        # PIL anchors: 'la' left-ascender, 'ma' middle, 'ra' right
        self.d.text((x * S, y * S), t, font=f, fill=fill + (255,) if len(fill) == 3 else fill, anchor=anchor)

    def line(self, x1, y1, x2, y2, fill, width=1):
        self.d.line([x1 * S, y1 * S, x2 * S, y2 * S], fill=fill, width=width * S)

    def save(self, name):
        # title bar
        self.d.rectangle([0, 0, W * S, 18 * S], fill=(20, 20, 24))
        self.text(6, 4, self.title, 9, C['dim'], bold=True)
        os.makedirs(OUT, exist_ok=True)
        self.im.save(os.path.join(OUT, name + '.png'))
        return self.im


# ------------------------------------------------------------------ screens
def battle():
    c = Canvas('BATTLE  ·  892x412 landscape  ·  every block on-screen, nothing scrolls')
    y = SAFE_T + 4
    # HUD (56px)
    c.rect(8, y, 428, 15, (18, 48, 36), C['green'], 1, 5)
    c.rect(8, y, 428 * .72, 15, C['green'], None, 0, 5, 150)
    c.text(222, y + 4, 'TEAM 1240 / 1720', 8, (4, 18, 10), 'ma', True)
    c.text(446, y + 2, 'M01 · SALIVARY GATE', 9, C['dim'])
    for i, n in enumerate('KGB'):
        c.rect(12 + i * 38, y + 19, 34, 34, (27, 35, 56), C['teal'], 1, 6)
        c.text(12 + i * 38 + 17, y + 28, n, 10, C['text'], 'ma', True)
    for i in range(3):
        c.ellipse(135 + i * 13, y + 31, 5, None, C['blood'], 1)
    for i, ic in enumerate('♪☰≡'):
        x = W - 8 - 44 * (3 - i) - 4
        c.rect(x, y + 8, 44, 44, (26, 15, 20), C['line'], 1, 10)
        c.text(x + 22, y + 15, ic, 13, C['dim'], 'ma')
    y += 56
    stage_top = y + 2
    stage_bot = H - SAFE_B - 34 - 126
    # rails
    c.rect(8, stage_top, 74, stage_bot - stage_top, (18, 7, 11), C['line'], 1, 6, 200)
    c.rect(W - 8 - 96, stage_top, 96, stage_bot - stage_top, (18, 7, 11), C['line'], 1, 6, 200)
    # arena
    ax, aw = 8 + 74 + 4, W - 16 - 74 - 96 - 8
    c.rect(ax, stage_top, aw, stage_bot - stage_top, None, C['line'], 1, 6, 90, True)
    # left rail contents
    ry = stage_top + 4
    for label, val, hh in [('TURN', '2', 40), ('RES', '3', 26), ('DRAW', '12', 34), ('EP', '3', 32)]:
        c.rect(16, ry, 58, hh, C['panel'], C['line'], 1, 6)
        c.text(45, ry + 4, label, 7, C['dim'], 'ma')
        c.text(45, ry + 15, val, 10, C['text'], 'ma', True)
        ry += hh + 5
    # enemies
    n = 3
    ew = min(210, aw / n - 6)
    for i in range(n):
        ex = ax + (aw - (ew * n + 8 * (n - 1))) / 2 + i * (ew + 8)
        sel = i == 1
        c.rect(ex, stage_top + 18, ew, 118, None, C['teal'] if sel else C['line'], 2 if sel else 1, 8)
        c.text(ex + ew / 2, stage_top + 60, '◉', 22, C['dim'], 'ma')
        c.rect(ex + 8, stage_top + 104, ew - 16, 11, (42, 11, 18), C['blood'], 1, 3)
        c.text(ex + ew / 2, stage_top + 128, 'STREP · 320/320', 7, C['text'], 'ma')
        if sel:
            c.text(ex + ew / 2, stage_top + 138, 'TARGETED', 6, C['teal'], 'ma', True)
    c.text(ax + aw / 2, stage_top + 4, 'BREAK  ⚡ CORRUPT  TENACITY → +1 AP', 8, C['gold'], 'ma')
    # right rail
    c.ellipse(W - 84 + 22, stage_top + 26, 22, (10, 11, 20), C['dim'], 1)
    c.text(W - 62, stage_top + 21, '⧗', 14, C['dim'], 'ma')
    c.rect(W - 84 + 20, stage_top + 54, 44, 34, (58, 30, 44), C['blood'], 1, 6)
    c.text(W - 62, stage_top + 64, 'GRAVE 7', 7, C['text'], 'ma')
    c.rect(W - 84 + 10, stage_bot - 74, 76, 76, C['blood'], C['white'], 2, 38)
    c.text(W - 84 + 48, stage_bot - 52, '✓', 20, C['white'], 'ma', True)
    c.text(W - 84 + 48, stage_bot - 34, 'END TURN', 7, C['white'], 'ma', True)
    # hand strip
    hs = stage_bot + 2
    c.rect(8, hs, W - 16, H - SAFE_B - hs, (5, 2, 3), C['line'], 1, 4)
    ch = 126
    cw = round(ch * 0.74)
    nc = 5
    total = cw * nc - 9 * (nc - 1)
    cx0 = (W - total) / 2
    for i in range(nc):
        x = cx0 + i * (cw - 9)
        c.rect(x, hs + 2, cw, ch, (11, 5, 7), C['gold'] if i == 0 else (255, 255, 255), 2 if i == 0 else 1, 8,
               alpha=255 if i == 0 else 90)
        c.ellipse(x + 15, hs + 17, 11, (42, 26, 32), C['teal'], 2)
        c.text(x + cw / 2, hs + ch - 26, 'CARD', 8, C['text'], 'ma')
        c.text(x + cw / 2, hs + ch - 14, 'loadout', 6, C['dim'], 'ma')
    c.text(20, H - SAFE_B - 13, 'AP 3', 10, C['blue'], bold=True)
    c.text(W - 20, H - SAFE_B - 12, 'TAP to play · HOLD to inspect · TAP enemy to target', 6.5, C['dim'], 'ra')
    # annotations
    c.line(0, 18, 0, 18, C['teal'])
    return c.save('battle')


def title():
    c = Canvas('TITLE  ·  892x412  ·  logo + 1 primary + 6 secondary, all above the fold')
    c.rect(0, 18, W, H - 18, (21, 6, 9), None, 0, 0)
    c.text(W / 2, 34, 'CELL WARRIORS', 26, C['text'], 'ma', True)
    c.text(W / 2, 68, 'THE BODY IS THE BATTLEFIELD', 8, C['dim'], 'ma')
    c.rect(W / 2 - 130, 84, 260, 40, C['blood'], (255, 255, 255), 1, 8)
    c.text(W / 2, 96, 'CHAOS EXPEDITION', 12, C['white'], 'ma', True)
    labels = ['STORY MISSIONS', 'COMBAT GUIDE', 'SIMULATION', 'CELL LAB', 'SETTINGS', 'reset save']
    bw = [116, 110, 98, 86, 82, 72]
    x = W / 2 - (sum(bw) + 6 * (len(bw) - 1)) / 2
    for lab, w in zip(labels, bw):
        c.rect(x, 136, w, 34, (30, 22, 26), C['line'], 1, 7)
        c.text(x + w / 2, 147, lab, 8, C['dim'], 'ma')
        x += w + 6
    c.text(W / 2, H - 16, 'CELL WARRIORS v1.0.0 · BUILD 08A · © IMMUNE COMMAND', 6.5, C['dim'], 'ma')
    c.rect(W - 58, 26, 44, 44, (30, 24, 28), C['line'], 1, 10)
    c.text(W - 36, 40, '♪', 13, C['dim'], 'ma')
    c.rect(14, 26, 96, 26, (60, 42, 12), C['gold'], 1, 13)
    c.text(62, 35, '◈ 1240  ID·07A', 7, C['gold'], 'ma')
    c.text(W / 2, 186, 'HUD row 2:  status/tips are below the fold on purpose', 7, C['dim'], 'ma')
    return c.save('title')


def hand_geometry():
    """Seven cards (post-draw worst case) at every phone width, drawn to scale."""
    H2 = 950
    c = Canvas.__new__(Canvas)
    c.im = Image.new('RGB', (W * S, H2 * S), C['bg'])
    c.d = ImageDraw.Draw(c.im, 'RGBA')
    c.title = 'HAND GEOMETRY  ·  seven cards fit at every phone width · ratio locked 0.74'
    c.d.rectangle([0, 0, W * S, 18 * S], fill=(20, 20, 24))
    c.text(6, 4, c.title, 9, C['dim'], bold=True)
    widths = [(568, 'very small 16:9'), (640, 'small 16:9'), (720, 'compact'),
              (892, 'typical 20:9'), (1000, 'large')]
    n = 7
    for i, (vw, label) in enumerate(widths):
        y = 54 + i * 180
        cap = min(156, max(88, round(H * 0.34)))
        box = min(vw, W - 24) - 16
        cw = max(40, min(round(cap * .74), int(box / (n - 0.26 * (n - 1)))))
        ch = round(cw / .74)
        gap = 2 * ((cw * .26) // 2)
        total = cw * n - gap * (n - 1)
        fits = total <= box
        c.text(12, y - 13, f'{vw}px viewport — {label}', 8.5, C['teal'], bold=True)
        c.rect(8, y, box, ch + 8, (5, 2, 3), C['line'], 1, 5)
        x = 8 + (box - total) / 2
        for k in range(n):
            c.rect(x + k * (cw - gap), y + 4, cw, ch, (11, 5, 7), (255, 255, 255), 1, 6, 120)
        c.text(12, y + ch + 13,
               f'{n} cards · {cw}×{ch}px · ratio {cw/ch:.2f} · {total:.0f}px of {box:.0f}px',
               7.5, C['green'] if fits else C['blood'], bold=True)
        c.text(box + 4, y + ch + 13, 'FITS' if fits else 'OVERFLOW', 8,
               C['green'] if fits else C['blood'], bold=True)
    return c.save('hand')


def safe_area():
    c = Canvas('SAFE AREAS  ·  cutout left, gesture bar bottom  ·  content inset with env()')
    c.rect(0, 18, W, H - 18, (26, 13, 17), None, 0, 0)
    c.rect(0, 18, 34, H - 18, (0, 0, 0), None, 0, 0, 140)
    c.text(17, 60, 'CUTOUT', 6, C['blood'], 'ma')
    c.rect(0, H - SAFE_B, W, SAFE_B, (0, 0, 0), None, 0, 0, 140)
    c.text(W - 8, H - SAFE_B - 9, 'gesture bar', 6, C['dim'], 'ra')
    c.rect(34 + 8, 22, W - 34 - 16, 52, None, C['teal'], 1, 4)
    c.text(50, 32, 'hud-top  padding: safe-t+4  safe-l+8', 8, C['teal'])
    c.rect(34 + 8, 100, W - 34 - 16, 180, None, C['dim'], 1, 4, 90, True)
    c.text(50, 110, 'battle-stage  padding: safe-l+6  safe-r+6', 8, C['dim'])
    c.rect(34 + 8, H - SAFE_B - 126 - 6, W - 34 - 16, 126, None, C['gold'], 1, 4)
    c.text(50, H - SAFE_B - 20, 'hand-zone  padding-bottom: safe-b+2', 8, C['gold'])
    return c.save('safe-area')


def sheets():
    """Overlay/sheet screens must be thumb-reachable sheets, not floating modals."""
    c = Canvas('SHEET  ·  card detail as a full-bleed sheet (was a 860px centred modal)')
    c.rect(0, 18, W, H - 18, (8, 4, 5), None, 0, 0, 200)
    c.rect(12, 24, W - 24, H - 24 - SAFE_B, (23, 10, 14), C['line'], 1, 8)
    c.rect(24, 36, 108, 146, (11, 5, 7), C['gold'], 2, 7)
    c.text(78, 100, 'CARD', 9, C['text'], 'ma')
    c.text(78, 114, 'ART', 7, C['dim'], 'ma')
    c.text(146, 40, 'LAST SHIFT +', 12, C['white'], bold=True)
    c.text(146, 58, 'KAITO · ATTACK · ⚡ FURY · 2 AP', 7, C['teal'])
    rows = ['38 DAMAGE', '→ 8 base +12 Strength +18 Fury', '×1.6 BURST  ×1.35 VULN', 'CRIT guaranteed on last AP']
    for i, r in enumerate(rows):
        c.rect(146, 68 + i * 22, 420, 19, (40, 20, 26), C['line'], 1, 5)
        c.text(154, 74 + i * 22, r, 7.5, C['text'])
    c.text(146, 168, 'UPGRADE (+):  Exhaust — draws 1 card, +6 damage', 7.5, C['gold'])
    c.text(146, 186, 'tap anywhere to close', 7, C['dim'])
    c.rect(W - 60, 30, 44, 44, (30, 24, 28), C['line'], 1, 22)
    c.text(W - 38, 44, '✕', 13, C['dim'], 'ma')
    return c.save('sheet')


def roster():
    """Roster: 6 combatants, team slot strip, deploy bar. Must not need a scroll."""
    c = Canvas('ROSTER  ·  892x412  ·  six combatants + team strip + deploy, one screen')
    c.d.rectangle([0, 18, W * S, (H - 18) * S], fill=(242, 244, 245))
    c.rect(0, 18, W, 46, (250, 250, 250), (220, 224, 230), 1, 0)
    c.text(12, 30, 'COMBATANTS', 12, C['ink'], bold=True)
    c.text(12, 44, 'PICK 3 · 3 / 3 SELECTED', 7, (107, 90, 96))
    c.text(150, 38, 'EDGE SYNERGY  ·  +2 ATK', 7, (10, 107, 98), bold=True)
    for i, lab in enumerate(['ALL', 'STRIKER', 'VANGUARD', 'CONTROLLER', 'PSIONIC', 'ALCHEMIST', 'MNEMONIST']):
        x = 430 + i * 62
        if x > W - 70: break
        c.rect(x, 28, 58, 15, (255, 255, 255), (220, 224, 230), 1, 8)
        c.text(x + 29, 32, lab, 5.5, (107, 90, 96), 'ma')
    c.text(W - 12, 30, '1 240', 10, C['gold'], 'ra', True)
    # 6 cards in 3 columns x 2 rows (the mobile rule: minmax(140px,1fr))
    cw2, ch2 = 282, 118
    for i in range(6):
        col, row = i % 3, i // 3
        x = 12 + col * (cw2 + 8)
        y = 72 + row * (ch2 + 8)
        c.rect(x, y, cw2, ch2, (255, 255, 255), (226, 230, 234), 1, 8)
        c.rect(x, y, cw2, 3, (53, 208, 192), None, 0, 2)
        c.rect(x + 4, y + 10, 108, ch2 - 20, (237, 240, 242), None, 0, 5)
        c.text(x + 58, y + ch2 / 2 - 10, ['KAITO', 'MOMO', 'GORO', 'BIBI', 'YUNA', 'SABLE'][i], 6.5, (107, 90, 96), 'ma')
        c.text(x + 58, y + ch2 / 2 + 2, 'ART', 5, (170, 175, 185), 'ma')
        c.text(x + 120, y + 12, ['NEUTROPHIL', 'PLATELET', 'MACROPHAGE', 'MAST CELL', 'EOSINOPHIL', 'MEMORY B'][i],
               7, C['ink'], bold=True)
        c.text(x + 120, y + 24, ['STRIKER', 'VANGUARD', 'CONTROLLER', 'PSIONIC', 'ALCHEMIST', 'MNEMONIST'][i],
               5.5, (10, 107, 98))
        for k in range(3):
            c.rect(x + 120, y + 36 + k * 7, 150, 4, (235, 238, 242), None, 0, 2)
        for k, lab in enumerate(['DETAILS', 'SIM', 'LAB']):
            c.rect(x + 120 + k * 40, y + ch2 - 20, 36, 14, (255, 255, 255), (53, 208, 192), 1, 4)
            c.text(x + 138 + k * 40, y + ch2 - 16, lab, 4.5, (10, 107, 98), 'ma')
        if i < 3:
            c.text(x + cw2 - 10, y + 10, 'IN TEAM', 5, C['white'], 'ra', True)
            c.rect(x, y, cw2, ch2, None, (53, 208, 192), 2, 8)
    # bottom bar: team slots + deploy
    y = H - 46
    c.rect(0, y, W, 46, (252, 252, 252), (220, 224, 230), 1, 0)
    for i in range(3):
        c.rect(12 + i * 96, y + 8, 88, 30, (240, 243, 245), (53, 208, 192), 1, 6)
        c.text(56 + i * 96, y + 16, ['KAITO · LEAD', 'GORO', 'BIBI'][i], 6, C['ink'], 'ma', True)
        c.text(56 + i * 96, y + 27, 'HP 88', 5.5, (107, 90, 96), 'ma')
    c.rect(W - 200, y + 8, 188, 30, C['blood'], C['white'], 1, 7)
    c.text(W - 106, y + 18, 'START EXPEDITION', 9, C['white'], 'ma', True)
    return c.save('roster')


def reward():
    """Post-battle draft: three cards must fit without scrolling."""
    c = Canvas('REWARD  ·  892x412  ·  draft of three, rank chip, take/skip')
    c.rect(0, 18, W, H - 18, (233, 237, 240), None, 0, 0)
    # content-sized panel (flex column, gap 9) centred in the view
    cw3 = round(min(130, 0.17 * H * 1.6))
    ch3 = round(cw3 / 0.74)
    ph = 14 + 40 + 9 + ch3 + 9 + 14 + 9 + 32 + 14   # header, cards, hint, buttons, padding
    pw = 720
    px, py = (W - pw) / 2, (H - ph) / 2
    c.rect(px, py, pw, ph, (255, 255, 255), (230, 233, 238), 1, 12)
    c.rect(px + 16, py + 14, 40, 40, (240, 166, 60), None, 0, 20)
    c.text(px + 36, py + 24, 'S', 16, C['white'], 'ma', True)
    c.text(px + 66, py + 18, 'SECTOR CLEARED', 15, C['ink'], bold=True)
    c.text(px + 66, py + 34, '+18 cells · 2 of 3 combatants survived', 7, (107, 90, 96))
    # three draft cards, sized from the height budget
    total = cw3 * 3 + 20
    x0 = px + (pw - total) / 2
    for i in range(3):
        x = x0 + i * (cw3 + 10)
        y = py + 14 + 40 + 9
        c.rect(x, y, cw3, ch3, (11, 5, 7), (255, 255, 255), 2, 8, 90)
        c.text(x + cw3 / 2, y + 14, 'CARD', 7, C['text'], 'ma')
        c.text(x + cw3 / 2, y + ch3 - 22, 'NEW', 6, C['gold'], 'ma', True)
        c.text(x + cw3 / 2, y + ch3 - 10, '+34 DMG', 6, C['dim'], 'ma')
    c.text(px + pw / 2, py + 14 + 40 + 9 + ch3 + 6, 'TAP A CARD TO ADD IT TO YOUR DECK', 7,
           (107, 90, 96), 'ma')
    by = py + ph - 32 - 14
    c.rect(px + pw / 2 - 170, by, 160, 32, C['blood'], C['white'], 1, 7)
    c.text(px + pw / 2 - 90, by + 10, 'TAKE CARD', 8, C['white'], 'ma', True)
    c.rect(px + pw / 2 + 10, by, 160, 32, (246, 247, 249), (220, 224, 230), 1, 7)
    c.text(px + pw / 2 + 90, by + 10, 'SKIP (+CELLS)', 8, (107, 90, 96), 'ma')
    c.text(px + pw / 2, py + ph + 8, f'card {cw3}x{ch3} · 3 fit in {total}px of {pw - 40}px', 6, C['green'], 'ma')
    return c.save('reward')


def map_screen():
    """Chaos map: 11 floors, lazy diagonal, nodes thumb-sized."""
    c = Canvas('MAP  ·  892x412  ·  11 floors in a scroll; nodes >=44px')
    c.d.rectangle([0, 18, W * S, (H - 18) * S], fill=(242, 244, 245))
    c.rect(0, 18, W, 42, (250, 250, 250), (220, 224, 230), 1, 0)
    c.text(12, 28, 'CHAOS SECTOR', 12, C['ink'], bold=True)
    c.text(12, 44, 'FLOOR 4 / 11 · PICK A ROUTE', 7, (107, 90, 96))
    c.rect(W - 190, 26, 54, 22, (255, 249, 236), C['gold'], 1, 11)
    c.text(W - 163, 32, '⧗ 2', 7, (138, 90, 18), 'ma', True)
    c.rect(W - 130, 26, 54, 22, (255, 249, 236), C['gold'], 1, 11)
    c.text(W - 103, 32, '◈ 47', 7, (138, 90, 18), 'ma', True)
    c.rect(W - 70, 26, 30, 22, (255, 255, 255), (220, 224, 230), 1, 6)
    c.text(W - 55, 32, 'DECK', 5, (107, 90, 96), 'ma')
    c.rect(W - 34, 26, 26, 22, (255, 255, 255), (220, 224, 230), 1, 6)
    c.text(W - 21, 32, 'EXIT', 4.5, (107, 90, 96), 'ma')
    y = 68
    for f in range(5):
        n = 3 if f % 2 == 0 else 2
        for i in range(n):
            nw = min(104, 0.22 * W)
            total = nw * n + 8 * (n - 1)
            x = (W - total) / 2 + i * (nw + 8)
            cleared = f < 3
            active = f == 3
            c.rect(x, y, nw, 44, C['white'], (53, 208, 192) if active else (226, 230, 234),
                   2 if active else 1, 9)
            c.text(x + nw / 2, y + 8, ['⚔', '✦', '☠', '⧗', '◈'][(f + i) % 5], 8,
                   (107, 90, 96), 'ma')
            c.text(x + nw / 2, y + 20, ['PATHOGEN', 'ELITE', 'BOSS', 'REST', 'SHOP'][(f + i) % 5],
                   5.5, C['ink'], 'ma', True)
            c.text(x + nw / 2, y + 30, 'CLEARED' if cleared else ('TAP TO ENTER' if active else 'FLOOR %d' % (f + 1)),
                   4.5, (10, 107, 98) if active else (150, 150, 160), 'ma')
        if f < 4:
            c.line(W / 2, y + 44, W / 2, y + 50, (200, 205, 215), 1)
        y += 50
    c.text(12, H - 12, 'scrolls to floor 11 · the latest floor is highlighted', 6, (107, 90, 96))
    return c.save('map')


if __name__ == '__main__':
    made = [battle(), title(), roster(), map_screen(), reward(), hand_geometry(), safe_area(), sheets()]
    # contact sheet
    pad = 8
    totalh = sum(i.height for i in made) + pad * (len(made) + 1)
    sheet = Image.new('RGB', (W * S + pad * 2, totalh), (17, 17, 17))
    y = pad
    for im in made:
        sheet.paste(im, (pad, y))
        y += im.height + pad
    sheet.save(os.path.join(OUT, 'sheet.png'))
    print(f'wrote {len(made)} previews + sheet.png to {OUT}/')
