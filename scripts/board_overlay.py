"""Put the 8×8 battle board on a painted background, Underlords-style camera (high angle, mild perspective).

    python3 scripts/board_overlay.py BACKGROUND.png OUT.png [--units]

The board is transparent: tinted see-through cells with a thin outline (PO request), drawn flat and
projected onto a trapezoid (narrower at the top = farther away). The bench uses the same style.
With --units, a few current VieAni sprites are stood on cells to check scale.
The same projection numbers go into the game later (board corners in 1280×720 screen pixels).
"""
import json, pathlib, random, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
SW, SH = 1280, 720
# board corners on screen: top-left, top-right, bottom-right, bottom-left (Underlords-like camera)
CORNERS = [(352, 58), (928, 58), (1024, 604), (256, 604)]
# bench: 8 slots on a plank in front of the board (screen coords, simple trapezoid)
BENCH = [(256, 632), (1024, 632), (1044, 706), (236, 706)]
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
    """transparent board: tinted glass-like cells with a thin bright outline, background shows through"""
    T = TEX + 2 * RIM
    im = Image.new("RGBA", (T, T), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    cell = TEX // 8
    gap = 6
    for r in range(8):
        for c in range(8):
            own = r >= 4
            tint = (255, 214, 140) if own else (150, 230, 220)
            alpha = 60 if (r + c) % 2 == 0 else 34
            x0, y0 = RIM + c * cell + gap, RIM + r * cell + gap
            box = (x0, y0, x0 + cell - 2 * gap, y0 + cell - 2 * gap)
            d.rounded_rectangle(box, 14, fill=tint + (alpha,), outline=tint + (190,), width=4)
    mid = RIM + 4 * cell
    d.rectangle((RIM + gap, mid - 2, RIM + TEX - gap, mid + 2), fill=(230, 90, 60, 170))
    return im.filter(ImageFilter.GaussianBlur(0.6))


def compose(bg_path, out, units=False, seed=3):
    rng = np.random.default_rng(seed)
    bg = Image.open(bg_path).convert("RGB").resize((SW, SH), Image.LANCZOS).convert("RGBA")
    tex = board_texture(rng)
    T = tex.width
    src = [(0, 0), (T, 0), (T, T), (0, T)]
    coeffs = perspective_coeffs(src, CORNERS)
    proj = tex.transform((SW, SH), Image.PERSPECTIVE, coeffs, Image.BICUBIC)

    out_im = Image.alpha_composite(bg, proj)

    # bench plank with 8 slots
    bl = Image.new("RGBA", (SW, SH), (0, 0, 0, 0)); d = ImageDraw.Draw(bl)
    (a1, b1), (a2, b2), (a3, b3), (a4, b4) = BENCH
    for i in range(8):
        t0, t1 = i / 8, (i + 1) / 8
        top0, top1 = a1 + (a2 - a1) * t0 + 4, a1 + (a2 - a1) * t1 - 4
        bot0, bot1 = a4 + (a3 - a4) * t0 + 4, a4 + (a3 - a4) * t1 - 4
        d.polygon([(top0, b1 + 3), (top1, b1 + 3), (bot1, b4 - 3), (bot0, b4 - 3)], fill=(255, 214, 140, 40), outline=(255, 214, 140, 190))
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
            size = int((x2 - x) * 1.3)
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
