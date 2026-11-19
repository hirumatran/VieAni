"""Pixel-art habitat banners for the VieIndex detail view (PO 19 Nov 2026) – one per habitat in data/vieindex.json.

    python3 scripts/habitat_banners.py [PREVIEW.png]   -> assets/habitats/<Habitat>.png (240×80, shown ×3, nearest-neighbour)

Procedural, same palette and 4×4 ordered dithering as scripts/draft_backgrounds.py (original art; replace any file 1:1
with a hand-made or generated banner of the same size).
"""
import math, pathlib, random, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 240, 80
BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]
P = {k: tuple(int(v[i:i + 2], 16) for i in (0, 2, 4)) for k, v in {
    "ink": "16110e", "bark": "4a3628", "soil": "7a4a2a", "clay": "b36547", "sand": "e7c05f", "cream": "f0dca0", "white": "f3eee5",
    "red": "bd3d2a", "dred": "8c1c13", "sky0": "e6f6f8", "sky1": "b8e4f0", "sky2": "8fd3e8", "sea0": "5aa7d6", "sea1": "2f6fa8",
    "sea2": "1f4e79", "teal0": "155463", "teal1": "1f6f7a", "teal2": "2f8f8a", "teal3": "4fb3a5", "teal4": "7fd1c1",
    "g0": "2e6b3a", "g1": "3f8a45", "g2": "6bb35a", "g3": "9ccf6b", "rock0": "3f504d", "rock1": "5b6f6a", "rock2": "8e9a94",
    "peach": "f6c48a", "orange": "f39a6b", "violet": "6b5b95", "gold": "e7c05f", "dgreen": "1f4a2a", "lav": "c9b8e8",
}.items()}


