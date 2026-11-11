# VieAni sprite workflow (108 species, Pokémon-inspired 2D pixel art)

## Target style
- **Canvas 64×64**, transparent background, creature fills ~80% of the canvas.
- **Pose:** 3/4 front view facing left (like Pokémon Gen 4–5 battle sprites). Keep the
  same pose and ground line for every VieAni so the roster looks like one set.
- **1px dark outline**, light from top-left, max ~16 colours per sprite from the shared
  palette `assets/palette/vinmon.gpl`.
- **Read at 1×:** if you cannot recognise it at 64×64, simplify (silhouette + 2–3 key marks).

## Fastest route: draw ~30 base bodies, not 108 sprites
Most VieAni share a body plan (see `body` / profile in `data/vindex.json`). Draw one
base per family, then recolour and change the markings:

| Base body | VieAni that reuse it |
|---|---|
| Dog | Chó Cỏ, H'Mông, Phú Quốc, Bắc Hà, Lài, Sói Đỏ |
| Cat | Mèo Mướp, Mèo Mun, Mèo Tam Thể, Mèo Rừng (+ Báo gấm, Hổ as bigger variants) |
| Chicken | Gà Ri, Gà Đông Tảo, Gà Chọi, Gà chín cựa, Gà lôi, Công |
| Pig | Heo Ỉ, Heo Móng Cái, Heo Rừng |
| Rodent | Chuột Nhắt, Chuột Cống, Chuột Đồng, Sóc |
| Leaf monkey | 3 Chà vá, 3 Voọc, Khỉ Vàng |
| Gibbon / ape | Vượn Cao Vít, Vượn đen má trắng, Vượn khổng lồ |
| Deer | Sao la, Mang lớn, Hoẵng, Cheo cheo |
| Big ox / buffalo | Trâu, Bò xám, Tê giác |
| Elephant | Voi châu Á, Voi chín ngà |
| Horse | Ngựa Ta, Ngựa chín hồng mao, Ngựa sắt |
| Turtle | Rùa Trung Bộ, Đồi mồi, Giải, Rùa Hoàn Kiếm, Kim Quy |
| Wading bird | Cò Trắng, Cò thìa, Cò quắm, Sếu, Rẽ mỏ thìa, Chim Lạc |
| Small bird | Chim Sẻ, Sáo Sậu |
| Lizard | Thạch Sùng, Thằn Lằn, Tắc Kè, Kỳ Đà, Cá sấu |
| Frog | Cóc, Ếch |
| Fish | Cá Chép, Cá Rô, Cá Lóc, Cá tra dầu, Ngư Tinh |
| Insect | 11 insects (one body, swap wings / legs / colours) |
| Snake | Rắn Hổ Mang, Trăn Gấm, (Rồng as an elaborate variant) |

That turns 108 drawings into roughly 30 originals plus quick variants.

## Steps
1. **Print** `Vindex_bang_ve_tham_khao.pdf` (photo + empty 64×64 grid per VieAni), or open
   it on a tablet. Sketch the silhouette in the grid, or draw on a tablet (Procreate,
   Krita, Ibis Paint) with the photo on a layer at 30% opacity.
2. **Name each scan/export by VieAni number**: `V001.png`, `V002.jpg`, … (same numbers as the
   Google Sheet). Put them in one folder (Google Drive is fine – share it with me).
3. **I batch-convert** them:
   `python3 scripts/pixelize.py --batch sketches/ --size 64`
   → `assets/sprites/custom/<id>.png` + `_batch_sheet.png` to review all at once.
4. **Clean up** in Aseprite or Pixelorama (palette loaded): fix outline, eyes, key markings.
5. `python3 scripts/build_vindex.py` – the Vindex page uses your sprites automatically.

## Licences
Reference photos come from iNaturalist and Wikimedia Commons under Creative Commons or
public-domain licences (credits in `data/ref_credits.json` and the last pages of the PDF).
Many are **non-commercial (NC)** licences: use them only as drawing reference, do not trace
them 1:1 or ship them in the game, and keep the credits when you share the board.
