"""Build the full animation set for each VieAni from its two 64×64 poses.

    python3 art/animate.py OUT_DIR [dex ...]

For every VieAni and both orientations (front = on the opponent's board, facing the player;
back = on our board, facing the enemy) it writes a sprite sheet of 96×96 frames:

    row 0  idle    2 frames  (breathing bob)
    row 1  attack  4 frames  (wind-up, lunge, impact + slash/orb in the attack type colour, recover)
    row 2  cast    4 frames  (aura ring, rising sparks, flash, release burst)
    row 3  hit     2 frames  (white flash, knock-back)
    row 4  star2   4 frames  (silver outline shimmer)
    row 5  star3   4 frames  (golden outline glow pulse + sparkles)

plus <name>.json (frame grid) and a preview GIF. Effects are drawn procedurally (original art).
"""
import importlib.util, json, math, pathlib, sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = pathlib.Path(__file__).parent
ROOT = HERE.parent
sys.path.insert(0, str(HERE))
from kit import Sprite  # noqa: E402

F = 96                     # frame size
ROWS = [("idle", 2), ("attack", 4), ("cast", 4), ("hit", 2), ("star2", 4), ("star3", 4)]
TYPE_COL = {"Fire": (255, 122, 42), "Water": (74, 168, 255), "Electric": (255, 225, 74), "Grass": (92, 207, 90),
            "Ground": (200, 150, 74), "Rock": (168, 154, 128), "Sky": (154, 216, 255), "Insect": (168, 208, 64),
            "Poison": (176, 90, 208), "Legendary": (255, 216, 74)}


def load(path):
    spec = importlib.util.spec_from_file_location(path.stem, path); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); return m


