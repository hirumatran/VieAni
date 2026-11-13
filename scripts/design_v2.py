"""VieAni roster design v2 (PO review 13 Nov 2026).

Source of truth for: which VieAni stay / wait for a later update / are removed, tactical role,
attack range, the 12 synergies (Tộc hệ), skills (active / passive / ★3) and the 3 Linh Vật charms.
Keys are the sheet V-numbers of 11 Nov (= `dex` in data/vieindex.json).

Skill text format (PO request): Tên · Hiệu ứng · Thời gian · Sát thương · Hồi chiêu.
Numbers are written ★1 / ★2 / ★3. Damage budget per tier (one target, ★1/★2/★3):
  T1 150/250/400 · T2 200/325/525 · T3 250/400/650 · T4 325/525/850 · T5 400/650/1050
Area skills use ~60% of that. Cooldown = energy needed; the seconds shown are an estimate from the
unit's attack speed (+10 energy per attack, about +2.5 per second from being hit).
"""

KEEP, LATER, REMOVED = "Giữ", "Đưa vào update sau", "Xoá"
LATER_IDS = [9, 10, 30, 45, 46, 47, 48, 53, 54, 57, 64, 98, 99, 100, 107]
REMOVED_IDS = [22, 36, 37, 71, 72, 74]

# PO renames (sheet column C). Cá Nược = documented Vietnamese name of the Irrawaddy dolphin.
RENAME = {1: "Báo Gấm", 2: "Bò Biển (Cá Nàng Tiên)", 3: "Bò Xám", 4: "Cá Nược (Cá Heo Sông)",
          6: "Cá Sấu Nước Ngọt", 7: "Cá Tra Dầu"}
# zodiac additions: Khỉ Vàng waits for a later update, so Chà vá chân xám carries Thân (khỉ)
ZODIAC_ADD = {11: "Thân"}

ROLES = ["Đỡ Đòn", "Chiến Đấu", "Săn Mồi", "Phép Thuật", "Hỗ Trợ"]
ROLE_NOTE = {
    "Đỡ Đòn": "Hàng đầu, máu/giáp dày, giữ chân và hút sát thương",
    "Chiến Đấu": "Hàng đầu/giữa, vừa đánh vừa chịu đòn",
    "Săn Mồi": "Lao vào hàng sau, sát thương lớn, chí mạng",
    "Phép Thuật": "Hàng sau, kỹ năng diện rộng, sát thương ĐB",
    "Hỗ Trợ": "Hàng sau/giữa, buff đồng đội, hồi máu, khống chế",
}

# ---------------------------------------------------------------- 12 synergies
SYN = {
    "Tứ Linh": dict(t=[2, 4], eff=["(2) Thành viên Tứ Linh +15% mọi chỉ số",
                                   "(4) Cả đội +15% mọi chỉ số; Tứ Linh miễn khống chế 4 giây đầu trận"],
                    basis="Tứ Linh: Long – Lân – Quy – Phụng, bốn linh vật trong văn hóa Việt"),
    "Sơn Tinh": dict(t=[2, 3], eff=["(2) Giảm 50% sát thương nhận từ đòn hệ Nước",
                                    "(3) Miễn nhiễm sát thương hệ Nước; mỗi đòn Nước nhắm vào thành viên cho +5 Phòng thủ (cộng dồn)"],
                     basis="Ba lễ vật voi chín ngà, gà chín cựa, ngựa chín hồng mao giúp Sơn Tinh cưới Mỵ Nương; nước dâng bao nhiêu, núi cao bấy nhiêu"),
    "Hộ Quốc": dict(t=[2, 4, 6], eff=["(2) Cả đội +15 Phòng thủ và Phòng thủ ĐB",
                                      "(4) +30; đồng đội tụt dưới 30% máu nhận khiên bằng 20% máu tối đa (1 lần)",
                                      "(6) +45; khi đồng đội đầu tiên bị hạ, cả đội hồi 15% máu ('giữ nước')"],
                    basis="Linh vật và chiến mã giữ nước: Cá Ông cứu ngư dân, Nghê canh đình, Ngựa sắt Thánh Gióng, Kim Quy giúp Cổ Loa, voi chiến Bà Triệu, chim Lạc trên trống đồng"),
    "Săn Mồi": dict(t=[2, 4, 6], eff=["(2) +15% tỉ lệ chí mạng",
                                      "(4) +30% chí mạng; chí mạng gây ×1,75 sát thương",
                                      "(6) +45% chí mạng; chí mạng ×2; hạ một kẻ địch thì hồi 15% máu"],
                    basis="Thú và bò sát săn mồi của rừng, sông, trời"),
    "Cự Thú": dict(t=[2, 4, 6], eff=["(2) +15% Máu tối đa",
                                     "(4) +30% Máu; miễn Choáng và Đẩy lùi",
                                     "(6) +45% Máu; đầu trận khiêu khích kẻ địch trong 2 ô trong 3 giây"],
                   basis="Những loài thú khổng lồ – voi, tê giác, bò rừng, vượn khổng lồ, cá tra dầu"),
    "Cao Nguyên Bắc Bộ": dict(t=[2, 4, 6], eff=["(2) +15 Phòng thủ ĐB; sương núi: +15% né đòn tầm xa",
                                               "(4) +30 Phòng thủ ĐB; +25% né đòn tầm xa; miễn bị làm chậm",
                                               "(6) +45 Phòng thủ ĐB; mỗi 10 giây sương mù phủ sân 3 giây: kẻ địch đánh xa −25% chính xác"],
                              basis="Núi đá vôi và rừng núi phía Bắc (Hà Giang, Lạng Sơn, Cúc Phương, Pù Mát) – vượn, cầy, sóc, dê núi, chó H'Mông; hóa thạch vượn khổng lồ ở hang Lạng Sơn"),
    "Trường Sơn": dict(t=[2, 4, 6], eff=["(2) Ẩn mình 2 giây đầu trận; +10% né đòn",
                                         "(4) Ẩn mình 3 giây; +20% né đòn",
                                         "(6) Ẩn mình 4 giây; +30% né đòn; đòn đầu tiên sau khi hiện hình chí mạng"],
                       basis="Dãy Trường Sơn – nơi khoa học phát hiện sao la (1992), mang lớn (1994), thỏ vằn; gà lôi lam mào trắng đã mất ngoài tự nhiên"),
    "Tây Nguyên": dict(t=[2, 4, 6], eff=["(2) +10% tốc độ đánh",
                                         "(4) +20% tốc độ đánh; tiếng cồng chiêng: mỗi 8 giây cả đội hồi 4% máu",
                                         "(6) +30% tốc độ đánh; đầu trận thành viên +30% tốc độ di chuyển trong 4 giây"],
                       basis="Rừng khộp và đại ngàn Tây Nguyên (Kon Ka Kinh, Yok Đôn, Cát Tiên) – chà vá chân xám, công, hồng hoàng, tê tê, bò xám, tê giác, sói đỏ"),
    "Biển Đông": dict(t=[2, 4, 6], eff=["(2) +15 Phòng thủ ĐB",
                                        "(4) +30 Phòng thủ ĐB; đòn hệ Nước +15% sát thương",
                                        "(6) +45 Phòng thủ ĐB; đòn hệ Nước +30%; mỗi 8 giây sóng biển đẩy lùi hàng đầu địch 1 ô"],
                      basis="Loài và linh vật của biển Việt Nam"),
    "Sông Nước": dict(t=[3, 6, 9], eff=["(3) Thành viên hồi 1% máu mỗi giây",
                                        "(6) Cả đội hồi 1,5% máu mỗi giây",
                                        "(9) Cả đội hồi 2% máu mỗi giây; mưa dầm: kẻ địch −15% Tốc độ"],
                      basis="Sông Mê Kông, đồng ruộng, đầm lầy, ao làng – nơi cá, cò, sếu, vịt, cua, ốc sinh sống"),
    "Côn Trùng": dict(t=[3, 6, 9], eff=["(3) Côn trùng +15% Tốc độ",
                                        "(6) +25% Tốc độ và 15% né đòn",
                                        "(9) Sức sống: Côn trùng bị hạ có 30% hồi sinh với 30% máu"],
                      basis="Côn trùng nhỏ, nhanh và cực kỳ đông đúc"),
    "Bầy Chó Dữ": dict(t=[2, 4], eff=["(2) Đòn đánh của Chó có 15% gây Dại 3 giây (mục tiêu tấn công đồng đội của nó)",
                                        "(4) 25% gây Dại 4 giây; Trung thành: khi một đồng đội bị hạ, mọi Chó +25% Tấn công và Tốc độ đến hết trận"],
                       basis="Ý tưởng của PO: bệnh dại lây qua vết cắn của chó. Ngoài đời hãy tiêm phòng dại cho chó mèo"),
    "Hội Nhà Mèo": dict(t=[2, 3], eff=["(2) Liếm lông: mỗi 4 giây mỗi Mèo hồi 5% máu cho Mèo gần nhất; cả hai +15% tốc độ đánh 3 giây",
                                       "(3) Hồi 8% máu, +30% tốc độ đánh; Chín mạng: Mèo đầu tiên bị hạ hồi sinh với 20% máu"],
                        basis="Ý tưởng của PO: mèo liếm lông cho nhau để gắn kết; dân gian nói mèo có chín mạng"),
    "Bầy Gặm Nhấm": dict(t=[2, 3], eff=["(2) Gặm nhấm: mỗi đòn −3 Phòng thủ của mục tiêu (cộng dồn 10 lần)",
                                        "(3) Cộng dồn 15 lần; Sinh sôi: thành viên đầu tiên bị hạ để lại 2 con non (20% chỉ số)"],
                         basis="Chuột và sóc – bộ Gặm nhấm, răng cửa mọc suốt đời, sinh sản nhanh"),
    "Săn Côn Trùng": dict(t=[2, 4, 6], eff=["(2) +25% sát thương lên hệ Côn trùng",
                                            "(4) +50% sát thương lên Côn trùng; hồi 10% máu mỗi khi hạ một Côn trùng",
                                            "(6) Cả đội +25% sát thương lên Côn trùng; Côn trùng phe địch −20% né đòn"],
                          basis="Thạch sùng, thằn lằn, tắc kè, cóc, sáo sậu, chim sẻ – bắt sâu bọ quanh nhà và ngoài đồng"),
    "Gia Súc": dict(t=[2, 4, 6], eff=["(2) +10% Máu và +10 Phòng thủ",
                                      "(4) +20% Máu và +20 Phòng thủ; miễn nhiễm Dại",
                                      "(6) +30% Máu và +30 Phòng thủ; Được mùa: +1 vàng mỗi vòng thắng"],
                    basis="Trâu, heo, dê, ngựa, gà, vịt – vật nuôi của nhà nông"),
    "Mười Hai Con Giáp": dict(t=[3, 6, 9, 12], eff=["(3) 3 con giáp khác nhau: các con giáp +5% mọi chỉ số",
                                                    "(6) 6 con giáp: +10% mọi chỉ số",
                                                    "(9) 9 con giáp: +15% mọi chỉ số; con giáp miễn Dại",
                                                    "(12) Đủ 12 con giáp (chỉ đạt được nhờ Ấn Thống Nhất – xem vật phẩm Linh Vật): cả đội +25% mọi chỉ số; con giáp đầu tiên bị hạ hồi sinh với 50% máu"],
                              basis="12 con giáp Việt Nam: Tý, Sửu, Dần, Mão (mèo), Thìn, Tỵ, Ngọ, Mùi, Thân, Dậu, Tuất, Hợi. Tính theo cột Con giáp; cấp tối đa là 10 nên cần 3 Linh Vật + Rồng Lạc Việt để có thêm 2 con giáp còn thiếu"),
}

