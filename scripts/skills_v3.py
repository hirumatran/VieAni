"""Skill table v3 (task T11, PO 19 Nov 2026): every VieAni's active skill, passive and ★3 bonus mapped to a template,
reworded for the 5 v3 stats, with numbers computed from Tấn Công / Máu.

    python3 scripts/skills_v3.py              -> data/skills_v3.json (source for the T11 build)
    python3 scripts/skills_v3.py SHEET_DIR    -> also sheet rows for the tabs "Kỹ năng v3 – duyệt" and "Mẫu kỹ năng"

Number rules (also written in the "Mẫu kỹ năng" tab):
  skill damage % of Tấn Công = Năng lượng × 4  (60 → 240 %, 100 → 400 %)
     × 0.5 per target if it hits an area / a row / several targets, × 0.75 if it hits exactly 2 targets
     × 0.75 if it also stuns / roots / blinds / knocks back / poisons (control or damage-over-time)
     × 1.25 for Phép Thuật (low Tấn Công, the skill is their damage), × 0.75 for Hỗ Trợ (the effect is the point)
  {D} in a text = that % × Tấn Công × ★ multiplier (1 / 1.8 / 3.2), rounded to 5  -> grows with stars like attacks
  {S:p} = p % of the VieAni's own Máu × ★ multiplier (shields, walls)
  Every skill damage is reduced by the target's Giáp like an attack.
"""
import json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
STAR = (1, 1.8, 3.2)

# ---- templates ---------------------------------------------------------------------------------------------------
ACTIVE_TPL = {
    "Đòn mạnh": "Gây sát thương lớn lên 1 kẻ địch (mục tiêu có thể là: hiện tại, ít máu nhất, xa nhất, hàng sau, bậc cao nhất…; có thể lao/nhảy tới trước).",
    "Diện rộng": "Gây sát thương mọi kẻ địch trong một vùng: quanh mình, quanh mục tiêu, một hàng, đường thẳng, hình nón hoặc cả sân.",
    "Nhiều mục tiêu": "Đánh trúng một số kẻ địch nhất định (ví dụ 3 kẻ nhiều máu nhất) hoặc nảy từ kẻ này sang kẻ khác.",
    "Khống chế": "Gây hiệu ứng làm kẻ địch mất lượt: Choáng, Trói, Mù, Câm lặng, Mê hoặc, Đẩy lùi, Làm chậm, Tê liệt.",
    "Độc / Bỏng": "Mất % Máu mỗi giây trong một thời gian (Độc, Bỏng, Chảy máu, Sốt).",
    "Hồi máu": "Hồi % Máu tối đa cho bản thân / đồng đội ít máu nhất / đồng đội kề bên / cả đội; có thể gỡ hiệu ứng xấu.",
    "Khiên": "Tạo lớp máu ảo (tính theo Máu của VieAni dùng kỹ năng) chặn sát thương trong vài giây.",
    "Tăng sức": "Tăng chỉ số cho đồng đội trong vài giây (Tấn Công, Tốc Độ Đánh, Giáp, né đòn, miễn khống chế…).",
    "Suy yếu": "Giảm chỉ số kẻ địch trong vài giây (Tấn Công, Giáp, Tốc Độ Đánh, chính xác…).",
    "Chịu đòn": "Khiêu khích kẻ địch đánh vào mình và/hoặc giảm sát thương nhận vào, gánh đòn thay đồng đội.",
    "Triệu hồi": "Gọi thêm VieAni con với một phần chỉ số.",
    "Hồi sinh": "Làm đồng đội vừa bị hạ sống lại.",
    "Sao chép": "Biến thành hoặc dùng lại kỹ năng của kẻ địch.",
    "Đặc biệt": "Hiệu ứng riêng một VieAni (đòi vật phẩm, chở đồng đội, đắp ụ cát…) – lập trình riêng.",
}
PASSIVE_TPL = {
    "Chỉ số": "Cộng thẳng vào chỉ số (Máu %, Tấn Công %, Tốc Độ Đánh %, Giáp điểm, chí mạng %).",
    "Né đòn": "% tránh hoàn toàn một đòn đánh (có thể chỉ cận chiến / chỉ đánh xa).",
    "Giảm sát thương": "Nhận ít hơn % sát thương (từ đòn đánh thường, từ kỹ năng, từ phía trước, từ một tộc hệ…).",
    "Khi đánh trúng": "Mỗi đòn đánh thường có % gây hiệu ứng, hoặc luôn gây hiệu ứng nhỏ.",
    "Khi bị đánh": "Kẻ địch đánh vào VieAni này có % bị hiệu ứng / bị phản sát thương.",
    "Cộng dồn": "Mạnh dần trong trận: mỗi đòn / mỗi giây / mỗi lần bị đánh cộng thêm, có giới hạn.",
    "Khi máu thấp": "Kích hoạt khi Máu dưới một mức (50 %, 30 %, 20 %…), thường 1 lần mỗi trận.",
    "Hào quang": "Ảnh hưởng đồng đội hoặc kẻ địch trong một vùng (kề bên, 2 ô, cả sân) khi VieAni còn trên sân.",
    "Khi bị hạ": "Kích hoạt khi bị hạ: hồi sinh, để lại con non, hồn ma…",
    "Hồi máu": "Hồi máu đều đặn hoặc hút máu theo sát thương gây ra.",
    "Đầu trận": "Hiệu ứng trong vài giây đầu trận (ẩn mình, né đòn, tăng tốc…).",
    "Thiên địch": "Mạnh hơn khi đánh một nhóm con mồi (Côn Trùng, Chuột, Gà…), có thể tầm đánh vô hạn với chúng.",
    "Kinh tế": "Thêm vàng sau vòng đấu.",
    "Biến hình": "Đổi hình dạng giữa trận (Cá Chép hóa Rồng).",
    "Triệu hồi": "Tự sinh thêm VieAni con trong trận (ốc con, sói con).",
    "Nâng kỹ năng": "(★3) Làm kỹ năng kích hoạt hoặc bị động mạnh hơn: thêm mục tiêu, thêm hiệu ứng, vùng rộng hơn.",
}
BIRDS = ["Cò thìa", "Gà lôi lam mào trắng", "Cò quắm lớn", "Hồng hoàng", "Công", "Chim Lạc", "Phượng Hoàng", "Sếu đầu đỏ",
         "Rẽ mỏ thìa", "Vịt Cỏ", "Cò Trắng", "Chim Sẻ", "Sáo Sậu", "Cú Mèo", "Diều Hâu"]

# ---- the table: name -> (active name, active template, target, hit kind, control/dot?, active text,
#                          passive template, passive text, ★3 template, ★3 text, change note[, coef override]) ----
# hit kind: "1" one target · "2" two targets · "aoe" area / row / several · "" no damage
K = {}
def k(vi, an, at, tgt, hit, cc, atext, pt, ptext, st, stext, note="", coef=None):
    K[vi] = dict(an=an, at=at, tgt=tgt, hit=hit, cc=cc, atext=atext, pt=pt, ptext=ptext, st=st, stext=stext, note=note, coef=coef)

k("Thỏ vằn Trường Sơn", "Phóng Vằn", "Đòn mạnh", "kẻ địch xa nhất", "1", 0,
  "Phóng tới kẻ địch xa nhất, đá hậu {D} sát thương rồi nhảy về ô trống gần nhất",
  "Né đòn", "Sọc Ngụy Trang: 15% / 20% / 25% né đòn",
  "Nâng kỹ năng", "Bóng Đêm Trường Sơn: sau Phóng Vằn ẩn mình 2 giây")
k("Voi châu Á", "Dậm Đất", "Diện rộng + Khống chế", "kẻ địch trong 1 ô quanh mình", "aoe", 1,
  "Dậm chân: {D} sát thương và Choáng 1 / 1,25 / 1,5 giây kẻ địch trong 1 ô",
  "Hào quang", "Voi Chiến Bà Triệu: khi Voi còn trên sân, cả đội +5% / 8% / 10% Tấn Công",
  "Nâng kỹ năng", "Voi Trắng Một Ngà: Dậm Đất lan bán kính 2 ô")
