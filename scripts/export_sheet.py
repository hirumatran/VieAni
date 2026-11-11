"""Export the VieIndex data as row arrays for the Google Sheet "VieAni – Dữ liệu game".

    python3 scripts/export_sheet.py OUT_DIR

Writes vieani.json (tab VieAni, B1:W), toc_he.json (tab Tộc hệ, A1:E) and
quan_he.json (tab Thiên địch & Cộng sinh, A1:G). Column A (ID) and Q (Tổng)
are formulas in the sheet, so they are left out (Q is null = skipped).
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TV = {"Legendary": "Huyền thoại", "Fire": "Lửa", "Water": "Nước", "Electric": "Điện", "Grass": "Cỏ",
      "Ground": "Đất", "Rock": "Đá", "Sky": "Trời", "Insect": "Côn trùng", "Poison": "Độc"}


def main(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    L = lambda n: json.loads((ROOT / "data" / n).read_text(encoding="utf-8"))
    d, vn, sy, rel = L("vieindex.json"), L("vn_info.json"), L("synergies.json")["synergies"], L("relations.json")["relations"]
    G, IU = vn["labels"]["group"], vn["labels"]["iucn"]
    syn = {}
    for g in sy:
        for m in g["members"]:
            syn.setdefault(m, []).append(g["name"])
    byid = {s["id"]: s for s in d["species"]}
    rows = [["Tên VieAni", "Tên tiếng Anh", "Tên khoa học", "Nhóm", "Hệ 1", "Hệ 2", "Bậc (1–5)", "Tộc hệ 1", "Tộc hệ 2",
             "Máu (HP)", "Tấn công", "Phòng thủ", "Tấn công ĐB", "Phòng thủ ĐB", "Tốc độ", None, "Kiểu đòn", "Tầm đánh",
             "Sách Đỏ IUCN", "Cơ sở chỉ số (sinh học / truyền thuyết)", "Kỹ năng đặc biệt", "Con giáp"]]
    for s in sorted(d["species"], key=lambda s: s["dex"]):
        v = vn["species"][str(s["id"])]
        code = (s.get("iucn") or "").split(" ")[0]
        iu = v.get("iucn") or (f"{IU[code]} ({code})" if code in IU else s.get("iucn")
                               or ("—" if s["tier"] == 5 else "Phổ biến / vật nuôi – không xếp hạng"))
        st, sg = s["stats"], syn[s["id"]] + [""]
        rows.append([s["vi"], s["en"], s.get("sci") or "", G[s["group"]], TV[s["types"][0]],
                     TV[s["types"][1]] if len(s["types"]) > 1 else "", s["tier"], sg[0], sg[1],
                     st["hp"], st["atk"], st["def"], st["spa"], st["spd"], st["spe"], None,
                     "Vật lý" if s["attackClass"] == "physical" else "Đặc biệt", s["range"], iu,
                     s["statNote"], s.get("skill", ""), s.get("zodiac", "")])
    toc = [["Tên tộc hệ", "Số thành viên", "Thành viên (tự cập nhật)", "Mốc kích hoạt & hiệu ứng", "Cơ sở"]]
    toc += [[g["name"], None, None, "\n".join(f"({k}) {v}" for k, v in g["tiers"].items()), g["basis"]] for g in sy]
    names = lambda ids: ", ".join(byid[i]["vi"] for i in ids)
    qh = [["Quan hệ", "VieAni A", "VieAni B", "Hệ số", "Hiệu ứng trong trận", "Cơ sở", "Nguồn"]]
    for r in rel:
        b = f"Mọi VieAni hệ {TV[r['bType']]}" if r.get("bType") else names(r["b"])
        eff = r["effect"] + (f" (tầm đánh: {r['range']})" if r.get("range") and "vô hạn" not in r["effect"] else "")
        qh.append([r["kind"], names(r["a"]), b, r["mult"], eff, r["basis"], r.get("src", "")])
    for n, obj in (("vieani.json", rows), ("toc_he.json", toc), ("quan_he.json", qh)):
        (out / n).write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    print("rows:", len(rows), "synergies:", len(toc) - 1, "relations:", len(qh) - 1)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "build/sheet")
