"""Prepare VieAni illustrations for the game.

    python3 scripts/cutout.py [V001 ...]      # default: every V###_front/back.png in assets/illustrations/raw

For each raw image (plain white background, see docs/SPRITE_PROMPTS.md):
  1. remove the white background by flood-filling from the borders (white INSIDE the line art – chest,
     fangs, eye shine – is kept), with a soft 1-px edge so the line art stays smooth;
  2. crop to the creature, pad, and scale so the longest side is 512 px;
  3. write the ★2 silver outline and ★3 golden glow layers (same size, drawn behind the creature in game);
  4. update assets/illustrations/manifest.json (size + foot point, used to stand the creature on its cell).
Output: assets/illustrations/cut/V001_front.png, V001_front_star2.png, V001_front_star3.png, …
"""
import json, pathlib, sys
from collections import deque
from PIL import Image, ImageChops, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
RAW, CUT = ROOT / "assets/illustrations/raw", ROOT / "assets/illustrations/cut"
SIZE, PAD = 512, 24


def background_mask(im: Image.Image) -> Image.Image:
    """255 = background. Flood fill from the border through near-white, low-saturation pixels."""
    rgb = im.convert("RGB"); w, h = rgb.size; px = rgb.load()
    def white(c):
        return min(c) >= 232 and max(c) - min(c) <= 18
    bg = Image.new("L", (w, h), 0); bp = bg.load()
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if white(px[x, y]): q.append((x, y))
    for y in range(h):
        for x in (0, w - 1):
            if white(px[x, y]): q.append((x, y))
    while q:
        x, y = q.popleft()
        if bp[x, y]: continue
        bp[x, y] = 255
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if 0 <= nx < w and 0 <= ny < h and not bp[nx, ny] and white(px[nx, ny]):
                q.append((nx, ny))
    # pass 2: pure-white holes enclosed by the drawing (e.g. inside a tail loop or fin) are background too,
    # but only clean paper-white areas of a decent size – creamy white fur/bellies are kept
    def paper(c):
        return min(c) >= 247 and max(c) - min(c) <= 6
    seen = Image.new("L", (w, h), 0); sp = seen.load()
    for y0 in range(0, h, 2):
        for x0 in range(0, w, 2):
            if bp[x0, y0] or sp[x0, y0] or not paper(px[x0, y0]):
                continue
            comp, q = [], deque([(x0, y0)]); sp[x0, y0] = 1
            while q:
                x, y = q.popleft(); comp.append((x, y))
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and not sp[nx, ny] and not bp[nx, ny] and paper(px[nx, ny]):
                        sp[nx, ny] = 1; q.append((nx, ny))
            if len(comp) >= 600:
                for x, y in comp: bp[x, y] = 255
    return bg


def cutout(path: pathlib.Path):
    im = Image.open(path).convert("RGBA")
    bg = background_mask(im)
    # soft edge: the 1-px ring between background and drawing gets partial alpha from its brightness
    alpha = ImageChops.invert(bg)
    ring = ImageChops.subtract(bg.filter(ImageFilter.MaxFilter(3)), bg)   # drawing pixels touching the background
    lum = im.convert("L")
    soft = ImageChops.multiply(ring, ImageChops.invert(lum).point(lambda v: min(255, v * 3)))
    alpha = ImageChops.subtract(alpha, ring); alpha = ImageChops.lighter(alpha, soft)
    im.putalpha(alpha)
    box = alpha.point(lambda v: 255 if v > 24 else 0).getbbox()
    im = im.crop(box)
    s = (SIZE - 2 * PAD) / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    out = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ox, oy = (SIZE - im.width) // 2, SIZE - PAD - im.height     # stand on the bottom line
    out.alpha_composite(im, (ox, oy))
    return out, (SIZE // 2, SIZE - PAD)


def outline_layer(im: Image.Image, colour, width, blur=0, alpha=255):
    a = im.getchannel("A").point(lambda v: 255 if v > 40 else 0)
    ring = a.filter(ImageFilter.MaxFilter(2 * width + 1))
    if blur: ring = ring.filter(ImageFilter.GaussianBlur(blur))
    layer = Image.new("RGBA", im.size, colour + (0,))
    layer.putalpha(ring.point(lambda v: v * alpha // 255))
    return layer


def main(only):
    CUT.mkdir(parents=True, exist_ok=True)
    man_p = ROOT / "assets/illustrations/manifest.json"
    man = json.loads(man_p.read_text()) if man_p.exists() else {}
    for raw in sorted(RAW.glob("V*_*.png")):
        code, view = raw.stem.split("_", 1)
        if only and code not in only: continue
        im, foot = cutout(raw)
        im.save(CUT / f"{code}_{view}.png", optimize=True)
        outline_layer(im, (214, 224, 238), 7).save(CUT / f"{code}_{view}_star2.png", optimize=True)
        gold = outline_layer(im, (255, 196, 60), 16, blur=7)
        gold.alpha_composite(outline_layer(im, (255, 236, 150), 6))
        gold.save(CUT / f"{code}_{view}_star3.png", optimize=True)
        man.setdefault(code, {})[view] = {"size": SIZE, "foot": foot}
        print(code, view, "->", CUT / f"{code}_{view}.png")
    man_p.write_text(json.dumps(man, indent=1))
    # VieIndex shows the new illustrations as avatars: rebuild it
    import subprocess
    subprocess.run([sys.executable, str(ROOT / "scripts/build_vieindex.py")], check=True)


if __name__ == "__main__":
    main(sys.argv[1:])