# --------------------------------------------------------------- per VieAni
# dex: (role, range, [synergy1, synergy2], active, passive, star3)
# active = (name, effect, time, damage, cooldown_seconds)  – damage may be a "D:tier:mult" token
U = {}


def u(dex, role, rng, syn, active, passive, star3):
    U[dex] = dict(role=role, range=rng, syn=syn, active=active, passive=passive, star3=star3)


# ---- Tier 3 – 5 (endangered, lost, legendary)
u(1, "Săn Mồi", 1, ["Săn Mồi", "Trường Sơn"],
  ("Vồ Từ Tán Cây", "Nhảy lên cây rồi vồ xuống kẻ địch có máu thấp nhất trên sân", "Tức thời", "D:3:1.2", 9),
  "Vồ từ trên cây: đòn đầu tiên nhắm kẻ địch có máu thấp nhất; +15% / 20% / 25% tỉ lệ chí mạng",
  "Da Báo: ẩn mình vào cảnh vật – không thể bị đòn tầm xa nhắm vào trong 4 giây đầu trận và 2 giây sau mỗi lần dùng kỹ năng")
u(2, "Phép Thuật", 3, ["Biển Đông"],
  ("Tiếng Hát Cá Nàng Tiên", "Mê hoặc kẻ địch trong 2 ô quanh mục tiêu: không thể tấn công Bò Biển và đồng đội kề bên", "3 / 4 / 5 giây", "D:3:0.5 (diện rộng)", 12),
  "Gặm Cỏ Biển: hồi 2% / 2,5% / 3% máu mỗi giây khi không bị đánh trong 2 giây",
  "Thảm Cỏ Biển: tiếng hát hồi cho đồng đội trong vùng 15% máu tối đa của họ")
u(3, "Đỡ Đòn", 1, ["Cự Thú", "Tây Nguyên"],
  ("Húc Sừng Cong", "Lao tới húc mục tiêu và hất văng 1 ô, gây Choáng", "Choáng 1 / 1,5 / 2 giây", "D:4:1", 10),
  "Sừng Cong: phản 15% / 20% / 25% sát thương cận chiến nhận vào",
  "Tăng Trọng: mỗi đồng đội ngã xuống trong bán kính 1 ô cho Bò Xám +10% Máu tối đa và +5% Phòng thủ (cộng dồn)")
u(4, "Hỗ Trợ", 3, ["Biển Đông", "Sông Nước"],
  ("Sóng Âm Định Vị", "Phát sóng âm xuyên một hàng: kẻ địch trúng bị −20% / 25% / 30% Phòng thủ ĐB; đồng đội trên hàng được +15% Tấn công ĐB", "4 / 5 / 6 giây", "D:3:0.6 (cả hàng)", 9),
  "Định Vị: đòn đánh thường bằng sóng âm giảm 20% Phòng thủ ĐB của mục tiêu trong 3 giây (không cộng dồn)",
  "Cá Nược Dẫn Đường: đầu trận đồng đội hệ Nước +20% Tốc độ trong 6 giây")
u(5, "Hỗ Trợ", 3, ["Hộ Quốc", "Biển Đông"],
  ("Nam Hải Cứu Nạn", "Che chắn đồng đội máu thấp nhất trong 2 ô: tạo khiên và hồi máu", "Khiên 4 giây", "Khiên 300 / 500 / 800; hồi 20% / 25% / 30% máu", 10),
  "Ông Nam Hải: đồng đội hệ Nước +12% Phòng thủ và Phòng thủ ĐB; đòn hệ Nước của kẻ địch −12% sát thương",
  "Linh Ngư Phù Hộ: Nam Hải Cứu Nạn che chắn thêm 1 đồng đội; mỗi đồng đội được cứu 1 lần mỗi trận")
