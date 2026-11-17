"""Tộc hệ balance chart from docs/balance/synergy_balance.json (made by `npm run balance` in game/).

    python3 scripts/synergy_chart.py   -> docs/balance/synergy_chart.html (+ .png via Playwright)
"""
import base64, json, pathlib, subprocess

ROOT = pathlib.Path(__file__).resolve().parent.parent
R = json.loads((ROOT / "docs/balance/synergy_balance.json").read_text(encoding="utf-8"))
IDX = json.loads((ROOT / "assets/icons/synergies/index.json").read_text(encoding="utf-8"))
names, M = R["names"], R["matrix"]
order = sorted(range(len(names)), key=lambda i: -R["overall"][i])
icon = lambda n: "data:image/svg+xml;base64," + base64.b64encode((ROOT / f"assets/icons/synergies/{IDX[n]['icon']}.svg").read_bytes()).decode()


def colour(w):  # red (loses) – cream (even) – green (wins)
    if w != w: return "#333"
    a = abs(w - 0.5) * 2
    if w >= 0.5: r, g, b = 246 - 190 * a, 238 - 80 * a, 214 - 140 * a
    else: r, g, b = 246 - 20 * a, 238 - 170 * a, 214 - 150 * a
    return f"rgb({r:.0f},{g:.0f},{b:.0f})"


head = "".join(f'<th class="col"><img src="{icon(names[j])}"><div>{names[j]}</div></th>' for j in order)
rows = ""
for i in order:
    cells = "".join(f'<td style="background:{colour(M[i][j])}">{"–" if i == j else round(M[i][j] * 100)}</td>' for j in order)
    on, off, o, t = R["uplift"][i], R["baseline"][i], R["overall"][i], R["avgTier"][i]
    up = on - off
    rows += (f'<tr><th class="row"><img src="{icon(names[i])}"><span>{names[i]} <small>({R["tierReached"][i]})</small></span></th>{cells}'
             f'<td class="sum" style="background:{colour(o)}">{round(o * 100)}%</td>'
             f'<td class="tm">{round(off * 100)}% → {round(on * 100)}%</td>'
             f'<td class="bar"><div style="width:{max(0, up) * 150:.0f}%"></div><span>+{round(up * 100)}</span></td><td class="tier">{t:.1f}</td></tr>')
html = f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Tộc hệ – bảng tương khắc</title>
<style>
body{{margin:0;background:#1b120c;color:#fbe9c4;font-family:"Be Vietnam Pro",system-ui,sans-serif;padding:22px}}
h1{{margin:0 0 4px;font-size:24px;color:#ffe6a3}} p{{margin:2px 0;font-size:12.5px;color:#cdbb98;max-width:1500px}}
table{{border-collapse:collapse;margin-top:12px}} td,th{{border:1px solid #2b1d14}}
td{{width:46px;height:34px;text-align:center;font-weight:700;font-size:13px;color:#1b120c}}
th.col{{width:46px;vertical-align:bottom;padding:4px 0}} th.col img{{width:34px}} th.col div{{writing-mode:vertical-rl;transform:rotate(180deg);font-size:11.5px;margin:4px auto 0;white-space:nowrap;color:#fbe9c4}}
th.row{{text-align:left;white-space:nowrap;padding:0 8px 0 2px;font-size:13px}} th.row img{{width:28px;vertical-align:middle;margin-right:6px}} small{{color:#cdbb98}}
td.sum{{width:62px}} td.bar{{width:150px;position:relative;background:#2b1d14;text-align:left}} td.bar div{{height:22px;background:#e7c05f;opacity:.85}}
td.bar span{{position:absolute;left:8px;top:8px;color:#fff3d6;font-size:12.5px;text-shadow:0 1px 2px #000}} td.tm{{width:96px;color:#fbe9c4;background:#2b1d14;font-size:12px}} td.tier{{width:58px;color:#fbe9c4;background:#2b1d14}}
th.h{{font-size:11.5px;color:#ffe6a3;padding:4px;width:auto}}
</style></head><body>
<h1>Tộc hệ – bảng tương khắc (tỉ lệ thắng, %)</h1>
<p>Ô = tỉ lệ thắng của tộc hệ ở <b>hàng</b> trước tộc hệ ở <b>cột</b>. Mỗi đội: 8 VieAni ★2 gồm thành viên của tộc hệ đó (bổ sung VieAni bậc 1–3 ngẫu nhiên nếu thiếu), chỉ tộc hệ đó được kích hoạt; số trong ngoặc = mốc đạt được với 8 VieAni.
{R["battlesPerCell"]} trận mỗi cặp, đổi bên luân phiên; hết 45 giây thì bên còn nhiều % máu hơn thắng (tỉ lệ hòa trước khi phân xử: {R.get("drawRate", 0) * 100:.0f}%). Ngày {R["date"]}.</p>
<p><b>Gặp đội cùng bậc</b> = tỉ lệ thắng trước đội ngẫu nhiên có <i>đúng cùng bậc VieAni</i> nhưng không có tộc hệ, khi <b>tắt → bật</b> tộc hệ.
<b>Đóng góp</b> = chênh lệch (điểm %) – sức mạnh của riêng tộc hệ, đã loại ảnh hưởng của bậc VieAni. <b>Bậc TB</b> = bậc trung bình của VieAni trong đội: cột "Tổng" phụ thuộc nhiều vào bậc (VieAni bậc cao mạnh hơn).</p>
<table><tr><th></th>{head}<th class="h">Tổng</th><th class="h">Gặp đội cùng bậc<br>tắt → bật</th><th class="h">Đóng góp<br>(điểm %)</th><th class="h">Bậc TB</th></tr>{rows}</table>
</body></html>'''
out = ROOT / "docs/balance/synergy_chart.html"
out.write_text(html, encoding="utf-8")
js = f'''const {{ chromium }} = require('playwright'); (async () => {{ const b = await chromium.launch(); const p = await b.newPage({{ viewport: {{ width: 1500, height: 900 }}, deviceScaleFactor: 2 }});
await p.goto('file://{out}'); await p.waitForTimeout(500); await p.screenshot({{ path: '{out.with_suffix(".png")}', fullPage: true }}); await b.close(); }})();'''
subprocess.run(["node", "-e", js], check=True)
print("wrote", out, out.with_suffix(".png"))
