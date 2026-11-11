"""Turn a sketch or image into a draft 32x32 VieAni sprite.

    python3 scripts/pixelize.py sketch.jpg --id 20            # -> assets/sprites/custom/20.png
    python3 scripts/pixelize.py sketch.png --out my.png --flip --colors 10

Steps:
  1. Remove a plain background (flood fill from the edges), unless the image
     already has transparency.
  2. Crop to the subject and fit it, bottom-centred, inside the sprite with a
     1px margin for the outline.
  3. Shrink with area averaging (keeps thin pencil lines better than nearest).
  4. Map every pixel to the shared palette (assets/palette/vinmon.hex) and keep
     only the --colors most used palette colours.
  5. Remove stray single pixels and fill pinholes.
  6. Add the dark 1px outline used by all VieAni sprites.

It also saves a side-by-side preview (<out>.preview.png) of the cleaned input
and the 8x enlarged sprite. Finish the sprite by hand in Aseprite or Pixelorama,
then run scripts/build_vieindex.py. Sprites in assets/sprites/custom/ take
priority over the drawn ones and are never overwritten by scripts/sprites.py.

    python3 scripts/pixelize.py --build-palette   # rebuild palette from current sprites
    python3 scripts/pixelize.py --batch sketches/ --size 64   # every V001.png, V002.jpg … in a folder

Batch mode: file names start with the VieAni number from the Google Sheet / VieIndex
(V001 … V108). Each becomes assets/sprites/custom/<id>.png, plus _batch_sheet.png
showing all results side by side for review.
"""
import argparse, pathlib, sys
from collections import deque
import numpy as np
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
PALETTE = ROOT / "assets/palette/vinmon.hex"
CUSTOM = ROOT / "assets/sprites/custom"


# ---------- palette ----------

def load_palette(path=PALETTE):
    cols = [l.strip().lstrip("#") for l in path.read_text().splitlines() if l.strip()]
    return np.array([[int(c[i:i + 2], 16) for i in (0, 2, 4)] for c in cols], dtype=float)


def build_palette(n=32):
    """Derive an n-colour palette from the existing drawn sprites, weighted by use."""
    px = []
    for f in sorted((ROOT / "assets/sprites").glob("[0-9]*.png")):
        a = np.asarray(Image.open(f).convert("RGBA")).reshape(-1, 4)
        px.append(a[a[:, 3] > 0, :3])
    px = np.concatenate(px)
    strip = Image.fromarray(px.reshape(1, -1, 3).astype(np.uint8), "RGB")
    q = strip.quantize(colors=n, method=Image.Quantize.MEDIANCUT)
    pal = np.array(q.getpalette()[: n * 3]).reshape(-1, 3)
    pal = pal[np.argsort(pal @ [0.299, 0.587, 0.114])]  # dark -> light
    PALETTE.parent.mkdir(parents=True, exist_ok=True)
    hexes = ["%02x%02x%02x" % tuple(c) for c in pal]
    PALETTE.write_text("\n".join(hexes) + "\n")
    gpl = ["GIMP Palette", "Name: VieAni", "Columns: 8", "#"]
    gpl += ["%3d %3d %3d\t#%s" % (*c, h) for c, h in zip(pal, hexes)]
    PALETTE.with_suffix(".gpl").write_text("\n".join(gpl) + "\n")
    swatch = Image.fromarray(np.repeat(np.repeat(pal.reshape(1, -1, 3), 16, 0), 16, 1).astype(np.uint8))
    swatch.save(PALETTE.with_suffix(".png"))
    print(f"wrote {n}-colour palette -> {PALETTE} (+ .gpl for Aseprite/Pixelorama, .png swatch)")


def nearest(rgb, pal):
    """Index of nearest palette colour per pixel ('redmean' weighted RGB distance)."""
    r = (rgb[:, None, 0] + pal[None, :, 0]) / 2
    d = rgb[:, None, :] - pal[None, :, :]
    dist = (2 + r / 256) * d[..., 0] ** 2 + 4 * d[..., 1] ** 2 + (2 + (255 - r) / 256) * d[..., 2] ** 2
    return dist.argmin(1)


# ---------- steps ----------