k("Cò thìa", "Lùa Cá", "Diện rộng + Tăng sức + Suy yếu", "vùng 1 ô quanh mục tiêu", "aoe", 0,
  "Quét mỏ thìa: {D} sát thương và −15% Tốc Độ Đánh 5 giây cho kẻ địch trong vùng; đồng đội Sông Nước +15% / 20% / 25% Tấn Công 5 giây",
  "Chỉ số", "Đàn Trú Đông: +10% / 15% / 20% Tốc Độ Đánh khi đứng cạnh một loài chim",
  "Nâng kỹ năng", "Bãi Bồi Bình Yên: Lùa Cá hồi 10% Máu tối đa cho đồng đội trong vùng",
  "hệ Trời → loài chim; Tốc độ → Tốc Độ Đánh")
k("Báo Gấm", "Vồ Từ Tán Cây", "Đòn mạnh", "kẻ địch ít máu nhất trên sân", "1", 0,
  "Nhảy tới kẻ địch ít máu nhất trên sân, vồ {D} sát thương",
  "Chỉ số", "Vồ từ trên cây: đòn đầu tiên nhắm kẻ địch ít máu nhất; +15% / 20% / 25% tỉ lệ chí mạng",
  "Đầu trận", "Da Báo: không bị đòn đánh xa nhắm tới trong 4 giây đầu trận và 2 giây sau mỗi lần dùng kỹ năng")
k("Bò Biển (Cá Nàng Tiên)", "Tiếng Hát Cá Nàng Tiên", "Diện rộng + Khống chế", "vùng 2 ô quanh mục tiêu", "aoe", 1,
  "Hát: {D} sát thương kẻ địch trong 2 ô quanh mục tiêu; chúng không thể tấn công Bò Biển và đồng đội kề bên trong 3 / 4 / 5 giây (Mê hoặc)",
  "Hồi máu", "Gặm Cỏ Biển: hồi 2% / 2,5% / 3% Máu mỗi giây khi không bị đánh trong 2 giây",
  "Nâng kỹ năng", "Thảm Cỏ Biển: tiếng hát hồi 15% Máu tối đa cho đồng đội trong vùng")
k("Gà lôi lam mào trắng", "Lông Lam Ánh Bạc", "Diện rộng + Khống chế", "hình nón 2 ô phía trước", "aoe", 1,
  "Xòe lông lam: {D} sát thương và Mù 2 / 2,5 / 3 giây kẻ địch trong hình nón 2 ô phía trước",
  "Né đòn", "Ẩn Trong Tán Rừng: 15% / 20% / 25% né đòn",
  "Khi bị hạ", "Bóng Ma Trường Sơn: khi bị hạ, để lại hồn ma 4 giây dùng Lông Lam Ánh Bạc thêm 1 lần")
k("Cò quắm lớn", "Mỏ Quắm Xuyên Bùn", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Chọc mỏ dài: {D} sát thương, bỏ qua 30% / 40% / 50% Giáp của mục tiêu",
  "Khi đánh trúng", "Mỏ Cong: đòn đánh thường bỏ qua 20% Giáp",
  "Nâng kỹ năng", "Đàn Cò Quắm: kỹ năng nảy sang thêm 2 kẻ địch gần đó (60% sát thương)",
  "Phòng thủ ĐB / Phòng thủ → Giáp")
k("Vượn khổng lồ", "Đấm Đá Khổng Lồ", "Đòn mạnh + Diện rộng + Khống chế", "mục tiêu + kẻ địch kề bên", "1", 1,
  "Đập hai tay xuống đất: {D} sát thương lên mục tiêu, 20% / 30% / 40% số đó lan ra kẻ địch kề bên; tất cả bị Choáng 0,5 giây",
  "Chỉ số", "Thân Hình Khổng Lồ: +10% / 15% / 20% Máu",
  "Nâng kỹ năng", "Vỗ Ngực: dùng kỹ năng xong +100% Tấn Công trong 4 giây")
k("Kim Quy", "Hoàn Kiếm", "Đặc biệt + Đòn mạnh", "kẻ địch đang cầm vật phẩm bậc cao nhất", "1", 0,
  "Đòi 1 vật phẩm của kẻ địch giữ vật phẩm bậc cao nhất, gây {D} sát thương lên nó và trao vật phẩm cho đồng đội ít máu nhất đến hết trận; 1 lần mỗi trận",
  "Hào quang", "Nỏ Thần: đồng đội đánh xa +12% / 16% / 20% sát thương",
  "Nâng kỹ năng", "Móng Rùa Thần: đồng đội đánh xa bắn trúng thêm 1 mục tiêu (50% sát thương)",
  "'kẻ địch mạnh nhất' → kẻ giữ vật phẩm bậc cao nhất (dễ hiểu, dễ lập trình)")
k("Hồng hoàng", "Mổ Mũ Sừng", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Lao xuống mổ: {D} sát thương và Choáng 0,5 / 0,75 / 1 giây",
  "Khi đánh trúng", "Cánh Vỗ Ầm: 15% / 20% / 25% đòn đánh gây Choáng 0,5 giây",
  "Nâng kỹ năng", "Mũ Sừng Kép: ×2 thời gian Choáng của Mổ Mũ Sừng và Cánh Vỗ Ầm")
k("Công", "Xòe Đuôi", "Diện rộng + Khống chế", "kẻ địch trong 1 ô quanh mình", "aoe", 1,
  "Xòe đuôi rực rỡ: {D} sát thương và Làm chậm 20% / 30% / 40% kẻ địch trong 1 ô trong 2 / 3 / 4 giây",
  "Khi bị đánh", "Mắt Công: 15% / 20% / 25% phản hiệu ứng khống chế về kẻ dùng",
  "Nâng kỹ năng", "Đuôi Công Rộng: Xòe Đuôi bán kính 2 ô")
k("Chà vá chân xám", "Gầm Rú", "Diện rộng + Suy yếu", "kẻ địch trong 2 ô quanh mình", "aoe", 0,
  "Gầm vang: {D} sát thương kẻ địch trong 2 ô, chúng Hoảng sợ −10% / 15% / 20% Tấn Công trong 4 giây",
  "Né đòn", "Nhảy Cành: 15% / 20% / 25% né đòn cận chiến",
  "Nâng kỹ năng", "Thủ Lĩnh Bầy: Gầm Rú cho đồng đội trong vùng +15% Tốc Độ Đánh 4 giây",
  "Tốc độ → Tốc Độ Đánh")
k("Đồi mồi", "Rụt Mai", "Chịu đòn", "bản thân + kẻ địch kề bên", "", 0,
  "Rụt vào mai 3 giây: giảm 50% / 60% / 70% sát thương nhận vào và khiêu khích kẻ địch kề bên",
  "Chỉ số", "Bơi Xa: miễn Làm chậm; +10% / 15% / 20% Tốc Độ Đánh",
  "Khi bị đánh", "Mai Đồi Mồi: hết Rụt Mai thì phản 30% tổng sát thương đã chặn lên kẻ địch kề bên",
  "Tốc độ → Tốc Độ Đánh")
k("Hổ Đông Dương", "Hổ Vồ", "Đòn mạnh", "kẻ địch xa nhất trong 3 ô", "1", 0,
  "Phóng tới kẻ địch xa nhất trong 3 ô, vồ xé {D} sát thương",
  "Hào quang", "Chúa Sơn Lâm: kẻ địch trong 2 ô −15% / 20% / 25% Tấn Công",
  "Nâng kỹ năng", "Oai Hùm: Chúa Sơn Lâm áp dụng cho mọi kẻ địch trên sân")
k("Ngựa sắt Thánh Gióng", "Phun Lửa", "Diện rộng + Độc / Bỏng", "cả một hàng kẻ địch", "aoe", 1,
  "Phun lửa cả một hàng: {D} sát thương và để lại ô 'Làng Cháy' gây Bỏng 3% Máu mỗi giây trong 4 giây",
  "Khi máu thấp", "Nhổ Tre Đánh Giặc: Máu dưới 50% (gươm gãy) thì đòn đánh quét cả hàng ngang và +1 tầm",
  "Nâng kỹ năng", "Lửa Thiêu Rừng: Phun Lửa đốt cả nửa sân kẻ địch")
