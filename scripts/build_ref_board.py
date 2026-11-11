"""Build the printable sketch board: reference photo + blank 64x64 grid per Vinmon.

    python3 scripts/fetch_refs.py                 # first, downloads photos into refs/
    python3 scripts/build_ref_board.py OUT_DIR    # -> Vindex_bang_ve_tham_khao.pdf + overview PNG

A4 landscape, 150 dpi. Page 1: overview of all Vinmon. Then 6 Vinmon per page
(photo, empty 64x64 grid with 8px guides, name, types, tier, key features,
current draft sprite). Last pages: photo credits (required by the CC licenses).
"""
import json, pathlib, sys, textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
W, H = 1754, 1240  # A4 landscape @150 dpi
F = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
FB = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
font = lambda size, bold=False: ImageFont.truetype(FB if bold else F, size)
TV = {"Legendary": "Huyền thoại", "Fire": "Lửa", "Water": "Nước", "Electric": "Điện", "Grass": "Cỏ",
      "Ground": "Đất", "Rock": "Đá", "Sky": "Trời", "Insect": "Côn trùng", "Poison": "Độc"}
INK, MUTED, LINE, RED = (43, 29, 20), (122, 102, 86), (220, 208, 190), (140, 28, 19)


def load():
    L = lambda n: json.loads((ROOT / "data" / n).read_text(encoding="utf-8"))
    d, vn = L("vindex.json"), L("vn_info.json")
    cred = L("ref_credits.json") if (ROOT / "data/ref_credits.json").exists() else {}
    return sorted(d["species"], key=lambda s: s["dex"]), vn, cred


def photo(s, box):
    p = ROOT / "refs" / f"{s['id']:03d}.jpg"
    if not p.exists():
        return None
    im = Image.open(p).convert("RGB")
    im.thumbnail(box)
    return im


def sprite(s, size):
    for p in (ROOT / f"assets/sprites/custom/{s['id']:02d}.png", ROOT / f"assets/sprites/{s['id']:02d}.png"):
        if p.exists():
            return Image.open(p).convert("RGBA").resize((size, size), Image.NEAREST)
    return None


def header(d, title, page):
    d.rectangle((0, 0, W, 70), fill=RED)
    d.text((40, 18), title, font=font(30, True), fill=(251, 233, 196))
    d.text((W - 220, 26), f"Trang {page}", font=font(20), fill=(251, 233, 196))


def overview(sp, cred, page):
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    header(d, "Vindex – bảng tham khảo 108 Vinmon", page)
    cw, ch = (W - 40) // 12, (H - 90) // 9
    for i, s in enumerate(sp):
        x, y = 20 + (i % 12) * cw, 85 + (i // 12) * ch
        ph = photo(s, (cw - 10, ch - 34)) or sprite(s, min(cw, ch) - 40)
        if ph:
            im.paste(ph, (x + (cw - ph.width) // 2, y), ph if ph.mode == "RGBA" else None)
        d.text((x + 4, y + ch - 30), f"V{s['dex']:03d} {s['vi'][:17]}", font=font(13, True), fill=INK)
    return im


def grid(d, x, y, n=64, cell=4):
    for i in range(n + 1):
        c = (190, 180, 165) if i % 8 == 0 else (236, 230, 220)
        d.line((x + i * cell, y, x + i * cell, y + n * cell), fill=c)
        d.line((x, y + i * cell, x + n * cell, y + i * cell), fill=c)


def detail_page(chunk, vn, page):
    im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
    header(d, "Vindex – vẽ phác thảo 64×64 (nhìn nghiêng 3/4, quay sang trái)", page)
    cw, ch = (W - 60) // 3, (H - 100) // 2
    for i, s in enumerate(chunk):
        x, y = 30 + (i % 3) * cw, 90 + (i // 3) * ch
        d.rounded_rectangle((x, y, x + cw - 20, y + ch - 20), 14, outline=LINE, width=2)
        ph = photo(s, (270, 270))
        if ph:
            im.paste(ph, (x + 12 + (270 - ph.width) // 2, y + 12 + (270 - ph.height) // 2))
        else:
            d.rectangle((x + 12, y + 12, x + 282, y + 282), outline=LINE)
            d.text((x + 40, y + 130), "Chưa có ảnh –\nxem tranh/tượng\ntham khảo", font=font(18), fill=MUTED)
        grid(d, x + 292, y + 12)
        sp = sprite(s, 64)
        if sp:
            im.paste(sp, (x + cw - 100, y + 290), sp)
        ty = y + 290
        d.text((x + 14, ty), f"V{s['dex']:03d}  {s['vi']}", font=font(22, True), fill=INK)
        d.text((x + 14, ty + 30), f"{s['en']}  ·  {s.get('sci') or ''}"[:58], font=font(14), fill=MUTED)
        d.text((x + 14, ty + 52), "Hệ: " + " / ".join(TV[t] for t in s["types"]) + f"   ·   Bậc {s['tier']}",
               font=font(15, True), fill=INK)
        note = (vn["species"].get(str(s["id"]), {}).get("note") or s.get("note") or "")
        for k, line in enumerate(textwrap.wrap("Đặc điểm: " + note, 60)[:5]):
            d.text((x + 14, ty + 78 + k * 20), line, font=font(14), fill=INK)
        d.text((x + cw - 108, ty + 70), "sprite nháp", font=font(11), fill=MUTED)
    return im


def credit_pages(sp, cred, start):
    lines = []
    for s in sp:
        c = cred.get(str(s["id"]))
        if c:
            lines.append(f"V{s['dex']:03d} {s['vi']}: {c.get('author') or 'không rõ tác giả'} – {c.get('license')} – "
                         f"{c.get('source')} – {c.get('page')}")
        else:
            lines.append(f"V{s['dex']:03d} {s['vi']}: (không có ảnh)")
    pages, per = [], 46
    for p in range(0, len(lines), per):
        im = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(im)
        header(d, "Nguồn ảnh (giấy phép Creative Commons / phạm vi công cộng)", start + len(pages))
        d.text((40, 82), "Ảnh chỉ dùng để tham khảo khi vẽ. Hãy tự vẽ sprite, không đồ lại nguyên ảnh nếu dùng cho sản phẩm thương mại.",
               font=font(15), fill=MUTED)
        for k, line in enumerate(lines[p:p + per]):
            d.text((40, 112 + k * 24), line[:150], font=font(13), fill=INK)
        pages.append(im)
    return pages


def main(out):
    out = pathlib.Path(out); out.mkdir(parents=True, exist_ok=True)
    sp, vn, cred = load()
    pages = [overview(sp, cred, 1)]
    for i in range(0, len(sp), 6):
        pages.append(detail_page(sp[i:i + 6], vn, len(pages) + 1))
    pages += credit_pages(sp, cred, len(pages) + 1)
    pdf = out / "Vindex_bang_ve_tham_khao.pdf"
    pages[0].save(pdf, save_all=True, append_images=pages[1:], resolution=150)
    pages[0].save(out / "Vindex_tong_quan.png")
    print("pages:", len(pages), "photos:", len(cred), "->", pdf)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "build/board")
