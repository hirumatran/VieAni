"""VieAni sprite kit – draw a VieAni as layered shapes at 4× resolution, get a clean 64×64 pixel sprite.

Gen-3-style result (GBA battle sprites): 64×64, 3–4 tones per material (light from top-left),
coloured outline inside the silhouette, darker lines where a front part overlaps a back part,
≤ ~16 colours. Everything is original artwork described in code.

Usage (one file per VieAni in art/species/<dex>.py):

    from kit import Sprite, E, P, L, R
    def front(s: Sprite):            # seen from the front-left (opponent side, faces the player)
        body = E(128, 150, 60, 40)
        s.part(body, "orange")
        s.part(L([(80,160),(60,200)], 18), "orange")     # a leg
        s.detail(P([...]) & body, "stripe")             # stripes clipped to the body
        s.eye(28, 30, "amber")                           # eyes stamped at 64×64 resolution
    def back(s: Sprite):             # seen from behind-left (player side, faces the enemy)
        ...
    PALETTE = {"orange": "#e8892f", "stripe": "#2a1a14", "white": "#f4efe4"}

Coordinates: 256×256 canvas, (0,0) top-left; the creature stands on y≈236 and fills ~70–90% of the canvas.
"""
from __future__ import annotations

import colorsys
import math
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W = 256          # working canvas
OUT = 64         # final sprite
K = W // OUT     # 4


# ------------------------------------------------------------------ masks (1-bit 256×256 "L" images)
class Mask:
    def __init__(self, im: Image.Image | None = None):
        self.im = im if im is not None else Image.new("L", (W, W), 0)

    def __and__(self, o: "Mask"): return Mask(ImageChops.multiply(self.im, o.im))
    def __or__(self, o: "Mask"): return Mask(ImageChops.lighter(self.im, o.im))
    def __sub__(self, o: "Mask"): return Mask(ImageChops.subtract(self.im, o.im))

    def shift(self, dx: float, dy: float) -> "Mask":
        return Mask(ImageChops.offset(self.im, int(round(dx)), int(round(dy))))

    def grow(self, r: int) -> "Mask":
        return Mask(self.im.filter(ImageFilter.MaxFilter(2 * r + 1)))

    def shrink(self, r: int) -> "Mask":
        return Mask(self.im.filter(ImageFilter.MinFilter(2 * r + 1)))


def _new():
    m = Mask(); return m, ImageDraw.Draw(m.im)


def E(cx, cy, rx, ry, rot=0) -> Mask:
    """ellipse (rot in degrees)"""
    if rot == 0:
        m, d = _new(); d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=255); return m
    pts = []
    a = math.radians(rot)
    for i in range(48):
        t = 2 * math.pi * i / 48
        x, y = rx * math.cos(t), ry * math.sin(t)
        pts.append((cx + x * math.cos(a) - y * math.sin(a), cy + x * math.sin(a) + y * math.cos(a)))
    return P(pts)


def P(points) -> Mask:
    """polygon"""
    m, d = _new(); d.polygon([tuple(p) for p in points], fill=255); return m


def L(points, width, round_ends=True) -> Mask:
    """thick polyline (legs, tails, necks); width may be a number or a list per point (tapering)"""
    m, d = _new()
    ws = width if isinstance(width, (list, tuple)) else [width] * len(points)
    for (p, q, w0, w1) in zip(points, points[1:], ws, ws[1:]):
        steps = max(2, int(math.dist(p, q) / 2))
        for i in range(steps + 1):
            t = i / steps
            x, y, w = p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, w0 + (w1 - w0) * t
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=255)
    return m


def R(x0, y0, x1, y1) -> Mask:
    m, d = _new(); d.rectangle((x0, y0, x1, y1), fill=255); return m


def bezier(p0, p1, p2, n=24):
    """points of a quadratic curve – handy for tails, horns, manes"""
    return [((1 - t) ** 2 * p0[0] + 2 * (1 - t) * t * p1[0] + t * t * p2[0],
             (1 - t) ** 2 * p0[1] + 2 * (1 - t) * t * p1[1] + t * t * p2[1]) for t in (i / n for i in range(n + 1))]


# ------------------------------------------------------------------ colour tones
def _hex(h):
    h = h.lstrip("#"); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def tones(base_hex):
    """highlight, base, shadow, line – hue-shifted like hand-made pixel art (warm light, cool shadow)"""
    r, g, b = [c / 255 for c in _hex(base_hex)]
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    def mk(dh, dl, ds):
        rr, gg, bb = colorsys.hls_to_rgb((h + dh) % 1, max(0, min(1, l + dl)), max(0, min(1, s + ds)))
        return (int(rr * 255), int(gg * 255), int(bb * 255), 255)
    warm = -0.02 if 0.1 < h < 0.6 else 0.02
    return {"hi": mk(warm, 0.13, -0.02), "base": mk(0, 0, 0), "sh": mk(-warm * 1.5, -0.16, 0.05),
            "line": mk(-warm * 2, -0.38 if l > 0.3 else -0.2, 0.0)}