u(6, "Săn Mồi", 1, ["Săn Mồi", "Sông Nước"],
  ("Đớp Mồi", "Cắn chặt và giữ chân mục tiêu (Trói), cắn liên tục trong thời gian giữ", "2 / 2,5 / 3 giây", "D:3:1.1 (chia đều theo thời gian)", 10),
  "Da Cá Sấu: giảm 10% / 15% / 20% sát thương vật lý nhận vào",
  "Ẩn Nấp: lặn trong nước rồi trồi lên sau lưng kẻ địch đánh chậm nhất trong bán kính 3 ô, đớp một đòn chí mạng 125% sát thương")
u(7, "Đỡ Đòn", 1, ["Cự Thú", "Sông Nước"],
  ("Giẫy Giụa", "Quẫy mạnh, lớp da trơn tiết dầu: 1 kẻ địch trúng bị +20% / 30% / 40% trượt đòn vật lý", "5 giây", "D:3:0.6", 10),
  "Khổng Lồ Sông Mê Kông: +10% / 15% / 20% Máu tối đa",
  "Giẫy Giụa Diện Rộng: ảnh hưởng mọi kẻ địch trong bán kính 2 ô thay vì 1 mục tiêu")
u(8, "Hỗ Trợ", 1, ["Cao Nguyên Bắc Bộ"],
  ("Đào Hang Tiếp Tế", "Đào đất tìm mồi: hồi máu cho 2 đồng đội yếu nhất và gỡ 1 hiệu ứng xấu", "Tức thời", "Hồi 150 / 250 / 400 máu", 8),
  "Mùi Xạ Hương: kẻ địch đánh Cầy vằn có 15% / 20% / 25% bị Mù 1 giây",
  "Hang Ổ: Đào Hang Tiếp Tế hồi cho 3 đồng đội và cho họ +15% né đòn 3 giây")
u(11, "Chiến Đấu", 2, ["Tây Nguyên"],
  ("Gầm Rú", "Gầm vang khiến kẻ địch trong bán kính 2 ô hoảng sợ: −10% / 15% / 20% Tấn công", "4 giây", "D:3:0.5 (diện rộng)", 9),
  "Nhảy Cành: 15% / 20% / 25% né đòn cận chiến",
  "Thủ Lĩnh Bầy: Gầm Rú cho đồng đội trong vùng +15% Tốc độ")
u(12, "Hỗ Trợ", 1, ["Trường Sơn"],
  ("Nhanh Như Cheo", "Dẫn dụ kẻ địch có Tấn công cao nhất đánh vào mình (khiêu khích), dùng tốc độ né đòn +50%", "4 / 5 / 6 giây", "—", 10),
  "Nhút Nhát: luôn né đòn đầu tiên nhắm vào mình; 10% / 15% / 20% né đòn",
  "Biến Mất Trong Bụi Rậm: sau khi Nhanh Như Cheo kết thúc, ẩn mình 2 giây và hồi 20% máu")
u(13, "Phép Thuật", 3, ["Hộ Quốc"],
  ("Phong Ba Bão Táp", "Vỗ cánh tạo cuồng phong đẩy lùi toàn bộ kẻ địch 1 / 2 / 3 ô", "Tức thời", "100% Tấn công ĐB của Chim Lạc + D:5:0.6", 12),
  "Hào Khí Lạc Việt: +10% Máu và +3% Tấn công, Phòng thủ, Tốc độ cho mỗi tộc hệ đang kích hoạt trên sân",
  "Hồn Trống Đồng: nếu đội có Trống Đồng Đông Sơn, hiệu ứng trống ×2 và Phong Ba Bão Táp làm Choáng 1 giây")
u(14, "Phép Thuật", 3, ["Sông Nước"],
  ("Mỏ Quắm Xuyên Bùn", "Chọc mỏ dài xuyên giáp: sát thương bỏ qua 30% / 40% / 50% Phòng thủ ĐB", "Tức thời", "D:3:1.1", 8),
  "Mỏ Cong: đòn đánh thường bỏ qua 20% Phòng thủ",
  "Đàn Cò Quắm: kỹ năng nảy sang thêm 2 kẻ địch gần đó (60% sát thương)")
u(15, "Hỗ Trợ", 3, ["Sông Nước"],
  ("Lùa Cá", "Quét mỏ thìa trên mặt nước: đồng đội Sông Nước +15% / 20% / 25% Tấn công, kẻ địch trong vùng −15% Tốc độ", "5 giây", "D:3:0.4 (diện rộng)", 10),
  "Đàn Trú Đông: +10% / 15% / 20% Tốc độ khi đứng cạnh một VieAni hệ Trời",
  "Bãi Bồi Bình Yên: Lùa Cá hồi 10% máu cho đồng đội trong vùng")
u(16, "Hỗ Trợ", 3, ["Tây Nguyên"],
  ("Xòe Đuôi", "Xòe đuôi rực rỡ làm chậm kẻ địch trong bán kính 1 ô 20% / 30% / 40%", "2 / 3 / 4 giây", "D:3:0.4 (diện rộng)", 8),
  "Mắt Công: 15% / 20% / 25% phản kỹ năng gây khống chế về kẻ dùng",
  "Đuôi Công Rộng: bán kính Xòe Đuôi tăng lên 2 ô")
u(17, "Phép Thuật", 3, ["Tây Nguyên"],
  ("Vết Cắn Độc", "Cắn mục tiêu, nọc độc từ tuyến ở khuỷu tay gây Độc 3% / 4% / 5% máu mỗi giây và −30% hồi máu", "4 giây", "D:3:0.8 + Độc", 9),
  "Chậm Mà Chắc: +10% / 15% / 20% Phòng thủ ĐB; miễn bị đẩy lùi",
  "Nọc Lan: Độc lây sang 1 kẻ địch kề bên mục tiêu")
u(18, "Đỡ Đòn", 1, ["Biển Đông"],
  ("Rụt Mai", "Rụt vào mai: giảm 50% / 60% / 70% sát thương nhận vào, khiêu khích kẻ địch kề bên", "3 giây", "—", 10),
  "Bơi Xa: miễn bị làm chậm; +10% / 15% / 20% Tốc độ",
  "Mai Đồi Mồi: khi Rụt Mai kết thúc, phản lại 30% tổng sát thương đã chặn lên kẻ địch kề bên")
u(19, "Chiến Đấu", 1, ["Sơn Tinh"],
  ("Chín Cựa", "Đá liên hoàn 9 cú vào mục tiêu", "1,5 giây", "D:5:1.1 (9 cú)", 10),
  "Cựa Thép: đòn đánh thường +5 / 10 / 15 sát thương sau mỗi đòn lên cùng một kẻ địch (cộng dồn), mất khi đổi mục tiêu",
  "Gà Thần: ×2 sát thương của Chín Cựa và Cựa Thép")
u(20, "Phép Thuật", 3, ["Trường Sơn"],
  ("Lông Lam Ánh Bạc", "Xòe lông lam phản chiếu ánh sáng: Mù kẻ địch trong hình nón 2 ô phía trước", "2 / 2,5 / 3 giây", "D:4:0.7 (diện rộng)", 10),
  "Ẩn Trong Tán Rừng: 15% / 20% / 25% né đòn",
  "Bóng Ma Trường Sơn: khi bị hạ, để lại hồn ma 4 giây tiếp tục dùng kỹ năng 1 lần ('loài đã mất ngoài tự nhiên')")
u(21, "Chiến Đấu", 1, ["Săn Mồi"],
  ("Cào Tổ Ong", "Đứng thẳng dậy cào liên tục vào mục tiêu; hồi máu bằng 30% sát thương gây ra", "2 giây", "D:3:1.2", 9),
  "Lưỡi Dài: hồi 10% / 12% / 15% máu mỗi khi đánh trúng Côn trùng",
  "Ôm Ghì: Cào Tổ Ong Trói mục tiêu trong thời gian cào")
