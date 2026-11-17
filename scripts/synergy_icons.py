"""Tộc hệ (synergy) icons – v2 (PO 17 Nov 2026: "more aesthetic, symbolic").

    python3 scripts/synergy_icons.py      -> assets/icons/synergies/<slug>.svg  (+ index.json, CREDITS.md)

Each icon = one white symbol on a jewel-coloured tile: radial light, a faint Đông Sơn bronze-drum ring pattern,
a thin gold inner frame and a dark bronze border. Symbols are from game-icons.net (CC BY 3.0, by Lorc, Delapouite and
contributors; vendored in scripts/data/game_icons_subset.json), except Mười Hai Con Giáp: a 12-ray star in the style of
the Đông Sơn drum centre (drawn here). Change SYMBOL / COLOUR below and re-run.
"""
import json, math, pathlib, unicodedata

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/icons/synergies"
GI = json.loads((ROOT / "scripts/data/game_icons_subset.json").read_text(encoding="utf-8"))

# name -> (tile colour, game-icons name or None for custom, meaning)
ICONS = {
    "Tứ Linh": ("#c9962a", "dragon-spiral", "rồng cuộn – đứng đầu Tứ Linh (Long, Lân, Quy, Phụng)"),
    "Sơn Tinh": ("#8a5a2e", "mountains", "núi thiêng – Sơn Tinh dâng núi chặn nước"),
    "Hộ Quốc": ("#b3262d", "bordered-shield", "khiên giữ nước"),
    "Săn Mồi": ("#d8661c", "fangs", "nanh thú săn"),
    "Cự Thú": ("#4f6672", "elephant-head", "đầu voi – thú khổng lồ"),
    "Cao Nguyên Bắc Bộ": ("#3c4aa8", "peaks", "núi đá vôi phía Bắc"),
    "Trường Sơn": ("#2b7a3d", "forest", "đại ngàn Trường Sơn"),
    "Tây Nguyên": ("#0f7f73", "gong", "cồng chiêng Tây Nguyên"),
    "Biển Đông": ("#1d56a8", "big-wave", "sóng Biển Đông"),
    "Sông Nước": ("#2a9fd0", "lotus", "hoa sen – ao làng, đồng nước"),
    "Côn Trùng": ("#6fa83a", "dragonfly", "chuồn chuồn"),
    "Bầy Chó Dữ": ("#7a2230", "wolf-head", "đầu chó dữ"),
    "Hội Nhà Mèo": ("#7a2aa0", "cat", "mèo"),
    "Bầy Gặm Nhấm": ("#c94f7c", "mouse", "chuột"),
    "Săn Côn Trùng": ("#8a8a22", "gecko", "tắc kè / thằn lằn bắt sâu bọ"),
    "Gia Súc": ("#a8703a", "bull-horns", "sừng trâu – vật nuôi nhà nông"),
    "Mười Hai Con Giáp": ("#2f3e46", None, "ngôi sao 12 cánh kiểu mặt trống đồng – 12 con giáp"),
}


def slug(name: str) -> str:
    s = unicodedata.normalize("NFD", name.replace("đ", "d").replace("Đ", "D"))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    return "-".join("".join(c if c.isalnum() else " " for c in s).split())


def mix(hex_: str, other: str, k: float) -> str:
    a = [int(hex_[i:i + 2], 16) for i in (1, 3, 5)]
    b = [int(other[i:i + 2], 16) for i in (1, 3, 5)]
    return "#" + "".join(f"{round(x + (y - x) * k):02x}" for x, y in zip(a, b))


def drum_star(n=12) -> str:
    """12-ray star with rings, like the centre of a Đông Sơn bronze drum (in a 512 box)"""
    c, r1, r2 = 256, 70, 200
    pts = []
    for i in range(n * 2):
        a = -math.pi / 2 + i * math.pi / n
        r = r2 if i % 2 == 0 else r1
        pts.append(f"{c + r * math.cos(a):.1f},{c + r * math.sin(a):.1f}")
    ring = "".join(f'<circle cx="{c + 232 * math.cos(-math.pi / 2 + (i + .5) * 2 * math.pi / n):.1f}" '
                   f'cy="{c + 232 * math.sin(-math.pi / 2 + (i + .5) * 2 * math.pi / n):.1f}" r="16" fill="#fff"/>' for i in range(n))
    return f'<polygon points="{" ".join(pts)}" fill="#fff"/><circle cx="{c}" cy="{c}" r="44" fill="#fff"/>{ring}'


