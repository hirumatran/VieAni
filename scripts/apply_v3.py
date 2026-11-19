"""v3 data texts (PO 19 Nov 2026): no types, 5 stats (Giáp = % less damage), 4 weak tộc hệ buffed.

    python3 scripts/apply_v3.py      -> rewrites tộc hệ tiers in data/synergies.json, item effects in data/items.json and
                                        type-based Thiên địch texts in data/relations.json (idempotent)
The battle rules for the same numbers are in game/src/core/battle.ts and game/src/core/items.ts.
NB: scripts/design_v2.py / apply_v2.py hold the older v2 texts – do not re-run them without porting these changes.
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SYN = {
    "Sơn Tinh": {"2": "Giảm 50% sát thương nhận từ VieAni Biển Đông và Sông Nước (nước dâng)",
                 "3": "Miễn nhiễm sát thương từ VieAni Biển Đông và Sông Nước; mỗi đòn của chúng nhắm vào thành viên cho +2 Giáp (núi cao thêm)"},
    "Hộ Quốc": {"2": "Cả đội +5 Giáp", "4": "Cả đội +10 Giáp; đồng đội tụt dưới 30% máu nhận khiên bằng 20% máu tối đa (1 lần)",
                "6": "Cả đội +15 Giáp; khi đồng đội đầu tiên bị hạ, cả đội hồi 15% máu ('giữ nước')"},
    "Cao Nguyên Bắc Bộ": {"2": "+5 Giáp; sương núi: +15% né đòn tầm xa", "4": "+10 Giáp; +25% né đòn tầm xa",
                          "6": "+15 Giáp; mỗi 10 giây sương mù phủ sân 3 giây: kẻ địch đánh xa thêm 25% trượt"},
    "Biển Đông": {"2": "+5 Giáp", "4": "+10 Giáp; +15% Tấn Công", "6": "+15 Giáp; +30% Tấn Công; mỗi 8 giây sóng biển đẩy lùi hàng đầu địch 1 ô"},
    "Sông Nước": {"3": "Thành viên hồi 2% máu mỗi giây", "6": "Cả đội hồi 3% máu mỗi giây",
                  "9": "Cả đội hồi 4% máu mỗi giây; mưa dầm: kẻ địch −15% Tốc Độ Đánh"},
    "Côn Trùng": {"3": "Côn trùng +15% Tốc Độ Đánh", "6": "+25% Tốc Độ Đánh và 15% né đòn", "9": "Sức sống: Côn trùng bị hạ có 30% hồi sinh với 30% máu"},
    "Bầy Chó Dữ": {"4": "25% gây Dại 4 giây; Trung thành: khi một đồng đội bị hạ, mọi Chó +25% Tấn Công và Tốc Độ Đánh đến hết trận"},
    "Hội Nhà Mèo": {"2": "Liếm lông: mỗi 4 giây mỗi Mèo hồi 8% máu cho Mèo gần nhất; cả hai +15% Tốc Độ Đánh 3 giây",
                    "3": "Hồi 12% máu, +30% Tốc Độ Đánh; Chín mạng: Mèo đầu tiên bị hạ hồi sinh với 20% máu"},
    "Bầy Gặm Nhấm": {"2": "Gặm nhấm: mỗi đòn −2 Giáp của mục tiêu (cộng dồn 10 lần)",
                     "3": "Cộng dồn 15 lần; Sinh sôi: thành viên đầu tiên bị hạ để lại 2 con non (20% chỉ số)"},
    "Săn Côn Trùng": {"2": "+10% Tấn Công; +25% sát thương lên VieAni Côn Trùng",
                      "4": "+15% Tấn Công; +50% sát thương lên Côn Trùng; hồi 10% máu mỗi khi hạ một Côn Trùng",
                      "6": "+20% Tấn Công; cả đội +25% sát thương lên Côn Trùng; Côn Trùng phe địch −20% né đòn"},
    "Gia Súc": {"2": "+10% Máu và +4 Giáp", "4": "+20% Máu và +8 Giáp; miễn nhiễm Dại", "6": "+30% Máu và +12 Giáp; Được mùa: +1 vàng mỗi vòng thắng"},
}
ITEMS = {
    2: "+25% sát thương lên VieAni Côn Trùng và Bầy Gặm Nhấm (sâu bọ, chuột phá lúa)",
    4: "+10 Giáp",
    5: "+5 Giáp; giảm 15% sát thương từ VieAni Biển Đông và Sông Nước (che nắng che mưa)",
    6: "Giảm 30% sát thương từ VieAni Biển Đông và Sông Nước",
    8: "+8 Giáp. Đi cặp với Bánh Chưng",
    13: "+15% Tốc Độ Đánh; không thể bị cướp hay đòi vật phẩm (Bờm không đổi quạt)",
    14: "+20 Tấn Công; đòn đánh bỏ qua 10 Giáp",
    16: "Ném xích vào 1 kẻ địch: −25% Tấn Công, −40% Tốc Độ Đánh trong 4 giây",
    18: "Trói 1 VieAni Biển Đông / Sông Nước 3 giây (VieAni khác 1 giây)",
    19: "Úp 1 VieAni Biển Đông / Sông Nước bậc 1–2: nhốt 4 giây",
    25: "Cả đội +15% Tấn Công và +15% Tốc Độ Đánh. Có Chim Lạc: hiệu ứng ×2",
    29: "Cắm cọc vào 2 ô: VieAni Biển Đông / Sông Nước phe địch đi qua bị trói 2 giây và mất 15% máu",
    37: "Cả đội +10% Tốc Độ Đánh; mỗi 10 giây hồi 5% máu cho cả đội",
    42: "+20 Giáp; đứng cạnh Voi thì +20% Tấn Công",
    43: "+25% Tốc Độ Đánh; miễn nhiễm làm chậm",
    45: "Mỗi đòn đánh có 20% gọi sét: thêm sát thương lên mục tiêu và 1 kẻ địch kề bên",
    47: "Mọi đồng đội đánh xa bắn trúng 2 mục tiêu; cả đội +10 Giáp",
}
REL = {"VieAni hệ Côn trùng": "VieAni Côn Trùng", "hệ Côn trùng": "VieAni Côn Trùng", "VieAni VieAni": "VieAni"}


def main():
    p = ROOT / "data/synergies.json"; d = json.loads(p.read_text(encoding="utf-8"))
    for g in d["synergies"]:
        for k, v in SYN.get(g["name"], {}).items():
            assert k in g["tiers"], (g["name"], k)
            g["tiers"][k] = v
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    p = ROOT / "data/items.json"; d = json.loads(p.read_text(encoding="utf-8"))
    for it in d["items"]:
        if it["id"] in ITEMS: it["effect"] = ITEMS[it["id"]]
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    p = ROOT / "data/relations.json"; d = json.loads(p.read_text(encoding="utf-8"))
    for r in d["relations"]:
        for a, b in REL.items(): r["effect"] = r["effect"].replace(a, b)
    p.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
    print("v3 texts applied:", len(SYN), "tộc hệ,", len(ITEMS), "items")


if __name__ == "__main__":
    main()
