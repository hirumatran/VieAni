"""Apply design_v2 (PO review 13 Nov 2026): build sheet payloads + update data/*.json.

    python3 scripts/apply_v2.py OUT_DIR      # writes sheet payload JSON files, updates data/
"""
import json, math, pathlib, re, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
import design_v2 as D

ROOT = pathlib.Path(__file__).resolve().parent.parent
BASE = {1: (150, 250, 400), 2: (200, 325, 525), 3: (250, 400, 650), 4: (325, 525, 850), 5: (400, 650, 1050)}
r5 = lambda x: int(5 * round(x / 5))


def dmg_text(tok):
    def sub(m):
        t, k = int(m.group(1)), float(m.group(2))
        return " / ".join(str(r5(b * k)) for b in BASE[t])
    return re.sub(r"D:(\d):([\d.]+)", sub, tok)


def interval(spe):
    return min(2.5, max(0.6, 200 / (spe + 50)))


def energy_for(spe, sec):
    gain = 10 / interval(spe) + 2.5
    e = max(40, min(150, int(10 * round(sec * gain / 10))))
    return e, max(1, round(e / gain))


def main(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    L = lambda n: json.loads((ROOT / "data" / n).read_text(encoding="utf-8"))
    data = L("vieindex.json")
    by = {s["dex"]: s for s in data["species"]}
    kept = [k for k in sorted(by) if k not in D.LATER_IDS + D.REMOVED_IDS]

    rows = {"C": [], "G": [], "KL": [], "U": [], "XAA": []}
    for k in kept:
        s, u = by[k], D.U[k]
        name, eff, time, dmg, sec = u["active"]
        e, est = energy_for(s["stats"]["spe"], sec)
        active = f"{name}\nHiệu ứng: {eff}\nThời gian: {time}\nSát thương: {dmg_text(dmg)}\nHồi chiêu: {e} năng lượng (≈ {est} giây)"
        syn = u["syn"] + [""]
        rows["G"].append([u["role"]]); rows["KL"].append(syn[:2]); rows["U"].append([u["range"]])
        rows["XAA"].append([active, u["passive"], u["star3"], D.ZODIAC_ADD.get(k) or s.get("zodiac") or ""])
        # ---- repo data
        s["status"] = "keep"; s["role"] = u["role"]; s["range"] = u["range"]
        if k in D.RENAME: s["vi"] = D.RENAME[k]
        if k in D.ZODIAC_ADD: s["zodiac"] = D.ZODIAC_ADD[k]
        s["skills"] = {"active": {"name": name, "effect": eff, "time": time, "damage": dmg_text(dmg), "energy": e, "estSeconds": est},
                       "passive": u["passive"], "star3": u["star3"]}
        s["skill"] = u["passive"]
    rows["C"] = [[D.RENAME.get(k, by[k]["vi"])] for k in kept[:7]]
    for k in D.LATER_IDS: by[k]["status"] = "later"
    for k in D.REMOVED_IDS: by[k]["status"] = "removed"
    data["roles"] = D.ROLE_NOTE
    data["skillFormat"] = "Tên · Hiệu ứng · Thời gian · Sát thương (★1/★2/★3) · Hồi chiêu (năng lượng)"
    (ROOT / "data/vieindex.json").write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")

    # synergies
    name2id = {}
    for s in data["species"]: name2id[s["vi"]] = s["id"]
    syn_json = []
    for nm, g in D.SYN.items():
        members = [by[k]["id"] for k in kept if nm in D.U[k]["syn"]]
        tiers = {}
        for line in g["eff"]:
            m = re.match(r"\((\d+)\) (.*)", line); tiers[m.group(1)] = m.group(2)
        e = {"name": nm, "members": members, "tiers": tiers, "basis": g["basis"]}
        if nm == "Mười Hai Con Giáp": e["byZodiac"] = True
        syn_json.append(e)
    (ROOT / "data/synergies.json").write_text(json.dumps({"note": "12 tộc hệ (bản 2, 13/11/2026). Mười Hai Con Giáp tính theo cột Con giáp.", "synergies": syn_json}, ensure_ascii=False, indent=1), encoding="utf-8")

    # relations: drop removed species, keep the rest (later units are filtered in game by status)
    rel = L("relations.json")
    removed = {by[k]["id"] for k in D.REMOVED_IDS}
    later = {by[k]["id"] for k in D.LATER_IDS}
    keep_rel = []
    for r in rel["relations"]:
        r["a"] = [i for i in r["a"] if i not in removed]; r["b"] = [i for i in r["b"] if i not in removed]
        if r["a"] and (r["b"] or r.get("bType")): keep_rel.append(r)
    rel["relations"] = keep_rel
    (ROOT / "data/relations.json").write_text(json.dumps(rel, ensure_ascii=False, indent=1), encoding="utf-8")

    # items: add the 3 Linh Vật charms
    it = L("items.json")
    it["categories"]["LV"] = "Linh vật"
    it["items"] = [i for i in it["items"] if i.get("cat") != "LV"]
    for vid, nm, tier, cat, eff, basis in D.CHARMS:
        it["items"].append({"id": int(vid[2:]), "name": nm, "tier": tier, "cat": "LV", "effect": eff, "basis": basis, "src": ""})
    it["charmRule"] = D.CHARM_RULE
    (ROOT / "data/items.json").write_text(json.dumps(it, ensure_ascii=False, indent=1), encoding="utf-8")

    # sheet: relations tab rows (kept + later units only, current names)
    TV = {"Legendary": "Huyền thoại", "Fire": "Lửa", "Water": "Nước", "Electric": "Điện", "Grass": "Cỏ",
          "Ground": "Đất", "Rock": "Đá", "Sky": "Trời", "Insect": "Côn trùng", "Poison": "Độc"}
    byid = {s["id"]: s for s in data["species"]}
    qh = []
    for r in keep_rel:
        ka = [i for i in r["a"] if byid[i]["status"] == "keep"]
        kb = [i for i in r["b"] if byid[i]["status"] == "keep"]
        if not ka or not (kb or r.get("bType")):
            continue
        names = lambda xs: ", ".join(byid[i]["vi"] for i in xs)
        b = f"Mọi VieAni hệ {TV[r['bType']]}" if r.get("bType") else names(kb)
        qh.append([r["kind"], names(ka), b, r["mult"], r["effect"], r["basis"], r.get("src", "")])
    # items E column (fix '+' cells) + charms
    items_e = [["'" + i["effect"] if i["effect"][:1] in "+-=−" else i["effect"]] for i in it["items"] if i["cat"] != "LV"]
    charms = [[vid, nm, tier, "Linh vật", eff, basis, ""] for vid, nm, tier, cat, eff, basis in D.CHARMS]
    toc = [[nm, "\n".join(g["eff"]), g["basis"]] for nm, g in D.SYN.items()]
    for n, obj in (("rows.json", rows), ("relations.json", qh), ("items_e.json", items_e), ("charms.json", charms), ("toc.json", toc)):
        (out / n).write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    print("kept", len(kept), "relations shown", len(qh), "items", len(it["items"]), "synergies", len(syn_json))
    print("archive rows (sheet row numbers):", sorted(D.LATER_IDS + D.REMOVED_IDS))


if __name__ == "__main__":
    main(sys.argv[1])
