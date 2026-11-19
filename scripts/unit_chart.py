"""Per-VieAni balance chart from docs/balance/unit_balance.json (made by `npm run balance -- tools/unitBalance.ts` in game/).

    python3 scripts/unit_chart.py   -> docs/balance/unit_chart.html (+ .png via Playwright)
"""
import json, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
R = json.loads((ROOT / "docs/balance/unit_balance.json").read_text(encoding="utf-8"))
ROLE_COL = {"Đỡ Đòn": "#4f7cac", "Chiến Đấu": "#c0702a", "Săn Mồi": "#b33a2a", "Phép Thuật": "#7a4fa8", "Hỗ Trợ": "#3f8a45"}
TIER = {1: "Bậc 1 – Thân thuộc", 2: "Bậc 2 – Hoang dã", 3: "Bậc 3 – Nguy cấp", 4: "Bậc 4 – Đã mất", 5: "Bậc 5 – Huyền thoại"}
cols = ""
for t in range(1, 6):
    us = sorted([u for u in R["units"] if u["tier"] == t], key=lambda u: -u["t11"])
    rows = ""
    for u in us:
        w, n = u["t11"], u["now"]
        rows += (f'<div class="r"><span class="nm">{u["vi"]}</span><span class="bar"><i class="mid"></i>'
                 f'<b style="left:{min(w,50)}%;width:{abs(w-50)}%;background:{ROLE_COL[u["role"]]}"></b>'
                 f'<i class="now" style="left:{n}%" title="hiện tại {n}%"></i></span><span class="v">{w:.0f}%</span></div>')
    cols += f'<div class="tier"><h3>{TIER[t]} <small>({len(us)})</small></h3>{rows}</div>'
lad = {(l["mode"], l["tier"]): l["winRate"] for l in R["ladder"]}
ladder = " · ".join(f'Bậc {t} thắng bậc {t-1}: <b>{lad[("t11", t)]:.0f}%</b>' for t in range(2, 6))
legend = " ".join(f'<span class="lg" style="background:{c}"></span>{r}' for r, c in ROLE_COL.items())
html = f"""<!doctype html><html><head><meta charset="utf-8"><title>Cân bằng VieAni</title><style>
body{{margin:0;padding:18px 22px;background:#fbf4e6;color:#2b1d14;font:13px/1.35 system-ui,sans-serif;width:1500px}}
h1{{font-size:20px;margin:0 0 4px}} .sub{{color:#6b5a48;margin-bottom:10px}} .grid{{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}}
h3{{font-size:14px;margin:4px 0 6px}} small{{color:#8a7560;font-weight:400}}
.r{{display:grid;grid-template-columns:118px 1fr 34px;align-items:center;gap:5px;height:17px}} .nm{{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:12px}}
.bar{{position:relative;height:11px;background:#efe3cc;border-radius:3px}} .bar b{{position:absolute;top:0;bottom:0;border-radius:2px}}
.mid{{position:absolute;left:50%;top:-3px;bottom:-3px;width:1px;background:#2b1d14}} .now{{position:absolute;top:-2px;width:2px;height:15px;background:#2b1d14;opacity:.45}}
.v{{text-align:right;font-variant-numeric:tabular-nums;font-size:12px}} .lg{{display:inline-block;width:12px;height:10px;margin:0 4px 0 12px;border-radius:2px}}
.box{{margin-top:12px;padding:8px 12px;background:#fff8ea;border:1px solid #e4d3b4;border-radius:8px}}</style></head><body>
<h1>Cân bằng từng VieAni (thử nhanh 19/11/2026)</h1>
<div class="sub">Tỉ lệ thắng của đội có VieAni đó, trong các đội ngẫu nhiên cùng bậc (5 con, ★2, tắt tộc hệ). 50% = trung bình của bậc. Thanh màu = theo bảng kỹ năng T11 (chỉ phần sát thương); vạch xám = game hiện tại. Sai số ±5%. {legend}</div>
<div class="grid">{cols}</div>
<div class="box">Giữa các bậc (4 con ngẫu nhiên mỗi bên): {ladder}. Bậc 5 phải thắng bậc 4 – hiện thua.</div>
</body></html>"""
out = ROOT / "docs/balance/unit_chart.html"
out.write_text(html, encoding="utf-8")
js = f"""const {{ chromium }} = require('playwright'); (async () => {{ const b = await chromium.launch(); const p = await b.newPage({{ viewport: {{ width: 1544, height: 800 }}, deviceScaleFactor: 2 }});
await p.goto('file://{out}'); await p.screenshot({{ path: '{out.with_suffix(".png")}', fullPage: true }}); await b.close(); }})();"""
subprocess.run(["node", "-e", js], check=True)
print("wrote", out, out.with_suffix(".png"))
