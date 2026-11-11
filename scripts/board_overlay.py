"""Put the 8×8 battle board on a painted background, Underlords-style camera (high angle, mild perspective).

    python3 scripts/board_overlay.py BACKGROUND.png OUT.png [--units]

The board is drawn flat (top-down) as a stone platform with a wooden rim, then projected onto a
trapezoid (narrower at the top = farther away), given a front edge, a shadow and a foam ring on the
water. With --units, a few current VieAni sprites are stood on cells to check scale.
The same projection numbers go into the game later (board corners in 1280×720 screen pixels).
"""
import json, pathlib, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SW, SH = 1280, 720
# board corners on screen: top-left, top-right, bottom-right, bottom-left (Underlords-like camera)
CORNERS = [(420, 92), (860, 92), (932, 548), (348, 548)]
# bench: 8 slots on a plank in front of the board (screen coords, simple trapezoid)
BENCH = [(352, 592), (928, 592), (944, 648), (336, 648)]
TEX = 1024  # flat board texture size (8 cells × 128 px)
RIM = 40    # wooden rim width in the flat texture


def perspective_coeffs(src, dst):
    """coefficients for PIL Image.transform(PERSPECTIVE) mapping dst (output) -> src (input)"""
    A, B = [], []
    for (x, y), (u, v) in zip(dst, src):
        A.append([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.append(u)
        A.append([0, 0, 0, x, y, 1, -v * x, -v * y]); B.append(v)
    return np.linalg.solve(np.array(A, float), np.array(B, float)).tolist()


def board_texture(rng):
    T = TEX + 2 * RIM
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    # wooden rim (lim, Hạ Long floating-village planks)
    d.rectangle((0, 0, T - 1, T - 1), fill=(96, 62, 38, 255))
    for y in range(0, T, 10):
        d.line((0, y, T, y), fill=(84, 54, 33, 255))
    d.rectangle((6, 6, T - 7, T - 7), outline=(140, 94, 56, 255), width=4)
    cell = TEX // 8
    for r in range(8):
        for c in range(8):
            own = r >= 4
            base = np.array((214, 196, 160) if (r + c) % 2 == 0 else (196, 176, 140), float)
            tint = np.array((255, 214, 140)) if own else np.array((150, 214, 205))
            col = base * 0.72 + tint * 0.28
            x0, y0 = RIM + c * cell, RIM + r * cell
            # stone tile with soft per-pixel variation (painted look, not pixel art)
            noise = rng.normal(0, 6, (cell, cell, 1))
            tile = np.clip(col + noise, 0, 255).astype(np.uint8)
            t = Image.fromarray(tile, "RGB").filter(ImageFilter.GaussianBlur(1.5)).convert("RGBA")
            im.paste(t, (x0, y0))
            d.rectangle((x0, y0, x0 + cell - 1, y0 + cell - 1), outline=(120, 100, 76, 255), width=3)  # grout
            d.line((x0 + 4, y0 + 4, x0 + cell - 6, y0 + 4), fill=(236, 224, 196, 255), width=2)     # top-left light
            d.line((x0 + 4, y0 + 4, x0 + 4, y0 + cell - 6), fill=(236, 224, 196, 255), width=2)
            # worn corners / moss on the enemy half edge, a little dirt everywhere
            for _ in range(3):
                px, py = x0 + rng.integers(10, cell - 10), y0 + rng.integers(10, cell - 10)
                d.ellipse((px - 3, py - 2, px + 3, py + 2), fill=(150, 132, 104, 120))
    # centre line (red lacquer, like a temple beam) + Đông Sơn drum star in the middle
    mid = RIM + 4 * cell
    d.rectangle((RIM, mid - 4, RIM + TEX, mid + 4), fill=(150, 40, 28, 255))
    return im


def compose(bg_path, out, units=False, seed=3):
    rng = np.random.default_rng(seed)
    bg = Image.open(bg_path).convert("RGB").resize((SW, SH), Image.LANCZOS).convert("RGBA")
    tex = board_texture(rng)
    T = tex.width
    src = [(0, 0), (T, 0), (T, T), (0, T)]
    coeffs = perspective_coeffs(src, CORNERS)
    proj = tex.transform((SW, SH), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

    # shadow on the water, then foam ring, then the platform's front face (thickness)
    (tlx, tly), (trx, try_), (brx, bry), (blx, bly) = CORNERS
    sh = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(sh)
    d.polygon([(tlx + 18, tly + 30), (trx + 30, try_ + 30), (brx + 40, bry + 44), (blx + 10, bly + 44)], fill=(10, 40, 36, 120))
    sh = sh.filter(ImageFilter.GaussianBlur(16))
    foam = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(foam)
    d.line([(blx - 6, bly + 26), (brx + 6, bry + 26)], fill=(225, 245, 236, 150), width=5)
    d.line([(blx - 4, bly + 26), (tlx - 8, tly + 22)], fill=(225, 245, 236, 90), width=3)
    d.line([(brx + 4, bry + 26), (trx + 8, try_ + 22)], fill=(225, 245, 236, 90), width=3)
    foam = foam.filter(ImageFilter.GaussianBlur(2.5))
    face = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(face)
    d.polygon([(blx, bly), (brx, bry), (brx - 2, bry + 22), (blx + 2, bly + 22)], fill=(70, 44, 27, 255))
    for k in range(4):
        y = bly + 5 + k * 5
        d.line([(blx + 2, y), (brx - 2, y)], fill=(58, 36, 22, 255), width=1)
    d.polygon([(trx, try_), (brx, bry), (brx - 2, bry + 22), (trx, try_ + 8)], fill=(58, 36, 22, 255))
    d.polygon([(tlx, tly), (blx, bly), (blx + 2, bly + 22), (tlx, tly + 8)], fill=(80, 52, 32, 255))

    out_im = Image.alpha_composite(bg, sh)
    out_im = Image.alpha_composite(out_im, foam)
    out_im = Image.alpha_composite(out_im, face)
    out_im = Image.alpha_composite(out_im, proj)

    # bench plank with 8 slots
    bl = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(bl)
    (a1, b1), (a2, b2), (a3, b3), (a4, b4) = BENCH
    d.polygon([(a1 - 6, b1 - 6), (a2 + 6, b2 - 6), (a3 + 6, b3 + 6), (a4 - 6, b4 + 6)], fill=(70, 44, 27, 235))
    d.line([(a4 - 6, b4 + 6), (a3 + 6, b3 + 6)], fill=(46, 28, 17, 255), width=6)
    for i in range(8):
        t0, t1 = i / 8, (i + 1) / 8
        top0, top1 = a1 + (a2 - a1) * t0 + 4, a1 + (a2 - a1) * t1 - 4
        bot0, bot1 = a4 + (a3 - a4) * t0 + 4, a4 + (a3 - a4) * t1 - 4
        d.polygon([(top0, b1 + 3), (top1, b1 + 3), (bot1, b4 - 3), (bot0, b4 - 3)], fill=(196, 176, 140, 255), outline=(232, 184, 92, 255))
    out_im = Image.alpha_composite(out_im, bl)

    # Underlords-style vignette keeps the eye on the board
    vg = Image.new("L", (SW, SH), 0); ImageDraw.Draw(vg).ellipse((-120, -160, SW + 120, SH + 120), fill=255)
    vg = vg.filter(ImageFilter.GaussianBlur(90))
    dark = Image.new("RGBA", (SW, SH), (20, 14, 10, 150)); dark.putalpha(Image.eval(vg, lambda v: int(150 * (1 - v / 255))))
    out_im = Image.alpha_composite(out_im, dark)

    # soft warm light from the top-left sun of this painting
    light = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(light)
    d.ellipse((150, -250, 900, 420), fill=(255, 220, 150, 40))
    out_im = Image.alpha_composite(out_im, light.filter(ImageFilter.GaussianBlur(60)))

    if units:
        species = {s["vi"]: s["id"] for s in json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))["species"]}
        H = np.array(perspective_coeffs(CORNERS, src)).tolist()  # flat -> screen mapping
        a, b, c, dd, e, f, g, h = perspective_coeffs(CORNERS, src)

        def to_screen(u, v):  # flat texture coords -> screen
            den = g * u + h * v + 1
            return (a * u + b * v + c) / den, (dd * u + e * v + f) / den

        cell = TEX / 8
        place = {(1, 1): "Hổ Đông Dương", (1, 3): "Voi châu Á", (1, 5): "Gấu chó", (2, 2): "Rắn Hổ Mang", (2, 6): "Trâu",
                 (5, 2): "Chó Phú Quốc", (6, 1): "Voi chín ngà", (6, 3): "Gà chín cựa", (6, 5): "Ngựa chín hồng mao",
                 (7, 4): "Rồng Lạc Việt", (5, 6): "Sếu đầu đỏ", (7, 6): "Mèo Mun"}
        for (r, col), name in sorted(place.items()):
            u = RIM + (col + 0.5) * cell; v = RIM + (r + 0.62) * cell
            x, y = to_screen(u, v)
            x2, _ = to_screen(u + cell, v)
            size = int((x2 - x) * 1.05)
            sp = Image.open(ROOT / f"assets/sprites/{species[name]:02d}.png").convert("RGBA").resize((size, size), Image.NEAREST)
            if r < 4:
                sp = sp.transpose(Image.FLIP_LEFT_RIGHT)
            shadow = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); ImageDraw.Draw(shadow).ellipse(
                (x - size * 0.32, y - size * 0.08, x + size * 0.32, y + size * 0.1), fill=(40, 30, 20, 110))
            out_im = Image.alpha_composite(out_im, shadow.filter(ImageFilter.GaussianBlur(3)))
            out_im.alpha_composite(sp, (int(x - size / 2), int(y - size * 0.92)))
    out_im.convert("RGB").save(out)
    print("wrote", out)


if __name__ == "__main__":
    compose(sys.argv[1], sys.argv[2], "--units" in sys.argv)
