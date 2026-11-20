"""v3 stats (PO 19 Nov 2026): 5 simple stats per VieAni, made from a role base line × tier + a small biology twist.

    python3 scripts/stats_v3.py      -> data/vieindex.json: `stats` = {hp, atk, aspd, armor, energy}; old six stats kept in `statsV2`

  Máu (hp)            role base × TIER_MUL[tier] × twist(old HP stat)        rounded to 10
  Tấn Công (atk)      role base × TIER_MUL[tier] × twist(old best attack)    rounded to 1
  Tốc Độ Đánh (aspd)  attacks per second: role base × twist(old Speed)       rounded to 0.05
  Giáp (armor)        % less damage: role base + 3 per tier above 1 + twist(old defences) ±5, 0–60
  Năng lượng (energy) energy needed for the skill = the skill's energy in the sheet (column X)
The twist compares the animal with the average of its role (±10 %), so e.g. an elephant is tankier than a goat of the same role.
"""
import json, pathlib, statistics

ROOT = pathlib.Path(__file__).resolve().parent.parent
#               Máu  Tấn Công  Tốc Độ Đánh  Giáp
ROLE = {
    "Đỡ Đòn":     (700, 40, 0.60, 30),
    "Chiến Đấu":  (600, 50, 0.70, 20),
    "Săn Mồi":    (500, 60, 0.85, 10),
    "Phép Thuật": (450, 40, 0.65, 5),
    "Hỗ Trợ":     (500, 35, 0.60, 15),
}
TIER_MUL = {1: 1.0, 2: 1.2, 3: 1.4, 4: 1.6, 5: 1.9}  # tier 5 1.8 → 1.9: PO 20 Nov 2026


def main():
    p = ROOT / "data/vieindex.json"
    data = json.loads(p.read_text(encoding="utf-8"))
    sp = [s for s in data["species"] if s.get("status") == "keep"]
    for s in data["species"]:
        if "statsV2" not in s: s["statsV2"] = s["stats"]
    # each old stat as a share of that animal's own total (old totals grew with tier, so raw values would count tier twice)
    def old(s):
        o = s["statsV2"]; t = sum(o.values())
        return {k: v / t for k, v in o.items()}
    avg = {r: {k: statistics.mean(f(old(s)) for s in sp if s["role"] == r)
               for k, f in {"hp": lambda o: o["hp"], "atk": lambda o: max(o["atk"], o["spa"]), "spe": lambda o: o["spe"],
                            "def": lambda o: (o["def"] + o["spd"]) / 2}.items()} for r in ROLE}
    tw = lambda v, a: max(0.9, min(1.1, 1 + 0.5 * (v / a - 1)))  # half of the difference to the role average, ±10 %
    for s in sp:
        o, a = old(s), avg[s["role"]]
        hp0, atk0, as0, ar0 = ROLE[s["role"]]
        m = TIER_MUL[s["tier"]]
        hp = round(hp0 * m * tw(o["hp"], a["hp"]) / 10) * 10
        atk = round(atk0 * m * tw(max(o["atk"], o["spa"]), a["atk"]))
        aspd = round(as0 * tw(o["spe"], a["spe"]) / 0.05) * 0.05
        armor = round(ar0 + 3 * (s["tier"] - 1) + 50 * (tw((o["def"] + o["spd"]) / 2, a["def"]) - 1))
        s["stats"] = {"hp": hp, "atk": atk, "aspd": round(aspd, 2), "armor": max(0, min(60, armor)), "energy": s["skills"]["active"]["energy"]}
    p.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding="utf-8")
    for r in ROLE:
        rows = sorted((s for s in sp if s["role"] == r), key=lambda s: (s["tier"], s["vi"]))
        print(f"== {r}")
        for s in rows[:3] + rows[-2:]: print(f'   T{s["tier"]} {s["vi"]:28s} {s["stats"]}')


if __name__ == "__main__":
    main()
