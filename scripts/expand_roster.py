"""One-time roster expansion (11/2026): new 5-tier system, everyday animals, insects,
skills, zodiac (12 con giáp), new synergies and predator/symbiosis relations.

    python3 scripts/expand_roster.py      # safe to re-run: skips if already applied
then: python3 scripts/draft_stats.py --force && python3 scripts/sprites.py && python3 scripts/build_vieindex.py
"""
import json, pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
D = ROOT / "data"
load = lambda n: json.loads((D / n).read_text(encoding="utf-8"))
def save(n, obj):
    (D / n).write_text(json.dumps(obj, ensure_ascii=False, indent=1), encoding="utf-8")

# group code -> tier.  Tier 1 everyday, 2 wild but not threatened, 3 threatened,
# 4 extinct / gone from Vietnam, 5 legendary.
TIER_BY_GROUP = {"Common": 1, "Wild": 2, "Endangered": 3, "Vanished": 4, "Legendary": 5}

# id, vi, en, sci, group, types, habitat, body, zodiac, synergies, iucn, skill, note, tweak
NEW = [
 # ---- Tier 1: everyday animals ----
 (51, "Chó Cỏ", "Vietnamese Native Dog", "Canis familiaris", "Common", ["Ground"], "Village", "dog", "Tuất", ["Bầy Chó"], None,
  "Giữ nhà: đứng hàng sau thì +20% Phòng thủ cho đồng đội kề bên", "Giống chó bản địa có mặt khắp làng quê Việt Nam; khỏe, dễ nuôi, trung thành.", None),
 (52, "Chó H'Mông Cộc Đuôi", "Hmong Bobtail Dog", "Canis familiaris", "Common", ["Ground", "Rock"], "Mountain", "dog", "Tuất", ["Bầy Chó", "Tứ Quốc Khuyển"], None,
  "Săn vùng núi: miễn bị làm chậm; +20% né đòn 5 giây đầu trận", "Giống chó spitz cổ của người H'Mông miền núi phía Bắc, đuôi cộc bẩm sinh, dùng để săn và canh gác; một trong 'tứ đại quốc khuyển'.", {"def": 10, "spe": -10}),
 (53, "Chó Phú Quốc", "Phu Quoc Ridgeback", "Canis familiaris", "Common", ["Ground", "Water"], "Island", "dog", "Tuất", ["Bầy Chó", "Tứ Quốc Khuyển"], None,
  "Xoáy lưng: đòn đầu tiên lên mỗi mục tiêu luôn chí mạng", "Giống chó có dải lông xoáy dọc sống lưng ở đảo Phú Quốc, nhanh nhẹn, được người dân đảo dùng để săn từ hàng trăm năm; một trong 'tứ đại quốc khuyển'.", {"spe": 10, "def": -10}),
 (54, "Chó Bắc Hà", "Bac Ha Dog", "Canis familiaris", "Common", ["Ground", "Rock"], "Mountain", "dog", "Tuất", ["Bầy Chó", "Tứ Quốc Khuyển"], None,
  "Chăn dắt: khiêu khích kẻ địch gần nhất phải đánh mình trong 2 giây", "Giống spitz cỡ vừa, lông dày ở vùng Bắc Hà (Lào Cai), do người H'Mông nuôi để săn, canh gác và chăn gia súc; một trong 'tứ đại quốc khuyển'.", {"hp": 10, "spa": -10}),
 (55, "Chó Lài", "Lai Dog (Indochinese Dingo)", "Canis familiaris", "Common", ["Ground"], "Mountain", "dog", "Tuất", ["Bầy Chó", "Tứ Quốc Khuyển"], None,
  "Bản năng hoang dã: +20% Tấn công khi máu dưới 50%", "Giống chó nguyên thủy vùng trung du, miền núi, còn gọi 'Dingo Đông Dương'; nguồn gốc còn tranh luận. Một trong 'tứ đại quốc khuyển'.", {"atk": 10, "spd": -10}),
 (56, "Mèo Mướp", "Tabby Cat", "Felis catus", "Common", ["Ground"], "Home", "cat", "Mão", ["Bầy Mèo"], None,
  "Vồ mồi: đòn đầu tiên lên mỗi mục tiêu +30% sát thương", "Mèo nhà lông vằn phổ biến nhất ở Việt Nam. Người Việt chọn con Mèo (không phải con Thỏ) làm con giáp Mão.", None),
 (57, "Mèo Mun", "Black Cat", "Felis catus", "Common", ["Ground", "Poison"], "Home", "cat", "Mão", ["Bầy Mèo"], None,
  "Điềm gở: kẻ địch đánh Mèo Mun có 10% đánh trượt", "Mèo lông đen tuyền; tín ngưỡng dân gian kiêng để mèo đen nhảy qua thi hài.", {"spa": 10, "def": -10}),
 (58, "Mèo Tam Thể", "Calico Cat", "Felis catus", "Common", ["Ground"], "Home", "cat", "Mão", ["Bầy Mèo"], None,
  "May mắn: 15% hồi sinh với 25% máu khi bị hạ", "Lông ba màu trắng, cam, đen; gần như luôn là mèo cái vì gen màu cam nằm trên nhiễm sắc thể X.", {"spd": 10, "atk": -10}),
 (59, "Gà Ri", "Ri Chicken", "Gallus gallus domesticus", "Common", ["Ground"], "Village", "fowl", "Dậu", ["Đàn Gà"], None,
  "Bới đất: mỗi 5 giây hồi 5% máu", "Giống gà ta nhỏ con, đẻ khỏe, nuôi thả phổ biến ở làng quê miền Bắc.", None),
 (60, "Gà Đông Tảo", "Dong Tao Chicken", "Gallus gallus domesticus", "Common", ["Ground"], "Village", "fowl", "Dậu", ["Đàn Gà"], None,
  "Chân voi: miễn bị đẩy lùi; +20% Phòng thủ", "Giống gà quý ở xã Đông Tảo (Khoái Châu, Hưng Yên), nổi tiếng với đôi chân rất to; thuộc danh mục nguồn gen vật nuôi cần bảo tồn.", {"hp": 10, "def": 15, "spe": -25}),
 (61, "Gà Chọi", "Vietnamese Fighting Cock", "Gallus gallus domesticus", "Common", ["Ground"], "Village", "fowl", "Dậu", ["Đàn Gà"], None,
  "Đá cựa: 20% gây chảy máu (mất 3% máu/giây trong 3 giây)", "Gà chọi gắn với hội chọi gà truyền thống ở nhiều làng quê.", {"atk": 15, "spd": -15}),
 (62, "Heo Ỉ", "I Pig", "Sus scrofa domesticus", "Common", ["Ground"], "Village", "pig", "Hợi", ["Ủn Ỉn", "Gia Súc"], None,
  "Bụng phệ: +25% Máu tối đa", "Giống lợn nội miền Bắc, lưng võng, bụng xệ, da đen; có nguy cơ tuyệt chủng nên đang được giữ giống để bảo tồn.", {"hp": 10, "spe": -10}),
 (63, "Heo Móng Cái", "Mong Cai Pig", "Sus scrofa domesticus", "Common", ["Ground"], "Village", "pig", "Hợi", ["Ủn Ỉn", "Gia Súc"], None,
  "Mắn đẻ: khi bị hạ, để lại 1 heo con (20% chỉ số)", "Giống lợn lang đen trắng vùng Móng Cái (Quảng Ninh), một dòng của lợn Ỉ; đàn thuần bị ảnh hưởng nặng bởi dịch tả lợn châu Phi năm 2019.", None),
 (64, "Chuột Nhắt", "House Mouse", "Mus musculus", "Common", ["Ground"], "Home", "rodent", "Tý", ["Bầy Chuột"], None,
  "Lẻn nhanh: 25% né đòn", "Loài chuột nhỏ sống quanh nhà ở khắp thế giới.", {"spe": 15, "hp": -15}),
 (65, "Chuột Cống", "Brown Rat", "Rattus norvegicus", "Common", ["Ground", "Poison"], "Home", "rodent", "Tý", ["Bầy Chuột"], None,
  "Mầm bệnh: đòn đánh gây nhiễm độc 2% máu/giây trong 3 giây", "Chuột lớn sống ở cống rãnh; có thể mang mầm bệnh như xoắn khuẩn Leptospira.", {"hp": 10, "atk": 5, "spe": -15}),
 (66, "Chuột Đồng", "Rice-field Rat", "Rattus argentiventer", "Common", ["Ground", "Grass"], "Field", "rodent", "Tý", ["Bầy Chuột", "Đồng Quê"], None,
  "Phá lúa: kẻ địch bị đánh giảm 15% hồi máu", "Loài gây hại lúa chính ở Đông Nam Á; thịt chuột đồng là món quen thuộc ở miền Tây.", None),
 (67, "Trâu", "Water Buffalo", "Bubalus bubalis", "Common", ["Ground", "Water"], "Field", "giant", "Sửu", ["Đồng Quê", "Gia Súc"], None,
  "Đầu cơ nghiệp: đồng đội Đồng Quê +10% Phòng thủ", "'Con trâu là đầu cơ nghiệp' – sức kéo chính của nhà nông; người Việt lấy con Trâu làm con giáp Sửu.", {"spe": -10, "hp": 10}),
 (68, "Dê", "Domestic Goat", "Capra hircus", "Common", ["Rock"], "Mountain", "goat", "Mùi", ["Gia Súc"], None,
  "Leo vách: +20% né đòn", "Dê được nuôi nhiều ở vùng núi đá vôi (như Ninh Bình); con giáp Mùi.", None),
 (69, "Ngựa Ta", "Vietnamese Horse", "Equus caballus", "Common", ["Ground"], "Mountain", "horse", "Ngọ", ["Gia Súc"], None,
  "Thồ hàng: đồng đội kề bên +10% Tốc độ", "Ngựa nội nhỏ con, bền sức, dùng thồ hàng ở vùng núi phía Bắc; con giáp Ngọ.", None),
 (70, "Vịt Cỏ", "Native Duck", "Anas platyrhynchos domesticus", "Common", ["Water", "Sky"], "Field", "duck", None, ["Đồng Quê"], None,
  "Lội ruộng: nhặt mồi hồi 3% máu mỗi 4 giây", "Giống vịt nội nhỏ con, nuôi chạy đồng; nông dân thả vịt để ăn ốc bươu vàng hại lúa.", None),
 (71, "Cò Trắng", "Little Egret", "Egretta garzetta", "Common", ["Sky", "Water"], "Field", "wader", None, ["Đồng Quê", "Đất Ngập Nước"], "Ít quan tâm (LC)",
  "Mổ chính xác: +30% sát thương lên cá và ếch", "'Con cò bay lả bay la' – hình ảnh quen thuộc trong ca dao và đồng ruộng Việt.", None),
 (72, "Chim Sẻ", "Eurasian Tree Sparrow", "Passer montanus", "Common", ["Sky"], "Village", "smallbird", None, ["Lông Vũ"], "Ít quan tâm (LC)",
  "Bầy sẻ: +5% Tốc độ cho mỗi VieAni hệ Trời trên sân", "Loài chim nhỏ quen thuộc nhất ở mái nhà, sân phơi.", None),
 (73, "Sáo Sậu", "Black-collared Starling", "Gracupica nigricollis", "Common", ["Sky"], "Field", "smallbird", None, ["Lông Vũ"], "Ít quan tâm (LC)",
  "Bắt chước: sao chép kỹ năng của kẻ địch gần nhất (1 lần mỗi trận)", "Loài sáo phổ biến ở đồng ruộng, hay được nuôi vì giọng hót và khả năng bắt chước âm thanh.", {"spa": 10, "spe": -10}),
 (74, "Cá Rô Đồng", "Climbing Perch", "Anabas testudineus", "Common", ["Water", "Ground"], "Field", "smallfish", None, ["Đồng Quê"], None,
  "Lên cạn: đứng ô cạn không bị phạt; khi máu thấp thì trườn ra xa", "Có cơ quan hô hấp phụ giúp thở khí trời, sống được ở nước thiếu oxy và trườn được quãng ngắn trên đất ẩm.", None),
 (75, "Cá Chép", "Common Carp", "Cyprinus carpio", "Common", ["Water"], "Field", "carp", None, ["Đồng Quê"], None,
  "Vượt Vũ Môn: sống sót 20 giây thì hóa Rồng (chỉ số ×1,5, thêm hệ Huyền thoại)", "Ngày 23 tháng Chạp, người Việt thả cá chép với ý 'cá hóa rồng' đưa ông Táo về trời.", None),
 (76, "Cá Lóc", "Striped Snakehead", "Channa striata", "Common", ["Water"], "Field", "predfish", None, ["Săn Mồi"], None,
  "Rình mồi: đòn đầu tiên từ ẩn nấp +40% sát thương", "Loài cá săn mồi quen thuộc ở ao, ruộng; món cá lóc nướng trui của miền Tây.", None),
 (77, "Cua Đồng", "Rice-field Crab", "Somanniathelphusa sp.", "Common", ["Water", "Rock"], "Field", "crab", None, ["Đồng Quê"], None,
  "Càng kẹp: giữ chân mục tiêu 1 giây", "Sống trong hang ở bờ ruộng; món canh cua rau đay quen thuộc.", None),
 (78, "Ốc Bươu Vàng", "Golden Apple Snail", "Pomacea canaliculata", "Common", ["Water"], "Field", "snail", None, ["Đồng Quê"], None,
  "Ngoại lai: mỗi 8 giây đẻ 1 ốc con (10% chỉ số)", "Loài ngoại lai xâm hại gốc Nam Mỹ, phá hại lúa nghiêm trọng ở Việt Nam.", None),
 (79, "Thạch Sùng", "Common House Gecko", "Hemidactylus frenatus", "Common", ["Rock"], "Home", "gecko", None, ["Săn Côn Trùng"], "Ít quan tâm (LC)",
  "Tặc lưỡi: tầm đánh vô hạn với hệ Côn trùng – luôn bắt Côn trùng ở bất kỳ đâu trên sân", "Bò trên tường, trần nhà bắt muỗi và côn trùng; tiếng 'tặc lưỡi' gắn với thành ngữ 'Thạch Sùng còn thiếu mẻ kho'.", None),
 (80, "Thằn Lằn Bóng", "Common Sun Skink", "Eutropis multifasciata", "Common", ["Ground", "Grass"], "Village", "gecko", None, ["Săn Côn Trùng"], "Ít quan tâm (LC)",
  "Đứt đuôi: lần đầu nhận đòn chí tử, còn lại 1 máu và chạy ra xa", "Thằn lằn thân bóng hay phơi nắng ở vườn; có thể tự cắt đuôi để thoát thân.", {"hp": 10, "spa": -10}),
 (81, "Cóc Nhà", "Asian Common Toad", "Duttaphrynus melanostictus", "Common", ["Poison", "Water"], "Village", "toad", None, ["Săn Côn Trùng"], "Ít quan tâm (LC)",
  "Cậu ông Trời: khi bị hạ thì gọi mưa – đòn hệ Nước của đồng đội +20% trong 5 giây", "Tuyến sau mắt tiết nhựa độc. Truyện 'Cóc kiện Trời' kể cóc lên kiện Trời đòi mưa, nên dân gian gọi 'con cóc là cậu ông Trời'.", None),
 (82, "Ếch Đồng", "East Asian Bullfrog", "Hoplobatrachus rugulosus", "Common", ["Water"], "Field", "frog", None, ["Săn Côn Trùng", "Đồng Quê"], "Ít quan tâm (LC)",
  "Nhảy xa: nhảy thẳng tới hàng sau của địch", "Loài ếch lớn của đồng ruộng, ăn nhiều côn trùng hại lúa.", None),
 (83, "Gián", "American Cockroach", "Periplaneta americana", "Common", ["Insect"], "Home", "roach", None, ["Côn Trùng", "Dạ Hành"], None,
  "Chạy trốn: 35% né đòn; khi máu dưới 20% chạy khỏi tầm đánh 2 giây", "Côn trùng sống dai, chạy rất nhanh, hoạt động về đêm trong nhà bếp, cống rãnh.", None),
 (84, "Muỗi Vằn", "Yellow Fever Mosquito", "Aedes aegypti", "Common", ["Insect", "Poison"], "Home", "mosquito", None, ["Côn Trùng"], None,
  "Hút máu: hồi 30% sát thương gây ra; 15% gây Sốt (−20% Tốc độ trong 3 giây)", "Muỗi truyền bệnh sốt xuất huyết; lăng quăng (bọ gậy) sống trong nước đọng.", None),
 (85, "Đom Đóm", "Firefly", "Lampyridae", "Common", ["Insect", "Fire"], "Field", "firefly", None, ["Côn Trùng", "Dạ Hành"], None,
  "Lập lòe: mỗi 5 giây làm chói mắt 1 kẻ địch (−30% chính xác trong 2 giây)", "Phát sáng bằng phản ứng sinh hóa (ánh sáng lạnh) – trong game xếp hệ Lửa.", None),
 (86, "Kiến Lửa", "Tropical Fire Ant", "Solenopsis geminata", "Common", ["Insect", "Fire"], "Field", "ant", None, ["Côn Trùng", "Tổ Đàn"], None,
  "Đốt rát: gây bỏng 3% máu/giây trong 3 giây", "Vết đốt nóng rát như lửa; sống thành tổ lớn dưới đất.", None),
 (87, "Kiến Vàng", "Weaver Ant", "Oecophylla smaragdina", "Common", ["Insect"], "Field", "ant", None, ["Côn Trùng", "Tổ Đàn"], None,
  "Canh vườn: +30% sát thương lên Côn trùng khác; đồng đội hệ Cỏ +10% Phòng thủ", "Nông dân miền Tây nuôi kiến vàng trong vườn cam quýt để diệt sâu hại, giảm thuốc trừ sâu.", {"def": 10, "spa": -10}),
 (88, "Ong Mật", "Asian Honeybee", "Apis cerana", "Common", ["Insect", "Poison"], "Field", "bee", None, ["Côn Trùng", "Tổ Đàn"], None,
  "Ngòi chết: một đòn đốt ×3 sát thương nhưng Ong mất 50% máu", "Ong thợ có ngòi răng cưa; khi đốt động vật có vú, ngòi mắc lại và ong chết.", None),
 (89, "Ve Sầu", "Cicada", "Cicadidae", "Common", ["Insect"], "Village", "cicada", None, ["Côn Trùng"], None,
  "Khúc ca mùa hè: mỗi 6 giây làm choáng kẻ địch gần nhất 0,5 giây. Lột xác: hồi 30% máu một lần", "Tiếng ve báo hiệu mùa hè; ấu trùng sống nhiều năm dưới đất rồi lột xác.", None),
 (90, "Châu Chấu", "Rice Grasshopper", "Oxya sp.", "Common", ["Insect", "Grass"], "Field", "grasshopper", None, ["Côn Trùng", "Đồng Quê"], None,
  "Châu chấu đá xe: +50% sát thương lên kẻ địch bậc cao hơn", "Côn trùng hại lúa; thành ngữ 'châu chấu đá xe' nói kẻ yếu dám chống kẻ mạnh.", None),
 (91, "Chuồn Chuồn", "Dragonfly", "Anisoptera", "Common", ["Insect", "Sky"], "Field", "dragonfly", None, ["Côn Trùng"], None,
  "Báo mưa: đồng đội hệ Nước +10% sát thương ('chuồn chuồn bay thấp thì mưa')", "Thợ săn muỗi trên không; tục ngữ 'chuồn chuồn bay thấp thì mưa, bay cao thì nắng, bay vừa thì râm'.", None),
 (92, "Bọ Ngựa", "Praying Mantis", "Mantodea", "Common", ["Insect", "Grass"], "Field", "mantis", None, ["Côn Trùng"], None,
  "Rình vồ: đòn đầu tiên ×2 sát thương", "Côn trùng săn mồi với đôi chân trước hình lưỡi hái, ăn nhiều sâu bọ hại.", None),
 # ---- Tier 2: wild, not threatened ----
 (93, "Heo Rừng", "Wild Boar", "Sus scrofa", "Wild", ["Ground"], "Forest", "pig", "Hợi", ["Ủn Ỉn"], "Ít quan tâm (LC)",
  "Húc: lao vào kẻ địch, gây choáng 1 giây", "Tổ tiên của lợn nhà; sống ở rừng khắp Việt Nam.", None),
 (94, "Mèo Rừng", "Leopard Cat", "Prionailurus bengalensis", "Wild", ["Grass"], "Forest", "predator", "Mão", ["Săn Mồi", "Dạ Hành"], "Ít quan tâm (LC)",
  "Vồ chuột: +40% sát thương lên Chuột", "Loài mèo hoang nhỏ có đốm, phổ biến nhất trong rừng Việt Nam, săn chuột về đêm.", None),
 (95, "Khỉ Vàng", "Rhesus Macaque", "Macaca mulatta", "Wild", ["Grass", "Rock"], "Forest", "macaque", "Thân", ["Rừng Xanh"], "Ít quan tâm (LC)",
  "Trộm đồ: cướp 1 hiệu ứng tăng cường của kẻ địch", "Loài khỉ phổ biến ở rừng và núi đá miền Bắc; con giáp Thân.", None),
 (96, "Sóc Bụng Đỏ", "Pallas's Squirrel", "Callosciurus erythraeus", "Wild", ["Grass"], "Forest", "small", None, ["Rừng Xanh"], "Ít quan tâm (LC)",
  "Tích trữ: mỗi 6 giây hồi 6% máu", "Loài sóc leo cây phổ biến, bụng màu nâu đỏ.", None),
 (97, "Hoẵng", "Red Muntjac", "Muntiacus vaginalis", "Wild", ["Grass"], "Forest", "deer", None, ["Rừng Xanh"], "Ít quan tâm (LC)",
  "Sủa báo động: khi bị đánh lần đầu, đồng đội +15% né đòn trong 3 giây", "Còn gọi mang thường hay 'hươu sủa' vì tiếng kêu như chó sủa.", None),
 (98, "Tắc Kè", "Tokay Gecko", "Gekko gecko", "Wild", ["Rock"], "Forest", "gecko", None, ["Săn Côn Trùng", "Rừng Xanh"], "Ít quan tâm (LC)",
  "Ngoạm chặt: giữ chân mục tiêu 2 giây", "Tiếng kêu 'tắc kè' đặc trưng; thường bị săn bắt làm thuốc.", None),
 (99, "Rắn Hổ Mang", "Monocled Cobra", "Naja kaouthia", "Wild", ["Poison"], "Field", "snake", "Tỵ", ["Mãng Xà"], "Ít quan tâm (LC)",
  "Nọc thần kinh: gây độc 4% máu/giây trong 3 giây", "Rắn độc bành mang khi bị đe dọa; ăn nhiều chuột đồng. Con giáp Tỵ.", None),
 (100, "Trăn Gấm", "Reticulated Python", "Malayopython reticulatus", "Wild", ["Ground"], "Forest", "python", "Tỵ", ["Mãng Xà", "Săn Mồi"], "Ít quan tâm (LC)",
  "Siết chặt: trói mục tiêu 2 giây, mỗi giây −5% máu", "Loài trăn dài nhất thế giới; siết mồi đến chết rồi nuốt chửng.", None),
 (101, "Cá Đuối Điện", "Electric Ray", "Narke dipterygia", "Wild", ["Water", "Electric"], "Sea", "ray", None, ["Biển Đông"], "Nhiều loài – không xếp hạng chung",
  "Phóng điện: 25% làm tê liệt mục tiêu 1 giây", "Vùng biển Việt Nam có một số loài cá đuối điện như cá đuối điện chấm trắng (Narke dipterygia); chúng phát điện để tự vệ và bắt mồi.", None),
 (102, "Sứa", "Jellyfish", "Scyphozoa", "Wild", ["Water", "Poison"], "Sea", "jelly", None, ["Biển Đông"], "Nhiều loài – không xếp hạng chung",
  "Xúc tu độc: kẻ đánh cận chiến bị phản 15% sát thương dạng độc", "Trôi theo dòng nước, xúc tu có tế bào châm độc.", None),
 (103, "Mực", "Cuttlefish", "Sepiida", "Wild", ["Water"], "Sea", "squid", None, ["Biển Đông"], "Nhiều loài – không xếp hạng chung",
  "Phun mực: làm mù kẻ địch xung quanh 2 giây", "Phun mực đen để thoát thân, đổi màu da để ngụy trang.", None),
 (104, "Cú Mèo", "Collared Scops Owl", "Otus lettia", "Wild", ["Sky"], "Forest", "owl", None, ["Dạ Hành", "Rừng Xanh"], "Ít quan tâm (LC)",
  "Mắt đêm: không thể bị né đòn bởi VieAni Dạ Hành", "Loài cú nhỏ có túm lông tai, săn chuột và côn trùng về đêm.", None),
 (105, "Diều Hâu", "Black Kite", "Milvus migrans", "Wild", ["Sky"], "Village", "raptor", None, ["Săn Mồi"], "Ít quan tâm (LC)",
  "Sà xuống: tầm đánh vô hạn với nhóm Gà", "Loài chim săn mồi hay lượn trên làng quê; dân gian gắn diều hâu với cảnh rình bắt gà con.", None),
 (106, "Kỳ Đà", "Asian Water Monitor", "Varanus salvator", "Wild", ["Ground", "Water"], "Wetland", "monitor", None, ["Săn Mồi"], "Ít quan tâm (LC)",
  "Quất đuôi: đánh lan sang kẻ địch kề bên", "Loài thằn lằn lớn bơi giỏi, ăn cá, trứng và xác động vật.", None),
 # ---- Tier 3: threatened ----
 (107, "Sói Đỏ", "Dhole", "Cuon alpinus", "Endangered", ["Ground"], "Forest", "predator", None, ["Săn Mồi"], "Nguy cấp (EN)",
  "Săn bầy: +10% sát thương cho mỗi VieAni Săn Mồi khác trên sân", "Loài chó hoang săn theo bầy, còn gọi chó sói lửa; vẫn được ghi nhận ở một số rừng Việt Nam như Pù Hoạt (Nghệ An).", {"spe": 10, "hp": -10}),
 (108, "Cà Cuống", "Giant Water Bug", "Lethocerus indicus", "Endangered", ["Insect", "Water"], "Field", "waterbug", None, ["Côn Trùng", "Đồng Quê"], "Sách Đỏ Việt Nam (1992)",
  "Tinh dầu cà cuống: mùi hương khiến đồng đội +10% Tấn công", "Tinh dầu cà cuống từng là gia vị đặc sản (bánh cuốn, nước chấm); nay rất hiếm.", None),
]