class Canvas:
    def __init__(self, seed):
        self.im = Image.new("RGB", (W, H)); self.px = self.im.load(); self.rnd = random.Random(seed)

    def put(self, x, y, c):
        if 0 <= x < W and 0 <= y < H: self.px[x, y] = P[c]

    def grad(self, y0, y1, cols):
        """vertical gradient through palette colours, dithered"""
        n = len(cols) - 1
        for y in range(max(0, y0), min(H, y1)):
            t = (y - y0) / max(1, y1 - y0 - 1) * n
            i = min(int(t), n - 1) if n else 0
            f = t - i
            for x in range(W):
                self.put(x, y, cols[i + 1] if n and f * 16 > BAYER[y % 4][x % 4] else cols[i])

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1):
            for x in range(x0, x1): self.put(x, y, c)

    def ridge(self, base, amp, freq, col, seed, rough=0.0, lit=None):
        """filled silhouette below a wavy line"""
        r = random.Random(seed); ph = r.random() * 6
        for x in range(W):
            h = base - amp * (0.6 * math.sin(x * freq + ph) + 0.4 * math.sin(x * freq * 2.3 + ph * 2)) - rough * r.random()
            for y in range(int(h), H): self.put(x, y, col)
            if lit and 0 <= int(h) < H: self.put(x, int(h), lit)

    def tree(self, x, y, r, dark="g0", mid="g1", light="g2"):
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                d = xx * xx + yy * yy
                if d <= r * r:
                    c = light if (xx + yy < -r // 2 and d < (r - 1) ** 2) else mid if d < (r - 1) ** 2 else dark
                    self.put(x + xx, y + yy, c)
        for yy in range(r, r + 4): self.put(x, y + yy, "bark")

    def cloud(self, x, y, w):
        for i in range(w):
            for j in range(-2, 3):
                if abs(j) + abs(i - w / 2) / (w / 2) * 2 < 3: self.put(x + i, y + j, "white")

    def water(self, y0, cols=("sea0", "sea1", "sea2"), sparkle="sky1"):
        self.grad(y0, H, list(cols))
        for _ in range(60):
            x, y = self.rnd.randrange(W), self.rnd.randrange(y0 + 2, H)
            for k in range(self.rnd.randint(2, 5)): self.put(x + k, y, sparkle)

    def sun(self, x, y, r, c="cream"):
        for yy in range(-r, r + 1):
            for xx in range(-r, r + 1):
                if xx * xx + yy * yy <= r * r: self.put(x + xx, y + yy, c)

    def birds(self, n, y0, y1):
        for _ in range(n):
            x, y = self.rnd.randrange(20, W - 20), self.rnd.randrange(y0, y1)
            for d in (-2, -1, 1, 2): self.put(x + d, y - (1 if abs(d) == 1 else 0), "ink")

    def house(self, x, y, w=22, roof="red", wall="cream"):
        self.rect(x, y, x + w, y + 10, wall)
        for i in range(6):
            self.rect(x - 3 + i, y - 1 - i, x + w + 3 - i, y - i, roof)
        self.rect(x + w // 2 - 2, y + 4, x + w // 2 + 2, y + 10, "bark")
        self.rect(x + 3, y + 3, x + 7, y + 6, "teal0")

    def reeds(self, y, n, col="g2"):
        for _ in range(n):
            x = self.rnd.randrange(W); h = self.rnd.randint(5, 12)
            for k in range(h): self.put(x + (1 if k > h * 0.7 else 0), y - k, col)
            self.put(x + 1, y - h, "soil")

    def palm(self, x, y, h):
        for k in range(h): self.put(x + int(2 * math.sin(k / h * 2)), y - k, "bark")
        tx = x + int(2 * math.sin(2))
        for ang in range(0, 360, 45):
            for r in range(1, 8):
                a = math.radians(ang)
                self.put(tx + int(r * math.cos(a)), y - h + int(r * math.sin(a) * 0.6 + r * r / 16), "g1" if r < 5 else "g2")


def forest(c):
    c.grad(0, 40, ["sky0", "sky1", "sky2"]); c.cloud(30, 10, 22); c.cloud(170, 14, 18)
    c.ridge(34, 6, 0.04, "rock1", 1); c.ridge(44, 5, 0.06, "teal1", 2)
    for i in range(30): c.tree(c.rnd.randrange(W), c.rnd.randrange(42, 56), c.rnd.randint(6, 10), "g0", "teal1", "g1")
    for i in range(24): c.tree(c.rnd.randrange(W), c.rnd.randrange(58, 74), c.rnd.randint(6, 9))
    c.rect(0, 74, W, H, "dgreen")


def field(c):
    c.grad(0, 34, ["sky0", "sky1", "sky2"]); c.cloud(140, 9, 24); c.sun(40, 12, 6)
    c.ridge(30, 5, 0.05, "rock1", 3); c.ridge(36, 4, 0.08, "teal2", 4)
    for band in range(10):
        y0 = 36 + band * 5; col = ["g2", "g3", "sand", "g3", "g2"][band % 5]
        for y in range(y0, y0 + 5):
            for x in range(W): c.put(x, y + int(1.5 * math.sin(x * 0.05 + band)), col)
        for x in range(W): c.put(x, y0 + int(1.5 * math.sin(x * 0.05 + band)), "soil")
    c.house(190, 40, 16, roof="bark", wall="clay")


def village(c):
    c.grad(0, 42, ["peach", "sky1", "sky0"][::-1]); c.cloud(80, 10, 20)
    c.ridge(40, 4, 0.05, "teal2", 5)
    for x in range(0, W, 7):  # bamboo hedge
        for y in range(28 + (x * 7) % 6, 56): c.put(x + (y % 3 == 0), y, "g1" if y % 5 else "g0")
    c.house(30, 46, 26); c.house(150, 48, 22, roof="dred")
    c.tree(110, 38, 12, "g0", "g1", "g2"); c.rect(108, 50, 112, 60, "bark")
    c.rect(0, 58, W, H, "clay")
    for x in range(0, W, 2):
        for y in range(62, H, 3): c.put(x + (y // 3) % 2, y, "soil")


def home(c):
    c.rect(0, 0, W, 50, "cream")
    for y in range(0, 50, 6):  # brick lines
        for x in range(W): c.put(x, y, "sand")
        for x in range((y // 6 % 2) * 6, W, 12): c.rect(x, y, x + 1, y + 6, "sand")
    c.rect(20, 10, 60, 50, "bark"); c.rect(24, 14, 56, 50, "soil")  # door
    c.rect(150, 14, 190, 36, "bark"); c.rect(153, 17, 187, 33, "sky1")  # window
    for k in range(4): c.rect(153 + k * 9, 17, 154 + k * 9, 33, "bark")
    c.rect(0, 50, W, H, "clay")  # red-tile courtyard
    for y in range(50, H, 6):
        for x in range(W): c.put(x, y, "soil")
        for x in range((y // 6 % 2) * 8, W, 16): c.rect(x, y, x + 1, y + 6, "soil")
    for px_ in (100, 220):  # potted plants
        c.rect(px_ - 5, 40, px_ + 5, 50, "red"); c.tree(px_, 34, 7)


def sea(c):
    c.grad(0, 36, ["sky0", "sky1", "sky2"]); c.cloud(60, 9, 20); c.cloud(190, 13, 16)
    c.ridge(36, 3, 0.05, "teal2", 6)
    c.water(38, ("sea0", "sea1", "sea2"))
    for y in range(64, H):
        for x in range(W):
            if y > 66 + 3 * math.sin(x * 0.07): c.put(x, y, "sand" if y % 3 else "cream")
    c.palm(220, 70, 26)


def wetland(c):
    c.grad(0, 40, ["orange", "peach", "cream"]); c.sun(170, 26, 7, "white"); c.birds(5, 8, 22)
    c.ridge(40, 2, 0.08, "g0", 7)
    c.water(42, ("teal3", "teal2", "teal1"), "teal4")
    for _ in range(14):
        x, y = c.rnd.randrange(W), c.rnd.randrange(46, 76)
        for xx in range(-3, 4): c.put(x + xx, y, "g2")
        if c.rnd.random() < 0.35: c.put(x, y - 1, "orange"); c.put(x, y - 2, "peach")
    c.reeds(78, 70)


def river(c):
    c.grad(0, 34, ["sky0", "sky1", "sky2"]); c.cloud(110, 11, 22)
    c.ridge(30, 5, 0.04, "rock1", 8)
    for i in range(18): c.tree(c.rnd.randrange(W), c.rnd.randrange(30, 40), c.rnd.randint(4, 7), "g0", "teal1", "g1")
    c.water(42, ("teal3", "teal2", "teal1"), "teal4")
    c.rect(0, 70, W, H, "g1"); c.reeds(72, 40, "g3")
    bx = 120  # wooden boat
    c.rect(bx, 56, bx + 26, 59, "bark"); c.rect(bx + 3, 59, bx + 23, 61, "soil"); c.rect(bx + 10, 50, bx + 16, 56, "bark")


def mountain(c):
    c.grad(0, 44, ["sky0", "sky1", "sky2"]); c.cloud(50, 12, 20)
    c.ridge(26, 10, 0.03, "rock2", 9, lit="white"); c.ridge(40, 8, 0.045, "rock1", 10); c.ridge(54, 6, 0.06, "teal1", 11)
    for y in range(44, 48):  # mist
        for x in range(W):
            if (x + y) % 3: c.put(x, y, "sky0")
    for i in range(16):
        x, y = c.rnd.randrange(W), c.rnd.randrange(58, 74)
        for k in range(8):
            for xx in range(-(k // 2), k // 2 + 1): c.put(x + xx, y - 8 + k, "g0")
    c.rect(0, 74, W, H, "dgreen")


def karst(c):
    c.grad(0, 44, ["sky0", "sky1", "sky2"]); c.cloud(130, 9, 22)
    for x0, w, h, col in ((10, 22, 46, "rock1"), (60, 16, 34, "rock2"), (95, 28, 54, "rock1"), (150, 18, 40, "rock2"), (190, 26, 50, "rock1")):
        for x in range(x0, x0 + w):
            top = 56 - h + int(4 * math.sin((x - x0) / w * math.pi) * -1) + (2 if (x - x0) in (0, w - 1) else 0)
            for y in range(top, 58): c.put(x, y, col if (x - x0) > w * 0.35 else "rock0")
            c.put(x, top, "g1"); c.put(x, top + 1, "g2" if x % 2 else "g1")
    c.water(56, ("teal3", "teal2", "teal1"), "teal4")
    c.rect(140, 62, 160, 64, "bark"); c.rect(146, 54, 148, 62, "bark"); c.rect(148, 54, 156, 60, "red")


def island(c):
    sea(c)
    c.rect(0, 64, W, H, "sea1")
    c.water(40, ("sea0", "sea1", "sea2"))
    for x in range(70, 170):
        top = 52 - int(10 * math.sin((x - 70) / 100 * math.pi))
        for y in range(top, 60): c.put(x, y, "g1" if y < top + 3 else "g0")
        for y in range(58, 62): c.put(x, y, "sand")
    c.palm(100, 50, 16); c.palm(140, 48, 18)


def sky(c):
    c.grad(0, 70, ["sky0", "sky1", "sky2", "sea0"])
    for x, y, w in ((20, 20, 26), (90, 40, 30), (170, 16, 24), (200, 50, 28), (60, 60, 20)): c.cloud(x, y, w)
    c.birds(9, 10, 50)
    c.ridge(74, 3, 0.05, "teal1", 12)


def mythic(c):
    c.grad(0, 60, ["violet", "lav", "peach", "gold"])
    c.sun(120, 40, 18, "cream"); c.sun(120, 40, 12, "white")
    for x0 in (20, 60, 170, 200):  # swirling clouds
        for k in range(14):
            a = k / 14 * math.pi * 2
            c.put(x0 + int(8 * math.cos(a)), 20 + int(4 * math.sin(a)), "white")
            c.put(x0 + int(5 * math.cos(a)), 20 + int(2.5 * math.sin(a)), "cream")
    c.ridge(62, 3, 0.05, "violet", 13)
    # đình roof silhouette with curled ends
    for i in range(14): c.rect(70 + i * 2, 54 - i, 170 - i * 2, 55 - i, "dred")
    c.rect(78, 55, 162, 72, "bark"); c.rect(64, 52, 70, 54, "dred"); c.rect(170, 52, 176, 54, "dred")
    c.put(63, 51, "gold"); c.put(176, 51, "gold"); c.put(120, 40, "gold")
    for x in range(86, 160, 12): c.rect(x, 58, x + 3, 72, "dred")
    c.rect(0, 72, W, H, "rock0")


SCENES = {"Forest": forest, "Field": field, "Village": village, "Home": home, "Sea": sea, "Wetland": wetland, "River": river,
          "Mountain": mountain, "Karst": karst, "Island": island, "Sky": sky, "Mythic": mythic}


def main(preview=None):
    out = ROOT / "assets/habitats"; out.mkdir(parents=True, exist_ok=True)
    tiles = []
    for i, (name, fn) in enumerate(SCENES.items()):
        cv = Canvas(100 + i); fn(cv)
        cv.im.save(out / f"{name}.png", optimize=True)
        tiles.append(cv.im.resize((W * 2, H * 2), Image.NEAREST))
    if preview:
        sheet = Image.new("RGB", (W * 2 * 3 + 8, (H * 2 + 4) * 4), (20, 14, 10))
        for i, t in enumerate(tiles): sheet.paste(t, ((i % 3) * (W * 2 + 4), (i // 3) * (H * 2 + 4)))
        sheet.save(preview)
    print("wrote", len(SCENES), "habitat banners")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