u(23, "Phép Thuật", 3, ["Săn Mồi"],
  ("Biến Hóa Vạn Trạng", "Hóa thành bản sao của VieAni mạnh nhất phe địch (tổng chỉ số cao nhất), giữ nguyên % máu; 1 lần mỗi vòng", "Đến hết trận", "Theo kỹ năng của bản sao", 12),
  "Mê Hoặc: đòn đánh có 10% / 15% / 20% khiến mục tiêu tấn công đồng đội của nó 2 giây",
  "Cửu Vĩ: bản sao giữ thêm 1 kỹ năng bị động của Hồ Tinh và +20% mọi chỉ số")
u(24, "Săn Mồi", 2, ["Tây Nguyên"],
  ("Mổ Mũ Sừng", "Lao xuống mổ bằng mỏ và mũ sừng: Choáng mục tiêu", "0,5 / 0,75 / 1 giây", "D:3:1.1", 8),
  "Cánh Vỗ Ầm: 15% / 20% / 25% đòn đánh gây Choáng 0,5 giây",
  "Mũ Sừng Kép: ×2 thời gian Choáng của cả hai kỹ năng")
u(25, "Săn Mồi", 1, ["Săn Mồi"],
  ("Hổ Vồ", "Phóng tới kẻ địch xa nhất trong 3 ô, vồ và xé", "Tức thời", "D:4:1.3", 9),
  "Chúa Sơn Lâm: kẻ địch trong 2 ô −15% / 20% / 25% Tấn công",
  "Oai Hùm: Chúa Sơn Lâm áp dụng cho toàn bộ kẻ địch trên sân")
u(26, "Hỗ Trợ", 3, ["Tứ Linh", "Hộ Quốc"],
  ("Hoàn Kiếm", "Đòi lại 1 vật phẩm của kẻ địch mạnh nhất và trao cho đồng đội yếu nhất đến hết trận; 1 lần mỗi vòng", "Đến hết trận", "D:5:0.8", 12),
  "Nỏ Thần: đồng đội đánh tầm xa +12% / 16% / 20% sát thương",
  "Móng Rùa Thần: đồng đội đánh tầm xa bắn trúng thêm 1 mục tiêu (50% sát thương)")
u(27, "Chiến Đấu", 1, ["Tứ Linh"],
  ("Múa Lân Trừ Tà", "Múa quanh đồng đội: xóa mọi hiệu ứng xấu và cho miễn khống chế", "2 / 3 / 4 giây", "D:5:0.6 (diện rộng)", 9),
  "Trống Lân: mỗi 8 giây gỡ 1 hiệu ứng xấu khỏi đồng đội kề bên",
  "Lân Vàng: Múa Lân Trừ Tà hồi 15% máu cho cả đội")
u(28, "Chiến Đấu", 1, ["Trường Sơn"],
  ("Húc Gạc Lớn", "Cúi gạc húc mục tiêu, gây thêm 25% sát thương lên hệ Cỏ", "Tức thời", "D:3:1.1", 8),
  "Gạc Lớn Nhất: +10% / 15% / 20% Phòng thủ khi đứng hàng đầu",
  "Gạc Xuyên: Húc Gạc Lớn xuyên qua mục tiêu, trúng thêm kẻ đứng sau")
u(29, "Đỡ Đòn", 1, ["Hộ Quốc"],
  ("Trấn Giữ", "Đứng tấn: gánh 30% / 40% / 50% sát thương thay cho đồng đội kề bên", "5 giây", "—", 10),
  "Thân Đá: +10% / 15% / 20% Phòng thủ và Phòng thủ ĐB",
  "Nghê Canh Đình: khi Trấn Giữ kết thúc, phản 25% sát thương đã gánh lên kẻ địch trong 1 ô")
u(31, "Chiến Đấu", 1, ["Sơn Tinh"],
  ("Phi Nước Đại", "Phi xuyên qua hàng địch đến hàng sau, giẫm mọi kẻ địch trên đường", "Tức thời", "D:5:0.7 (đường thẳng)", 9),
  "Vó Ngựa: +5 / 10 / 15 tốc độ đánh sau mỗi đòn lên cùng một kẻ địch (cộng dồn), mất khi đổi mục tiêu",
  "Chín Hồng Mao: ×2 chỉ số cộng dồn của Vó Ngựa; Phi Nước Đại Choáng 0,5 giây")
u(32, "Chiến Đấu", 1, ["Hộ Quốc"],
  ("Phun Lửa", "Phun lửa đốt cả một hàng kẻ địch, để lại ô 'Làng Cháy' gây Bỏng 3% máu/giây", "4 giây", "D:5:0.7 (cả hàng)", 10),
  "Nhổ Tre Đánh Giặc: khi máu dưới 50% (gươm gãy), đòn đánh quét cả hàng ngang và +1 tầm",
  "Lửa Thiêu Rừng: Phun Lửa đốt toàn bộ nửa sân kẻ địch")
u(33, "Phép Thuật", 3, ["Tứ Linh"],
  ("Lửa Thiêng", "Gọi mưa lửa xuống vùng 2×2 quanh mục tiêu, gây Bỏng", "Bỏng 3 giây", "D:5:0.7 (diện rộng)", 9),
  "Trứng Lửa Tái Sinh: khi bị hạ, hóa trứng lửa 6 giây (máu trứng = 30% máu tối đa, đốt kẻ kề bên). Trứng không bị phá thì nở lại với 100% máu; 1 lần mỗi trận",
  "Phượng Múa: sau khi tái sinh, Lửa Thiêng dùng ngay và +30% Tấn công ĐB đến hết trận")
u(34, "Phép Thuật", 3, ["Sông Nước"],
  ("Mỏ Thìa Vẩy Nước", "Vẩy nước lấp lánh trúng 3 kẻ địch ngẫu nhiên, Mù 1 giây", "1 giây", "D:3:0.5 mỗi mục tiêu", 7),
  "Bé Nhỏ Nhanh Nhẹn: 20% / 25% / 30% né đòn tầm xa",
  "Hiếm Có Khó Tìm: lần đầu bị hạ, sống lại với 30% máu (chỉ còn vài trăm cá thể ngoài tự nhiên)")
u(35, "Phép Thuật", 3, ["Tứ Linh"],
  ("Hô Mưa Gọi Sấm", "Giáng sét xuống 3 kẻ địch máu cao nhất", "Tức thời", "D:5:0.8 mỗi mục tiêu", 9),
  "Thăng Long: lần đầu máu dưới 30%, bay vút lên 2 giây (không thể bị chọn làm mục tiêu) rồi giáng sét ×2",
  "Long Uy: Hô Mưa Gọi Sấm trúng 5 kẻ địch và làm Choáng 0,5 giây")
u(38, "Đỡ Đòn", 1, ["Trường Sơn"],
  ("Sừng Thẳng Phòng Vệ", "Chĩa đôi sừng thẳng chặn đường: khiêu khích kẻ địch trong 1 ô và giảm 30% / 40% / 50% sát thương cận chiến nhận vào", "3 / 4 / 5 giây", "D:3:0.5 (diện rộng)", 10),
  "Kỳ Lân Châu Á: không bị chọn làm mục tiêu trong 3 giây đầu trận",
  "Điềm Lành: khi Sao La còn trên sân, đồng đội Trường Sơn +10% mọi chỉ số")
u(39, "Hỗ Trợ", 3, ["Sông Nước"],
  ("Vũ Điệu Sếu", "Múa giữa đồng: đồng đội +10% / 15% / 20% Tốc độ và hồi 10% máu", "5 giây", "Hồi 10% máu", 10),
  "Bay Cao: là VieAni Bay – né 30% đòn cận chiến của VieAni không phải hệ Trời",
  "Mùa Sếu Về: Vũ Điệu Sếu còn cho +15% Tấn công và gỡ hiệu ứng xấu")