# Skills for the original 50
SKILL = {
 1: "Hô mưa gọi sấm: mỗi 6 giây giáng sét xuống 3 kẻ địch (sát thương hệ Điện)",
 2: "Vũ điệu trống đồng: khi Chim Lạc còn trên sân, đồng đội +10% Tốc độ",
 3: "Nỏ thần: đồng đội đánh tầm xa +20% sát thương",
 4: "Múa lân trừ tà: mỗi 8 giây xóa hiệu ứng xấu khỏi đồng đội",
 5: "Tái sinh từ lửa: hồi sinh 1 lần với 50% máu",
 6: "Trấn giữ: gánh 30% sát thương thay cho đồng đội kề bên",
 7: "Chín ngà: cú húc gây sát thương lan 3 ô phía trước",
 8: "Chín cựa: mỗi đòn đánh trúng 2 lần",
 9: "Phi nước đại: luôn ra đòn đầu tiên trong trận",
 10: "Phun lửa: đốt cả một hàng kẻ địch, gây bỏng 3 giây",
 11: "Sóng dữ: đẩy lùi và làm chậm hàng đầu của địch",
 12: "Mê hoặc: khiến 1 kẻ địch tấn công đồng đội của nó trong 2 giây",
 13: "Cứu nạn: che chắn đồng đội sắp bị hạ, hồi 25% máu (1 lần mỗi đồng đội)",
 14: "Sừng tê: lao húc gây choáng 1,5 giây",
 15: "Sừng cong: phản 15% sát thương cận chiến",
 16: "Đấm đá: đòn đánh gây sát thương lan",
 17: "Chúa sơn lâm: kẻ địch xung quanh −15% Tấn công",
 18: "Ẩn trong tán rừng: 20% né đòn",
 19: "Trường thọ: hồi 2% máu mỗi giây",
 20: "Kỳ lân châu Á: không bị chọn làm mục tiêu trong 3 giây đầu trận",
 21: "Gạc lớn: cú húc +25% sát thương lên hệ Cỏ",
 22: "Chịu lạnh: miễn nhiễm làm chậm",
 23: "Leo vách: né 25% đòn cận chiến",
 24: "Sống sót: lần đầu máu dưới 25%, hồi 30% máu",
 25: "Nữ hoàng linh trưởng: đồng đội Chà Vá +10% Phòng thủ ĐB",
 26: "Núi cao: +15% Máu tối đa",
 27: "Đi xa: +1 tầm đánh",
 28: "Song ca: tiếng hót làm chậm kẻ địch 15%",
 29: "Chuyền cành: mỗi 5 giây nhảy sang ô trống và né 1 đòn",
 30: "Cuộn tròn: khi máu dưới 30%, +50% Phòng thủ trong 4 giây",
 31: "Đớp và xoay: giữ chân mục tiêu 2 giây",
 32: "Rụt cổ: chặn hoàn toàn 1 đòn mỗi 6 giây",
 33: "Rình đáy cát: đòn đầu tiên ×2 sát thương",
 34: "Bơi xa: miễn làm chậm, +15% Tốc độ",
 35: "Mỏ cong: đòn đánh bỏ qua 20% Phòng thủ",
 36: "Mỏ thìa: né 30% đòn tầm xa",
 37: "Khổng lồ sông Mê Kông: +20% Máu tối đa",
 38: "Dậm đất: mỗi 8 giây làm choáng kẻ địch kề bên 1 giây",
 39: "Ẩn nấp: 25% né đòn",
 40: "Đào bới: hồi 4% máu mỗi 5 giây",
 41: "Sóng âm: đòn đặc biệt bỏ qua 20% Phòng thủ ĐB",
 42: "Xòe đuôi: mỗi 8 giây làm chậm 20% kẻ địch xung quanh trong 2 giây",
 43: "Lùa cá: đồng đội Đất Ngập Nước +10% Tấn công",
 44: "Vết cắn độc: gây độc 3% máu/giây trong 4 giây",
 45: "Vũ điệu sếu: đồng đội Cửu Long +10% Tốc độ",
 46: "Vồ từ trên cây: đòn đầu tiên nhắm hàng sau của địch",
 47: "Lưỡi dài: hồi 15% máu mỗi khi đánh trúng Côn trùng",
 48: "Mũ sừng: đòn mổ gây choáng 0,5 giây",
 49: "Gặm cỏ biển: hồi 2% máu/giây",
 50: "Nhanh như cheo: luôn né đòn đầu tiên nhắm vào mình",
}
ZODIAC = {17: "Dần", 1: "Thìn", 9: "Ngọ", 10: "Ngọ", 8: "Dậu"}

