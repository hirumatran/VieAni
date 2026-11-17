"""Size of each VieAni on the board, from its real typical adult body mass (PO, 17 Nov 2026).

    python3 scripts/sizes.py      -> data/sizes.json  (V-code -> mass, scale, note, source)

Rule: legendary VieAni (tier 5) and the giants (Cự Thú members) stay at today's size (scale 1.0). Every other VieAni is
scaled between 0.5 (the lightest) and 0.9 (the heaviest non-giant), linear in log10(mass), everything under 1 g counted as 1 g – body length grows with the cube
root of mass, and a log scale keeps an ant visible next to a tiger.
Masses: typical adult (middle of the usual range) from the sources listed; "≈" = rough estimate (flagged in the output).
"""
import json, math, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
W = "https://en.wikipedia.org/wiki/"
# V-code: (mass kg, note, source, rough?)
MASS = {
 "V001": (16, "11,5–23 kg", W + "Clouded_leopard", False),
 "V002": (400, "230–500 kg", W + "Dugong", False),
 "V004": (120, "đến khoảng 130 kg", W + "Irrawaddy_dolphin", False),
 "V006": (100, "con trưởng thành 2–3 m", W + "Siamese_crocodile", True),
 "V008": (3, "2–4 kg", W + "Owston%27s_palm_civet", False),
 "V009": (10, "đực ~10,9 kg, cái ~8,2 kg", W + "Gray-shanked_douc", False),
 "V010": (2, "cheo cheo (Tragulus) 1,5–2,5 kg", W + "Silver-backed_chevrotain", True),
 "V012": (4.2, "~4,2 kg", W + "Giant_ibis", False),
 "V013": (1.6, "", W + "Black-faced_spoonbill", True),
 "V014": (4.5, "trống 3,8–5 kg", W + "Green_peafowl", False),
 "V015": (0.45, "0,36–0,58 kg", W + "Pygmy_slow_loris", False),
 "V016": (60, "45–70 kg", W + "Hawksbill_sea_turtle", False),
 "V018": (1.1, "", W + "Edwards%27s_pheasant", True),
 "V019": (45, "25–65 kg", W + "Sun_bear", False),
 "V021": (3, "2,15–4 kg", W + "Great_hornbill", False),
 "V022": (170, "đực 150–195 kg", W + "Indochinese_tiger", False),
 "V025": (40, "30–50 kg", W + "Large-antlered_muntjac", False),
 "V030": (0.033, "29–34 g", W + "Spoon-billed_sandpiper", False),
 "V032": (90, "80–100 kg", W + "Saola", False),
 "V033": (7.3, "6,8–7,8 kg (chim bay cao nhất, ~1,8 m)", W + "Sarus_crane", False),
 "V035": (6, "4–10 kg", W + "Sunda_pangolin", False),
 "V036": (1.5, "chưa có số đo; loài gần nhất (thỏ vằn Sumatra) ~1,5 kg", W + "Sumatran_striped_rabbit", True),
 "V039": (7, "", W + "Northern_white-cheeked_gibbon", False),
 "V041": (0.003, "bọ ngựa lớn 2–5 g", W + "Mantis", True),
 "V042": (5, "thường 2–14 kg", W + "Common_carp", False),
 "V043": (0.0005, "", W + "Oxya", True),
 "V044": (0.024, "~24 g", W + "Eurasian_tree_sparrow", False),
 "V045": (13, "giống bản địa, không có tiêu chuẩn", "https://vi.wikipedia.org/wiki/Chó_cỏ", True),
 "V046": (20, "15–25 kg", W + "H%27Mong_dog", True),
 "V047": (15, "không có tiêu chuẩn giống", W + "L%C3%A0i_dog", True),
 "V048": (16, "12–20 kg", W + "Phu_Quoc_ridgeback", False),
 "V049": (0.0007, "", W + "Dragonfly", True),
 "V050": (0.35, "250–500 g", W + "Brown_rat", False),
 "V051": (0.02, "~20 g", W + "House_mouse", False),
 "V052": (0.45, "350–550 g", W + "Little_egret", False),
 "V053": (0.07, "", W + "Duttaphrynus_melanostictus", True),
 "V054": (0.03, "", W + "Somanniathelphusa", True),
 "V055": (30, "dê cỏ 25–35 kg", W + "Goat", True),
 "V056": (0.00002, "", W + "Firefly", True),
 "V057": (5, "gà trống 4,5–5,5 kg", W + "%C4%90%C3%B4ng_T%E1%BA%A3o_chicken", False),
 "V058": (0.001, "~1 g", W + "American_cockroach", False),
 "V059": (50, "Wikipedia: đực ~50 kg, cái ~48 kg; TL giống bản địa: 60–70 kg", W + "Vietnamese_Pot-bellied", False),
 "V060": (80, "chưa có số liệu khối lượng trưởng thành; phối giống > 60 kg", "https://thuvienphapluat.vn/TCVN/Nong-nghiep/Tieu-chuan-Viet-Nam-TCVN-1467-1982-lon-cai-giong-mong-cai-phan-cap-chat-luong-900682.aspx", True),
 "V061": (0.000001, "thợ ~1 mg", W + "Solenopsis_geminata", True),
 "V062": (0.000005, "", W + "Oecophylla_smaragdina", True),
 "V063": (4, "mèo nhà 3,5–4,5 kg", W + "Cat", False),
 "V064": (4, "mèo nhà 3,5–4,5 kg", W + "Cat", False),
 "V065": (4, "mèo nhà 3,5–4,5 kg", W + "Cat", False),
 "V066": (0.000002, "~2 mg", W + "Aedes_aegypti", True),
 "V067": (200, "ngựa nội nhỏ (nhóm poni Đông Nam Á); TCVN 9271:2012 phối giống ≥ 180 kg", "https://thuvienphapluat.vn/TCVN/Nong-nghiep/TCVN-9271-2012-Ngua-giong-Yeu-cau-ky-thuat-905839.aspx", True),
 "V068": (0.00008, "~80 mg", W + "Apis_cerana", True),
 "V069": (0.04, "", W + "Pomacea_canaliculata", True),
 "V070": (0.1, "", W + "Black-collared_starling", True),
 "V071": (0.03, "", W + "Eutropis_multifasciata", True),
 "V072": (0.004, "3–5 g", W + "Common_house_gecko", False),
 "V074": (0.0015, "", W + "Cicada", True),
 "V075": (1.5, "", W + "Domestic_duck", True),
 "V076": (0.07, "dài tối đa ~18 cm (FishBase); khối lượng tính từ công thức dài–nặng của FishBase", "https://fishbase.se/summary/13689", True),
 "V077": (0.14, "100–170 g", W + "Collared_scops_owl", False),
 "V078": (0.8, "0,6–1,1 kg", W + "Black_kite", False),
 "V079": (80, "50–100 kg", W + "Wild_boar", False),
 "V080": (24, "20–28 kg", W + "Indian_muntjac", False),
 "V081": (1, "", W + "Cuttlefish", True),
 "V082": (1, "dài 1,3–1,5 m", W + "Monocled_cobra", True),
 "V083": (0.4, "300–500 g", W + "Pallas%27s_squirrel", False),
 "V084": (1, "rất khác nhau giữa các loài", W + "Jellyfish", True),
 "V085": (0.25, "150–400 g", W + "Tokay_gecko", False),
 "V086": (50, "dài 5–6 m+", W + "Reticulated_python", True),
 "V087": (16, "12–20 kg", W + "Dhole", False),
}
LO, HI = 0.5, 0.9
TINY = 0.001  # 1 g: everything lighter is drawn at the minimum 50 % (otherwise ants stretch the scale and cats ≈ tigers)


