"""Embed data/vieindex.json and assets/sprites/*.png into src/vieindex.template.html -> vieindex.html

Sprites in assets/sprites/custom/ take priority over the drawn ones.
Run scripts/sprites.py first if the drawn sprites changed.
"""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "data/vieindex.json").read_text(encoding="utf-8"))
sprites = {}
for s in data["species"]:
    custom = root / f'assets/sprites/custom/{s["id"]:02d}.png'  # from pixelize.py / hand-made
    png = custom if custom.exists() else root / f'assets/sprites/{s["id"]:02d}.png'
    if png.exists():
        sprites[s["id"]] = "data:image/png;base64," + base64.b64encode(png.read_bytes()).decode()
vn = json.loads((root / "data/vn_info.json").read_text(encoding="utf-8"))  # Vietnamese info-card text
for sp in data["species"]:
    sp["vn"] = vn["species"].get(str(sp["id"]), {})
data["vnMeta"] = {k: v for k, v in vn.items() if k != "species"}
data["synergies"] = json.loads((root / "data/synergies.json").read_text(encoding="utf-8"))["synergies"]
data["relations"] = json.loads((root / "data/relations.json").read_text(encoding="utf-8"))["relations"]
data["items"] = json.loads((root / "data/items.json").read_text(encoding="utf-8"))
data["mechanics"] = json.loads((root / "data/mechanics.json").read_text(encoding="utf-8"))
tpl = (root / "src/vieindex.template.html").read_text(encoding="utf-8")
out = (tpl.replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
          .replace("__SPRITES__", json.dumps(sprites)))
(root / "vieindex.html").write_text(out, encoding="utf-8")
print("wrote vieindex.html", len(data["species"]), "species,", len(sprites), "sprites")
