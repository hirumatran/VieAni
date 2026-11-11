"""Draft pixel-art battle backgrounds (8 Vietnamese landscapes, see data/backgrounds.json).

    python3 scripts/draft_backgrounds.py [PREVIEW_DIR]

Writes assets/backgrounds/<id>.png at 180×200 (the game scales them ×4 to its 720×800 canvas,
nearest-neighbour) and, if PREVIEW_DIR is given, a contact sheet + in-game mock-ups there.
These are procedural drafts to judge mood and colour; final art can replace any file 1:1.
"""
import json, math, pathlib, random, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 180, 200
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

# landscape palette (32 colours), saved to assets/palette/backgrounds.hex
PAL = """16110e 2d2219 4a3628 7a4a2a b36547 c28245 e7c05f f0dca0 f3eee5 bd3d2a 8c1c13
e6f6f8 b8e4f0 8fd3e8 5aa7d6 2f6fa8 1f4e79 155463 1f6f7a 2f8f8a 4fb3a5 7fd1c1
2e6b3a 3f8a45 6bb35a 9ccf6b 3f504d 5b6f6a 8e9a94 f6c48a f39a6b 6b5b95""".split()
C = {h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)) for h in PAL}
c = lambda h: C[h]


def vgrad(px, y0, y1, cols, x0=0, x1=W):
    """vertical gradient with 4×4 ordered dithering between palette colours"""
    for y in range(max(0, y0), min(H, y1)):
        t = (y - y0) / max(1, (y1 - y0 - 1)) * (len(cols) - 1)
        i = min(int(t), len(cols) - 2) if len(cols) > 1 else 0
        f = t - i
        for x in range(x0, x1):
            px[x, y] = c(cols[i + 1]) if len(cols) > 1 and BAYER[y % 4][x % 4] < f * 16 else c(cols[i])


def karst(px, rng, cx, base, w, h, body, shade, top=None, top_px=4):
    """limestone tower: rounded steep sides, shaded right third, vegetation cap"""
    half = w / 2
    for x in range(int(cx - half), int(cx + half) + 1):
        if not 0 <= x < W:
            continue
        u = (x - cx) / half
        if abs(u) > 1:
            continue
        hh = h * (1 - abs(u) ** 3.2) ** 0.45 + rng.uniform(-1.2, 1.2)
        ytop = int(base - hh)
        for y in range(max(0, ytop), min(H, base)):
            col = shade if u > 0.35 else body
            if top and y - ytop < top_px + (1 if (x * 7 + y) % 5 == 0 else 0):
                col = top
            elif top and (x * 13 + y * 7) % 23 == 0:
                col = top  # bushes clinging to the cliff
            px[x, y] = c(col)


def reflect(img, horizon, y_end, tint, amount=0.55, wobble=1.5):
    px = img.load()
    src = img.copy().load()
    for y in range(horizon, min(H, y_end)):
        sy = 2 * horizon - y - 1
        if sy < 0:
            continue
        off = int(round(wobble * math.sin(y * 0.9)))
        for x in range(W):
            sx = min(W - 1, max(0, x + off))
            a, b = src[sx, sy], px[x, y]
            k = amount * (1 - (y - horizon) / max(1, (y_end - horizon)) * 0.6)
            px[x, y] = tuple(int(b[i] * (1 - k) + (a[i] * 0.6 + tint[i] * 0.4) * k) for i in range(3))


def ripples(d, rng, y0, y1, col, n=40, maxw=8):
    for _ in range(n):
        x, y = rng.randrange(W), rng.randrange(y0, y1)
        d.line((x, y, x + rng.randint(2, maxw), y), fill=c(col))


