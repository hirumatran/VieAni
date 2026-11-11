"""Draft the type chart and base stats into data/vindex.json.

    python3 scripts/draft_stats.py           # fill only species that have no stats yet
    python3 scripts/draft_stats.py --force   # redraft every species (overwrites hand edits!)

Stats follow Pokemon's six base stats (HP, Attack, Defense, Sp. Atk, Sp. Def,
Speed). Each species gets a body-plan profile (how its points are split) and a
total set by its tier, so rarer Vinmon are stronger. Edit the numbers in
data/vindex.json by hand after drafting; this script won't touch them again
without --force.
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
P = ROOT / "data/vindex.json"
STATS = ["hp", "atk", "def", "spa", "spd", "spe"]

# Attacker -> defender multipliers that are not 1x, taken from Pokemon's
# Gen 6+ chart (Sky = Flying, Insect = Bug). Pokemon's two immunities among
# these types (Electric->Ground, Ground->Flying = 0x) are softened to 0.5x:
# in an auto-battler a unit can't switch moves, so 0x would make it useless.
CHART = {
    "Fire":     {"Grass": 2, "Insect": 2, "Fire": .5, "Water": .5, "Rock": .5},
    "Water":    {"Fire": 2, "Ground": 2, "Rock": 2, "Water": .5, "Grass": .5},
    "Electric": {"Water": 2, "Sky": 2, "Electric": .5, "Grass": .5, "Ground": .5},
    "Grass":    {"Water": 2, "Ground": 2, "Rock": 2, "Fire": .5, "Grass": .5, "Poison": .5, "Sky": .5, "Insect": .5},
    "Ground":   {"Fire": 2, "Electric": 2, "Poison": 2, "Rock": 2, "Grass": .5, "Insect": .5, "Sky": .5},
    "Rock":     {"Fire": 2, "Sky": 2, "Insect": 2, "Ground": .5},
    "Sky":      {"Grass": 2, "Insect": 2, "Electric": .5, "Rock": .5},
    "Insect":   {"Grass": 2, "Fire": .5, "Poison": .5, "Sky": .5},
    "Poison":   {"Grass": 2, "Poison": .5, "Ground": .5, "Rock": .5},
}
SOFTENED = [["Electric", "Ground"], ["Ground", "Sky"]]

# Base stat total by tier. For scale: Pokemon's fully evolved non-legendaries
# are mostly ~450-540, pseudo-legendaries 600, most legendaries 570-680.
# Legendary Vinmon stay at 530 because their type rule (+25% damage dealt,
# -25% taken) already makes them trade about 1.67x better in a fight.
BST = {1: 400, 2: 440, 3: 480, 4: 510, 5: 530}

# Body-plan profiles: relative weights for hp, atk, def, spa, spd, spe
PROFILE = {
    "giant":     (1.5, 1.3, 1.3, .5, .9, .5),
    "predator":  (1.0, 1.5, .8, .6, .8, 1.3),
    "bear":      (1.2, 1.3, 1.0, .5, .9, .8),
    "small":     (.8, .9, .7, .6, .8, 1.6),
    "deer":      (1.0, 1.1, .9, .7, 1.0, 1.3),
    "armored":   (1.0, .9, 1.6, .5, 1.1, .7),
    "monkey":    (.9, .9, .8, 1.1, 1.0, 1.3),
    "gibbon":    (.8, 1.0, .7, 1.1, .9, 1.5),
    "loris":     (.8, .6, .8, 1.5, 1.2, .6),
    "greatape":  (1.4, 1.5, 1.2, .6, .9, .6),
    "turtle":    (1.3, .8, 1.6, .8, 1.2, .4),
    "croc":      (1.2, 1.5, 1.3, .5, .8, .6),
    "bigfish":   (1.3, 1.1, 1.0, .8, 1.0, .8),
    "cetacean":  (1.2, .8, .9, 1.2, 1.1, .8),
    "dugong":    (1.5, .7, 1.1, 1.0, 1.2, .5),
    "wader":     (.8, 1.0, .7, 1.1, .9, 1.5),
    "gamebird":  (.8, .9, .8, 1.2, 1.0, 1.3),
    "hornbill":  (.9, 1.2, .8, 1.0, .9, 1.2),
    # legendaries
    "dragon":    (1.0, 1.1, .9, 1.4, 1.0, 1.1),
    "lacbird":   (.8, 1.0, .8, 1.3, 1.0, 1.4),
    "kimquy":    (1.2, .7, 1.4, 1.2, 1.4, .5),
    "lan":       (1.1, 1.2, 1.0, 1.0, 1.0, 1.0),
    "phoenix":   (.9, .9, .8, 1.5, 1.1, 1.2),
    "nghe":      (1.2, 1.0, 1.5, .6, 1.3, .6),
    "rooster":   (.8, 1.4, .8, .7, .8, 1.5),
    "steed":     (.9, 1.2, .8, .8, .9, 1.6),
    "ironhorse": (1.0, 1.4, 1.3, 1.0, .8, .9),
    "fishdemon": (1.2, 1.4, 1.0, 1.0, .9, .9),
    "fox":       (.8, .8, .7, 1.5, 1.1, 1.4),
    "whale":     (1.7, 1.0, 1.0, 1.1, 1.1, .4),
    # everyday animals, insects and common wildlife (11/2026)
    "dog":       (1.0, 1.3, .8, .6, .8, 1.5),
    "cat":       (.8, 1.2, .7, .8, .9, 1.6),
    "fowl":      (.9, 1.2, .9, .6, .8, 1.2),
    "pig":       (1.5, 1.1, 1.1, .5, .9, .7),
    "rodent":    (.7, 1.0, .6, .7, .8, 1.8),
    "goat":      (1.0, 1.0, 1.1, .6, 1.0, 1.1),
    "duck":      (1.0, .9, .9, .9, 1.0, 1.0),
    "smallbird": (.7, .9, .6, 1.1, .9, 1.6),
    "smallfish": (1.0, 1.0, 1.0, .8, 1.0, .9),
    "carp":      (1.1, .9, 1.0, 1.1, 1.1, .8),
    "predfish":  (1.0, 1.4, .9, .6, .8, 1.2),
    "crab":      (.9, 1.2, 1.6, .4, .9, .6),
    "snail":     (1.1, .6, 1.7, .6, 1.3, .3),
    "gecko":     (.8, 1.0, .8, 1.0, .9, 1.4),
    "toad":      (1.1, .8, 1.0, 1.3, 1.1, .7),
    "frog":      (.9, 1.1, .8, .9, .9, 1.4),
    "roach":     (.7, .8, .8, .5, .8, 2.0),
    "mosquito":  (.5, .9, .5, 1.3, .7, 1.8),
    "firefly":   (.7, .6, .7, 1.5, 1.0, 1.3),
    "ant":       (.7, 1.4, 1.1, .6, .8, 1.2),
    "bee":       (.6, 1.5, .6, 1.0, .7, 1.5),
    "cicada":    (.9, .7, 1.0, 1.4, 1.1, .8),
    "grasshopper": (.8, 1.2, .8, .6, .8, 1.6),
    "dragonfly": (.7, 1.2, .6, .8, .8, 1.8),
    "mantis":    (.8, 1.6, .8, .6, .8, 1.2),
    "waterbug":  (.9, 1.3, 1.0, .7, .9, 1.0),
    "snake":     (.9, 1.0, .8, 1.4, 1.0, 1.1),
    "python":    (1.4, 1.4, 1.1, .5, .9, .6),
    "ray":       (1.0, .8, 1.0, 1.4, 1.1, .8),
    "jelly":     (1.0, .6, .8, 1.4, 1.3, .6),
    "squid":     (.9, .9, .8, 1.3, 1.0, 1.2),
    "owl":       (.8, 1.2, .8, 1.0, 1.0, 1.3),
    "raptor":    (.8, 1.4, .7, .8, .8, 1.5),
    "monitor":   (1.2, 1.3, 1.1, .5, .9, .9),
    "horse":     (.9, 1.2, .8, .8, .9, 1.6),
    "macaque":   (.9, .9, .8, 1.1, 1.0, 1.3),
}

# species id -> profile
BODY = {
    1: "dragon", 2: "lacbird", 3: "kimquy", 4: "lan", 5: "phoenix", 6: "nghe", 7: "giant",
    8: "rooster", 9: "steed", 10: "ironhorse", 11: "fishdemon", 12: "fox", 13: "whale",
    14: "giant", 15: "giant", 16: "greatape", 17: "predator", 18: "gamebird", 19: "turtle",
    20: "deer", 21: "deer", 22: "monkey", 23: "monkey", 24: "monkey", 25: "monkey",
    26: "monkey", 27: "monkey", 28: "gibbon", 29: "gibbon", 30: "armored", 31: "croc",
    32: "turtle", 33: "turtle", 34: "turtle", 35: "wader", 36: "wader", 37: "bigfish",
    38: "giant", 39: "small", 40: "small", 41: "cetacean", 42: "gamebird", 43: "wader",
    44: "loris", 45: "wader", 46: "predator", 47: "bear", 48: "hornbill", 49: "dugong",
    50: "small",
}


# Species nudges that move points between stats (each sums to 0, so the total
# is unchanged). Only where biology gives a reason; the rest stay at profile.
TWEAK = {
    14: {"def": 10, "spe": -10, "why": "Tê giác Java: da dày nhiều nếp gấp như áo giáp"},
    15: {"atk": 5, "spe": 5, "def": -10, "why": "Bò xám: sừng dài, linh hoạt hơn tê giác"},
    20: {"def": 10, "atk": -10, "why": "Sao la: tính điềm tĩnh, hai sừng dài thẳng dùng để phòng vệ"},
    21: {"atk": 10, "spa": -10, "why": "Mang lớn: gạc lớn nhất trong các loài mang"},
    34: {"spe": 20, "def": -20, "why": "Rùa biển bơi nhanh ngoài khơi, mai nhẹ hơn rùa đầm"},
    33: {"atk": 15, "def": -15, "why": "Giải: mai mềm như da, rình mồi và cắn rất nhanh"},
    19: {"atk": 15, "def": -15, "why": "Giải: mai mềm như da, rình mồi và cắn rất nhanh"},
    36: {"spe": 15, "hp": -15, "why": "Rẽ mỏ thìa rất nhỏ (khoảng 15 cm) và nhanh"},
    35: {"hp": 10, "spe": -10, "why": "Cò quắm lớn là loài cò quắm lớn nhất, nặng hơn"},
    45: {"hp": 10, "atk": 5, "spe": -15, "why": "Sếu đầu đỏ là loài chim bay cao nhất thế giới, to và nặng"},
    40: {"def": 10, "spe": -10, "why": "Cầy vằn chắc nịch, kiếm ăn dưới đất"},
    50: {"spe": 10, "def": -10, "why": "Cheo cheo rất nhỏ, nhút nhát, chạy nhanh"},
    22: {"hp": 10, "def": 5, "spe": -15, "why": "Voọc mũi hếch là loài voọc lớn nhất trong nhóm, chịu lạnh vùng núi cao"},
    23: {"spe": 10, "spa": -10, "why": "Voọc mông trắng leo vách đá vôi dựng đứng rất nhanh"},
    24: {"spd": 10, "spa": -10, "why": "Voọc Cát Bà bền bỉ, sống sót trên đảo đá vôi biệt lập"},
    25: {"hp": 5, "spd": 5, "spa": -10, "why": "Chà vá chân nâu sống đàn lớn, thích nghi cả gần thành phố (Sơn Trà)"},
    26: {"hp": 10, "spe": -10, "why": "Chà vá chân xám sống ở vùng núi cao hơn (Kon Ka Kinh)"},
    27: {"spe": 10, "def": -10, "why": "Chà vá chân đen sống rừng khô thưa, di chuyển xa"},
    28: {"def": 10, "spe": -10, "why": "Vượn Cao Vít sống rừng đá vôi, tán rừng thấp và đứt quãng"},
    29: {"spe": 10, "def": -10, "why": "Vượn đen má trắng chuyền cành trong tán rừng già cao, rất nhanh"},
}
PROFILE_VI = {
    "giant": "Thú cỡ lớn: máu, tấn công, phòng thủ cao; chậm",
    "predator": "Thú săn mồi: tấn công và tốc độ cao",
    "bear": "Gấu: khỏe, máu và tấn công khá; trung bình về tốc độ",
    "small": "Thú nhỏ: rất nhanh nhưng yếu",
    "deer": "Thú móng guốc rừng: nhanh, khá cân bằng",
    "armored": "Thân phủ vảy sừng: phòng thủ rất cao",
    "monkey": "Linh trưởng ăn lá: nhanh nhẹn, đánh tầm xa (tấn công ĐB)",
    "gibbon": "Vượn: chuyền cành nhanh nhất; tiếng hót = tấn công ĐB",
    "loris": "Culi: chậm chạp; nọc độc = tấn công ĐB cao",
    "greatape": "Vượn khổng lồ: to, khỏe, chậm",
    "turtle": "Rùa: phòng thủ rất cao, rất chậm",
    "croc": "Cá sấu: lực cắn mạnh, da dày, chậm trên cạn",
    "bigfish": "Cá cỡ lớn: máu cao, khá cân bằng",
    "cetacean": "Cá heo: định vị bằng sóng âm = tấn công ĐB",
    "dugong": "Bò biển: to, hiền, chậm",
    "wader": "Chim lội nước: nhanh, mổ từ xa",
    "gamebird": "Chim rừng: nhanh, phô diễn bộ lông = tấn công ĐB",
    "hornbill": "Hồng hoàng: mỏ và mũ sừng lớn, tấn công mạnh",
    "dragon": "Rồng: hô mưa gọi sấm = tấn công ĐB",
    "lacbird": "Chim Lạc: bay nhanh, tấn công ĐB",
    "kimquy": "Kim Quy: mai thần, phòng thủ rất cao",
    "lan": "Lân: cân bằng mọi mặt",
    "phoenix": "Phượng Hoàng: lửa thiêng = tấn công ĐB rất cao",
    "nghe": "Nghê: linh thú canh giữ bằng đá, phòng thủ rất cao",
    "rooster": "Gà chín cựa: cựa sắc, tấn công và tốc độ cao",
    "steed": "Ngựa chín hồng mao: nhanh nhất",
    "ironhorse": "Ngựa sắt: thân sắt, tấn công và phòng thủ cao",
    "fishdemon": "Ngư Tinh: thủy quái, tấn công cao",
    "fox": "Hồ Tinh: yêu thuật = tấn công ĐB rất cao",
    "whale": "Cá Ông: khổng lồ, máu rất cao, chậm",
    "dog": "Chó: cắn mạnh, chạy nhanh",
    "cat": "Mèo: nhanh nhẹn, vồ mồi chính xác",
    "fowl": "Gà: mổ và đá cựa, khá cân bằng",
    "pig": "Heo: máu rất dày, khỏe, chậm",
    "rodent": "Chuột: nhỏ, cực nhanh, yếu",
    "goat": "Dê: cứng cáp, leo trèo giỏi",
    "duck": "Vịt: cân bằng, lội nước giỏi",
    "smallbird": "Chim nhỏ: rất nhanh, yếu",
    "smallfish": "Cá nhỏ: dai sức, cân bằng",
    "carp": "Cá chép: dai sức, tiềm năng hóa rồng = tấn công ĐB",
    "predfish": "Cá săn mồi: tấn công mạnh, nhanh",
    "crab": "Cua: mai cứng, càng kẹp mạnh, chậm",
    "snail": "Ốc: vỏ rất cứng, rất chậm",
    "gecko": "Bò sát nhỏ: nhanh, phóng lưỡi/ngoạm bắt mồi",
    "toad": "Cóc: chậm, nhựa độc = tấn công ĐB",
    "frog": "Ếch: nhảy xa, nhanh",
    "roach": "Gián: nhanh nhất, rất khó bị đánh trúng",
    "mosquito": "Muỗi: mong manh, rất nhanh, hút máu = tấn công ĐB",
    "firefly": "Đom đóm: ánh sáng = tấn công ĐB",
    "ant": "Kiến: khỏe so với thân hình, vỏ cứng",
    "bee": "Ong: ngòi đốt mạnh, mong manh",
    "cicada": "Ve sầu: tiếng kêu = tấn công ĐB, vỏ cứng",
    "grasshopper": "Châu chấu: nhảy xa, đá mạnh",
    "dragonfly": "Chuồn chuồn: bay cực nhanh, săn mồi trên không",
    "mantis": "Bọ ngựa: chân lưỡi hái, tấn công rất mạnh",
    "waterbug": "Cà cuống: thợ săn dưới nước, kìm mạnh",
    "snake": "Rắn độc: nọc độc = tấn công ĐB",
    "python": "Trăn: to khỏe, siết mồi, chậm",
    "ray": "Cá đuối điện: phóng điện = tấn công ĐB",
    "jelly": "Sứa: xúc tu độc = tấn công ĐB, chậm",
    "squid": "Mực: phun mực = tấn công ĐB, nhanh",
    "owl": "Cú: săn đêm, nhanh và chính xác",
    "raptor": "Chim săn mồi: móng vuốt mạnh, bay nhanh",
    "monitor": "Kỳ đà: to khỏe, quất đuôi",
    "horse": "Ngựa: bền sức, chạy nhanh",
    "macaque": "Khỉ: nhanh nhẹn, tinh khôn, ăn tạp = tấn công ĐB",
}


def tier(s, rule=None):
    """Tier comes from the group: 1 everyday, 2 wild, 3 threatened, 4 extinct, 5 legendary."""
    return s["tier"]


def draft(s, t):
    body = s.get("body") or BODY[s["id"]]
    w = PROFILE[body]
    total = BST[t]
    raw = [total * x / sum(w) for x in w]
    st = [max(20, 5 * round(v / 5)) for v in raw]  # round to 5s like hand-made tables
    st[0] += total - sum(st)  # put rounding remainder into HP so the total is exact
    stats = dict(zip(STATS, st))
    for k, v in {**TWEAK.get(s["id"], {}), **(s.get("tweak") or {})}.items():
        if k != "why":
            stats[k] += v
    note = PROFILE_VI[body]
    if s["id"] in TWEAK:
        note += ". " + TWEAK[s["id"]]["why"]
    s["statNote"] = note
    physical = stats["atk"] >= stats["spa"]
    attack_type = next(x for x in s["types"] if x != "Legendary")
    rng = 1 if physical else 3
    if physical and "Sky" in s["types"]:
        rng = 2
    return stats, attack_type, ("physical" if physical else "special"), rng


def main():
    force = "--force" in sys.argv
    d = json.loads(P.read_text(encoding="utf-8"))
    d["typeChart"] = CHART
    d["typeChartNote"] = ("Attacker -> defender multipliers; anything not listed is 1x. From Pokemon's Gen 6+ chart "
                          "(Sky = Flying, Insect = Bug). Against a dual-type defender the multipliers multiply, as in "
                          "Pokemon. Pokemon's 0x immunities listed in typeChartSoftened are 0.5x here.")
    d["typeChartSoftened"] = SOFTENED
    d["legendaryRule"] = {"dealt": 1.25, "taken": 0.75,
                          "note": "A Legendary-type unit deals x1.25 damage to every type and takes x0.75 from every type, "
                                  "on top of its other type's matchups. Legendary vs Legendary: 1.25 x 0.75 = 0.9375."}
    d["statRule"] = {"stats": STATS, "bstByTier": BST,
                     "note": "Pokemon-style base stats. Total set by tier; split by body plan. Physical attacks use "
                             "atk vs def, special use spa vs spd. Range in hexes: 1 melee, 2 swoop, 3 ranged. "
                             "attackType is the unit's first non-Legendary type."}
    n = 0
    for s in d["species"]:
        if "stats" in s and not force:
            continue
        s["stats"], s["attackType"], s["attackClass"], s["range"] = draft(s, tier(s, d["tierRule"]))
        n += 1
    P.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"drafted stats for {n} species; type chart has {len(CHART)} attacking types")


if __name__ == "__main__":
    main()