def remove_background(img, tol):
    a = np.asarray(img.convert("RGBA")).astype(float)
    if (a[..., 3] < 250).mean() > 0.01:  # already has real transparency
        return a
    h, w = a.shape[:2]
    rgb = a[..., :3]
    border = np.concatenate([rgb[0], rgb[-1], rgb[:, 0], rgb[:, -1]])
    bg = np.median(border, 0)
    close = np.sqrt(((rgb - bg) ** 2).sum(-1)) <= tol
    seen = np.zeros((h, w), bool)
    q = deque((y, x) for y in range(h) for x in (0, w - 1)) + deque((y, x) for x in range(w) for y in (0, h - 1))
    while q:  # flood fill from the edges: only background connected to the border is removed
        y, x = q.popleft()
        if seen[y, x] or not close[y, x]:
            continue
        seen[y, x] = True
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not seen[ny, nx]:
                q.append((ny, nx))
    a[seen, 3] = 0
    return a


def fit(a, size):
    ys, xs = np.nonzero(a[..., 3] > 0)
    if not len(ys):
        sys.exit("Nothing left after background removal: try a lower --tolerance")
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    h, w = a.shape[:2]
    inner = size - 2  # 1px margin each side for the outline
    scale = inner / max(h, w)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    # premultiply so transparent pixels don't bleed their colour into edges
    pm = a.copy()
    pm[..., :3] *= pm[..., 3:4] / 255
    small = np.asarray(Image.fromarray(pm.astype(np.uint8), "RGBA").resize((nw, nh), Image.BOX)).astype(float)
    out = np.zeros((size, size, 4))
    x0 = (size - nw) // 2
    y0 = size - 1 - nh  # stand on the bottom margin
    out[y0:y0 + nh, x0:x0 + nw] = small
    alpha = out[..., 3]
    with np.errstate(invalid="ignore", divide="ignore"):
        out[..., :3] = np.where(alpha[..., None] > 0, out[..., :3] * 255 / alpha[..., None], 0)
    out[..., 3] = np.where(alpha >= 128, 255, 0)
    return out


def to_palette(a, pal, ncolors):
    mask = a[..., 3] > 0
    rgb = a[mask, :3]
    idx = nearest(rgb, pal)
    used, counts = np.unique(idx, return_counts=True)
    if len(used) > ncolors:
        keep = used[np.argsort(-counts)[:ncolors]]
        idx = keep[nearest(pal[idx], pal[keep])]
    out = np.zeros_like(a)
    out[mask, :3] = pal[idx]
    out[mask, 3] = 255
    return out


def tidy(a):
    m = a[..., 3] > 0
    p = np.pad(m, 1)
    n4 = p[:-2, 1:-1].astype(int) + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]
    a = a.copy()
    a[m & (n4 == 0)] = 0  # stray single pixels
    holes = ~m & (n4 == 4)
    for y, x in zip(*np.nonzero(holes)):  # pinholes: copy the pixel above
        a[y, x] = a[y - 1, x]
    # speckles: a pixel whose colour matches none of its 4 neighbours takes the
    # most common neighbour colour (1px lines survive: their neighbours match)
    src = a.copy()
    h, w = m.shape
    for y in range(h):
        for x in range(w):
            if not src[y, x, 3]:
                continue
            nb = [tuple(src[y + dy, x + dx, :3]) for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1))
                  if 0 <= y + dy < h and 0 <= x + dx < w and src[y + dy, x + dx, 3]]
            if len(nb) >= 3 and tuple(src[y, x, :3]) not in nb:
                a[y, x, :3] = max(set(nb), key=nb.count)
    return a


def outline(a, pal):
    pal = pal[:6]  # palette is sorted dark -> light: outlines use the 6 darkest colours
    m = a[..., 3] > 0
    out = a.copy()
    h, w = m.shape
    for y in range(h):
        for x in range(w):
            if m[y, x]:
                continue
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                ny, nx = y + dy, x + dx
                if 0 <= ny < h and 0 <= nx < w and m[ny, nx]:
                    dark = a[ny, nx, :3] * 0.25 + [20, 14, 10]  # same rule as sprites.py
                    out[y, x, :3] = pal[nearest(dark[None], pal)[0]]
                    out[y, x, 3] = 255
                    break
    return out