u(40, "Đỡ Đòn", 1, ["Cự Thú", "Tây Nguyên"],
  ("Sừng Tê Giác", "Lao húc mục tiêu: Choáng 1,5 giây, gây chí mạng 150% / 200% / 250%. Nếu mục tiêu còn dưới 25% máu thì hạ gục ngay", "Choáng 1,5 giây", "D:4:1 × chí mạng", 10),
  "Da Giáp: giảm 10% / 15% / 20% sát thương nhận vào từ phía trước",
  "Sừng Bất Khuất: hồi chiêu Sừng Tê Giác giảm còn 7 giây")
u(41, "Đỡ Đòn", 1, ["Tây Nguyên"],
  ("Cuộn Tròn", "Nhảy lên cuộn tròn lăn vào kẻ địch trong bán kính 1 / 2 / 3 ô; +5% Phòng thủ cho mỗi kẻ địch trúng (cộng dồn)", "Tức thời", "D:3:0.6 (diện rộng)", 9),
  "Vảy Sừng: giảm 10% / 15% / 20% sát thương vật lý nhận vào",
  "Kháng Phép: sau khi Cuộn Tròn, miễn nhiễm sát thương ĐB 2 giây")
u(42, "Săn Mồi", 1, ["Trường Sơn"],
  ("Phóng Vằn", "Phóng như tên bắn tới hàng sau, đá hậu mục tiêu rồi nhảy về ô trống gần nhất", "Tức thời", "D:3:1.1", 8),
  "Sọc Ngụy Trang: 15% / 20% / 25% né đòn",
  "Bóng Đêm Trường Sơn: sau Phóng Vằn ẩn mình 2 giây")
u(43, "Đỡ Đòn", 1, ["Cự Thú", "Hộ Quốc"],
  ("Dậm Đất", "Dậm chân làm rung đất: Choáng kẻ địch kề bên", "1 / 1,25 / 1,5 giây", "D:3:0.6 (diện rộng)", 9),
  "Voi Chiến Bà Triệu: khi Voi còn trên sân, cả đội +5% / 8% / 10% Tấn công",
  "Voi Trắng Một Ngà: Dậm Đất lan ra bán kính 2 ô")
u(44, "Đỡ Đòn", 1, ["Sơn Tinh", "Cự Thú"],
  ("Chín Ngà", "Hất chín ngà về phía trước: sát thương lan 3 ô phía trước và Đẩy lùi 1 ô", "Tức thời", "D:5:0.7 (3 ô)", 10),
  "Núi Dâng: mỗi đòn hệ Nước nhận vào cho +5 Phòng thủ (cộng dồn đến hết trận); +5% / 10% / 15% Máu",
  "Sính Lễ Vua Hùng: Chín Ngà làm Choáng 1 giây và đồng đội Sơn Tinh +15% Tấn công 4 giây")
u(49, "Phép Thuật", 3, ["Cao Nguyên Bắc Bộ"],
  ("Bài Ca Rừng Già", "Hót vang: sóng âm trúng mọi kẻ địch trong 2 ô quanh mục tiêu, làm chậm 15%", "3 giây", "D:3:0.6 (diện rộng)", 9),
  "Chuyền Cành: mỗi 5 giây nhảy sang ô trống và né 1 đòn",
  "Tán Rừng Che Chở: đồng đội +10% Tốc độ khi Vượn nhảy ngang qua")
u(50, "Chiến Đấu", 1, ["Cự Thú", "Cao Nguyên Bắc Bộ"],
  ("Đấm Đá Khổng Lồ", "Đập hai tay xuống đất: sát thương lan 20% / 30% / 40% ra kẻ địch kề bên và Choáng 0,5 giây", "Tức thời", "D:4:1.1", 10),
  "Thân Hình Khổng Lồ: +10% / 15% / 20% Máu",
  "Vỗ Ngực: khi dùng kỹ năng, +100% Tấn công trong 4 giây")

# ---- Tier 1 – 2
u(51, "Săn Mồi", 1, ["Côn Trùng", "Săn Mồi"],
  ("Lưỡi Hái", "Chém hai lưỡi hái vào mục tiêu; nếu mục tiêu là Côn trùng thì Trói 1 giây", "Tức thời", "D:1:1.2", 7),
  "Rình Vồ: đòn đầu tiên trong trận ×1,5 / ×2 / ×2,5 sát thương",
  "Bọ Ngựa Cái: hạ được kẻ địch thì hồi 30% máu")
u(52, "Phép Thuật", 3, ["Sông Nước"],
  ("Vượt Vũ Môn", "Quẫy đuôi tạo sóng trúng mục tiêu và kẻ đứng sau; tích 1 'vảy rồng' (+5% Tấn công ĐB)", "Tức thời", "D:1:0.9", 8),
  "Cá Chép Hóa Rồng: sống sót 20 giây trên sân thì hóa Rồng Con (thêm hệ Huyền thoại, chỉ số ×1,3 / ×1,4 / ×1,5, có Bay) đến hết trận",
  "Long Môn: hóa rồng sau 12 giây và Rồng Con giữ kỹ năng Hô Mưa Gọi Sấm (50% sức mạnh)")
u(55, "Chiến Đấu", 1, ["Côn Trùng", "Sông Nước"],
  ("Châu Chấu Đá Xe", "Nhảy xa đá vào kẻ địch có bậc cao nhất trong 3 ô", "Tức thời", "D:1:1.2 (+50% nếu mục tiêu bậc cao hơn)", 8),
  "Liều Mạng: +30% / 40% / 50% sát thương lên kẻ địch có bậc cao hơn",
  "Đẩy Xe: đòn đánh có 20% đẩy lùi kẻ địch bậc cao hơn 1 ô")
u(56, "Hỗ Trợ", 3, ["Săn Côn Trùng"],
  ("Nhặt Thóc Giúp Tấm", "Cả bầy sẻ sà xuống: gỡ 1 hiệu ứng xấu và hồi máu cho 2 đồng đội yếu nhất", "Tức thời", "Hồi 120 / 200 / 320 máu", 8),
  "Bầy Sẻ: +5% / 7% / 10% Tốc độ cho mỗi VieAni hệ Trời trên sân",
  "Chim Sẻ Báo Tin: đầu trận cả đội +10% né đòn 4 giây")
u(58, "Đỡ Đòn", 1, ["Bầy Chó Dữ"],
  ("Sủa Giữ Nhà", "Sủa vang khiêu khích kẻ địch trong 1 ô; đồng đội kề bên +20% Phòng thủ", "3 / 3,5 / 4 giây", "—", 9),
  "Trung Thành: khi đồng đội kề bên bị hạ, +20% / 25% / 30% Tấn công đến hết trận",
  "Chó Giữ Làng: Sủa Giữ Nhà khiêu khích trong bán kính 2 ô")
u(59, "Chiến Đấu", 1, ["Bầy Chó Dữ", "Cao Nguyên Bắc Bộ"],
  ("Săn Vùng Núi", "Phi lên dốc đá rồi vồ mục tiêu ở hàng sau", "Tức thời", "D:1:1.2", 8),
  "Chân Núi: miễn bị làm chậm; +20% né đòn trong 5 giây đầu trận (★2: 6 giây, ★3: 7 giây)",
  "Cộc Đuôi Dũng Mãnh: Săn Vùng Núi Choáng mục tiêu 1 giây")
u(60, "Săn Mồi", 1, ["Bầy Chó Dữ"],
  ("Bản Năng Hoang Dã", "Cắn xé mục tiêu, sát thương tăng theo % máu đã mất của Chó Lài", "Tức thời", "D:1:1.1 (tới ×2 khi gần chết)", 8),
  "Hoang Dã: +20% / 25% / 30% Tấn công khi máu dưới 50%",
  "Đầu Đàn: Bản Năng Hoang Dã gây Chảy máu 3% máu/giây trong 3 giây")