NEW_SYN = [
 {"name": "Bầy Chó", "members": [51, 52, 53, 54, 55], "tiers": {"3": "Đòn đánh của Chó có 15% gây Dại: mục tiêu nổi điên, tấn công đồng đội của nó trong 3 giây", "5": "25% gây Dại, kéo dài 4 giây"}, "basis": "Ý tưởng game: bệnh dại lây qua vết cắn của chó. Ngoài đời, hãy tiêm phòng dại cho chó mèo."},
 {"name": "Tứ Quốc Khuyển", "members": [52, 53, 54, 55], "tiers": {"2": "Chó +15% Tấn công", "4": "Trung thành: khi một đồng đội bị hạ, mọi Chó +30% Tấn công và Tốc độ đến hết trận"}, "basis": "'Tứ đại quốc khuyển' Việt Nam: Phú Quốc, H'Mông cộc đuôi, Bắc Hà, Lài"},
 {"name": "Bầy Mèo", "members": [56, 57, 58], "tiers": {"2": "Liếm lông: mỗi 4 giây, mỗi Mèo hồi 5% máu cho Mèo gần nhất; cả hai +15% tốc độ đánh trong 3 giây", "3": "Hồi 8% máu, +30% tốc độ đánh"}, "basis": "Mèo liếm lông cho nhau để gắn kết bầy"},
 {"name": "Đàn Gà", "members": [59, 60, 61], "tiers": {"2": "Gáy sáng: đầu trận cả đội +10% Tốc độ trong 5 giây", "3": "+20% Tốc độ trong 5 giây; Gà +15% chí mạng"}, "basis": "Gà gáy báo sáng ở làng quê"},
 {"name": "Ủn Ỉn", "members": [62, 63, 93], "tiers": {"2": "Heo +20% Máu", "3": "Ăn tạp: mỗi khi Heo hạ một kẻ địch, hồi 20% máu"}, "basis": "Lợn nhà và lợn rừng"},
 {"name": "Bầy Chuột", "members": [64, 65, 66], "tiers": {"2": "Gặm nhấm: mỗi đòn giảm 3 Phòng thủ của mục tiêu (cộng dồn tối đa 10 lần)", "3": "Sinh sôi: Chuột đầu tiên bị hạ để lại 2 chuột con (mỗi con 20% chỉ số)"}, "basis": "Chuột gặm nhấm và sinh sản rất nhanh"},
 {"name": "Đồng Quê", "members": [66, 67, 70, 71, 74, 75, 77, 78, 82, 90, 108], "tiers": {"2": "+10 Phòng thủ", "4": "+10 Phòng thủ; hồi 1% máu mỗi giây", "6": "+10% mọi chỉ số; hồi 2% máu mỗi giây"}, "basis": "Hệ sinh thái đồng ruộng, ao làng"},
 {"name": "Gia Súc", "members": [62, 63, 67, 68, 69], "tiers": {"2": "+10% Máu", "4": "+20% Máu và miễn nhiễm Dại"}, "basis": "Vật nuôi lớn của nhà nông"},
 {"name": "Săn Côn Trùng", "members": [79, 80, 81, 82, 98], "tiers": {"2": "+25% sát thương lên hệ Côn trùng", "4": "+50% sát thương lên hệ Côn trùng; hồi 10% máu mỗi khi hạ một Côn trùng"}, "basis": "Thạch sùng, thằn lằn, cóc, ếch, tắc kè ăn côn trùng"},
 {"name": "Côn Trùng", "members": [83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 108], "tiers": {"3": "Côn trùng +15% Tốc độ", "6": "+15% Tốc độ và 15% né đòn", "9": "Sức sống: Côn trùng bị hạ có 30% hồi sinh với 30% máu"}, "basis": "Côn trùng nhỏ, nhanh và cực kỳ đông đúc"},
 {"name": "Tổ Đàn", "members": [86, 87, 88], "tiers": {"2": "Bầy đàn: mỗi 3 giây +5% Tấn công (cộng dồn tối đa 6 lần)", "3": "Đòn đánh lan sang 1 kẻ địch kề bên"}, "basis": "Kiến và ong sống thành tổ, phối hợp cả đàn"},
 {"name": "Rừng Xanh", "members": [95, 96, 97, 98, 104], "tiers": {"2": "+10% né đòn", "4": "+10% né đòn; ẩn mình 2 giây đầu trận"}, "basis": "Loài rừng phổ biến"},
 {"name": "Mãng Xà", "members": [99, 100], "tiers": {"2": "Đòn đánh gây độc 2% máu/giây và làm chậm 15%"}, "basis": "Rắn và trăn"},
 {"name": "Mười Hai Con Giáp", "members": [], "byZodiac": True, "tiers": {"3": "Có 3 con giáp khác nhau: các con giáp +5% mọi chỉ số", "6": "6 con giáp: +10% mọi chỉ số", "12": "Đủ 12 con giáp: +25% mọi chỉ số; con giáp đầu tiên bị hạ hồi sinh với 50% máu"}, "basis": "12 con giáp Việt Nam: Tý (chuột), Sửu (trâu), Dần (hổ), Mão (mèo), Thìn (rồng), Tỵ (rắn), Ngọ (ngựa), Mùi (dê), Thân (khỉ), Dậu (gà), Tuất (chó), Hợi (lợn). Tính theo cột Con giáp, không chiếm ô tộc hệ."},
]
EXTEND = {"Dạ Hành": ([83, 85, 94, 104], {"6": "40% né đòn; đòn đầu tiên luôn chí mạng"}),
          "Săn Mồi": ([76, 94, 100, 105, 106, 107], {"6": "+40% chí mạng; chí mạng gây ×2 sát thương"}),
          "Lông Vũ": ([72, 73], {"6": "+30% Tốc độ và +1 tầm đánh"}),
          "Biển Đông": ([101, 102, 103], {"6": "+40 Phòng thủ ĐB; đòn hệ Nước +25% sát thương"}),
          "Đất Ngập Nước": ([71], {})}

