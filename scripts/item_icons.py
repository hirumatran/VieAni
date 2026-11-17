"""Item icons – round tiles coloured by item tier (1 grey … 5 gold), one white symbol each.

    python3 scripts/item_icons.py      -> assets/icons/items/<id>.svg (+ index.json id -> name, tier)

Symbols: game-icons.net (CC BY 3.0, Lorc, Delapouite & contributors; vendored in scripts/data/game_icons_subset.json), except
Nón Lá, Bánh Chưng and Trống Đồng (drawn here). Only items that can drop get an icon (core/items.ts DROPPABLE).
"""
import json, math, pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).parent))
from synergy_icons import GI, mix, drum_star  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/icons/items"
TIER = {1: "#7d8590", 2: "#3f9a5c", 3: "#2f74c0", 4: "#8e47c4", 5: "#c99216"}

NON_LA = '<path fill="#fff" d="M256 70 L470 330 Q256 380 42 330Z"/><path fill="none" stroke="#fff" stroke-width="22" d="M150 330 Q256 470 362 330"/>'
BANH_CHUNG = ('<rect x="96" y="96" width="320" height="320" rx="34" fill="#fff"/>'
              '<g stroke="#000" stroke-opacity=".55" stroke-width="22"><path d="M210 96 V416 M302 96 V416 M96 210 H416 M96 302 H416"/></g>')
# Linh Vật charms: Bắc Bộ bronze (Đông Sơn drum star), Trung Bộ jade (S-shaped land + waves), Nam Bộ wood (nine-branch delta)
CHARM_COL = {51: "#b07a3a", 52: "#2f9a78", 53: "#8a5a32"}
S_LAND = ('<path fill="none" stroke="#fff" stroke-width="58" stroke-linecap="round" d="M300 70 C150 110 170 210 260 250 C350 290 360 380 210 440"/>'
          '<path fill="none" stroke="#fff" stroke-width="20" stroke-linecap="round" d="M60 420 q30 -22 60 0 t60 0 M330 120 q30 -22 60 0 t60 0"/>')
DELTA = ('<path fill="none" stroke="#fff" stroke-width="30" stroke-linecap="round" stroke-linejoin="round" d="M256 60 V230 '
         'M256 230 L120 440 M256 230 L170 450 M256 230 L220 455 M256 230 L256 460 M256 230 L292 455 M256 230 L342 450 M256 230 L392 440 '
         'M256 160 L170 330 M256 160 L342 330"/>')
CHARMS = {51: "DRUM12", 52: S_LAND, 53: DELTA}
SYMBOL = {
    1: "wood-stick", 2: "sickle", 3: "slingshot", 4: "round-shield", 5: NON_LA, 6: "cloak", 7: BANH_CHUNG, 8: "dumpling-bao",
    9: "bowl-of-rice", 12: "herbs-bundle", 13: "handheld-fan", 14: "barbed-spear", 15: "machete", 24: "envelope",
    25: "DRUM", 26: "crossbow", 27: "bamboo", 30: "scroll-unfurled", 31: "cooking-pot", 34: "fruiting", 35: "watermelon",
    36: "oyster-pearl", 37: "gong", 38: "ancient-sword", 39: "flanged-mace", 40: "linden-leaf", 41: "bow-arrow",
    42: "breastplate", 43: "sandal", 45: "thor-hammer", 47: "turtle-shell", 48: "tattered-banner", 49: "vertical-banner",
}


def tile(colour: str, body: str, sid: str) -> str:
    light, dark, rim = mix(colour, "#ffffff", .35), mix(colour, "#000000", .45), mix(colour, "#000000", .7)
    W, H = GI["size"]
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="bg{sid}" cx=".4" cy=".34" r=".72"><stop offset="0" stop-color="{light}"/><stop offset=".6" stop-color="{colour}"/>
      <stop offset="1" stop-color="{dark}"/></radialGradient>
    <linearGradient id="fg{sid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e6cf"/></linearGradient>
    <filter id="sh{sid}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".5"/></filter>
    <mask id="m{sid}"><g fill="#fff">{body}</g></mask>
  </defs>
  <circle cx="64" cy="64" r="61" fill="{rim}"/>
  <circle cx="64" cy="64" r="57" fill="url(#bg{sid})"/>
  <circle cx="64" cy="64" r="51" fill="none" stroke="#f3d27a" stroke-opacity=".7" stroke-width="1.6"/>
  <path d="M20 52 A46 46 0 0 1 108 52" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="7" stroke-linecap="round"/>
  <g filter="url(#sh{sid})"><g transform="translate(27 27) scale({74 / W:.5f} {74 / H:.5f})">
    <rect width="{W}" height="{H}" fill="url(#fg{sid})" mask="url(#m{sid})"/></g></g>
</svg>
'''


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    items = {i["id"]: i for i in json.loads((ROOT / "data/items.json").read_text(encoding="utf-8"))["items"]}
    index = {}
    for iid, sym in SYMBOL.items():
        it = items[iid]
        body = drum_star(14) if sym == "DRUM" else sym if sym.startswith("<") else GI["icons"][sym].replace("currentColor", "#fff")
        (OUT / f"{iid}.svg").write_text(tile(TIER[it["tier"]], body, f"i{iid}"), encoding="utf-8")
        index[iid] = {"name": it["name"], "tier": it["tier"], "cat": it["cat"], "symbol": sym if not sym.startswith("<") else "custom"}
    for iid, sym in CHARMS.items():
        it = items[iid]
        body = drum_star(12) if sym == "DRUM12" else sym
        (OUT / f"{iid}.svg").write_text(tile(CHARM_COL[iid], body, f"i{iid}"), encoding="utf-8")
        index[iid] = {"name": it["name"], "tier": it["tier"], "cat": "LV", "symbol": "custom"}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "CREDITS.md").write_text("# Item icons – credits\n\nSymbols from **game-icons.net** by Lorc, Delapouite and contributors, "
                                    "**CC BY 3.0** – recoloured on VieAni tiles. Nón Lá, Bánh Chưng and the Trống Đồng star: VieAni project.\n",
                                    encoding="utf-8")
    print("wrote", len(index), "item icons")


if __name__ == "__main__":
    main()