u(61, "Săn Mồi", 1, ["Bầy Chó Dữ"],
  ("Xoáy Lưng", "Lao tới đánh chí mạng mục tiêu, bỏ qua né đòn", "Tức thời", "D:1:1.2 × chí mạng", 8),
  "Xoáy Lưng: đòn đầu tiên lên mỗi mục tiêu luôn chí mạng; +5% / 10% / 15% tỉ lệ chí mạng",
  "Biết Bơi: miễn sát thương hệ Nước trong 3 giây sau khi dùng kỹ năng")
u(62, "Săn Mồi", 2, ["Côn Trùng"],
  ("Bổ Nhào", "Bay vút xuống mục tiêu, đánh 3 lần liên tiếp", "1 giây", "D:1:1.1 (3 đòn)", 7),
  "Báo Mưa: đồng đội hệ Nước +6% / 8% / 10% sát thương ('chuồn chuồn bay thấp thì mưa')",
  "Cắn Rốn Biết Bơi: 1 lần mỗi trận giúp 1 đồng đội miễn nhiễm sát thương hệ Nước 5 giây")
u(63, "Chiến Đấu", 1, ["Bầy Gặm Nhấm"],
  ("Mầm Bệnh", "Cắn mục tiêu: Độc 3% / 4% / 5% máu mỗi giây, lây sang 1 kẻ địch kề bên", "3 giây", "D:1:0.8 + Độc", 8),
  "Gặm Nhấm: đòn đánh giảm 3 Phòng thủ của mục tiêu (cộng dồn 5 / 7 / 10 lần)",
  "Đại Dịch: Độc của Mầm Bệnh lây thêm 1 lần nữa khi mục tiêu bị hạ")
u(65, "Săn Mồi", 1, ["Bầy Gặm Nhấm"],
  ("Lẻn Vào Kho", "Chui qua khe đến hàng sau, cắn kẻ địch máu thấp nhất", "Tức thời", "D:1:1.1", 7),
  "Đám Cưới Chuột: đầu trận dâng lễ cho Mèo – Mèo phe địch không tấn công Chuột trong 3 / 4 / 5 giây; 25% né đòn",
  "Họ Nhà Chuột: khi bị hạ, để lại 2 chuột con (20% chỉ số)")
u(66, "Phép Thuật", 3, ["Sông Nước"],
  ("Mổ Chính Xác", "Mổ thẳng vào mục tiêu, gây thêm 30% sát thương lên cá, ếch, cua, ốc", "Tức thời", "D:1:1.1", 7),
  "Cò Theo Trâu: đứng cạnh Trâu thì cả hai +10% / 15% / 20% Tốc độ",
  "Cánh Cò Bay Lả: là VieAni Bay; kỹ năng trúng thêm 1 mục tiêu")
u(67, "Hỗ Trợ", 3, ["Săn Côn Trùng", "Sông Nước"],
  ("Nghiến Răng Gọi Mưa", "Nghiến răng gọi mưa trên sân: đòn hệ Nước của đồng đội +15% / 20% / 25% sát thương", "5 giây", "—", 9),
  "Cậu Ông Trời: kẻ địch đánh Cóc bị sét đánh (hệ Điện, 15% máu tối đa của kẻ đó); hồi chiêu 12 / 10 / 8 giây",
  "Cóc Kiện Trời: Cua, Hổ, Gấu, Ong cùng phe lập tức ra đòn mỗi khi Cóc nghiến răng")
u(68, "Đỡ Đòn", 1, ["Sông Nước"],
  ("Dã Tràng Xe Cát", "Đắp ụ cát chặn đòn tầm xa cho đồng đội phía sau; ụ tự sụp ('nhọc lòng mà chẳng nên công cán gì')", "4 / 5 / 6 giây", "Ụ cát chịu 200 / 350 / 550 sát thương", 8),
  "Càng Kẹp: đòn đánh 10% / 15% / 20% giữ chân mục tiêu 1 giây",
  "Mai Cứng: khi ụ cát sụp, Cua +30% Phòng thủ 4 giây")
u(69, "Đỡ Đòn", 1, ["Gia Súc", "Cao Nguyên Bắc Bộ"],
  ("Húc Đầu", "Lùi lấy đà rồi húc mạnh: Đẩy lùi mục tiêu 1 ô và Choáng", "Choáng 0,5 / 0,75 / 1 giây", "D:1:1", 8),
  "Leo Vách: 15% / 20% / 25% né đòn",
  "Dê Núi Đá: Húc Đầu đẩy lùi 2 ô và gây thêm sát thương nếu mục tiêu va vào kẻ khác")
u(70, "Phép Thuật", 3, ["Côn Trùng"],
  ("Lập Lòe", "Nháy sáng làm chói mắt kẻ địch trong 1 ô quanh mục tiêu", "Mù 2 / 2,5 / 3 giây", "D:1:0.5 (diện rộng)", 8),
  "Đèn Đêm: đồng đội kề bên +10% / 15% / 20% chính xác (bỏ qua né đòn)",
  "Đom Đóm Sáng Rực: Lập Lòe cho đồng đội trong vùng +15% Tấn công ĐB 4 giây")
u(73, "Đỡ Đòn", 1, ["Gia Súc"],
  ("Chân Voi Trụ Vững", "Bám chặt chân: không thể bị đẩy lùi, +30% / 40% / 50% Phòng thủ, khiêu khích kẻ địch kề bên", "3 giây", "—", 9),
  "Đá Cựa: 15% / 20% / 25% đòn đánh gây Chảy máu 3% máu/giây trong 3 giây",
  "Gà Tiến Vua: kết thúc Chân Voi Trụ Vững thì hồi 20% máu")
u(75, "Săn Mồi", 1, ["Côn Trùng"],
  ("Chạy Trốn", "Bỏ chạy nhanh ra khỏi tầm đánh rồi quay lại cắn kẻ địch yếu nhất", "2 giây", "D:1:1", 7),
  "Bất Tử: 25% / 30% / 35% né đòn; khi máu dưới 20%, chạy khỏi tầm đánh 2 giây",
  "Gián Bay: khi Chạy Trốn thì được Bay")
u(76, "Đỡ Đòn", 1, ["Gia Súc"],
  ("Ủn Ỉn Lăn Bùn", "Lăn bùn: tạo khiên và hồi máu", "Khiên 4 giây", "Khiên 150 / 250 / 400", 9),
  "Lì Lợm: +2% Máu tối đa cho mỗi đòn nhận vào (tối đa +20% / 25% / 30%)",
  "Bụng Phệ: Ủn Ỉn Lăn Bùn khiêu khích kẻ địch kề bên")
u(77, "Đỡ Đòn", 1, ["Gia Súc"],
  ("Gọi Đàn", "Kêu gọi đàn con: tạo 1 heo con cản đường (20% / 25% / 30% chỉ số)", "Đến hết trận", "—", 12),
  "Mắn Đẻ: khi bị hạ, để lại 1 heo con (20% chỉ số)",
  "Đàn Đông: khi bị hạ để lại 2 heo con với 40% chỉ số")
u(78, "Chiến Đấu", 1, ["Côn Trùng"],
  ("Đốt Rát", "Cả tổ đốt mục tiêu: gây Bỏng 3% / 4% / 5% máu mỗi giây", "3 giây", "D:1:0.8 + Bỏng", 8),
  "Tổ Kiến: +5% Tấn công mỗi 3 giây (cộng dồn 4 / 5 / 6 lần)",
  "Lửa Kiến: ×2 lượng máu mất do Bỏng")
u(79, "Chiến Đấu", 1, ["Côn Trùng"],
  ("Canh Vườn", "Cả đàn kiến vàng giữ vườn: +30% sát thương lên Côn trùng khác, đồng đội hệ Cỏ +10% Phòng thủ", "5 giây", "D:1:0.8", 8),
  "Kiến Thợ Dệt: +10% / 15% / 20% Phòng thủ khi đứng cạnh một đồng đội hệ Cỏ",
  "Thiên Địch Sâu Bọ: ×2 lượng Phòng thủ cộng thêm của Canh Vườn")
