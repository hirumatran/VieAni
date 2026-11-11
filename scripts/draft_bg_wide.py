"""Wide (16:9) battle background, v2 – Vịnh Hạ Long, after the PO's Gemini reference.

    python3 scripts/draft_bg_wide.py [PREVIEW_DIR]

Writes assets/backgrounds/wide/ha_long.png at 320×180 (game scales ×4 → 1280×720, the
landscape phone/PC layout) and, with PREVIEW_DIR, an in-game mock-up with board, VieAni and HUD.
Layers back to front: sky → far ranges in mist → karst islands at increasing depth (each with
reflection and wave-cut notch) → junk boats → foreground cliffs. Atmospheric perspective: the
farther the layer, the paler and bluer it gets.
"""
import json, math, pathlib, random, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 320, 180
HZ = 62  # horizon
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
hexrgb = lambda h: tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))

PAL = [hexrgb(h) for h in """
16110e 2d2219 4a3628 7a4a2a 8c1c13 b8402c d9643a e8945a f0c08a f3eee5
e6f6f8 cfeaf0 b0dbe8 8fcbe0 dfece8 c9dcd6 b1c9c3 98b5ae 809f98 6b8b85
57746f 44605c 33504d 243f3e 9fd8c8 7cc8b4 5bb39e 3f9a86 2a8270 1f6f62
175c55 124a48 0e3a3c 8fbf6a 6ea455 548c45 3f733a 2e5c30 214726 a8c890
""".split()]


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


class Canvas:
    def __init__(self):
        self.im = Image.new("RGB", (W, H)); self.px = self.im.load(); self.d = ImageDraw.Draw(self.im)

    def put(self, x, y, col):
        if 0 <= x < W and 0 <= y < H:
            self.px[x, y] = col

    def dgrad(self, y0, y1, cols):
        """vertical gradient through several colours, ordered dither between steps"""
        for y in range(max(0, y0), min(H, y1)):
            t = (y - y0) / max(1, y1 - y0 - 1) * (len(cols) - 1)
            i = min(int(t), len(cols) - 2); f = t - i
            for x in range(W):
                self.px[x, y] = cols[i + 1] if BAYER[y % 4][x % 4] < f * 16 else cols[i]

    def mist(self, y, thick, col, strength=0.6):
        for yy in range(y - thick, y + thick):
            k = strength * (1 - abs(yy - y) / thick)
            for x in range(W):
                wob = 0.5 + 0.5 * math.sin(x / 23 + yy * 0.3)
                if 0 <= yy < H:
                    self.px[x, yy] = lerp(self.px[x, yy], col, max(0.0, k * (0.5 + 0.5 * wob)))


