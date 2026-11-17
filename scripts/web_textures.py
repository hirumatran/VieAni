"""Game textures from the 512-px cut-outs (17 Nov 2026: all 87 VieAni = 46 MB of PNG per match was too heavy).

    python3 scripts/web_textures.py [V001 ...]

For every cut-out view writes ONE WebP sheet assets/illustrations/web/<stem>.webp, 3 frames of 256×256 side by side:
  frame 0 = the VieAni, frame 1 = ★2 silver outline, frame 2 = ★3 golden glow.
The 512-px PNGs in cut/ stay the masters (VieIndex uses them); only web/ ships with the game.
"""
import pathlib, sys
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
CUT, WEB = ROOT / "assets/illustrations/cut", ROOT / "assets/illustrations/web"
F = 256


def main(only):
    WEB.mkdir(parents=True, exist_ok=True)
    n = size = 0
    for body in sorted(CUT.glob("V*.png")):
        stem = body.stem
        if stem.endswith(("_star2", "_star3")): continue
        if only and stem.split("_")[0] not in only: continue
        sheet = Image.new("RGBA", (F * 3, F), (0, 0, 0, 0))
        for i, suf in enumerate(["", "_star2", "_star3"]):
            f = CUT / f"{stem}{suf}.png"
            if f.exists(): sheet.alpha_composite(Image.open(f).convert("RGBA").resize((F, F), Image.LANCZOS), (i * F, 0))
        out = WEB / f"{stem}.webp"
        sheet.save(out, "WEBP", quality=86, method=4)
        n += 1; size += out.stat().st_size
    print(f"web textures: {n} sheets, {size / 1e6:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1:])