k("Cá Nược (Cá Heo Sông)", "Sóng Âm Định Vị", "Diện rộng + Suy yếu + Tăng sức", "cả một hàng", "aoe", 0,
  "Sóng âm xuyên một hàng: {D} sát thương; kẻ địch trúng −8 / 10 / 12 Giáp, đồng đội trên hàng +15% Tấn Công, trong 4 / 5 / 6 giây",
  "Khi đánh trúng", "Định Vị: đòn đánh thường giảm 5 Giáp của mục tiêu trong 3 giây (không cộng dồn)",
  "Đầu trận", "Cá Nược Dẫn Đường: đầu trận đồng đội Biển Đông / Sông Nước +20% Tốc Độ Đánh trong 6 giây",
  "Phòng thủ ĐB −% → Giáp −điểm; Tấn công ĐB → Tấn Công; hệ Nước → Biển Đông / Sông Nước")
k("Bò Xám", "Húc Sừng Cong", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Lao húc: {D} sát thương, hất văng 1 ô và Choáng 1 / 1,5 / 2 giây",
  "Khi bị đánh", "Sừng Cong: phản 15% / 20% / 25% sát thương cận chiến nhận vào",
  "Cộng dồn", "Tăng Trọng: mỗi đồng đội ngã xuống trong 1 ô cho Bò Xám +10% Máu tối đa và +3 Giáp (cộng dồn)",
  "+5% Phòng thủ → +3 Giáp")
k("Mang lớn", "Húc Gạc Lớn", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Cúi gạc húc: {D} sát thương; +25% nếu mục tiêu là Đỡ Đòn",
  "Chỉ số", "Gạc Lớn Nhất: +5 / 7 / 10 Giáp khi đứng hàng đầu",
  "Nâng kỹ năng", "Gạc Xuyên: Húc Gạc Lớn trúng cả kẻ đứng sau mục tiêu",
  "'+25% lên hệ Cỏ' → lên Đỡ Đòn (gạc lớn húc thú to) – PO xem; Phòng thủ % → Giáp")
k("Lân", "Múa Lân Trừ Tà", "Diện rộng + Tăng sức", "kẻ địch kề bên; đồng đội trong 1 ô", "aoe", 0,
  "Múa quanh đồng đội: {D} sát thương kẻ địch kề bên; đồng đội trong 1 ô được xóa hiệu ứng xấu và miễn khống chế 2 / 3 / 4 giây",
  "Hào quang", "Trống Lân: mỗi 8 giây gỡ 1 hiệu ứng xấu khỏi đồng đội kề bên",
  "Nâng kỹ năng", "Lân Vàng: Múa Lân Trừ Tà hồi 15% Máu tối đa cho cả đội")
k("Chim Lạc", "Phong Ba Bão Táp", "Diện rộng + Khống chế", "mọi kẻ địch", "aoe", 1,
  "Vỗ cánh tạo cuồng phong: {D} sát thương mọi kẻ địch và đẩy lùi 1 / 2 / 3 ô",
  "Chỉ số", "Hào Khí Lạc Việt: mỗi tộc hệ đang kích hoạt cho Chim Lạc +10% Máu, +3% Tấn Công và +3% Tốc Độ Đánh",
  "Nâng kỹ năng", "Hồn Trống Đồng: đội có Trống Đồng Đông Sơn thì hiệu ứng trống ×2 và Phong Ba Bão Táp Choáng 1 giây",
  "'100% Tấn công ĐB + số cố định' → một con số theo Tấn Công; bỏ Phòng thủ khỏi bị động")
k("Cá Tra Dầu", "Giẫy Giụa", "Đòn mạnh + Suy yếu", "mục tiêu hiện tại", "1", 0,
  "Quẫy mạnh, da trơn tiết dầu: {D} sát thương; mục tiêu trượt thêm 20% / 30% / 40% đòn đánh thường trong 5 giây",
  "Chỉ số", "Khổng Lồ Sông Mê Kông: +10% / 15% / 20% Máu",
  "Nâng kỹ năng", "Giẫy Giụa Diện Rộng: ảnh hưởng mọi kẻ địch trong 2 ô",
  "'đòn vật lý' → đòn đánh thường")
k("Nghê", "Trấn Giữ", "Chịu đòn", "đồng đội kề bên", "", 0,
  "Đứng tấn 5 giây: gánh 30% / 40% / 50% sát thương thay cho đồng đội kề bên",
  "Chỉ số", "Thân Đá: +5 / 7 / 10 Giáp",
  "Khi bị đánh", "Nghê Canh Đình: hết Trấn Giữ thì phản 25% sát thương đã gánh lên kẻ địch trong 1 ô",
  "+% Phòng thủ và Phòng thủ ĐB → +Giáp")
k("Ngựa chín hồng mao", "Phi Nước Đại", "Diện rộng", "đường thẳng xuyên hàng địch", "aoe", 0,
  "Phi xuyên hàng địch tới hàng sau: {D} sát thương mọi kẻ địch trên đường",
  "Cộng dồn", "Vó Ngựa: mỗi đòn lên cùng một kẻ địch +5% / 8% / 10% Tốc Độ Đánh (cộng dồn), mất khi đổi mục tiêu",
  "Nâng kỹ năng", "Chín Hồng Mao: ×2 cộng dồn của Vó Ngựa; Phi Nước Đại Choáng 0,5 giây",
  "'+5/10/15 tốc độ đánh' → +% Tốc Độ Đánh")
k("Gà chín cựa", "Chín Cựa", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Đá liên hoàn 9 cú trong 1,5 giây, tổng {D} sát thương",
  "Cộng dồn", "Cựa Thép: mỗi đòn lên cùng một kẻ địch +5% / 8% / 10% sát thương (cộng dồn), mất khi đổi mục tiêu",
  "Nâng kỹ năng", "Gà Thần: ×2 sát thương của Chín Cựa và Cựa Thép",
  "'+5/10/15 sát thương' → +% sát thương")
k("Hồ Tinh", "Biến Hóa Vạn Trạng", "Sao chép", "VieAni mạnh nhất phe địch", "", 0,
  "Hóa thành bản sao của VieAni mạnh nhất phe địch (bậc cao nhất, rồi sao cao nhất), giữ nguyên % Máu, đến hết trận; 1 lần mỗi trận",
  "Khi đánh trúng", "Mê Hoặc: 10% / 15% / 20% đòn đánh khiến mục tiêu tấn công đồng đội của nó 2 giây",
  "Nâng kỹ năng", "Cửu Vĩ: bản sao giữ Mê Hoặc của Hồ Tinh và +20% mọi chỉ số",
  "'tổng chỉ số cao nhất' → bậc rồi sao cao nhất (v3 không còn tổng chỉ số)")
k("Voi chín ngà", "Chín Ngà", "Diện rộng + Khống chế", "3 ô phía trước", "aoe", 1,
  "Hất chín ngà: {D} sát thương 3 ô phía trước và đẩy lùi 1 ô",
  "Chỉ số", "Núi Dâng: +5% / 10% / 15% Máu; mỗi đòn nhận từ VieAni Biển Đông / Sông Nước cho +2 Giáp (cộng dồn đến hết trận)",
  "Nâng kỹ năng", "Sính Lễ Vua Hùng: Chín Ngà Choáng 1 giây và đồng đội Sơn Tinh +15% Tấn Công 4 giây",
  "hệ Nước → Biển Đông / Sông Nước; +5 Phòng thủ → +2 Giáp")
k("Vượn đen má trắng", "Bài Ca Rừng Già", "Diện rộng + Khống chế", "kẻ địch trong 2 ô quanh mục tiêu", "aoe", 1,
  "Hót vang: {D} sát thương kẻ địch trong 2 ô quanh mục tiêu và Làm chậm 15% trong 3 giây",
  "Né đòn", "Chuyền Cành: mỗi 5 giây nhảy sang ô trống và né 1 đòn",
  "Nâng kỹ năng", "Tán Rừng Che Chở: đồng đội kề ô Vượn vừa nhảy tới +10% Tốc Độ Đánh 3 giây",
  "Tốc độ → Tốc Độ Đánh; nói rõ 'đồng đội kề ô vừa nhảy tới'")
