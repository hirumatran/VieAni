"""Export game data as row arrays for the Google Sheet "VieIndex – Dữ liệu VieAni" (v3 layout, 19 Nov 2026).

    python3 scripts/export_sheet.py OUT_DIR

Writes JSON 2-D arrays, one per block, ready for a values update:
  vieani_stats.json  tab VieAni K1:O  – Máu, Tấn Công, Tốc Độ Đánh, Giáp, Năng lượng (rows in the tab's own order, matched by name)
  toc_he.json        tab Tộc hệ D2:D   – tier texts, in the tab's row order (TOC_ORDER)
  vat_pham.json      tab Vật phẩm E2:E – item effects by id (VP01…)
The other VieAni columns (ID, Di chuyển, Sát thương/giây, Kiểu đòn, Máu ★2/★3, Giây giữa 2 đòn) are array formulas in row 1.
Tabs not exported here (Luật chơi, Hiệu ứng, Thiên địch & Cộng sinh) are short and edited by hand.
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TOC_ORDER = ["Tứ Linh", "Sơn Tinh", "Hộ Quốc", "Săn Mồi", "Cự Thú", "Cao Nguyên Bắc Bộ", "Trường Sơn", "Tây Nguyên", "Biển Đông",
             "Sông Nước", "Côn Trùng", "Bầy Chó Dữ", "Hội Nhà Mèo", "Bầy Gặm Nhấm", "Săn Côn Trùng", "Gia Súc", "Mười Hai Con Giáp"]
STAT_HEAD = ["Máu", "Tấn Công", "Tốc Độ Đánh (lần/giây)", "Giáp (% giảm sát thương, tối đa 60)", "Năng lượng (để tung kỹ năng)"]


def main(out, names_file=None):
    """names_file: optional JSON list of VieAni names in the sheet's row order (column C); default = V-code order of the game data."""
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    L = lambda n: json.loads((ROOT / "data" / n).read_text(encoding="utf-8"))
    d, sy, items = L("vieindex.json"), L("synergies.json")["synergies"], L("items.json")["items"]
    keep = {s["vi"]: s for s in d["species"] if s.get("status") == "keep"}
    names = json.loads(pathlib.Path(names_file).read_text(encoding="utf-8")) if names_file else list(keep)
    stats = [STAT_HEAD] + [[keep[n]["stats"][k] for k in ("hp", "atk", "aspd", "armor", "energy")] for n in names]
    by = {g["name"]: g for g in sy}
    toc = [["\n".join(f"({k}) {v}" for k, v in by[n]["tiers"].items())] for n in TOC_ORDER]
    vp = [[x["effect"]] for x in sorted(items, key=lambda x: x["id"])]
    for n, obj in (("vieani_stats.json", stats), ("toc_he.json", toc), ("vat_pham.json", vp)):
        (out / n).write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    print("VieAni rows:", len(stats) - 1, "tộc hệ:", len(toc), "items:", len(vp))


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "build/sheet", sys.argv[2] if len(sys.argv) > 2 else None)