def tree_blob(d, x, y, r, dark, mid, light):
    d.ellipse((x - r, y - r, x + r, y + r), fill=c(dark))
    d.ellipse((x - r + 1, y - r, x + r - 2, y + r - 3), fill=c(mid))
    d.ellipse((x - r // 2, y - r + 1, x + r // 3, y - r // 3), fill=c(light))


def clouds(d, rng, n, y0, y1, col="f3eee5", shade="b8e4f0"):
    for _ in range(n):
        x, y, w = rng.randrange(-10, W), rng.randrange(y0, y1), rng.randint(14, 30)
        for k in range(4):
            cx = x + k * w // 4
            d.ellipse((cx - 6, y - 4 - (k % 2) * 2, cx + 6, y + 3), fill=c(col))
        d.line((x - 4, y + 3, x + w + 2, y + 3), fill=c(shade))


# ---------------------------------------------------------------- scenes
def ha_long(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    hz = 104
    vgrad(px, 0, hz, ["8fd3e8", "b8e4f0", "e6f6f8"])
    clouds(d, rng, 5, 8, 50)
    vgrad(px, hz, H, ["4fb3a5", "2f8f8a", "1f6f7a", "155463"])
    for i in range(9):  # hazy far islands
        karst(px, rng, rng.randrange(0, W), hz, rng.randint(10, 18), rng.randint(10, 22), "8e9a94", "8e9a94")
    for i in range(7):
        karst(px, rng, rng.randrange(0, W), hz, rng.randint(14, 24), rng.randint(22, 40), "5b6f6a", "3f504d", "3f8a45")
    karst(px, rng, 12, hz + 2, 34, 78, "5b6f6a", "3f504d", "2e6b3a", 6)
    karst(px, rng, 168, hz + 2, 30, 64, "5b6f6a", "3f504d", "2e6b3a", 6)
    reflect(img, hz, H, c("155463"))
    d = ImageDraw.Draw(img)
    ripples(d, rng, hz + 4, H, "7fd1c1", 55)
    # junk boat with fan-shaped sails
    bx, by = 112, 150
    d.polygon([(bx - 16, by), (bx + 16, by), (bx + 12, by + 5), (bx - 12, by + 5)], fill=c("4a3628"))
    for k, (sx, hgt) in enumerate([(-9, 18), (0, 24), (9, 16)]):
        x = bx + sx
        d.line((x, by, x, by - hgt), fill=c("2d2219"))
        d.polygon([(x, by - hgt), (x + 7, by - hgt + 3), (x + 7, by - 3), (x, by - 2)], fill=c("c28245" if k != 1 else "b36547"))
        for r in range(by - hgt + 4, by - 2, 4):
            d.line((x, r, x + 7, r + 1), fill=c("7a4a2a"))
    d.line((bx - 18, by + 6, bx + 18, by + 6), fill=c("7fd1c1"))
    return img


def phong_nha(rng):
    img = Image.new("RGB", (W, H), c("16110e")); px = img.load(); d = ImageDraw.Draw(img)
    # skylight (doline) with sky and jungle visible
    d.ellipse((50, -30, 140, 40), fill=c("b8e4f0"))
    d.ellipse((58, -24, 132, 30), fill=c("e6f6f8"))
    for x in range(52, 140, 5):
        tree_blob(d, x, 34 + rng.randint(-3, 3), 6, "2e6b3a", "3f8a45", "6bb35a")
    # rock texture on the walls
    for _ in range(260):
        x, y, r = rng.randrange(W), rng.randrange(H), rng.randint(2, 6)
        if px[x, y] == c("16110e"):
            d.ellipse((x - r, y - r // 2, x + r, y + r // 2), fill=c(rng.choice(["2d2219", "2d2219", "4a3628"])))
    d.ellipse((50, -30, 140, 40), fill=c("b8e4f0"))
    d.ellipse((58, -24, 132, 30), fill=c("e6f6f8"))
    for x in range(52, 140, 5):
        tree_blob(d, x, 34 + rng.randint(-3, 3), 6, "2e6b3a", "3f8a45", "6bb35a")
    # stalactites
    for x in list(range(0, 50, 7)) + list(range(140, W, 7)):
        L = rng.randint(10, 34)
        d.polygon([(x, 0), (x + 5, 0), (x + 2, L)], fill=c("4a3628"))
        d.line((x + 1, 0, x + 2, L - 2), fill=c("5b6f6a"))
    # light shaft (dithered)
    for y in range(36, 165):
        t = (y - 36) / 130
        x0, x1 = int(70 - 30 * t), int(122 + 26 * t)
        for x in range(x0, x1):
            if BAYER[y % 4][x % 4] < 6 - 4 * t:
                px[x, y] = c("e7c05f") if (x + y) % 3 else c("f0dca0")
    # jungle on the cave floor under the skylight
    for x in range(40, 150, 6):
        tree_blob(d, x, 150 + rng.randint(-6, 4), rng.randint(6, 9), "2e6b3a", "3f8a45", "9ccf6b")
    # underground river
    vgrad(px, 165, H, ["1f6f7a", "155463", "1f4e79"])
    ripples(d, rng, 168, H, "4fb3a5", 40)
    # stalagmites
    for x in (8, 20, 160, 172):
        L = rng.randint(14, 30)
        d.polygon([(x - 5, 166), (x + 5, 166), (x, 166 - L)], fill=c("4a3628"))
    return img


def nam_cat_tien(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    vgrad(px, 0, 90, ["8fd3e8", "b8e4f0", "e6f6f8"])
    clouds(d, rng, 4, 6, 40)
    d.rectangle((0, 80, W, 128), fill=c("2e6b3a"))
    for x in range(-5, W + 10, 9):  # distant canopy
        tree_blob(d, x, 78 + rng.randint(-4, 4), 9, "5b6f6a", "8e9a94", "8e9a94")
    for x in range(-5, W + 10, 12):  # tall dipterocarp trees
        h = rng.randint(30, 55)
        d.rectangle((x, 115 - h, x + 2, 120), fill=c("4a3628"))
        tree_blob(d, x + 1, 115 - h, rng.randint(9, 13), "2e6b3a", "3f8a45", "6bb35a")
    for x in range(-5, W + 10, 7):  # dense understorey
        tree_blob(d, x, 118 + rng.randint(-3, 3), 8, "2e6b3a", "3f8a45", "9ccf6b")
    vgrad(px, 128, H, ["4fb3a5", "2f8f8a", "1f6f7a"])  # Bàu Sấu wetland
    reflect(img, 128, 170, c("1f6f7a"), 0.45)
    d = ImageDraw.Draw(img)
    for _ in range(14):  # water lilies
        x, y = rng.randrange(W), rng.randrange(150, H)
        d.ellipse((x - 3, y - 1, x + 3, y + 1), fill=c("3f8a45"))
        if rng.random() < 0.4:
            px[x, y - 1] = c("f39a6b")
    for x in range(0, W, 3):  # reeds at the front
        h = rng.randint(6, 18)
        d.line((x, H, x + rng.randint(-2, 2), H - h), fill=c(rng.choice(["6bb35a", "3f8a45", "9ccf6b"])))
    ripples(d, rng, 132, 170, "7fd1c1", 25)
    return img


def mu_cang_chai(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    vgrad(px, 0, 70, ["8fd3e8", "b8e4f0", "e6f6f8"])
    # blue mountain ranges
    for k, (col, base, amp) in enumerate([("8e9a94", 60, 16), ("5b6f6a", 72, 20)]):
        ph = rng.random() * 6
        for x in range(W):
            top = int(base - amp * (0.6 + 0.4 * math.sin(x / 17 + ph)) - 6 * math.sin(x / 7 + ph * 2))
            d.line((x, top, x, H), fill=c(col))
    # mist band
    for y in range(68, 78):
        for x in range(W):
            if BAYER[y % 4][x % 4] < 8 - abs(y - 73):
                px[x, y] = c("e6f6f8")
    # rice terraces: contour bands following the hill
    golds = ["e7c05f", "c28245", "e7c05f", "f0dca0", "9ccf6b", "e7c05f"]
    for y in range(78, H):
        for x in range(W):
            hill = 10 * math.sin(x / 28) + 6 * math.sin(x / 11 + 1.3) + (y - 78) * 0.15
            v = (y + hill) / 6.0
            band = int(v)
            frac = v - band
            col = golds[band % len(golds)]
            if frac < 0.17:
                col = "6bb35a" if band % 3 else "3f8a45"  # grassy bund edge
            elif frac > 0.85:
                col = "b36547" if col in ("e7c05f", "f0dca0") else col
            px[x, y] = c(col)
    # H'Mông stilt house on the right slope
    hx, hy = 142, 110
    d.rectangle((hx, hy, hx + 22, hy + 10), fill=c("7a4a2a"))
    d.polygon([(hx - 4, hy), (hx + 11, hy - 10), (hx + 26, hy)], fill=c("4a3628"))
    for sx in (hx + 2, hx + 10, hx + 20):
        d.line((sx, hy + 10, sx, hy + 16), fill=c("2d2219"))
    d.rectangle((hx + 8, hy + 3, hx + 12, hy + 9), fill=c("2d2219"))
    # small tree
    d.line((34, 100, 34, 112), fill=c("4a3628")); tree_blob(d, 34, 98, 7, "2e6b3a", "3f8a45", "6bb35a")
    return img


def hoan_kiem(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    hz = 96
    vgrad(px, 0, hz, ["b8e4f0", "e6f6f8", "f6c48a"])
    clouds(d, rng, 3, 10, 40)
    # far bank: trees and low city blocks
    for x in range(0, W, 9):
        d.rectangle((x, hz - rng.randint(8, 20), x + 7, hz), fill=c(rng.choice(["8e9a94", "5b6f6a"])))
    for x in range(-4, W + 8, 7):
        tree_blob(d, x, hz - 2, 6, "2e6b3a", "3f8a45", "6bb35a")
    vgrad(px, hz, H, ["4fb3a5", "2f8f8a", "1f6f7a"])
    # Tháp Rùa on its islet
    tx, ty = 78, 128
    d.ellipse((tx - 18, ty - 4, tx + 18, ty + 6), fill=c("3f8a45"))
    d.ellipse((tx - 14, ty - 6, tx + 14, ty + 2), fill=c("6bb35a"))
    for lvl, (w, h) in enumerate([(14, 9), (10, 7), (6, 6)]):
        base = ty - 4 - sum(hh for _, hh in [(14, 9), (10, 7), (6, 6)][:lvl])
        d.rectangle((tx - w // 2, base - h, tx + w // 2, base), fill=c("e7dec2" if "e7dec2" in C else "f0dca0"))
        d.line((tx - w // 2 - 1, base - h, tx + w // 2 + 1, base - h), fill=c("8e9a94"))
        for ax in range(tx - w // 2 + 2, tx + w // 2 - 1, 4):
            d.rectangle((ax, base - h + 3, ax + 1, base - 1), fill=c("4a3628"))
    d.line((tx, ty - 26, tx, ty - 30), fill=c("8e9a94"))
    # Thê Húc bridge (red, arched) to Ngọc Sơn temple on the right
    for x in range(118, W):
        y = int(140 - 9 * math.sin((x - 118) / (W - 118) * math.pi))
        d.line((x, y, x, y + 2), fill=c("bd3d2a"))
        if x % 6 == 0:
            d.line((x, y - 3, x, y), fill=c("8c1c13"))
    d.rectangle((158, 112, 180, 128), fill=c("c28245"))
    d.polygon([(154, 112), (169, 104), (184, 112)], fill=c("8c1c13"))
    reflect(img, hz, H, c("1f6f7a"), 0.5)
    d = ImageDraw.Draw(img)
    ripples(d, rng, hz + 6, H, "7fd1c1", 40)
    # willow at top-left
    d.line((0, 0, 30, 6), fill=c("4a3628"), width=2)
    for x in range(0, 34, 2):
        L = rng.randint(20, 55)
        d.line((x, 4, x + rng.randint(-2, 2), 4 + L), fill=c(rng.choice(["6bb35a", "3f8a45", "9ccf6b"])))
    return img


def trang_an(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    hz = 112
    vgrad(px, 0, hz, ["8fd3e8", "b8e4f0", "e6f6f8"])
    clouds(d, rng, 4, 6, 40)
    for _ in range(6):
        karst(px, rng, rng.randrange(0, W), hz, rng.randint(16, 26), rng.randint(30, 52), "8e9a94", "5b6f6a", "6bb35a", 5)
    for cx, w, h in [(15, 40, 95), (60, 30, 66), (165, 36, 88), (120, 26, 58)]:
        karst(px, rng, cx, hz, w, h, "5b6f6a", "3f504d", "3f8a45", 12)
    # cổng tam quan on the left bank
    d.rectangle((0, hz - 6, 52, hz + 2), fill=c("6bb35a"))
    gx, gy = 22, hz - 6
    d.rectangle((gx - 12, gy - 14, gx + 12, gy), fill=c("f0dca0"))
    d.rectangle((gx - 4, gy - 10, gx + 4, gy), fill=c("2d2219"))
    d.polygon([(gx - 16, gy - 14), (gx, gy - 22), (gx + 16, gy - 14)], fill=c("8c1c13"))
    d.polygon([(gx - 6, gy - 20), (gx, gy - 26), (gx + 6, gy - 20)], fill=c("bd3d2a"))
    vgrad(px, hz, H, ["4fb3a5", "2f8f8a", "1f6f7a"])
    d.rectangle((0, hz - 6, 52, hz + 1), fill=c("6bb35a"))
    reflect(img, hz + 2, H, c("1f6f7a"), 0.5)
    d = ImageDraw.Draw(img)
    ripples(d, rng, hz + 6, H, "7fd1c1", 40)
    # sampan boats with rowers in nón lá
    for bx, by in [(70, 150), (128, 176)]:
        d.polygon([(bx - 14, by), (bx + 14, by), (bx + 10, by + 4), (bx - 10, by + 4)], fill=c("4a3628"))
        for rx in (bx - 6, bx + 5):
            d.rectangle((rx - 1, by - 6, rx + 1, by), fill=c("2f6fa8"))
            d.polygon([(rx - 4, by - 6), (rx, by - 10), (rx + 4, by - 6)], fill=c("e7c05f"))
        d.line((bx + 5, by - 4, bx + 13, by + 6), fill=c("7a4a2a"))
    return img


def tram_chim(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    hz = 118
    vgrad(px, 0, hz, ["6b5b95", "c86b7a" if "c86b7a" in C else "f39a6b", "f39a6b", "f6c48a"])
    d.ellipse((112, 80, 136, 104), fill=c("f6c48a")); d.ellipse((115, 83, 133, 101), fill=c("e7c05f"))
    # melaleuca (tràm) tree line silhouettes
    for x in range(-4, W + 6, 5):
        h = rng.randint(10, 24)
        d.line((x, hz, x, hz - h), fill=c("2d2219"))
        d.ellipse((x - 4, hz - h - 5, x + 4, hz - h + 3), fill=c("2d2219"))
    vgrad(px, hz, H, ["f39a6b", "b36547", "4a3628"])
    for _ in range(9):  # flooded patches reflecting the sunset
        x, y, w = rng.randrange(-10, W), rng.randrange(hz + 6, H - 10), rng.randint(16, 40)
        d.ellipse((x, y, x + w, y + 5), fill=c("f6c48a"))
    for x in range(0, W, 2):  # tall grass
        h = rng.randint(4, 14)
        d.line((x, H, x + rng.randint(-1, 1), H - h), fill=c(rng.choice(["7a4a2a", "4a3628", "b36547"])))
    # sarus cranes standing (grey body, red head)
    for cx, cy in [(48, 160), (60, 166), (140, 158)]:
        d.ellipse((cx - 5, cy - 4, cx + 5, cy + 2), fill=c("8e9a94"))
        d.line((cx + 3, cy - 3, cx + 5, cy - 13), fill=c("8e9a94"))
        d.rectangle((cx + 4, cy - 16, cx + 6, cy - 13), fill=c("bd3d2a"))
        d.line((cx + 7, cy - 14, cx + 10, cy - 13), fill=c("2d2219"))
        d.line((cx - 1, cy + 2, cx - 1, cy + 10), fill=c("2d2219")); d.line((cx + 2, cy + 2, cx + 2, cy + 10), fill=c("2d2219"))
    for fx, fy in [(40, 50), (58, 42), (74, 56)]:  # flying silhouettes
        d.line((fx - 8, fy - 3, fx, fy, fx + 8, fy - 3), fill=c("2d2219"))
        d.line((fx, fy, fx + 5, fy + 1), fill=c("2d2219"))
    return img


def con_dao(rng):
    img = Image.new("RGB", (W, H)); px = img.load(); d = ImageDraw.Draw(img)
    hz = 92
    vgrad(px, 0, hz, ["5aa7d6", "8fd3e8", "b8e4f0", "e6f6f8"])
    clouds(d, rng, 5, 8, 50)
    for cx, w, h, col in [(40, 70, 26, "5b6f6a"), (130, 90, 34, "3f8a45"), (175, 50, 20, "5b6f6a")]:
        for x in range(cx - w // 2, cx + w // 2):
            if 0 <= x < W:
                u = (x - cx) / (w / 2)
                top = int(hz - h * (1 - u * u) - 2 * math.sin(x / 3))
                d.line((x, top, x, hz), fill=c(col))
    vgrad(px, hz, 160, ["2f6fa8", "5aa7d6", "4fb3a5", "7fd1c1"])
    ripples(d, rng, hz + 3, 155, "e6f6f8", 35, 6)
    # foam line and beach
    for x in range(W):
        y = int(160 + 2 * math.sin(x / 9))
        d.line((x, y - 1, x, y), fill=c("f3eee5"))
        d.line((x, y + 1, x, H), fill=c("f0dca0"))
    for _ in range(120):
        px[rng.randrange(W), rng.randrange(165, H)] = c("e7c05f")
    # sea turtle on the sand
    tx, ty = 96, 182
    d.ellipse((tx - 8, ty - 5, tx + 8, ty + 5), fill=c("4a3628"))
    d.ellipse((tx - 6, ty - 4, tx + 6, ty + 3), fill=c("7a4a2a"))
    d.ellipse((tx + 7, ty - 2, tx + 11, ty + 2), fill=c("6bb35a"))
    for fx, fy in [(-7, -5), (5, -6), (-7, 4), (5, 5)]:
        d.ellipse((tx + fx, ty + fy, tx + fx + 3, ty + fy + 2), fill=c("6bb35a"))
    # coconut palms framing both sides
    for bx, lean in [(8, 1), (172, -1), (24, 1)]:
        topx, topy = bx + 10 * lean, 72 if bx != 24 else 96
        d.line((bx, H, topx, topy), fill=c("7a4a2a"), width=3)
        for ang in range(0, 360, 45):
            a = math.radians(ang)
            ex, ey = topx + 18 * math.cos(a), topy + 8 * math.sin(a) + 6
            d.line((topx, topy, ex, ey), fill=c("3f8a45"), width=2)
        d.ellipse((topx - 3, topy, topx + 2, topy + 4), fill=c("4a3628"))
    return img


SCENES = {"ha_long": ha_long, "phong_nha": phong_nha, "nam_cat_tien": nam_cat_tien, "mu_cang_chai": mu_cang_chai,
          "hoan_kiem": hoan_kiem, "trang_an": trang_an, "tram_chim": tram_chim, "con_dao": con_dao}


def quantize(img):
    pal = Image.new("P", (1, 1))
    flat = [v for h in PAL for v in C[h]]
    pal.putpalette(flat + [0] * (768 - len(flat)))
    return img.quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")


def board_mock(bg):
    """how it looks in the game: 720×800 canvas, background ×4, semi-transparent board on top"""
    im = bg.resize((720, 800), Image.NEAREST).convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    x0, y0, cell = 104, 70, 64
    for r in range(8):
        for col in range(8):
            own = r >= 4
            base = ((91, 122, 58) if (r + col) % 2 == 0 else (82, 112, 58)) if own else ((58, 42, 31) if (r + col) % 2 == 0 else (51, 37, 27))
            d.rectangle((x0 + col * cell, y0 + r * cell, x0 + (col + 1) * cell - 1, y0 + (r + 1) * cell - 1), fill=base + (120,))
    d.rectangle((x0, y0 + 4 * cell - 1, x0 + 8 * cell, y0 + 4 * cell + 1), fill=(140, 28, 19, 255))
    for i in range(8):
        d.rectangle((x0 + i * cell + 2, 618, x0 + (i + 1) * cell - 3, 680), fill=(44, 31, 22, 200), outline=(122, 102, 86, 255))
    return Image.alpha_composite(im, ov).convert("RGB")


def main(preview=None):
    out = ROOT / "assets/backgrounds"; out.mkdir(parents=True, exist_ok=True)
    (ROOT / "assets/palette/backgrounds.hex").write_text("\n".join(PAL) + "\n")
    names = {b["id"]: b["vi"] for b in json.loads((ROOT / "data/backgrounds.json").read_text(encoding="utf-8"))["backgrounds"]}
    imgs = {}
    for i, (key, fn) in enumerate(SCENES.items()):
        imgs[key] = quantize(fn(random.Random(1000 + i)))
        imgs[key].save(out / f"{key}.png")
    print("wrote", len(imgs), "backgrounds ->", out)
    if preview:
        p = pathlib.Path(preview); p.mkdir(parents=True, exist_ok=True)
        f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 18)
        sheet = Image.new("RGB", (4 * 360 + 50, 2 * 440 + 30), (27, 18, 12)); d = ImageDraw.Draw(sheet)
        for i, (k, im) in enumerate(imgs.items()):
            x, y = 10 + (i % 4) * 370, 10 + (i // 4) * 450
            sheet.paste(im.resize((360, 400), Image.NEAREST), (x, y))
            d.text((x + 4, y + 406), names.get(k, k), font=f, fill=(251, 233, 196))
        sheet.save(p / "backgrounds_sheet.png")
        for k in ("ha_long", "mu_cang_chai"):
            board_mock(imgs[k]).save(p / f"ingame_{k}.png")
        print("previews ->", p)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
