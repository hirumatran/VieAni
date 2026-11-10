"""Embed data/vindex.json into src/vindex.template.html -> vindex.html"""
import json, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
data = json.loads((root / "data/vindex.json").read_text(encoding="utf-8"))
tpl = (root / "src/vindex.template.html").read_text(encoding="utf-8")
out = tpl.replace("__DATA__", json.dumps(data, ensure_ascii=False).replace("</", "<\\/"))
(root / "vindex.html").write_text(out, encoding="utf-8")
print("wrote vindex.html", len(data["species"]), "species")
