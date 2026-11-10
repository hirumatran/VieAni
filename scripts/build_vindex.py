"""Embed data/vindex.json and assets/sprites/*.png into src/vindex.template.html -> vindex.html

Sprites in assets/sprites/custom/ take priority over the drawn ones.
Run scripts/sprites.py first if the drawn sprites changed.
"""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "data/vindex.json").read_text(encoding="utf-8"))
sprites = {}
for s in data["species"]:
    custom = root / f'assets/sprites/custom/{s["id"]:02d}.png'  # from pixelize.py / hand-made
    png = custom if custom.exists() else root / f'assets/sprites/{s["id"]:02d}.png'
    if png.exists():
        sprites[s["id"]] = "data:image/png;base64," + base64.b64encode(png.read_bytes()).decode()
tpl = (root / "src/vindex.template.html").read_text(encoding="utf-8")
out = (tpl.replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
          .replace("__SPRITES__", json.dumps(sprites)))
(root / "vindex.html").write_text(out, encoding="utf-8")
print("wrote vindex.html", len(data["species"]), "species,", len(sprites), "sprites")