u(80, "Hỗ Trợ", 1, ["Hội Nhà Mèo"],
  ("Quỷ Nhập Tràng", "Nhảy qua một đồng đội vừa bị hạ: nó sống dậy 5 giây với 30% / 40% / 50% máu rồi ngã xuống lại; 1 lần mỗi vòng", "5 giây", "—", 10),
  "Mắt Đêm: 10% / 15% / 20% né đòn; nhìn thấy kẻ địch Ẩn mình",
  "Chín Mạng: đồng đội được hồi sinh không ngã xuống lại sau 5 giây")
u(81, "Săn Mồi", 1, ["Hội Nhà Mèo"],
  ("Vồ Mồi", "Vồ tới mục tiêu: đòn đầu tiên lên mỗi mục tiêu +30% sát thương", "Tức thời", "D:1:1.2", 8),
  "Bắt Chuột: +20% / 30% / 40% sát thương lên Chuột",
  "Mèo Mướp Lanh Lẹ: Vồ Mồi nảy sang kẻ địch thứ hai")
u(82, "Chiến Đấu", 1, ["Hội Nhà Mèo"],
  ("Cào Ba Màu", "Cào ba nhát vào mục tiêu, mỗi nhát một hiệu ứng: −10% Tấn công, −10% Phòng thủ, −10% Tốc độ", "4 giây", "D:1:1", 8),
  "May Mắn: 15% / 20% / 25% hồi sinh với 25% máu khi bị hạ",
  "Mèo Tam Thể Mang Lộc: +1 vàng mỗi vòng thắng khi Mèo Tam Thể còn sống")
u(83, "Phép Thuật", 3, ["Côn Trùng"],
  ("Hút Máu", "Đốt và hút máu mục tiêu; 30% gây Sốt (−20% Tốc độ)", "Sốt 3 giây", "D:1:1 (hồi 50% sát thương)", 7),
  "Truyền Bệnh: 15% / 20% / 25% đòn đánh gây Sốt 3 giây",
  "Muỗi Vằn Sốt Xuất Huyết: Sốt còn khiến mục tiêu mất 2% máu mỗi giây")
u(84, "Hỗ Trợ", 1, ["Gia Súc"],
  ("Thồ Hàng", "Chở 2 đồng đội yếu nhất lùi về hàng sau, cho họ +20% Tốc độ", "4 giây", "—", 10),
  "Bền Sức: đồng đội kề bên +6% / 8% / 10% Tốc độ",
  "Ngựa Trạm: Thồ Hàng còn hồi 15% máu cho đồng đội được chở")
u(85, "Săn Mồi", 1, ["Côn Trùng"],
  ("Ngòi Chết", "Một đòn đốt ×3 sát thương nhưng Ong mất 50% máu", "Tức thời", "D:1:1.5", 9),
  "Bầy Ong: mỗi Ong trên sân +5% / 7% / 10% Tấn công cho Côn trùng đồng đội",
  "Ong Chúa Phù Hộ: Ngòi Chết chỉ làm Ong mất 20% máu")
u(86, "Đỡ Đòn", 1, ["Sông Nước"],
  ("Rút Vào Vỏ", "Đóng nắp vỏ: miễn sát thương vật lý", "1,5 / 2 / 2,5 giây", "—", 9),
  "Ngoại Lai: mỗi 8 giây đẻ 1 ốc con (10% / 12% / 15% chỉ số) cản đường",
  "Ốc Bươu Vàng Phá Lúa: ốc con làm chậm 15% kẻ địch chạm vào")
u(87, "Phép Thuật", 3, ["Săn Côn Trùng"],
  ("Bắt Chước", "Sao chép kỹ năng của kẻ địch gần nhất trong 1 / 2 / 3 ô và dùng lại ngay", "Theo kỹ năng sao chép", "70% sức mạnh của kỹ năng gốc", 10),
  "Lắm Lời: đòn đánh 10% / 15% / 20% làm Câm lặng mục tiêu 1 giây (không dùng được kỹ năng)",
  "Sáo Nói Tiếng Người: kỹ năng sao chép giữ 100% sức mạnh")
u(88, "Săn Mồi", 1, ["Săn Côn Trùng"],
  ("Phóng Lưỡi", "Phóng lưỡi bắt một Côn trùng bất kỳ trên sân (không có thì kẻ địch gần nhất)", "Tức thời", "D:1:1.2", 7),
  "Đứt Đuôi: lần đầu nhận đòn chí tử còn lại 1 máu và chạy ra xa (★2 còn 10% máu, ★3 còn 20%)",
  "Đuôi Mọc Lại: sau Đứt Đuôi, hồi 30% máu trong 3 giây")
u(89, "Săn Mồi", 1, ["Săn Côn Trùng"],
  ("Tặc Lưỡi", "Tặc lưỡi ba tiếng: bắt Côn trùng ở bất kỳ đâu trên sân", "Tức thời", "D:1:1.2 (×1,5 lên Côn trùng)", 7),
  "Bám Tường: tầm đánh vô hạn với hệ Côn trùng; 10% / 15% / 20% né đòn",
  "Thạch Sùng Kêu: Tặc Lưỡi trúng thêm 1 Côn trùng nữa")
u(90, "Đỡ Đòn", 1, ["Cự Thú", "Gia Súc"],
  ("Trâu Vàng Hồ Tây", "Lao húc xuyên một hàng, ô đi qua bị sụt: kẻ địch đứng trên bị chậm 30%", "3 giây", "D:1:0.9 (cả hàng)", 10),
  "Con Trâu Là Đầu Cơ Nghiệp: +10% / 15% / 20% Máu",
  "Đầu Cơ Nghiệp: +1 vàng mỗi lần Trâu hạ được kẻ địch (tối đa 2 vàng mỗi vòng)")
u(91, "Phép Thuật", 3, ["Côn Trùng"],
  ("Khúc Ca Mùa Hè", "Kêu inh ỏi: Choáng kẻ địch gần nhất", "0,5 / 0,75 / 1 giây", "D:1:0.8", 7),
  "Vỏ Ve: +10% / 15% / 20% Phòng thủ",
  "Lột Xác: 1 lần mỗi trận, khi máu dưới 30% hồi 30% máu")
u(92, "Hỗ Trợ", 2, ["Gia Súc", "Sông Nước"],
  ("Lội Ruộng", "Lội nước nhặt mồi: hồi máu cho bản thân và đồng đội kề bên", "Tức thời", "Hồi 120 / 200 / 320 máu", 8),
  "Ăn Ốc: +50% sát thương lên Ốc Bươu Vàng; 10% / 15% / 20% né đòn hệ Nước",
  "Đàn Vịt Đồng: Lội Ruộng hồi cho cả đội 8% máu")
u(93, "Phép Thuật", 3, ["Biển Đông"],
  ("Phóng Điện", "Phóng dòng điện nảy qua 3 kẻ địch", "Tê liệt 1 giây", "D:2:0.6 mỗi lần nảy", 9),
  "Da Tích Điện: 15% / 20% / 25% làm tê liệt kẻ đánh cận chiến 1 giây",
  "Lưới Điện: Phóng Điện nảy 5 lần")
u(94, "Săn Mồi", 2, ["Cao Nguyên Bắc Bộ"],
  ("Săn Đêm", "Lặng lẽ sà xuống kẻ địch Ẩn mình hoặc máu thấp nhất; luôn trúng", "Tức thời", "D:2:1.2", 8),
  "Mắt Đêm: không thể bị né đòn bởi kẻ địch Ẩn mình hoặc có né đòn; +5% / 10% / 15% chí mạng",
  "Cú Vọ: Săn Đêm làm Câm lặng mục tiêu 2 giây")