def drum_rings(colour: str) -> str:
    """faint Đông Sơn-style decoration: two rings with a band of small triangles between them"""
    tri = []
    for i in range(28):
        a = i * 2 * math.pi / 28
        x1, y1 = 64 + 47 * math.cos(a - .06), 64 + 47 * math.sin(a - .06)
        x2, y2 = 64 + 47 * math.cos(a + .06), 64 + 47 * math.sin(a + .06)
        x3, y3 = 64 + 41 * math.cos(a), 64 + 41 * math.sin(a)
        tri.append(f"M{x1:.1f} {y1:.1f}L{x2:.1f} {y2:.1f}L{x3:.1f} {y3:.1f}Z")
    return (f'<g opacity=".16" fill="none" stroke="#fff" stroke-width="1.2"><circle cx="64" cy="64" r="50"/>'
            f'<circle cx="64" cy="64" r="38"/></g><path d="{"".join(tri)}" fill="#fff" opacity=".14"/>')


def tile(colour: str, icon: str | None, sid: str) -> str:
    light, dark, rim = mix(colour, "#ffffff", .32), mix(colour, "#000000", .45), mix(colour, "#000000", .7)
    W, H = GI["size"]
    body = drum_star() if icon is None else GI["icons"][icon].replace("currentColor", "#fff")
    return f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" width="128" height="128">
  <defs>
    <radialGradient id="bg{sid}" cx=".42" cy=".36" r=".75"><stop offset="0" stop-color="{light}"/><stop offset=".55" stop-color="{colour}"/>
      <stop offset="1" stop-color="{dark}"/></radialGradient>
    <linearGradient id="gl{sid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/>
      <stop offset=".45" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <linearGradient id="fg{sid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#f1e6cf"/></linearGradient>
    <filter id="sh{sid}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="3" stdDeviation="2.5" flood-color="#000" flood-opacity=".5"/></filter>
    <filter id="nz{sid}" x="0" y="0" width="1" height="1"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="7"/>
      <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .14 0"/><feComposite in2="SourceGraphic" operator="in"/></filter>
    <mask id="m{sid}"><g fill="#fff">{body.replace('fill="#fff"', 'fill="#fff"')}</g></mask>
  </defs>
  <rect x="3" y="3" width="122" height="122" rx="24" fill="{rim}"/>
  <rect x="6" y="6" width="116" height="116" rx="21" fill="url(#bg{sid})"/>
  <rect x="6" y="6" width="116" height="116" rx="21" fill="#000" filter="url(#nz{sid})"/>
  {drum_rings(colour)}
  <rect x="6" y="6" width="116" height="58" rx="21" fill="url(#gl{sid})"/>
  <rect x="11" y="11" width="106" height="106" rx="17" fill="none" stroke="#f3d27a" stroke-opacity=".75" stroke-width="1.6"/>
  <g filter="url(#sh{sid})"><g transform="translate(25 25) scale({78 / W:.5f} {78 / H:.5f})">
    <rect width="{W}" height="{H}" fill="url(#fg{sid})" mask="url(#m{sid})"/></g></g>
</svg>
'''


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    syn = json.loads((ROOT / "data/synergies.json").read_text(encoding="utf-8"))["synergies"]
    index = {}
    for g in syn:
        colour, icon, meaning = ICONS[g["name"]]
        sid = slug(g["name"])
        (OUT / f"{sid}.svg").write_text(tile(colour, icon, sid), encoding="utf-8")
        index[g["name"]] = {"icon": sid, "colour": colour, "symbol": meaning, "source": icon or "custom"}
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "CREDITS.md").write_text(
        "# Tộc hệ icons – credits\n\nSymbols (all except Mười Hai Con Giáp) from **game-icons.net** by Lorc, Delapouite and "
        "contributors, licensed **CC BY 3.0** (https://creativecommons.org/licenses/by/3.0/) – recoloured and placed on "
        "VieAni tiles. Used icons: " + ", ".join(sorted(v[1] for v in ICONS.values() if v[1])) + ".\n\n"
        "Tiles, Đông Sơn ring pattern and the Mười Hai Con Giáp drum star: VieAni project.\n", encoding="utf-8")
    print("wrote", len(index), "icons to", OUT)


if __name__ == "__main__":
    main()
