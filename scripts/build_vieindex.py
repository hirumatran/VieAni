"""Embed data/vieindex.json and assets/sprites/*.png into src/vieindex.template.html -> vieindex.html

Sprites in assets/sprites/custom/ take priority over the drawn ones.
Run scripts/sprites.py first if the drawn sprites changed.
"""
import base64, json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "data/vieindex.json").read_text(encoding="utf-8"))
# only the playable roster (status keep); 'later' / 'removed' VieAni are listed in the sheet archive tab
data["species"] = [s for s in data["species"] if s.get("status", "keep") == "keep"]
for s in data["species"]:
    k = s.get("skills")
    if k:  # one text block for the card: active · passive · ★3
        a = k["active"]
        s["skill"] = (f"{a['name']} ({a['energy']} năng lượng): {a['effect']} – sát thương {a['damage']}. "
                      f"Bị động – {k['passive']}. ★3 – {k['star3']}")
# V-code = position in the playable roster sorted by dex (same as the sheet ID and the game)
for i, s in enumerate(sorted(data["species"], key=lambda s: s["dex"])):
    s["code"] = f"V{i + 1:03d}"
# avatar: the clean illustration (front view, from scripts/cutout.py) when it exists, else the old pixel sprite
import io
from PIL import Image
sprites, illustrated = {}, []
for s in data["species"]:
    cut = root / f'assets/illustrations/cut/{s["code"]}_front.png'
    if cut.exists():
        im = Image.open(cut).convert("RGBA")
        im = im.crop(im.getbbox()).copy(); im.thumbnail((256, 256), Image.LANCZOS)
        buf = io.BytesIO(); im.save(buf, "WEBP", quality=88)
        sprites[s["id"]] = "data:image/webp;base64," + base64.b64encode(buf.getvalue()).decode()
        illustrated.append(s["id"])
        continue
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
          .replace("__SPRITES__", json.dumps(sprites))
          .replace("__ILLUSTRATED__", json.dumps(illustrated)))
(root / "vieindex.html").write_text(out, encoding="utf-8")
print("wrote vieindex.html", len(data["species"]), "species,", len(illustrated), "illustrations,", len(sprites) - len(illustrated), "pixel sprites")