u(95, "Săn Mồi", 2, ["Săn Mồi"],
  ("Sà Xuống", "Lao xuống từ trên cao: tầm đánh vô hạn với nhóm Gà, Chuột, Rắn", "Tức thời", "D:2:1.2", 8),
  "Mắt Diều Hâu: +10% / 15% / 20% chí mạng lên mục tiêu đang đứng một mình (không có đồng đội kề bên)",
  "Quắp Mồi: Sà Xuống nhấc mục tiêu lên 1 giây (không hành động)")
u(96, "Chiến Đấu", 1, ["Trường Sơn"],
  ("Húc", "Lao vào kẻ địch, gây Choáng", "1 / 1,25 / 1,5 giây", "D:2:1", 9),
  "Nanh Lợn Lòi: +10% / 15% / 20% sát thương khi máu dưới 50%",
  "Hung Hãn: Húc xuyên qua mục tiêu và trúng cả kẻ đứng sau")
u(97, "Hỗ Trợ", 1, ["Cao Nguyên Bắc Bộ"],
  ("Sủa Báo Động", "Kêu như tiếng chó sủa báo động: đồng đội +15% / 20% / 25% né đòn", "3 giây", "—", 8),
  "Nhanh Chân: 10% / 15% / 20% né đòn",
  "Rừng Có Mắt: Sủa Báo Động làm lộ diện kẻ địch Ẩn mình và −15% chính xác của kẻ địch trong 2 ô")
u(101, "Phép Thuật", 3, ["Biển Đông"],
  ("Phun Mực", "Phun mực đen: Mù kẻ địch trong bán kính 1 ô quanh mục tiêu", "2 / 3 / 4 giây", "D:2:0.5 (diện rộng)", 9),
  "Đổi Màu: 15% / 20% / 25% né đòn tầm xa",
  "Mực Khổng Lồ: Phun Mực lan bán kính 2 ô")
u(102, "Phép Thuật", 3, ["Săn Mồi"],
  ("Nọc Thần Kinh", "Phun nọc: Độc 4% / 5% / 6% máu mỗi giây và làm chậm 20%", "3 giây", "D:2:0.8 + Độc", 8),
  "Ngọc Rắn: né kỹ năng đầu tiên nhắm vào mình",
  "Rồng Rắn Lên Mây: đứng cạnh Rồng (Rồng Lạc Việt hoặc Rồng Con) thì được Bay và +20% Tấn công ĐB")
u(103, "Hỗ Trợ", 1, ["Cao Nguyên Bắc Bộ", "Bầy Gặm Nhấm"],
  ("Tích Trữ Hạt", "Ném hạt dẻ cho đồng đội: hồi máu và +10% Tấn công", "4 giây", "Hồi 150 / 250 / 400 máu", 8),
  "Nhảy Cành: 15% / 20% / 25% né đòn",
  "Kho Hạt Mùa Đông: Tích Trữ Hạt cho 2 đồng đội")
u(104, "Phép Thuật", 2, ["Biển Đông"],
  ("Xúc Tu Độc", "Quấn xúc tu quanh mình: kẻ địch trong 1 ô bị Độc và Trói 1 giây", "Độc 3 giây", "D:2:0.6 (diện rộng)", 9),
  "Tế Bào Gai: kẻ đánh cận chiến bị phản 10% / 15% / 20% sát thương dạng độc",
  "Sứa Bất Tử: 1 lần mỗi trận, khi bị hạ thì hồi lại 30% máu (thủy tức trở lại)")
u(105, "Săn Mồi", 1, ["Săn Côn Trùng"],
  ("Tàng Hình", "Đổi màu da ẩn mình, rồi ngoạm chặt mục tiêu", "Ẩn mình 3 / 4 / 5 giây", "D:2:1.2", 10),
  "Ngoạm Chặt: đòn đánh 10% / 15% / 20% giữ chân mục tiêu 2 giây",
  "Tắc Kè Kêu Mưa: sau Tàng Hình, đòn đầu tiên chí mạng và Choáng 1 giây")
u(106, "Chiến Đấu", 1, ["Săn Mồi"],
  ("Siết Chặt", "Quấn và siết mục tiêu: Trói, mỗi giây mất 5% máu", "2 / 2,5 / 3 giây", "D:2:0.6 + 5% máu/giây", 10),
  "Da Gấm: giảm 10% / 15% / 20% sát thương ĐB nhận vào",
  "Rồng Rắn Lên Mây: đứng cạnh Rồng (Rồng Lạc Việt hoặc Rồng Con) thì được Bay; Siết Chặt kéo dài thêm 1 giây")
u(108, "Săn Mồi", 1, ["Săn Mồi", "Tây Nguyên"],
  ("Sói Hú", "Hú gọi bầy: đồng đội Chó & Sói +15% / 20% / 25% Tấn công và tốc độ đánh", "5 giây", "—", 9),
  "Săn Bầy: +5% / 8% / 10% sát thương cho mỗi VieAni Săn Mồi khác trên sân",
  "Gọi Bầy: triệu hồi 2 sói con (40% chỉ số của Sói Đỏ) có 30% chí mạng")

# --------------------------------------------------------------- Linh Vật charms (items)
CHARMS = [
    ("VP51", "Linh Vật Bắc Bộ", 1, "Linh vật",
     "Không cộng chỉ số. Bùa đồng hình dáng vùng Bắc Bộ (núi Tây Bắc, đồng bằng sông Hồng), khắc hoa văn mặt trống đồng và chim Lạc. "
     "Chỉ xuất hiện từ vòng 1 đến vòng 10 (vòng thú hoang 1, 2, 3, 9). Là 1 trong 3 mảnh của Ấn Thống Nhất (xem Linh Vật Nam Bộ).",
     "Bắc Bộ – cái nôi văn hóa Đông Sơn, trống đồng Ngọc Lũ"),
    ("VP52", "Linh Vật Trung Bộ", 3, "Linh vật",
     "Không cộng chỉ số. Bùa ngọc hình dải đất Trung Bộ hẹp và cong chữ S, khắc sóng biển, đèn lồng Hội An và Cá Ông. "
     "Chỉ xuất hiện từ vòng 11 đến vòng 20 (vòng thú dữ 15). Là 1 trong 3 mảnh của Ấn Thống Nhất (xem Linh Vật Nam Bộ).",
     "Trung Bộ – dải đất hẹp giữa Trường Sơn và Biển Đông"),
    ("VP53", "Linh Vật Nam Bộ", 4, "Linh vật",
     "Không cộng chỉ số. Bùa gỗ hình châu thổ Nam Bộ với chín nhánh Cửu Long, khắc hoa sen và sếu đầu đỏ. Chỉ xuất hiện từ vòng 21 đến vòng 30 (vòng thú dữ 21, 27). "
     "ẤN THỐNG NHẤT: khi người chơi (1) đạt cấp tối đa 10 với Rồng Lạc Việt trên sân và (2) có đủ 3 Linh Vật Bắc – Trung – Nam trong túi, "
     "2 con giáp còn thiếu trên sân được tính là có mặt → có thể kích hoạt mốc (12) Mười Hai Con Giáp.",
     "Nam Bộ – đồng bằng sông Cửu Long chín nhánh đổ ra biển"),
]
CHARM_RULE = ("Linh Vật không cộng chỉ số, không chiếm ô vật phẩm của VieAni và không thể bị Hoàn Kiếm (Kim Quy) đòi lại. "
              "Mỗi Linh Vật chỉ xuất hiện trong khung vòng của nó: Bắc Bộ vòng 1–10 (thú hoang 1, 2, 3, 9), Trung Bộ vòng 11–20 (thú dữ 15), "
              "Nam Bộ vòng 21–30 (thú dữ 21, 27). Ở mỗi vòng thú hoang/thú dữ trong khung, 1 trong 3 lựa chọn là Linh Vật đó nếu bạn chưa có – "
              "chọn nó nghĩa là bỏ một vật phẩm chiến đấu. Bỏ lỡ khung vòng thì không còn cơ hội; mỗi người giữ tối đa 1 bản mỗi Linh Vật.")