k("Cầy vằn bắc", "Đào Hang Tiếp Tế", "Hồi máu", "2 đồng đội ít máu nhất", "", 0,
  "Hồi 15% / 20% / 25% Máu tối đa cho 2 đồng đội ít máu nhất và gỡ 1 hiệu ứng xấu",
  "Khi bị đánh", "Mùi Xạ Hương: kẻ địch đánh Cầy vằn có 15% / 20% / 25% bị Mù 1 giây",
  "Nâng kỹ năng", "Hang Ổ: Đào Hang Tiếp Tế hồi cho 3 đồng đội và cho họ +15% né đòn 3 giây",
  "hồi số cố định → % Máu tối đa (hợp với mọi bậc)")
k("Cu li nhỏ", "Vết Cắn Độc", "Đòn mạnh + Độc / Bỏng", "mục tiêu hiện tại", "1", 1,
  "Cắn: {D} sát thương, Độc 3% / 4% / 5% Máu mỗi giây trong 4 giây và mục tiêu −30% hồi máu",
  "Chỉ số", "Chậm Mà Chắc: +5 / 7 / 10 Giáp; miễn Đẩy lùi",
  "Nâng kỹ năng", "Nọc Lan: Độc lây sang 1 kẻ địch kề bên mục tiêu",
  "Phòng thủ ĐB → Giáp")
k("Sao la", "Sừng Thẳng Phòng Vệ", "Chịu đòn + Diện rộng", "kẻ địch trong 1 ô", "aoe", 0,
  "Chĩa đôi sừng: {D} sát thương kẻ địch trong 1 ô, khiêu khích chúng và giảm 30% / 40% / 50% sát thương cận chiến nhận vào trong 3 / 4 / 5 giây",
  "Đầu trận", "Kỳ Lân Châu Á: không bị chọn làm mục tiêu trong 3 giây đầu trận",
  "Hào quang", "Điềm Lành: Sao La còn trên sân thì đồng đội Trường Sơn +10% mọi chỉ số")
k("Sếu đầu đỏ", "Vũ Điệu Sếu", "Tăng sức + Hồi máu", "mọi đồng đội", "", 0,
  "Múa giữa đồng: đồng đội +10% / 15% / 20% Tốc Độ Đánh trong 5 giây và hồi 10% Máu tối đa",
  "Né đòn", "Bay Cao: biết Bay – né 30% đòn cận chiến của VieAni không biết Bay",
  "Nâng kỹ năng", "Mùa Sếu Về: Vũ Điệu Sếu thêm +15% Tấn Công và gỡ hiệu ứng xấu",
  "hệ Trời → 'không biết Bay'; Tốc độ → Tốc Độ Đánh")
k("Cá Sấu Nước Ngọt", "Đớp Mồi", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Cắn chặt, Trói mục tiêu 2 / 2,5 / 3 giây; tổng {D} sát thương chia đều trong lúc giữ",
  "Giảm sát thương", "Da Cá Sấu: giảm 10% / 15% / 20% sát thương từ đòn đánh thường",
  "Đầu trận", "Ẩn Nấp: đầu trận lặn rồi trồi lên sau lưng kẻ địch đánh chậm nhất trong 3 ô, đớp một đòn chí mạng",
  "'sát thương vật lý' → đòn đánh thường; ★3 ghi rõ là đầu trận")
k("Cheo cheo lưng bạc", "Nhanh Như Cheo", "Chịu đòn", "kẻ địch Tấn Công cao nhất", "", 0,
  "Khiêu khích kẻ địch có Tấn Công cao nhất và +50% né đòn trong 4 / 5 / 6 giây",
  "Né đòn", "Nhút Nhát: luôn né đòn đầu tiên nhắm vào mình; 10% / 15% / 20% né đòn",
  "Nâng kỹ năng", "Biến Mất Trong Bụi Rậm: hết Nhanh Như Cheo thì ẩn mình 2 giây và hồi 20% Máu")
k("Rẽ mỏ thìa", "Mỏ Thìa Vẩy Nước", "Nhiều mục tiêu + Khống chế", "3 kẻ địch ngẫu nhiên", "aoe", 1,
  "Vẩy nước lấp lánh trúng 3 kẻ địch ngẫu nhiên: mỗi kẻ {D} sát thương và Mù 1 giây",
  "Né đòn", "Bé Nhỏ Nhanh Nhẹn: 20% / 25% / 30% né đòn đánh xa",
  "Khi bị hạ", "Hiếm Có Khó Tìm: lần đầu bị hạ, sống lại với 30% Máu")
k("Gấu chó", "Cào Tổ Ong", "Đòn mạnh + Hồi máu", "mục tiêu hiện tại", "1", 0,
  "Đứng thẳng cào liên tục 2 giây: {D} sát thương, hồi máu bằng 30% sát thương gây ra",
  "Thiên địch", "Lưỡi Dài: hồi 10% / 12% / 15% Máu mỗi khi đánh trúng VieAni Côn Trùng",
  "Nâng kỹ năng", "Ôm Ghì: Cào Tổ Ong Trói mục tiêu trong lúc cào")
k("Tê tê Java", "Cuộn Tròn", "Diện rộng", "kẻ địch trong 1 / 2 / 3 ô", "aoe", 0,
  "Cuộn tròn lăn vào kẻ địch trong 1 / 2 / 3 ô: {D} sát thương; +2 Giáp cho mỗi kẻ trúng (cộng dồn)",
  "Giảm sát thương", "Vảy Sừng: giảm 10% / 15% / 20% sát thương từ đòn đánh thường",
  "Nâng kỹ năng", "Kháng Phép: sau Cuộn Tròn, miễn sát thương kỹ năng 2 giây",
  "+5% Phòng thủ → +2 Giáp; vật lý → đòn đánh thường; ĐB → kỹ năng")
k("Rồng Lạc Việt", "Hô Mưa Gọi Sấm", "Nhiều mục tiêu", "3 kẻ địch nhiều máu nhất", "aoe", 0,
  "Giáng sét xuống 3 kẻ địch nhiều máu nhất: mỗi kẻ {D} sát thương",
  "Khi máu thấp", "Thăng Long: lần đầu Máu dưới 30%, bay lên 2 giây (không bị nhắm tới) rồi dùng Hô Mưa Gọi Sấm với ×2 sát thương",
  "Nâng kỹ năng", "Long Uy: Hô Mưa Gọi Sấm trúng 5 kẻ địch và Choáng 0,5 giây")
k("Tê giác Java (Việt Nam)", "Sừng Tê Giác", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Lao húc: {D} sát thương và Choáng 1,5 giây; mục tiêu còn dưới 25% Máu thì bị hạ ngay",
  "Giảm sát thương", "Da Giáp: giảm 10% / 15% / 20% sát thương từ kẻ địch phía trước",
  "Nâng kỹ năng", "Sừng Bất Khuất: Sừng Tê Giác chỉ cần 40 Năng lượng",
  "gộp 'chí mạng 150/200/250%' vào con số sát thương; '7 giây hồi chiêu' → 40 Năng lượng", coef=240)
k("Phượng Hoàng", "Lửa Thiêng", "Diện rộng + Độc / Bỏng", "vùng 2×2 quanh mục tiêu", "aoe", 1,
  "Mưa lửa vùng 2×2 quanh mục tiêu: {D} sát thương và Bỏng 3% Máu mỗi giây trong 3 giây",
  "Khi bị hạ", "Trứng Lửa Tái Sinh: bị hạ thì hóa trứng 6 giây (Máu trứng = 30% Máu tối đa, đốt kẻ kề bên); trứng không vỡ thì nở lại với 100% Máu; 1 lần mỗi trận",
  "Nâng kỹ năng", "Phượng Múa: sau khi tái sinh, dùng Lửa Thiêng ngay và +30% Tấn Công đến hết trận",
  "Tấn công ĐB → Tấn Công")