def main():
    data = json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))
    syn = json.loads((ROOT / "data/synergies.json").read_text(encoding="utf-8"))["synergies"]
    giants = set(next(g for g in syn if g["name"] == "Cự Thú")["members"])
    roster = sorted([s for s in data["species"] if s.get("status") == "keep"], key=lambda s: s["dex"])
    masses = [max(TINY, m) for m, *_ in MASS.values()]
    lo, hi = math.log10(min(masses)), math.log10(max(masses))
    out = {}
    for i, s in enumerate(roster):
        code = f"V{i + 1:03d}"
        if s["tier"] == 5 or s["id"] in giants:
            out[code] = {"vi": s["vi"], "scale": 1.0, "why": "Huyền thoại" if s["tier"] == 5 else "Cự Thú (khổng lồ)"}
            continue
        m, note, src, rough = MASS[code]
        k = (math.log10(max(TINY, m)) - lo) / (hi - lo)
        out[code] = {"vi": s["vi"], "massKg": m, "scale": round(LO + (HI - LO) * k, 2), "note": note, "source": src, "rough": rough}
    missing = [c for c in out if "scale" not in out[c]]
    assert not missing, missing
    (ROOT / "data/sizes.json").write_text(json.dumps(out, ensure_ascii=False, indent=1), encoding="utf-8")
    rows = sorted(out.items(), key=lambda kv: -kv[1]["scale"])
    for c, v in rows: print(c, f'{v["scale"]:.2f}', v["vi"], v.get("massKg", v.get("why")), "≈" if v.get("rough") else "")


if __name__ == "__main__":
    main()
