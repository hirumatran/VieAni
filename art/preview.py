"""Render art/species/*.py to 64×64 front/back PNGs and an enlarged contact sheet.

    python3 art/preview.py OUT_DIR [dex ...]
"""
import importlib.util, pathlib, sys
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from kit import Sprite, colour_count

HERE = pathlib.Path(__file__).parent


def load(path):
    spec = importlib.util.spec_from_file_location(path.stem, path); m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m); return m


def render(path):
    m = load(path)
    out = {}
    for view in ("front", "back"):
        s = Sprite(m.PALETTE); getattr(m, view)(s); out[view] = s.render()
    return out


def main(out_dir, only):
    out = pathlib.Path(out_dir); out.mkdir(parents=True, exist_ok=True)
    files = sorted((HERE / "species").glob("v*.py"))
    if only: files = [f for f in files if any(f.stem.startswith(f"v{int(d):03d}") for d in only)]
    tiles = []
    for f in files:
        r = render(f)
        for v, im in r.items(): im.save(out / f"{f.stem}_{v}.png")
        tiles.append((f.stem, r, colour_count(r["front"])))
    S = 5; tile = 64 * S
    sheet = Image.new("RGB", (len(tiles) * (2 * tile + 30) + 20, tile + 60), (232, 240, 236)); d = ImageDraw.Draw(sheet)
    f = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 18)
    for i, (name, r, n) in enumerate(tiles):
        x = 20 + i * (2 * tile + 30)
        for j, v in enumerate(("front", "back")):
            sheet.paste(r[v].resize((tile, tile), Image.NEAREST), (x + j * tile, 10), r[v].resize((tile, tile), Image.NEAREST))
        d.text((x, tile + 20), f"{name}  ({n} màu)", font=f, fill=(40, 40, 40))
    sheet.save(out / "sheet.png"); print("->", out / "sheet.png", [t[0] for t in tiles])


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2:])