k("Cá Ông", "Nam Hải Cứu Nạn", "Khiên + Hồi máu", "đồng đội ít máu nhất trong 2 ô", "", 0,
  "Che chắn đồng đội ít máu nhất trong 2 ô: khiên {S:30} trong 4 giây và hồi 20% / 25% / 30% Máu tối đa",
  "Hào quang", "Ông Nam Hải: đồng đội Biển Đông / Sông Nước +6 Giáp; đòn của VieAni Biển Đông / Sông Nước phe địch −12% sát thương",
  "Nâng kỹ năng", "Linh Ngư Phù Hộ: che chắn thêm 1 đồng đội; mỗi đồng đội được cứu 1 lần mỗi trận",
  "khiên = 30% Máu Cá Ông; hệ Nước → Biển Đông / Sông Nước; +12% Phòng thủ → +6 Giáp")
k("Chó Cỏ", "Sủa Giữ Nhà", "Chịu đòn + Tăng sức", "kẻ địch trong 1 ô; đồng đội kề bên", "", 0,
  "Sủa vang: khiêu khích kẻ địch trong 1 ô trong 3 / 3,5 / 4 giây; đồng đội kề bên +8 Giáp",
  "Cộng dồn", "Trung Thành: đồng đội kề bên bị hạ thì +20% / 25% / 30% Tấn Công đến hết trận",
  "Nâng kỹ năng", "Chó Giữ Làng: Sủa Giữ Nhà khiêu khích trong 2 ô",
  "+20% Phòng thủ → +8 Giáp")
k("Chó H'Mông Cộc Đuôi", "Săn Vùng Núi", "Đòn mạnh", "một kẻ địch ở hàng sau", "1", 0,
  "Phi lên dốc đá rồi vồ một kẻ địch ở hàng sau: {D} sát thương",
  "Đầu trận", "Chân Núi: miễn Làm chậm; +20% né đòn trong 5 / 6 / 7 giây đầu trận",
  "Nâng kỹ năng", "Cộc Đuôi Dũng Mãnh: Săn Vùng Núi Choáng mục tiêu 1 giây")
k("Chó Phú Quốc", "Xoáy Lưng", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Lao tới đánh chí mạng: {D} sát thương, không thể bị né",
  "Chỉ số", "Xoáy Lưng: đòn đầu tiên lên mỗi kẻ địch luôn chí mạng; +5% / 10% / 15% tỉ lệ chí mạng",
  "Nâng kỹ năng", "Biết Bơi: 3 giây sau khi dùng kỹ năng, miễn sát thương từ VieAni Biển Đông / Sông Nước",
  "gộp chí mạng vào con số; hệ Nước → Biển Đông / Sông Nước", coef=400)
k("Chó Lài", "Bản Năng Hoang Dã", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Cắn xé: {D} sát thương, tăng dần tới ×2 khi Chó Lài gần hết Máu",
  "Khi máu thấp", "Hoang Dã: Máu dưới 50% thì +20% / 25% / 30% Tấn Công",
  "Nâng kỹ năng", "Đầu Đàn: Bản Năng Hoang Dã gây Chảy máu 3% Máu mỗi giây trong 3 giây")
k("Mèo Mướp", "Vồ Mồi", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Vồ tới mục tiêu: {D} sát thương; +30% nếu là đòn đầu tiên lên kẻ đó",
  "Thiên địch", "Bắt Chuột: +20% / 30% / 40% sát thương lên Chuột Nhắt và Chuột Cống",
  "Nâng kỹ năng", "Mèo Mướp Lanh Lẹ: Vồ Mồi nảy sang kẻ địch thứ hai")
k("Mèo Mun", "Quỷ Nhập Tràng", "Hồi sinh", "đồng đội vừa bị hạ", "", 0,
  "Nhảy qua đồng đội vừa bị hạ: nó sống dậy 5 giây với 30% / 40% / 50% Máu rồi ngã xuống lại; 1 lần mỗi trận",
  "Né đòn", "Mắt Đêm: 10% / 15% / 20% né đòn; nhìn thấy kẻ địch Ẩn mình",
  "Nâng kỹ năng", "Chín Mạng: đồng đội được hồi sinh không ngã xuống lại")
k("Mèo Tam Thể", "Cào Ba Màu", "Đòn mạnh + Suy yếu", "mục tiêu hiện tại", "1", 0,
  "Cào ba nhát: {D} sát thương; mục tiêu −10% Tấn Công, −5 Giáp, −10% Tốc Độ Đánh trong 4 giây",
  "Khi bị hạ", "May Mắn: 15% / 20% / 25% hồi sinh với 25% Máu khi bị hạ",
  "Kinh tế", "Mèo Tam Thể Mang Lộc: +1 vàng mỗi vòng thắng khi Mèo Tam Thể còn sống",
  "−10% Phòng thủ → −5 Giáp; Tốc độ → Tốc Độ Đánh")
k("Gà Đông Tảo", "Chân Voi Trụ Vững", "Chịu đòn", "bản thân + kẻ địch kề bên", "", 0,
  "Bám chặt chân 3 giây: không bị đẩy lùi, +10 / 15 / 20 Giáp, khiêu khích kẻ địch kề bên",
  "Khi đánh trúng", "Đá Cựa: 15% / 20% / 25% đòn đánh gây Chảy máu 3% Máu mỗi giây trong 3 giây",
  "Nâng kỹ năng", "Gà Tiến Vua: hết Chân Voi Trụ Vững thì hồi 20% Máu",
  "+30/40/50% Phòng thủ → +10/15/20 Giáp")
k("Heo Ỉ", "Ủn Ỉn Lăn Bùn", "Khiên + Hồi máu", "bản thân", "", 0,
  "Lăn bùn: khiên {S:20} trong 4 giây và hồi 10% Máu",
  "Cộng dồn", "Lì Lợm: mỗi đòn nhận vào +2% Máu tối đa (tối đa +20% / 25% / 30%)",
  "Nâng kỹ năng", "Bụng Phệ: Ủn Ỉn Lăn Bùn khiêu khích kẻ địch kề bên",
  "khiên = 20% Máu Heo Ỉ; thêm con số hồi máu (bản cũ ghi 'hồi máu' nhưng không có số)")
k("Heo Móng Cái", "Gọi Đàn", "Triệu hồi", "ô trống gần nhất", "", 0,
  "Gọi 1 heo con cản đường (20% / 25% / 30% chỉ số của Heo Móng Cái) đến hết trận",
  "Khi bị hạ", "Mắn Đẻ: bị hạ thì để lại 1 heo con (20% chỉ số)",
  "Nâng kỹ năng", "Đàn Đông: bị hạ thì để lại 2 heo con với 40% chỉ số")
k("Chuột Nhắt", "Lẻn Vào Kho", "Đòn mạnh", "kẻ địch ít máu nhất ở hàng sau", "1", 0,
  "Chui qua khe tới hàng sau, cắn kẻ địch ít máu nhất: {D} sát thương",
  "Đầu trận", "Đám Cưới Chuột: Mèo phe địch không tấn công Chuột trong 3 / 4 / 5 giây đầu trận; 25% né đòn",
  "Khi bị hạ", "Họ Nhà Chuột: bị hạ thì để lại 2 chuột con (20% chỉ số)")
k("Chuột Cống", "Mầm Bệnh", "Đòn mạnh + Độc / Bỏng", "mục tiêu + 1 kẻ kề bên", "1", 1,
  "Cắn: {D} sát thương, Độc 3% / 4% / 5% Máu mỗi giây trong 3 giây, lây sang 1 kẻ địch kề bên",
  "Khi đánh trúng", "Gặm Nhấm: mỗi đòn −2 Giáp của mục tiêu (cộng dồn 5 / 7 / 10 lần)",
  "Nâng kỹ năng", "Đại Dịch: mục tiêu đang bị Độc mà bị hạ thì Độc lây thêm 1 lần",
  "−3 Phòng thủ → −2 Giáp (giống tộc hệ Bầy Gặm Nhấm)")