def noise1(rng, n, scale):
    """smooth 1-D value noise"""
    pts = [rng.uniform(-1, 1) for _ in range(n // scale + 3)]
    out = []
    for i in range(n):
        p = i / scale; k = int(p); f = p - k; f = f * f * (3 - 2 * f)
        out.append(pts[k] * (1 - f) + pts[k + 1] * f)
    return out


def karst(cv, rng, cx, base, w, h, depth, reflect_to=None):
    """limestone island. depth 0 = near (full contrast) … 1 = far (merges into mist)."""
    mist = (205, 225, 222)
    lit, mid, shd, veg, veg2 = (128, 146, 138), (96, 114, 108), (62, 78, 74), (63, 115, 58), (110, 164, 85)
    fade = lambda col: lerp(col, mist, depth ** 0.8 * 0.9)
    half = w / 2
    prof = noise1(rng, int(w) + 2, max(3, int(w / 4)))
    streak = noise1(rng, int(w) + 2, 2)
    cols = []
    for i, x in enumerate(range(int(cx - half), int(cx + half) + 1)):
        u = (x - cx) / half
        if abs(u) > 1:
            continue
        hh = h * (1 - abs(u) ** 2.6) ** 0.55 * (1 + 0.12 * prof[i]) + rng.uniform(-0.6, 0.6)
        top = int(base - hh)
        cols.append((x, top))
        for y in range(top, base):
            v = (base - y) / max(1, hh)
            col = lit if u < -0.45 else (mid if u < 0.3 else shd)
            if streak[i] > 0.7 and col != shd:
                col = lerp(col, shd, 0.5)  # vertical rain-streaks in the limestone
            if y - top < 2 + (x * 7 % 3):
                col = veg  # vegetation cap
            elif ((x // 2) * 31 + (y // 2) * 17) % 37 == 0 and v > 0.25:
                col = veg2 if u < 0 else veg  # shrub clumps on ledges
            if base - y <= 2:
                col = shd  # wave-cut notch at the waterline
            cv.put(x, y, fade(col))
    for x, top in cols:  # rim light on the left edge
        if (x - cx) / half < -0.5:
            cv.put(x, top, fade((170, 190, 170)))
    if reflect_to:
        water_dark = (20, 80, 74)
        for x, top in cols:
            hh = base - top
            for k in range(min(int(hh * 0.8), reflect_to - base)):
                y = base + k
                src = cv.px[x, base - 1 - k] if base - 1 - k >= 0 else water_dark
                off = int(round(math.sin((y + x * 0.1) * 1.3)))
                if BAYER[y % 4][(x + off) % 4] < 11 - k * 10 / max(1, hh):
                    cv.put(x + off, y, lerp(src, lerp(water_dark, mist, depth * 0.7), 0.55))
        for x in range(int(cx - half * 0.9), int(cx + half * 0.9)):
            if rng.random() < 0.6:
                cv.put(x, base, fade((200, 235, 225)))  # foam line


def junk(cv, x, base, s, depth=0.0):
    """Hạ Long junk: dark hull, three fan-battened ochre/red sails, reflection"""
    mist = (205, 225, 222)
    f = lambda col: lerp(col, mist, depth * 0.85)
    d = cv.d
    L = int(30 * s)
    hull = [(x - L // 2, base - int(4 * s)), (x + L // 2 + int(3 * s), base - int(6 * s)), (x + L // 2 - int(2 * s), base),
            (x - L // 2 + int(3 * s), base)]
    d.polygon(hull, fill=f((58, 36, 26)))
    d.line((x - L // 2, base - int(4 * s), x + L // 2 + int(3 * s), base - int(6 * s)), fill=f((122, 74, 42)))
    d.rectangle((x - int(6 * s), base - int(8 * s), x + int(5 * s), base - int(4 * s)), fill=f((90, 55, 35)))
    for k, (dx, hgt, col) in enumerate([(-9, 20, (217, 100, 58)), (1, 27, (184, 64, 44)), (11, 18, (217, 100, 58))]):
        mx = x + int(dx * s); top = base - int((hgt + 4) * s); bot = base - int(5 * s)
        d.line((mx, bot, mx, top - int(2 * s)), fill=f((45, 34, 25)))
        sw = int(9 * s)
        d.polygon([(mx, top), (mx + sw, top + int(3 * s)), (mx + sw + int(2 * s), bot - int(1 * s)), (mx, bot)], fill=f(col))
        for r in range(top + int(4 * s), bot, max(2, int(4 * s))):
            d.line((mx, r, mx + sw + int(1 * s), r + int(1 * s)), fill=f((122, 50, 34)))
    for k in range(int(10 * s)):  # reflection
        y = base + 1 + k
        for xx in range(x - L // 2, x + L // 2, 1):
            if BAYER[y % 4][xx % 4] < 7 - k:
                cv.put(xx + (1 if k % 2 else 0), y, f((120, 60, 40) if k > 2 else (40, 30, 24)))


def ha_long_wide(seed=7):
    rng = random.Random(seed); cv = Canvas()
    # sky + sun haze
    cv.dgrad(0, HZ, [hexrgb(h) for h in ("8fcbe0", "b0dbe8", "cfeaf0", "e6f6f8")])
    for _ in range(7):  # soft clouds
        x, y, w = rng.randrange(-20, W), rng.randrange(6, 34), rng.randint(30, 60)
        for k in range(6):
            cx = x + k * w // 6; r = rng.randint(4, 8)
            cv.d.ellipse((cx - r, y - r // 2 - (k % 2) * 2, cx + r, y + r // 2), fill=(243, 238, 229))
        cv.d.line((x - 4, y + 3, x + w, y + 3), fill=(207, 234, 240))
    # far mountain ranges in haze
    for base, amp, col, sc in [(HZ, 10, (190, 212, 214), 18), (HZ + 2, 14, (168, 196, 198), 11)]:
        n = noise1(rng, W, sc)
        for x in range(W):
            top = int(base - amp * (0.55 + 0.45 * n[x]))
            cv.d.line((x, top, x, base), fill=col)
    # water
    cv.dgrad(HZ, H, [hexrgb(h) for h in ("9fd8c8", "7cc8b4", "5bb39e", "3f9a86", "2a8270", "1f6f62", "175c55")])
    cv.mist(HZ + 1, 4, (223, 236, 232), 0.7)
    # karst islands: far → near (base y deeper = nearer)
    layers = [(66, 0.85, 9, (6, 12), (8, 16)), (72, 0.65, 8, (10, 20), (14, 28)), (82, 0.45, 6, (16, 30), (22, 40)),
              (98, 0.25, 5, (22, 40), (32, 56))]
    for base, depth, n, wr, hr in layers:
        xs = sorted(rng.sample(range(10, W - 10), n))
        for x in xs:
            karst(cv, rng, x + rng.randint(-6, 6), base + rng.randint(-2, 3), rng.randint(*wr), rng.randint(*hr), depth, H)
        cv.mist(base - 2, 3, (223, 236, 232), 0.55 * depth + 0.15)
    # ripples, denser and longer toward the viewer
    for _ in range(260):
        y = int(HZ + 4 + (H - HZ - 4) * rng.random() ** 0.7)
        x = rng.randrange(W); L = 1 + int((y - HZ) / 22) + rng.randint(0, 2)
        cv.d.line((x, y, x + L, y), fill=(191, 232, 220) if rng.random() < 0.7 else (143, 211, 196))
    # boats at increasing size with depth
    for x, base, s, dep in [(70, 75, 0.35, 0.6), (232, 73, 0.3, 0.65), (150, 88, 0.5, 0.35), (258, 104, 0.75, 0.15),
                            (96, 134, 1.0, 0.0), (214, 158, 1.3, 0.0)]:
        junk(cv, x, base, s, dep)
    # foreground framing cliffs
    karst(cv, rng, 4, 172, 84, 128, 0.0, None)
    karst(cv, rng, 46, 180, 34, 52, 0.0, None)
    karst(cv, rng, 318, 168, 70, 112, 0.0, None)
    karst(cv, rng, 284, 180, 26, 30, 0.0, None)
    for x in list(range(0, 62)) + list(range(272, W)):  # foam at the cliff feet
        if rng.random() < 0.5:
            cv.put(x, rng.choice([170, 171, 166, 176, 177, 178]), (200, 235, 225))
    # seabirds
    for bx, by in [(120, 22), (130, 18), (142, 25), (205, 14)]:
        cv.d.line((bx - 3, by - 1, bx, by, bx + 3, by - 1), fill=(60, 70, 70))
    return cv.im


def quantize(img):
    pal = Image.new("P", (1, 1)); flat = [v for c in PAL for v in c]
    pal.putpalette(flat + [0] * (768 - len(flat)))
    return img.quantize(palette=pal, dither=Image.Dither.NONE).convert("RGB")


def mockup(bg):
    """1280×720 landscape layout: board in the middle, HUD left/right, bench + shop below"""
    S = 4; im = bg.resize((W * S, H * S), Image.NEAREST).convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0)); d = ImageDraw.Draw(ov)
    cell = 60; x0, y0 = (1280 - 8 * cell) // 2, 70
    for r in range(8):
        for c in range(8):
            own = r >= 4
            base = (232, 184, 92) if own else (70, 170, 160)
            a = 70 if (r + c) % 2 else 105
            box = (x0 + c * cell + 2, y0 + r * cell + 2, x0 + (c + 1) * cell - 3, y0 + (r + 1) * cell - 3)
            d.rounded_rectangle(box, 6, fill=base + (a,), outline=base + (190,), width=2)
    # bench
    by = y0 + 8 * cell + 14
    for i in range(8):
        d.rounded_rectangle((x0 + i * cell + 3, by, x0 + (i + 1) * cell - 4, by + cell - 6), 6, fill=(30, 22, 16, 170), outline=(232, 184, 92, 200), width=2)
    # shop bar
    d.rounded_rectangle((330, 660, 950, 716), 10, fill=(43, 29, 20, 220), outline=(194, 130, 69, 255), width=3)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
    fs = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 16)
    d.text((640, 688), "CỬA HÀNG", font=f, fill=(251, 233, 196, 255), anchor="mm")
    # HUD: player card (left), round box (right)
    d.ellipse((24, 20, 124, 120), fill=(43, 29, 20, 230), outline=(231, 192, 95, 255), width=4)
    d.rounded_rectangle((40, 112, 108, 140), 8, fill=(22, 17, 14, 230))
    d.text((74, 126), "♥ 73", font=fs, fill=(251, 233, 196, 255), anchor="mm")
    d.rounded_rectangle((22, 0, 126, 22), 6, fill=(43, 29, 20, 220))
    d.text((74, 11), "Bạn · Cấp 8", font=fs, fill=(251, 233, 196, 255), anchor="mm")
    d.rounded_rectangle((1080, 16, 1260, 92), 10, fill=(43, 29, 20, 220), outline=(194, 130, 69, 255), width=3)
    d.text((1170, 40), "VÒNG 18", font=f, fill=(251, 233, 196, 255), anchor="mm")
    d.text((1170, 70), "Chuẩn bị · 12 s", font=fs, fill=(231, 192, 95, 255), anchor="mm")
    for i, t in enumerate(["Sơn Tinh 3/3", "Bầy Chó 3/5", "Tứ Linh 2/4", "Con Giáp 6/12"]):
        d.rounded_rectangle((1090, 120 + i * 44, 1260, 156 + i * 44), 8, fill=(43, 29, 20, 200))
        d.text((1104, 138 + i * 44), t, font=fs, fill=(251, 233, 196, 255), anchor="lm")
    im = Image.alpha_composite(im, ov)
    # VieAni on the board (current draft sprites)
    data = {s["vi"]: s["id"] for s in json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))["species"]}
    place = {(0, 1): "Hổ Đông Dương", (0, 3): "Voi châu Á", (0, 5): "Gấu chó", (1, 2): "Rắn Hổ Mang", (1, 6): "Trâu",
             (5, 3): "Chó Phú Quốc", (6, 1): "Voi chín ngà", (6, 2): "Gà chín cựa", (6, 4): "Ngựa chín hồng mao",
             (7, 3): "Rồng Lạc Việt", (7, 5): "Sếu đầu đỏ", (6, 6): "Mèo Mun"}
    for (r, c), name in place.items():
        p = ROOT / f"assets/sprites/{data[name]:02d}.png"
        sp = Image.open(p).convert("RGBA").resize((cell - 6, cell - 6), Image.NEAREST)
        if r < 4:
            sp = sp.transpose(Image.FLIP_LEFT_RIGHT)
        im.alpha_composite(sp, (x0 + c * cell + 3, y0 + r * cell + 1))
    av = Image.open(ROOT / f"assets/sprites/{data['Hổ Đông Dương']:02d}.png").convert("RGBA").resize((72, 72), Image.NEAREST)
    im.alpha_composite(av, (38, 30))
    d = ImageDraw.Draw(im)
    for (r, c) in place:
        for k in range(2 if (r + c) % 3 else 3):
            sx = x0 + c * cell + 18 + k * 10; sy = y0 + r * cell + cell - 10
            d.text((sx, sy), "★", font=fs, fill=(231, 192, 95, 255), anchor="mm")
    return im.convert("RGB")


def main(preview=None):
    out = ROOT / "assets/backgrounds/wide"; out.mkdir(parents=True, exist_ok=True)
    bg = quantize(ha_long_wide())
    bg.save(out / "ha_long.png")
    print("wrote", out / "ha_long.png")
    if preview:
        p = pathlib.Path(preview); p.mkdir(parents=True, exist_ok=True)
        bg.resize((W * 4, H * 4), Image.NEAREST).save(p / "ha_long_v2.png")
        mockup(bg).save(p / "ha_long_v2_ingame.png")
        print("previews ->", p)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
