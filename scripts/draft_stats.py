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
BST = {1: 420, 2: 450, 3: 480, 4: 510, 5: 530}

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
    34: {"spe": 20, "def": -20, "why": "sea turtle: fast open-water swimmer, lighter shell"},
    33: {"atk": 15, "def": -15, "why": "softshell: leathery shell, fast ambush bite"},
    19: {"atk": 15, "def": -15, "why": "softshell: leathery shell, fast ambush bite"},
    36: {"spe": 15, "hp": -15, "why": "spoon-billed sandpiper is tiny (~15 cm) and quick"},
    35: {"hp": 10, "spe": -10, "why": "giant ibis: largest ibis, heavier"},
    45: {"hp": 10, "atk": 5, "spe": -15, "why": "sarus crane: tallest flying bird"},
    40: {"def": 10, "spe": -10, "why": "civet: stockier ground forager than the rabbit or chevrotain"},
    50: {"spe": 10, "def": -10, "why": "chevrotain: tiny and skittish"},
}


def tier(s, rule):
    if s["group"] == "Legendary":
        return 5
    if s["group"] == "Vanished":
        return 4
    return rule.get((s.get("iucn") or "").split(" ")[0], 1)


def draft(s, t):
    w = PROFILE[BODY[s["id"]]]
    total = BST[t]
    raw = [total * x / sum(w) for x in w]
    st = [max(20, 5 * round(v / 5)) for v in raw]  # round to 5s like hand-made tables
    st[0] += total - sum(st)  # put rounding remainder into HP so the total is exact
    stats = dict(zip(STATS, st))
    for k, v in TWEAK.get(s["id"], {}).items():
        if k != "why":
            stats[k] += v
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