k("Trâu", "Trâu Vàng Hồ Tây", "Diện rộng + Khống chế", "cả một hàng", "aoe", 1,
  "Húc xuyên một hàng: {D} sát thương; ô đi qua bị sụt, kẻ địch đứng trên bị Làm chậm 30% trong 3 giây",
  "Chỉ số", "Con Trâu Là Đầu Cơ Nghiệp: +10% / 15% / 20% Máu",
  "Kinh tế", "Đầu Cơ Nghiệp: +1 vàng mỗi lần Trâu hạ kẻ địch (tối đa 2 vàng mỗi vòng)")
k("Dê", "Húc Đầu", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Lùi lấy đà rồi húc: {D} sát thương, đẩy lùi 1 ô và Choáng 0,5 / 0,75 / 1 giây",
  "Né đòn", "Leo Vách: 15% / 20% / 25% né đòn",
  "Nâng kỹ năng", "Dê Núi Đá: đẩy lùi 2 ô; mục tiêu va vào kẻ khác thì cả hai nhận thêm 50% sát thương",
  "nói rõ 'thêm sát thương khi va' = +50%")
k("Ngựa Ta", "Thồ Hàng", "Đặc biệt + Tăng sức", "2 đồng đội ít máu nhất", "", 0,
  "Chở 2 đồng đội ít máu nhất lùi về hàng sau; họ +20% Tốc Độ Đánh trong 4 giây",
  "Hào quang", "Bền Sức: đồng đội kề bên +6% / 8% / 10% Tốc Độ Đánh",
  "Nâng kỹ năng", "Ngựa Trạm: Thồ Hàng hồi 15% Máu cho đồng đội được chở",
  "Tốc độ → Tốc Độ Đánh")
k("Vịt Cỏ", "Lội Ruộng", "Hồi máu", "bản thân + đồng đội kề bên", "", 0,
  "Lội nước nhặt mồi: hồi 12% / 16% / 20% Máu tối đa cho bản thân và đồng đội kề bên",
  "Thiên địch", "Ăn Ốc: +50% sát thương lên Ốc Bươu Vàng; 10% / 15% / 20% né đòn của VieAni Biển Đông / Sông Nước",
  "Nâng kỹ năng", "Đàn Vịt Đồng: Lội Ruộng hồi thêm 8% Máu cho cả đội",
  "hồi số cố định → % Máu; hệ Nước → Biển Đông / Sông Nước")
k("Cò Trắng", "Mổ Chính Xác", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Mổ thẳng: {D} sát thương; +30% nếu mục tiêu là VieAni Sông Nước (cá, cua, ốc…)",
  "Hào quang", "Cò Theo Trâu: đứng cạnh Trâu thì cả hai +10% / 15% / 20% Tốc Độ Đánh",
  "Nâng kỹ năng", "Cánh Cò Bay Lả: biết Bay; Mổ Chính Xác trúng thêm 1 mục tiêu",
  "'cá, ếch, cua, ốc' → VieAni Sông Nước; Tốc độ → Tốc Độ Đánh")
k("Chim Sẻ", "Nhặt Thóc Giúp Tấm", "Hồi máu", "2 đồng đội ít máu nhất", "", 0,
  "Cả bầy sẻ sà xuống: gỡ 1 hiệu ứng xấu và hồi 12% / 16% / 20% Máu tối đa cho 2 đồng đội ít máu nhất",
  "Chỉ số", "Bầy Sẻ: +5% / 7% / 10% Tốc Độ Đánh cho mỗi loài chim trên sân",
  "Đầu trận", "Chim Sẻ Báo Tin: đầu trận cả đội +10% né đòn trong 4 giây",
  "hồi số cố định → % Máu; hệ Trời → loài chim")
k("Sáo Sậu", "Bắt Chước", "Sao chép", "kẻ địch gần nhất trong 1 / 2 / 3 ô", "", 0,
  "Sao chép kỹ năng của kẻ địch gần nhất trong 1 / 2 / 3 ô và dùng ngay với 70% sức mạnh",
  "Khi đánh trúng", "Lắm Lời: 10% / 15% / 20% đòn đánh làm Câm lặng mục tiêu 1 giây",
  "Nâng kỹ năng", "Sáo Nói Tiếng Người: kỹ năng sao chép giữ 100% sức mạnh")
k("Cá Chép", "Vượt Vũ Môn", "Nhiều mục tiêu + Tăng sức", "mục tiêu + kẻ đứng sau", "2", 0,
  "Quẫy đuôi tạo sóng: {D} sát thương lên mục tiêu và kẻ đứng sau; tích 1 'vảy rồng' +5% Tấn Công (cộng dồn)",
  "Biến hình", "Cá Chép Hóa Rồng: sống 20 giây trên sân thì hóa Rồng Con đến hết trận – chỉ số ×1,3 / ×1,4 / ×1,5 và biết Bay",
  "Nâng kỹ năng", "Long Môn: hóa rồng sau 12 giây; Rồng Con có Hô Mưa Gọi Sấm (50% sức mạnh)",
  "Tấn công ĐB → Tấn Công; bỏ 'thêm hệ Huyền thoại'")
k("Cua Đồng", "Dã Tràng Xe Cát", "Đặc biệt", "ô phía trước", "", 0,
  "Đắp ụ cát chặn đòn đánh xa cho đồng đội phía sau trong 4 / 5 / 6 giây; ụ chịu {S:30} sát thương rồi sụp ('nhọc lòng mà chẳng nên công cán gì')",
  "Khi đánh trúng", "Càng Kẹp: 10% / 15% / 20% đòn đánh Trói mục tiêu 1 giây",
  "Nâng kỹ năng", "Mai Cứng: ụ cát sụp thì Cua +12 Giáp trong 4 giây",
  "ụ cát = 30% Máu Cua; +30% Phòng thủ → +12 Giáp")
k("Ốc Bươu Vàng", "Rút Vào Vỏ", "Chịu đòn", "bản thân", "", 0,
  "Đóng nắp vỏ: miễn sát thương đòn đánh thường trong 1,5 / 2 / 2,5 giây",
  "Triệu hồi", "Ngoại Lai: mỗi 8 giây đẻ 1 ốc con (10% / 12% / 15% chỉ số) cản đường",
  "Nâng kỹ năng", "Ốc Bươu Vàng Phá Lúa: ốc con Làm chậm 15% kẻ địch chạm vào",
  "'sát thương vật lý' → đòn đánh thường")
k("Thạch Sùng", "Tặc Lưỡi", "Đòn mạnh", "một Côn Trùng bất kỳ (không có thì mục tiêu hiện tại)", "1", 0,
  "Tặc lưỡi ba tiếng, bắt một VieAni Côn Trùng ở bất kỳ đâu: {D} sát thương (×1,5 lên Côn Trùng)",
  "Thiên địch", "Bám Tường: tầm đánh vô hạn với Côn Trùng; 10% / 15% / 20% né đòn",
  "Nâng kỹ năng", "Thạch Sùng Kêu: Tặc Lưỡi trúng thêm 1 Côn Trùng",
  "hệ Côn trùng → tộc hệ Côn Trùng")
k("Thằn Lằn Bóng", "Phóng Lưỡi", "Đòn mạnh", "một Côn Trùng bất kỳ (không có thì kẻ gần nhất)", "1", 0,
  "Phóng lưỡi bắt một VieAni Côn Trùng bất kỳ (không có thì kẻ địch gần nhất): {D} sát thương",
  "Khi máu thấp", "Đứt Đuôi: lần đầu nhận đòn chí tử thì còn lại 1 Máu / 10% / 20% Máu và chạy ra xa",
  "Nâng kỹ năng", "Đuôi Mọc Lại: sau Đứt Đuôi hồi 30% Máu trong 3 giây")