MEOW = [56, 57, 58]; RATS = [64, 65, 66]; HENS = [59, 60, 61]; DOGS = [51, 52, 53, 54, 55]
NEW_REL = [
 {"kind": "Thiên địch", "a": [79], "bType": "Insect", "mult": 1.5, "range": "vô hạn", "effect": "Tầm đánh vô hạn với mọi VieAni hệ Côn trùng; luôn ưu tiên bắt Côn trùng; +50% sát thương", "basis": "Thạch sùng bắt muỗi, côn trùng trên tường nhà"},
 {"kind": "Thiên địch", "a": [80], "bType": "Insect", "mult": 1.3, "range": "vô hạn", "effect": "Tầm đánh vô hạn với hệ Côn trùng; +30% sát thương", "basis": "Thằn lằn ăn côn trùng"},
 {"kind": "Thiên địch", "a": [98, 81, 82], "bType": "Insect", "mult": 1.3, "effect": "Ưu tiên tấn công Côn trùng; +30% sát thương", "basis": "Tắc kè, cóc, ếch ăn côn trùng"},
 {"kind": "Thiên địch", "a": [92], "bType": "Insect", "mult": 1.3, "effect": "Ưu tiên tấn công Côn trùng khác; +30% sát thương", "basis": "Bọ ngựa săn côn trùng"},
 {"kind": "Thiên địch", "a": [91], "b": [84], "mult": 1.5, "effect": "Ưu tiên tấn công Muỗi Vằn; +50% sát thương", "basis": "Chuồn chuồn (và ấu trùng) ăn muỗi"},
 {"kind": "Thiên địch", "a": [87], "b": [90], "mult": 1.3, "effect": "Ưu tiên tấn công Châu Chấu; +30% sát thương", "basis": "Kiến vàng bắt sâu bọ hại cây"},
 {"kind": "Thiên địch", "a": MEOW + [94], "b": RATS, "mult": 1.4, "effect": "Ưu tiên tấn công Chuột; +40% sát thương", "basis": "Mèo bắt chuột"},
 {"kind": "Thiên địch", "a": [99, 104], "b": RATS, "mult": 1.3, "effect": "Ưu tiên tấn công Chuột; +30% sát thương", "basis": "Rắn và cú săn chuột"},
 {"kind": "Thiên địch", "a": [99], "b": [82], "mult": 1.3, "effect": "Ưu tiên tấn công Ếch Đồng; +30% sát thương", "basis": "Rắn ăn ếch"},
 {"kind": "Thiên địch", "a": [105, 106], "b": HENS, "mult": 1.3, "range": "vô hạn (Diều Hâu)", "effect": "Ưu tiên tấn công Gà; +30% sát thương", "basis": "Diều hâu rình bắt gà con; kỳ đà ăn trộm gà và trứng"},
 {"kind": "Thiên địch", "a": [71], "b": [74, 82], "mult": 1.3, "effect": "Ưu tiên tấn công Cá Rô Đồng và Ếch Đồng; +30% sát thương", "basis": "Cò mổ cá, ếch ngoài ruộng"},
 {"kind": "Thiên địch", "a": [76], "b": [74], "mult": 1.3, "effect": "Ưu tiên tấn công Cá Rô Đồng; +30% sát thương", "basis": "Cá lóc ăn cá nhỏ"},
 {"kind": "Thiên địch", "a": [100], "b": [93], "mult": 1.3, "effect": "Ưu tiên tấn công Heo Rừng; +30% sát thương", "basis": "Trăn lớn săn lợn rừng"},
 {"kind": "Thiên địch", "a": [107], "b": [97, 39], "mult": 1.3, "effect": "Ưu tiên tấn công Hoẵng và Thỏ vằn Trường Sơn; +30% sát thương", "basis": "Sói đỏ săn thú móng guốc như mang; với thỏ là ý tưởng thiết kế game"},
 {"kind": "Thiên địch", "a": [47], "b": [88], "mult": 1.3, "effect": "Ưu tiên tấn công Ong Mật; +30% sát thương", "basis": "Gấu chó phá tổ ong ăn mật và ấu trùng"},
 {"kind": "Thiên địch", "a": [70], "b": [78], "mult": 1.5, "effect": "Ưu tiên tấn công Ốc Bươu Vàng; +50% sát thương", "basis": "Nông dân thả vịt ăn ốc bươu vàng hại lúa"},
 {"kind": "Thiên địch", "a": DOGS, "b": MEOW, "mult": 1.15, "effect": "Ưu tiên tấn công Mèo; +15% sát thương", "basis": "Thành ngữ 'như chó với mèo'"},
 {"kind": "Cộng sinh", "a": [67], "b": [71], "mult": 1.15, "effect": "Cò theo trâu: cả hai +15% Tốc độ", "basis": "Hình ảnh cò đi theo trâu bắt côn trùng trên đồng (loài hay theo trâu nhất là cò ruồi)"},
 {"kind": "Cộng sinh", "a": [75], "b": [1], "mult": 1.2, "effect": "Cá chép hóa rồng: Cá Chép hóa Rồng sau 10 giây thay vì 20; Rồng +20% Tấn công ĐB", "basis": "Tích cá chép vượt Vũ Môn hóa rồng"},
]