# ------------------------------------------------------------------ sprite
class Sprite:
    def __init__(self, palette: dict[str, str]):
        self.palette = palette
        self.layers: list[tuple[Mask, str, bool, int]] = []   # mask, colour name, shaded?, layer id
        self.stamps: list = []

    # parts are painted in call order (later = in front)
    def part(self, mask: Mask, colour: str, shade=True):
        self.layers.append((mask, colour, shade, len(self.layers) + 1))

    def detail(self, mask: Mask, colour: str):
        """markings (stripes, spots, belly patches): flat, no own outline, inherit shading of what is under"""
        self.layers.append((mask, colour, "detail", len(self.layers) + 1))

    def eye(self, x, y, iris="#2b1d14", size=3, look=-1, shine=True):
        """stamp an eye at 64×64 coords (x,y = centre). size 2..4. look=-1 looks left, 1 right"""
        self.stamps.append(("eye", x, y, iris, size, look, shine))

    def px(self, x, y, colour):
        """single 64×64 pixel stamp (nostrils, claws, sparkle)"""
        self.stamps.append(("px", x, y, colour))

    # -------------------------------------------------------------- render
    def render(self) -> Image.Image:
        col = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        lid = Image.new("L", (W, W), 0)          # which layer owns each pixel
        shmap = Image.new("L", (W, W), 0)        # 255 where the visible surface is in shadow
        himap = Image.new("L", (W, W), 0)        # 255 where it is highlighted
        light = (-1.0, -1.25)                    # light from top-left
        for mask, cname, shade, i in self.layers:
            t = tones(self.palette[cname])
            fill = Image.new("RGBA", (W, W), t["base"])
            if shade is True:
                k = 11
                sh = mask - mask.shift(light[0] * -k * 0.7, light[1] * -k)                 # bottom-right rim
                hi = (mask - mask.shift(light[0] * k * 0.55, light[1] * k * 0.55)).shrink(1)  # top-left rim
                fill.paste(t["sh"], (0, 0), sh.im)
                fill.paste(t["hi"], (0, 0), hi.im)
                shmap.paste(0, (0, 0), mask.im); shmap.paste(255, (0, 0), sh.im)
                himap.paste(0, (0, 0), mask.im); himap.paste(255, (0, 0), hi.im)
            elif shade == "detail":
                # markings follow the shading of the surface they are painted on
                fill.paste(t["sh"], (0, 0), shmap)
                fill.paste(t["hi"], (0, 0), himap)
            col.paste(fill, (0, 0), mask.im)
            if shade != "detail":
                lid.paste(i, (0, 0), mask.im)
        return self._downsample(col, lid)

    def _downsample(self, col: Image.Image, lid: Image.Image) -> Image.Image:
        cp, lp = col.load(), lid.load()
        out = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0)); op = out.load()
        owner = [[0] * OUT for _ in range(OUT)]
        for y in range(OUT):
            for x in range(OUT):
                counts, own = {}, {}
                n = 0
                for dy in range(K):
                    for dx in range(K):
                        c = cp[x * K + dx, y * K + dy]
                        if c[3] > 0:
                            n += 1
                            counts[c] = counts.get(c, 0) + 1
                            o = lp[x * K + dx, y * K + dy]
                            own[o] = own.get(o, 0) + 1
                if n >= 7:
                    op[x, y] = max(counts, key=counts.get)
                    owner[y][x] = max(own, key=own.get)
        # outline: silhouette edge → line tone of that colour; overlaps → darker where a front part meets a back part
        res = out.copy(); rp = res.load()
        for y in range(OUT):
            for x in range(OUT):
                c = op[x, y]
                if c[3] == 0:
                    continue
                edge = any(not (0 <= x + dx < OUT and 0 <= y + dy < OUT) or op[x + dx, y + dy][3] == 0
                           for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)))
                if edge:
                    rp[x, y] = _darken(c, 0.55)
                    continue
                me = owner[y][x]
                for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1)):
                    o = owner[y + dy][x + dx]
                    if o and me and o > me:   # neighbour belongs to a part in front of me → my pixel gets a line
                        rp[x, y] = _darken(c, 0.4)
                        break
        res = _limit_colours(res, 24)
        self._stamp(res)
        return res

    def _stamp(self, im):
        p = im.load()
        for s in self.stamps:
            if s[0] == "px":
                _, x, y, c = s
                p[x, y] = _hex(c) + (255,)
            elif s[0] == "eye":
                # 2 px wide, `size` px tall: pupil column on the side it looks to, iris beside it, white glint on top
                _, x, y, iris, size, look, shine = s
                ir = _hex(iris) + (255,)
                dark = (24, 16, 14, 255)
                pc, ic = (x, x + 1) if look < 0 else (x + 1, x)
                top = y - size // 2
                for dy in range(size):
                    p[pc, top + dy] = dark
                    p[ic, top + dy] = ir
                if shine:
                    p[ic, top] = (252, 250, 244, 255)
                p[ic, top + size - 1] = _darken(ir, 0.35)


def _darken(c, f):
    return (int(c[0] * (1 - f)), int(c[1] * (1 - f)), int(c[2] * (1 - f)), 255)


def _limit_colours(im: Image.Image, n: int) -> Image.Image:
    """keep at most n colours (median cut on opaque pixels), alpha untouched"""
    if colour_count(im) <= n:
        return im
    alpha = im.getchannel("A")
    q = im.convert("RGB").quantize(colors=n, method=Image.Quantize.MEDIANCUT).convert("RGB")
    out = q.convert("RGBA"); out.putalpha(alpha.point(lambda a: 255 if a else 0))
    return out


def colour_count(im: Image.Image) -> int:
    return len({c for c in im.getdata() if c[3] > 0})