k("Cóc Nhà", "Nghiến Răng Gọi Mưa", "Tăng sức", "đồng đội Biển Đông / Sông Nước", "", 0,
  "Nghiến răng gọi mưa 5 giây: đồng đội Biển Đông / Sông Nước +15% / 20% / 25% sát thương",
  "Khi bị đánh", "Cậu Ông Trời: kẻ địch đánh Cóc bị sét đánh mất 15% Máu tối đa của nó; sét chờ 12 / 10 / 8 giây mới đánh lại",
  "Nâng kỹ năng", "Cóc Kiện Trời: mỗi lần Cóc nghiến răng, Cua Đồng, Hổ Đông Dương, Gấu chó, Ong Mật cùng phe ra đòn ngay",
  "hệ Nước → Biển Đông / Sông Nước; bỏ 'hệ Điện'")
k("Gián", "Chạy Trốn", "Đòn mạnh", "kẻ địch ít máu nhất", "1", 0,
  "Chạy khỏi tầm đánh 2 giây rồi quay lại cắn kẻ địch ít máu nhất: {D} sát thương",
  "Né đòn", "Bất Tử: 25% / 30% / 35% né đòn; Máu dưới 20% thì chạy khỏi tầm đánh 2 giây",
  "Nâng kỹ năng", "Gián Bay: khi Chạy Trốn thì biết Bay")
k("Muỗi Vằn", "Hút Máu", "Đòn mạnh + Hồi máu", "mục tiêu hiện tại", "1", 0,
  "Đốt hút máu: {D} sát thương, hồi bằng 50% sát thương gây ra; 30% gây Sốt 3 giây",
  "Khi đánh trúng", "Truyền Bệnh: 15% / 20% / 25% đòn đánh gây Sốt 3 giây (−20% Tốc Độ Đánh)",
  "Nâng kỹ năng", "Sốt Xuất Huyết: Sốt còn làm mục tiêu mất 2% Máu mỗi giây",
  "Tốc độ → Tốc Độ Đánh")
k("Đom Đóm", "Lập Lòe", "Diện rộng + Khống chế", "kẻ địch trong 1 ô quanh mục tiêu", "aoe", 1,
  "Nháy sáng: {D} sát thương và Mù 2 / 2,5 / 3 giây kẻ địch trong 1 ô quanh mục tiêu",
  "Hào quang", "Đèn Đêm: đồng đội kề bên +10% / 15% / 20% chính xác (bớt bị né)",
  "Nâng kỹ năng", "Đom Đóm Sáng Rực: Lập Lòe cho đồng đội trong vùng +15% Tấn Công 4 giây",
  "Tấn công ĐB → Tấn Công")
k("Kiến Lửa", "Đốt Rát", "Đòn mạnh + Độc / Bỏng", "mục tiêu hiện tại", "1", 1,
  "Cả tổ đốt: {D} sát thương và Bỏng 3% / 4% / 5% Máu mỗi giây trong 3 giây",
  "Cộng dồn", "Tổ Kiến: +5% Tấn Công mỗi 3 giây (tối đa 4 / 5 / 6 lần)",
  "Nâng kỹ năng", "Lửa Kiến: ×2 Máu mất do Bỏng")
k("Kiến Vàng", "Canh Vườn", "Đòn mạnh + Tăng sức", "mục tiêu hiện tại; đồng đội kề bên", "1", 0,
  "Cả đàn cắn: {D} sát thương; trong 5 giây sau Kiến Vàng +30% sát thương lên Côn Trùng và đồng đội kề bên +5 Giáp",
  "Chỉ số", "Kiến Thợ Dệt: +5 / 7 / 10 Giáp khi đứng cạnh một đồng đội",
  "Nâng kỹ năng", "Thiên Địch Sâu Bọ: ×2 Giáp cộng thêm của Canh Vườn",
  "bỏ 'hệ Cỏ' (kiến vàng làm tổ trên cây – v3 không còn hệ); +10% Phòng thủ → +5 Giáp")
k("Ong Mật", "Ngòi Chết", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Một cú đốt {D} sát thương nhưng Ong mất 50% Máu hiện có",
  "Hào quang", "Bầy Ong: mỗi Ong Mật trên sân cho đồng đội Côn Trùng +5% / 7% / 10% Tấn Công",
  "Nâng kỹ năng", "Ong Chúa Phù Hộ: Ngòi Chết chỉ làm Ong mất 20% Máu",
  "sát thương cao hơn mức chuẩn vì phải trả 50% Máu", coef=540)
k("Ve Sầu", "Khúc Ca Mùa Hè", "Đòn mạnh + Khống chế", "kẻ địch gần nhất", "1", 1,
  "Kêu inh ỏi: {D} sát thương và Choáng 0,5 / 0,75 / 1 giây kẻ địch gần nhất",
  "Chỉ số", "Vỏ Ve: +5 / 7 / 10 Giáp",
  "Khi máu thấp", "Lột Xác: 1 lần mỗi trận, Máu dưới 30% thì hồi 30% Máu",
  "+% Phòng thủ → +Giáp")
k("Châu Chấu", "Châu Chấu Đá Xe", "Đòn mạnh", "kẻ địch bậc cao nhất trong 3 ô", "1", 0,
  "Nhảy xa đá kẻ địch bậc cao nhất trong 3 ô: {D} sát thương, +50% nếu nó bậc cao hơn Châu Chấu",
  "Chỉ số", "Liều Mạng: +30% / 40% / 50% sát thương lên kẻ địch bậc cao hơn",
  "Khi đánh trúng", "Đẩy Xe: đòn đánh có 20% đẩy lùi kẻ địch bậc cao hơn 1 ô")
k("Chuồn Chuồn", "Bổ Nhào", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Bay vút xuống đánh 3 lần liên tiếp trong 1 giây: tổng {D} sát thương",
  "Hào quang", "Báo Mưa: đồng đội Biển Đông / Sông Nước +6% / 8% / 10% sát thương ('chuồn chuồn bay thấp thì mưa')",
  "Nâng kỹ năng", "Cắn Rốn Biết Bơi: 1 lần mỗi trận cho 1 đồng đội miễn sát thương từ VieAni Biển Đông / Sông Nước 5 giây",
  "hệ Nước → Biển Đông / Sông Nước")
k("Bọ Ngựa", "Lưỡi Hái", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Chém hai lưỡi hái: {D} sát thương; mục tiêu là Côn Trùng thì bị Trói 1 giây",
  "Đầu trận", "Rình Vồ: đòn đánh đầu tiên trong trận ×1,5 / ×2 / ×2,5 sát thương",
  "Nâng kỹ năng", "Bọ Ngựa Cái: hạ được kẻ địch thì hồi 30% Máu")
k("Heo Rừng", "Húc", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Lao húc: {D} sát thương và Choáng 1 / 1,25 / 1,5 giây",
  "Khi máu thấp", "Nanh Lợn Lòi: Máu dưới 50% thì +10% / 15% / 20% sát thương",
  "Nâng kỹ năng", "Hung Hãn: Húc trúng cả kẻ đứng sau mục tiêu")
k("Sóc Bụng Đỏ", "Tích Trữ Hạt", "Hồi máu + Tăng sức", "đồng đội ít máu nhất", "", 0,
  "Ném hạt dẻ cho đồng đội ít máu nhất: hồi 15% / 20% / 25% Máu tối đa và +10% Tấn Công trong 4 giây",
  "Né đòn", "Nhảy Cành: 15% / 20% / 25% né đòn",
  "Nâng kỹ năng", "Kho Hạt Mùa Đông: Tích Trữ Hạt cho 2 đồng đội",
  "hồi số cố định → % Máu")
k("Hoẵng", "Sủa Báo Động", "Tăng sức", "mọi đồng đội", "", 0,
  "Kêu như tiếng chó sủa báo động: đồng đội +15% / 20% / 25% né đòn trong 3 giây",
  "Né đòn", "Nhanh Chân: 10% / 15% / 20% né đòn",
  "Nâng kỹ năng", "Rừng Có Mắt: Sủa Báo Động làm lộ kẻ địch Ẩn mình và kẻ địch trong 2 ô −15% chính xác")
k("Tắc Kè", "Tàng Hình", "Đòn mạnh", "mục tiêu hiện tại", "1", 0,
  "Đổi màu da ẩn mình 3 / 4 / 5 giây rồi ngoạm chặt mục tiêu: {D} sát thương",
  "Khi đánh trúng", "Ngoạm Chặt: 10% / 15% / 20% đòn đánh Trói mục tiêu 2 giây",
  "Nâng kỹ năng", "Tắc Kè Kêu Mưa: đòn đầu tiên sau Tàng Hình chí mạng và Choáng 1 giây")
