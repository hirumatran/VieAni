"""Battle status icons (visuals pass, 20 Nov 2026) – small round badges shown above a VieAni while a status lasts.

    python3 scripts/status_icons.py [ICONIFY_GAME_ICONS_JSON]   -> assets/icons/status/<kind>.svg (+ CREDITS.md)

Symbols: game-icons.net (CC BY 3.0, Lorc, Delapouite & contributors), vendored in scripts/data/game_icons_subset.json.
Pass the path of @iconify-json/game-icons' icons.json once to add symbols that are not vendored yet.
"""
import json, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from synergy_icons import mix  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/icons/status"
SUBSET = ROOT / "scripts/data/game_icons_subset.json"
# kind -> (colour, game-icons symbol, meaning)
STATUS = {
    "stun": ("#d8a10f", "knocked-out-stars", "Choáng"),
    "root": ("#8a5a32", "manacles", "Trói"),
    "blind": ("#55595f", "blindfold", "Mù"),
    "silence": ("#6a4fb0", "silenced", "Câm lặng"),
    "charm": ("#d0478f", "charm", "Mê hoặc"),
    "slow": ("#3f7fb6", "snail", "Làm chậm"),
    "taunt": ("#c0502a", "shouting", "Bị khiêu khích"),
    "dot": ("#4f9a2f", "poison-bottle", "Độc / Bỏng / Chảy máu"),
    "buff": ("#2f9a5c", "upgrade", "Được tăng sức"),
    "debuff": ("#b33a3a", "armor-downgrade", "Bị suy yếu"),
    "immune": ("#c99216", "aura", "Miễn khống chế / miễn sát thương"),
    "shield": ("#2f74c0", "checked-shield", "Khiên"),
    "stealth": ("#4a5a6a", "invisible", "Ẩn mình"),
    "rabid": ("#7a2fa0", "fangs", "Dại"),
    "guard": ("#8e6a16", "crenulated-shield", "Trấn giữ"),
    "wall": ("#a8703a", "brick-wall", "Ụ cát"),
    "copy": ("#c99216", "duality-mask", "Biến hóa"),
}


def badge(colour: str, body: str, size: list[int], sid: str) -> str:
    light, dark, rim = mix(colour, "#ffffff", .35), mix(colour, "#000000", .4), mix(colour, "#000000", .72)
    W, H = size
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64">
  <defs><radialGradient id="b{sid}" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="{light}"/><stop offset=".6" stop-color="{colour}"/>
    <stop offset="1" stop-color="{dark}"/></radialGradient></defs>
  <circle cx="32" cy="32" r="31" fill="{rim}"/><circle cx="32" cy="32" r="28" fill="url(#b{sid})"/>
  <circle cx="32" cy="32" r="25.5" fill="none" stroke="#f3d27a" stroke-opacity=".7" stroke-width="1.2"/>
  <g transform="translate(13 13) scale({38 / W:.5f} {38 / H:.5f})" fill="#fff">{body}</g>
</svg>
'''


def main():
    gi = json.loads(SUBSET.read_text(encoding="utf-8"))
    if len(sys.argv) > 1:  # vendor missing symbols from the full iconify set
        full = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
        for _, icon, _m in STATUS.values():
            if icon not in gi["icons"]:
                gi["icons"][icon] = full["icons"][icon]["body"]
        SUBSET.write_text(json.dumps(gi, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    OUT.mkdir(parents=True, exist_ok=True)
    for kind, (colour, icon, _m) in STATUS.items():
        body = gi["icons"][icon].replace("currentColor", "#fff")
        (OUT / f"{kind}.svg").write_text(badge(colour, body, gi["size"], kind), encoding="utf-8")
    (OUT / "CREDITS.md").write_text(
        "# Status icons – credits\n\nSymbols from **game-icons.net** by Lorc, Delapouite and contributors, licensed **CC BY 3.0** "
        "(https://creativecommons.org/licenses/by/3.0/) – recoloured on VieAni badges. Used: "
        + ", ".join(f"{i} ({m})" for _, i, m in STATUS.values()) + ".\n", encoding="utf-8")
    print("wrote", len(STATUS), "status icons to", OUT)


if __name__ == "__main__":
    main()