def preview(clean, sprite, path, zoom=8):
    s = sprite.shape[0] * zoom
    left = Image.fromarray(clean.astype(np.uint8), "RGBA")
    left.thumbnail((s, s))
    right = Image.fromarray(sprite.astype(np.uint8), "RGBA").resize((s, s), Image.NEAREST)
    sheet = Image.new("RGBA", (s * 2 + 24, s + 16), (246, 239, 227, 255))
    sheet.alpha_composite(left, (8 + (s - left.width) // 2, 8 + (s - left.height) // 2))
    sheet.alpha_composite(right, (s + 16, 8))
    sheet.save(path)


def convert(path, size, colors, tolerance, flip, outline_on, pal):
    img = Image.open(path)
    img.thumbnail((1024, 1024))
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    clean = remove_background(img, tolerance)
    a = tidy(to_palette(fit(clean, size), pal, colors))
    return clean, (outline(a, pal) if outline_on else a)


def run_batch(args):
    import json, re
    data = json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))
    by_dex = {s["dex"]: s for s in data["species"]}
    if not PALETTE.exists():
        build_palette()
    pal = load_palette()
    CUSTOM.mkdir(parents=True, exist_ok=True)
    done = []
    for f in sorted(pathlib.Path(args.batch).iterdir()):
        m = re.match(r"[Vv]?(\d{1,3})", f.stem)
        if not m or f.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp") or int(m.group(1)) not in by_dex:
            continue
        s = by_dex[int(m.group(1))]
        _, a = convert(f, args.size, args.colors, args.tolerance, args.flip, not args.no_outline, pal)
        out = CUSTOM / f"{s['id']:02d}.png"
        Image.fromarray(a.astype(np.uint8), "RGBA").save(out)
        done.append((s, out)); print(f"V{s['dex']:03d} {s['vi']} -> {out.name}")
    if done:
        z = 4 if args.size <= 32 else 2
        cell = args.size * z + 8
        cols = 10
        sheet = Image.new("RGBA", (cols * cell, ((len(done) + cols - 1) // cols) * cell), (246, 239, 227, 255))
        for i, (s, out) in enumerate(done):
            im = Image.open(out).resize((args.size * z, args.size * z), Image.NEAREST)
            sheet.alpha_composite(im, ((i % cols) * cell + 4, (i // cols) * cell + 4))
        sheet.save(CUSTOM / "_batch_sheet.png")
    print(f"{len(done)} sprites -> {CUSTOM}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image", nargs="?", help="sketch or image file (PNG, JPG, ...)")
    ap.add_argument("--id", type=int, help="VieAni id from data/vieindex.json; saves assets/sprites/custom/<id>.png")
    ap.add_argument("--out", help="output PNG path (instead of --id)")
    ap.add_argument("--size", type=int, default=32, help="sprite size in pixels (default 32)")
    ap.add_argument("--colors", type=int, default=12, help="max palette colours in this sprite (default 12)")
    ap.add_argument("--tolerance", type=float, default=40, help="background colour tolerance 0-255 (default 40)")
    ap.add_argument("--flip", action="store_true", help="mirror horizontally (VieAni face left)")
    ap.add_argument("--no-outline", action="store_true", help="skip the dark outline")
    ap.add_argument("--build-palette", action="store_true", help="rebuild the shared palette from current sprites")
    ap.add_argument("--batch", help="folder of sketches named V001…V108 (VieAni number)")
    args = ap.parse_args()

    if args.batch:
        run_batch(args); return

    if args.build_palette:
        build_palette()
        return
    if not args.image or not (args.id or args.out):
        ap.error("give an image and either --id or --out")
    if not PALETTE.exists():
        build_palette()

    img = Image.open(args.image)
    img.thumbnail((1024, 1024))  # keeps the flood fill fast on big photos
    if args.flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    pal = load_palette()
    clean = remove_background(img, args.tolerance)
    a = fit(clean, args.size)
    a = to_palette(a, pal, args.colors)
    a = tidy(a)
    if not args.no_outline:
        a = outline(a, pal)

    out = pathlib.Path(args.out) if args.out else CUSTOM / f"{args.id:02d}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(a.astype(np.uint8), "RGBA").save(out)
    preview(clean, a, out.with_suffix(".preview.png"))
    ncol = len(np.unique(a[a[..., 3] > 0, :3], axis=0))
    print(f"wrote {out} ({args.size}x{args.size}, {ncol} colours) + preview {out.with_suffix('.preview.png').name}")


if __name__ == "__main__":
    main()