k("Rắn Hổ Mang", "Nọc Thần Kinh", "Đòn mạnh + Độc / Bỏng", "mục tiêu hiện tại", "1", 1,
  "Phun nọc: {D} sát thương, Độc 4% / 5% / 6% Máu mỗi giây và Làm chậm 20% trong 3 giây",
  "Né đòn", "Ngọc Rắn: né kỹ năng đầu tiên nhắm vào mình mỗi trận",
  "Hào quang", "Rồng Rắn Lên Mây: đứng cạnh Rồng Lạc Việt hoặc Rồng Con thì biết Bay và +20% Tấn Công",
  "Tấn công ĐB → Tấn Công")
k("Trăn Gấm", "Siết Chặt", "Đòn mạnh + Khống chế", "mục tiêu hiện tại", "1", 1,
  "Quấn siết, Trói 2 / 2,5 / 3 giây: {D} sát thương và mất thêm 5% Máu mỗi giây bị siết",
  "Giảm sát thương", "Da Gấm: giảm 10% / 15% / 20% sát thương kỹ năng nhận vào",
  "Hào quang", "Rồng Rắn Lên Mây: đứng cạnh Rồng Lạc Việt hoặc Rồng Con thì biết Bay; Siết Chặt thêm 1 giây",
  "'sát thương ĐB' → sát thương kỹ năng")
k("Cá Đuối Điện", "Phóng Điện", "Nhiều mục tiêu + Khống chế", "nảy qua 3 kẻ địch", "aoe", 1,
  "Dòng điện nảy qua 3 kẻ địch: mỗi kẻ {D} sát thương và Tê liệt 1 giây",
  "Khi bị đánh", "Da Tích Điện: 15% / 20% / 25% Tê liệt kẻ đánh cận chiến 1 giây",
  "Nâng kỹ năng", "Lưới Điện: Phóng Điện nảy 5 lần")
k("Sứa", "Xúc Tu Độc", "Diện rộng + Khống chế + Độc / Bỏng", "kẻ địch trong 1 ô quanh mình", "aoe", 1,
  "Quấn xúc tu: kẻ địch trong 1 ô nhận {D} sát thương, Trói 1 giây và Độc 3% Máu mỗi giây trong 3 giây",
  "Khi bị đánh", "Tế Bào Gai: kẻ đánh cận chiến bị phản 10% / 15% / 20% sát thương",
  "Khi bị hạ", "Sứa Bất Tử: 1 lần mỗi trận, bị hạ thì sống lại với 30% Máu (thủy tức trở lại)")
k("Mực", "Phun Mực", "Diện rộng + Khống chế", "kẻ địch trong 1 ô quanh mục tiêu", "aoe", 1,
  "Phun mực đen: {D} sát thương và Mù 2 / 3 / 4 giây kẻ địch trong 1 ô quanh mục tiêu",
  "Né đòn", "Đổi Màu: 15% / 20% / 25% né đòn đánh xa",
  "Nâng kỹ năng", "Mực Khổng Lồ: Phun Mực bán kính 2 ô")
k("Cú Mèo", "Săn Đêm", "Đòn mạnh", "kẻ địch đang Ẩn mình, không có thì ít máu nhất", "1", 0,
  "Lặng lẽ sà xuống kẻ địch đang Ẩn mình (không có thì kẻ ít máu nhất): {D} sát thương, không thể bị né",
  "Chỉ số", "Mắt Đêm: đòn đánh không bị né; +5% / 10% / 15% chí mạng",
  "Nâng kỹ năng", "Cú Vọ: Săn Đêm làm Câm lặng mục tiêu 2 giây")
k("Diều Hâu", "Sà Xuống", "Đòn mạnh", "mục tiêu hiện tại (tầm vô hạn với Gà, Chuột, Rắn)", "1", 0,
  "Lao xuống từ trên cao: {D} sát thương; tầm vô hạn nếu nhắm Gà, Chuột hoặc Rắn",
  "Chỉ số", "Mắt Diều Hâu: +10% / 15% / 20% chí mạng lên mục tiêu không có đồng đội kề bên",
  "Nâng kỹ năng", "Quắp Mồi: Sà Xuống nhấc mục tiêu lên 1 giây (không hành động)")
k("Sói Đỏ", "Sói Hú", "Tăng sức", "Sói Đỏ + đồng đội Bầy Chó Dữ", "", 0,
  "Hú gọi bầy: Sói Đỏ và đồng đội Bầy Chó Dữ +15% / 20% / 25% Tấn Công và Tốc Độ Đánh trong 5 giây",
  "Chỉ số", "Săn Bầy: +5% / 8% / 10% sát thương cho mỗi VieAni vai trò Săn Mồi khác trên sân",
  "Triệu hồi", "Gọi Bầy: triệu hồi 2 sói con (40% chỉ số của Sói Đỏ, 30% chí mạng)",
  "'đồng đội Chó & Sói' → Bầy Chó Dữ; ★3 xếp mẫu Triệu hồi")


def coef_of(e, role, energy):
    if e["coef"]:
        return e["coef"]
    if not e["hit"]:
        return None
    c = energy * 4
    c *= {"1": 1, "2": 0.75, "aoe": 0.5}[e["hit"]]
    if e["cc"]:
        c *= 0.75
    c *= {"Phép Thuật": 1.25, "Hỗ Trợ": 0.75}.get(role, 1)
    return int(round(c / 10) * 10)


def r5(x):
    return int(5 * round(x / 5))


def fill(text, sp, coef):
    st = sp["stats"]
    if "{D}" in text:
        text = text.replace("{D}", " / ".join(f"{r5(st['atk'] * coef / 100 * m):,}".replace(",", ".") for m in STAR))
    while "{S:" in text:
        i = text.index("{S:"); j = text.index("}", i); p = int(text[i + 3:j])
        text = text[:i] + " / ".join(f"{r5(st['hp'] * p / 100 * m):,}".replace(",", ".") for m in STAR) + text[j + 1:]
    return text


def main(sheet_dir=None):
    d = json.loads((ROOT / "data/vieindex.json").read_text(encoding="utf-8"))
    keep = {s["vi"]: s for s in d["species"] if s.get("status") == "keep"}
    missing = set(keep) - set(K); extra = set(K) - set(keep)
    assert not missing and not extra, (missing, extra)
    out = []
    for vi, e in K.items():
        sp = keep[vi]; en = sp["skills"]["active"]["energy"]; c = coef_of(e, sp["role"], en)
        for t in e["at"].split(" + "): assert t in ACTIVE_TPL, (vi, t)
        assert e["pt"] in PASSIVE_TPL and e["st"] in PASSIVE_TPL, vi
        out.append({"id": sp["id"], "vi": vi, "tier": sp["tier"], "role": sp["role"], "energy": en,
                    "active": {"name": e["an"], "templates": e["at"].split(" + "), "target": e["tgt"], "hit": e["hit"],
                               "control": bool(e["cc"]), "atkPct": c, "text": fill(e["atext"], sp, c)},
                    "passive": {"template": e["pt"], "text": e["ptext"]},
                    "star3": {"template": e["st"], "text": e["stext"]}, "change": e["note"],
                    "old": sp["skills"]})
    (ROOT / "data/skills_v3.json").write_text(json.dumps(
        {"note": "T11 skill table v3 – generated by scripts/skills_v3.py; PO approves in the Sheet tab 'Kỹ năng v3 – duyệt'",
         "birds": BIRDS, "activeTemplates": ACTIVE_TPL, "passiveTemplates": PASSIVE_TPL, "skills": out},
        ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print("skills:", len(out))
    if sheet_dir:
        sd = pathlib.Path(sheet_dir); sd.mkdir(parents=True, exist_ok=True)
        (sd / "out.json").write_text(json.dumps({e["vi"]: e for e in out}, ensure_ascii=False), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else None)