def place(sprite, dx=0, dy=0, scale=(1.0, 1.0)):
    """put the 64×64 sprite on a 96×96 frame, feet on the bottom line, with offset and squash/stretch"""
    fr = Image.new("RGBA", (F, F), (0, 0, 0, 0))
    w, h = int(64 * scale[0]), int(64 * scale[1])
    sp = sprite.resize((w, h), Image.NEAREST) if (w, h) != (64, 64) else sprite
    fr.alpha_composite(sp, ((F - w) // 2 + dx, F - 8 - h + dy))
    return fr


def outline(fr, colour, width=1, alpha=255):
    a = fr.getchannel("A").point(lambda v: 255 if v else 0)
    ring = ImageChops.subtract(a.filter(ImageFilter.MaxFilter(2 * width + 1)), a)
    layer = Image.new("RGBA", fr.size, colour + (0,)); layer.putalpha(ring.point(lambda v: alpha if v else 0))
    out = Image.new("RGBA", fr.size, (0, 0, 0, 0)); out.alpha_composite(layer); out.alpha_composite(fr)
    return out


def tint(fr, colour, k):
    rgb = Image.new("RGBA", fr.size, colour + (255,))
    mixed = Image.blend(fr, rgb, k); mixed.putalpha(fr.getchannel("A")); return mixed


def sparkle(d, x, y, r, col):
    d.line((x - r, y, x + r, y), fill=col); d.line((x, y - r, x, y + r), fill=col)
    if r > 1: d.point((x, y), fill=(255, 255, 255, 255))


def slash(d, cx, cy, t, col, facing):
    """crescent swipe; t = 0..1 progress"""
    for i in range(3):
        r = 14 + i * 3
        a0 = -150 + 160 * t if facing < 0 else -30 - 160 * t
        d.arc((cx - r, cy - r, cx + r, cy + r), a0, a0 + 70, fill=(255, 255, 255, 230) if i == 1 else col + (200,), width=2)


def orb(d, cx, cy, r, col):
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=col + (160,))
    d.ellipse((cx - r // 2, cy - r // 2, cx + r // 2, cy + r // 2), fill=(255, 255, 255, 220))


def frames_for(sprite, typ, special, view):
    col = TYPE_COL.get(typ, (255, 255, 255))
    facing = -1 if view == "front" else 1          # front faces the player (down-left), back faces the enemy (up-right)
    fwd = (6 * facing, 3 if view == "front" else -3)
    rows = {}
    rows["idle"] = [place(sprite), place(sprite, dy=1, scale=(1.02, 0.97))]
    # attack
    a = [place(sprite, dx=-fwd[0] // 2, dy=-fwd[1] // 2, scale=(0.97, 1.03)),
         place(sprite, dx=fwd[0], dy=fwd[1], scale=(1.04, 0.97))]
    imp = place(sprite, dx=fwd[0] + facing * 2, dy=fwd[1]); d = ImageDraw.Draw(imp)
    hx, hy = F // 2 + facing * 30, F // 2 + (8 if view == "front" else -8)
    if special: orb(d, hx, hy, 9, col)
    else: slash(d, hx, hy, 0.6, col, facing)
    a.append(imp)
    a.append(place(sprite))
    rows["attack"] = a
    # cast
    c = []
    for i in range(4):
        fr = Image.new("RGBA", (F, F), (0, 0, 0, 0)); d = ImageDraw.Draw(fr)
        rx, ry = 20 + i * 6, 6 + i * 2
        d.ellipse((F // 2 - rx, F - 12 - ry, F // 2 + rx, F - 12 + ry), outline=col + (220,), width=2)
        body = place(sprite, dy=-i if i < 3 else 0)
        body = tint(body, col, [0.0, 0.15, 0.35, 0.1][i])
        if i == 2: body = outline(body, (255, 255, 255), 1)
        fr.alpha_composite(body)
        d = ImageDraw.Draw(fr)
        for k in range(5 + i * 2):
            x = 18 + (k * 37 + i * 11) % 60; y = F - 20 - ((k * 23 + i * 17) % 50)
            sparkle(d, x, y, 1 + (k + i) % 2, col + (255,))
        if i == 3:
            for ang in range(0, 360, 45):
                r0, r1 = 20, 34
                t = math.radians(ang)
                d.line((F // 2 + r0 * math.cos(t), F // 2 + r0 * math.sin(t), F // 2 + r1 * math.cos(t), F // 2 + r1 * math.sin(t)),
                       fill=col + (230,), width=2)
        c.append(fr)
    rows["cast"] = c
    rows["hit"] = [tint(place(sprite, dx=-fwd[0] // 2), (255, 255, 255), 0.7), place(sprite, dx=-fwd[0] // 3)]
    s2, s3 = [], []
    for i in range(4):
        fr = outline(place(sprite), (220, 228, 240), 1, [140, 220, 255, 220][i]); s2.append(fr)
        g = place(sprite)
        glow = outline(g, (255, 214, 90), 2, [120, 200, 255, 200][i]).filter(ImageFilter.GaussianBlur(1.2))
        fr = Image.new("RGBA", (F, F), (0, 0, 0, 0)); fr.alpha_composite(glow); fr.alpha_composite(outline(g, (255, 236, 150), 1))
        d = ImageDraw.Draw(fr)
        for k in range(4):
            x = 16 + (k * 19 + i * 13) % 64; y = 10 + (k * 29 + i * 7) % 64
            if (k + i) % 2 == 0: sparkle(d, x, y, 2, (255, 240, 160, 255))
        s3.append(fr)
    rows["star2"], rows["star3"] = s2, s3
    return rows


def sheet(rows):
    out = Image.new("RGBA", (F * 4, F * len(ROWS)), (0, 0, 0, 0))
    for r, (name, n) in enumerate(ROWS):
        for i, fr in enumerate(rows[name][:n]):
            out.alpha_composite(fr, (i * F, r * F))
    return out


def main(out_dir, only):
    out = pathlib.Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    data = json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))
    by_dex = {s["dex"]: s for s in data["species"]}
    files = sorted((HERE / "species").glob("v*.py"))
    if only: files = [f for f in files if any(f.stem.startswith(f"v{int(d):03d}") for d in only)]
    for f in files:
        m = load(f); dex = int(f.stem[1:4]); sp = by_dex[dex]
        special = sp["attackClass"] == "special"
        gif_frames = []
        for view in ("front", "back"):
            s = Sprite(m.PALETTE); getattr(m, view)(s); im = s.render()
            rows = frames_for(im, sp["attackType"], special, view)
            sheet(rows).save(out / f"{f.stem}_{view}.png")
            for name, n in ROWS:
                for fr in rows[name][:n]:
                    gif_frames.append((view, name, fr))
        (out / f"{f.stem}.json").write_text(json.dumps({"frame": F, "rows": ROWS, "views": ["front", "back"]}))
        # preview GIF: front and back side by side, every animation in order, ×3
        seq = []
        for name, n in ROWS:
            fronts = [fr for v, nm, fr in gif_frames if v == "front" and nm == name]
            backs = [fr for v, nm, fr in gif_frames if v == "back" and nm == name]
            reps = 3 if name in ("idle", "star2", "star3") else 1
            for _ in range(reps):
                for a, b in zip(fronts, backs):
                    canvas = Image.new("RGBA", (F * 2, F), (226, 236, 232, 255))
                    canvas.alpha_composite(a, (0, 0)); canvas.alpha_composite(b, (F, 0))
                    seq.append(canvas.resize((F * 6, F * 3), Image.NEAREST).convert("P", palette=Image.ADAPTIVE))
        seq[0].save(out / f"{f.stem}.gif", save_all=True, append_images=seq[1:], duration=160, loop=0, disposal=2)
        print("->", f.stem)


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