def main():
    d = load("vieindex.json")
    if any(s["id"] == 51 for s in d["species"]):
        print("already expanded – nothing to do"); return
    # regroup existing: old "Wild" were all threatened -> Endangered (tier 3)
    for s in d["species"]:
        if s["group"] == "Wild":
            s["group"] = "Endangered"
        s["skill"] = SKILL[s["id"]]
        if s["id"] in ZODIAC:
            s["zodiac"] = ZODIAC[s["id"]]
    for (i, vi, en, sci, g, ty, hab, body, zod, syn, iucn, skill, note, tw) in NEW:
        sp = {"id": i, "vi": vi, "en": en, "sci": sci, "group": g, "iucn": iucn, "habitat": hab, "note": note,
              "types": ty, "body": body, "skill": skill}
        if zod: sp["zodiac"] = zod
        if tw: sp["tweak"] = tw
        d["species"].append(sp)
    d["tierByGroup"] = TIER_BY_GROUP
    d["tierRule"] = {"note": "Bậc 1: vật nuôi/loài gặp hằng ngày; 2: hoang dã (rừng, núi, biển) ít gặp nhưng chưa bị đe dọa; 3: loài bị đe dọa (IUCN CR/EN/VU/DD hoặc Sách Đỏ VN); 4: đã tuyệt chủng hoặc đã mất ở Việt Nam; 5: huyền thoại"}
    for s in d["species"]:
        s["tier"] = TIER_BY_GROUP[s["group"]]
    save("vieindex.json", d)

    sy = load("synergies.json")
    for g in sy["synergies"]:
        if g["name"] in EXTEND:
            add, tiers = EXTEND[g["name"]]
            g["members"] += add; g["tiers"].update(tiers)
    sy["synergies"] += NEW_SYN
    save("synergies.json", sy)

    rel = load("relations.json")
    for r in rel["relations"]:
        r["a"] = [r["a"]] if isinstance(r["a"], int) else r["a"]
        r["b"] = [r["b"]] if isinstance(r["b"], int) else r["b"]
    for r in NEW_REL:
        r.setdefault("b", []); r.setdefault("src", "")
    rel["relations"] += NEW_REL
    rel["note"] += " 'bType' = áp dụng cho mọi VieAni thuộc hệ đó; 'range' = tầm đánh đặc biệt với mục tiêu đó."
    save("relations.json", rel)
    print("added", len(NEW), "VieAni,", len(NEW_SYN), "synergies,", len(NEW_REL), "relations")


if __name__ == "__main__":
    main()
