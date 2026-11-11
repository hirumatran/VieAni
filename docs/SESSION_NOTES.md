# VieAni – session notes (handoff)

Last session: 11/11/2026 (started 10/11/2026). Branch: `claude/vibrant-feynman-rjzlhw` (not merged to `main` yet).
Start the next session with this repo selected and ask Claude to read this file.

## What exists

| Path | What it is |
|---|---|
| `data/vieindex.json` | Game data for 50 VieAni: names, IUCN, habitat, types, `typeChart`, `legendaryRule`, stats, attack type/class, range |
| `data/synergies.json` | 17 Tộc hệ (synergies): members by id, activation levels, effects, basis |
| `data/relations.json` | Thiên địch (predator → prey) and Cộng sinh (symbiosis) pairs with multiplier, effect, basis |
| `data/vn_info.json` | Vietnamese info-card text: notes for all 50; population, habitat, location, threats, how to help and sources for the 37 real species |
| `src/vieindex.template.html` | VieIndex page template (search, type filters, sort, popup, type chart dialog) |
| `vieindex.html` | Built page – open in a browser. Rebuild after any data change |
| `assets/sprites/<id>.png` | Draft 32×32 sprites drawn by `scripts/sprites.py` |
| `assets/sprites/custom/<id>.png` | Your own sprites; override the drawn ones and are never overwritten |
| `assets/palette/vinmon.{gpl,hex,png}` | Shared 32-colour palette (load `.gpl` in Aseprite / Pixelorama) |

## Commands

```bash
python3 scripts/build_vieindex.py            # rebuild vieindex.html after editing data
python3 scripts/pixelize.py sketch.jpg --id 20 [--flip] [--colors 8]   # sketch -> draft sprite
python3 scripts/sprites.py                 # redraw the built-in sprites
python3 scripts/draft_stats.py [--force]   # (re)draft stats; --force overwrites hand edits
```

## Roster expansion (11/11)

108 VieAni (was 50). Tier now follows the group: 1 Thân thuộc (everyday/pets/insects, 42),
2 Hoang dã (wild, not threatened, 14), 3 Nguy cấp (threatened, 33), 4 Đã mất (6), 5 Huyền thoại (13).
Stat totals by tier: 400 / 440 / 480 / 510 / 530. Every VieAni has a `skill`; zodiac animals have `zodiac`.
31 synergies (incl. Bầy Chó rabies 15%, Bầy Mèo grooming heal + attack speed, Mười Hai Con Giáp by
zodiac column); 30 relations, incl. type-wide predators (`bType`: Thạch Sùng/Thằn Lằn hit Côn trùng
anywhere). `scripts/expand_roster.py` holds the added data; `scripts/export_sheet.py` exports sheet rows.

## Folklore, items, sketch board (11/11, part 3)

- `data/folklore.json`: 20 story-based skills + sources (`story`, `storySrc`, `storyAccuracy` on species);
  6 new-legendary ideas (Mộc Tinh, Thủy Tinh, Thiên Lôi, Trâu Vàng, Chằn Tinh/Đại Bàng, Rồng Con).
- `data/items.json`: 50 items, 5 tiers, categories TC/PT/HT/TD/NEM/SAN. `data/mechanics.json`: status glossary.
- Sheet tabs added: Vật phẩm, Hiệu ứng; VieAni tab column X = Điển tích.
- Sketch board: `scripts/fetch_refs.py` (photos → refs/, git-ignored; credits in data/ref_credits.json),
  `scripts/build_ref_board.py OUT` → 22-page PDF. Workflow in `docs/SPRITE_WORKFLOW.md`;
  `pixelize.py --batch DIR --size 64` converts V001… sketches.
- Cloud env "vinmon" allows iNaturalist, Wikimedia (incl. thumb.), vi/en Wikipedia; fandom blocks bots.

## Design decisions so far

- 10 types: Legendary, Fire, Water, Electric, Grass, Ground, Rock, Sky, Insect, Poison.
- Type chart = Pokémon Gen 6+ (Sky = Flying, Insect = Bug); Pokémon's 0× immunities
  (Electric→Ground, Ground→Sky) softened to 0.5× for auto-battle.
- Legendary: deals ×1.25 and takes ×0.75 against every type.
- Stats: Pokémon-style six stats; total by tier 400 / 440 / 480 / 510 / 530 (Legendary).
- Dex numbers are temporary (A–Z by English name). Cards show Vietnamese name first.

## Google Sheet (design master for editing)

"VieAni – Dữ liệu game" (formerly "Vindex – Dữ liệu Vinmon") in the user's Google Drive (created 11/11/2026), 4 tabs:
VieAni (auto ID V001…, Vietnamese types, tier, 2 synergy columns, stats, auto total, stat basis),
Bảng khắc hệ (editable type matrix + Legendary ×1.25/×0.75 + quick lookup),
Thiên địch & Cộng sinh, Tộc hệ (member list/count auto-updates).
Sheet locale is en_US so formulas work (numbers show 1.25). If the sheet is edited, sync changes
back into `data/*.json` before rebuilding the page.

## Open items / ideas for next time

1. Decide: keep immunities at 0.5× or use 0× like Pokémon.
2. ~~Differentiate identical stats~~ – done 11/11: every VieAni now has a unique stat line with a
   biology note (`statNote`); totals still fixed by tier.
3. ~~Thin types~~ – now Fire 4, Electric 2, Insect 11 (added Kiến Lửa, Đom Đóm, Cá Đuối Điện, insects).
4. ~~Vietnamese type badges~~ – done on page and sheet.
5. ~~Verify province names~~ – done 11/11: all mergers used are confirmed (Res. 202/2025/QH15);
   Đồng Nai is now **TP. Đồng Nai** (centrally run city from 30/4/2026); Cát Tiên NP managed by
   TP. Đồng Nai from 10/2026 (Decision 2058/QĐ-TTg) – still partly in Lâm Đồng until a boundary change.
   Still open: Xuân Thủy spoonbill "36–93/year" original report not reachable (labelled as unverified
   on the card); older/unpublished population figures are labelled with their survey year.
   Sites blocked in this cloud session: chinhphu.vn, vietnamnews.vn, mae.gov.vn, wikipedia.org.
6. Replace draft sprites with real art (sketch → `pixelize.py` → clean up in Aseprite/Pixelorama).
7. Next game steps: auto-chess board, shop/tiers, synergies (e.g. Sơn Tinh bride-price trio,
   the three doucs "Chà vá" set), damage formula.
8. Merge the branch into `main` (open a pull request) when ready.
9. New sprites (ids 51–108) are rough drafts – crab and insect legs especially.
10. Balance pass: T1 swarms (Côn Trùng 11 members, Đồng Quê 11) may be too strong at high counts.

## Project plan (added 11 Nov 2026)
- Full plan: `docs/PROJECT_PLAN.md` (milestones, scope, stack, budget, 43 tasks, risks).
- Tracker: Google Sheet tab "Kế hoạch dự án" (status dropdown; overdue rows turn red).
- Targets: Alpha Fri 15 Jan 2027 and public Beta Fri 26 Feb 2027 – both web-only on itch.io; native apps after beta. Tết buffer 4–14 Feb.
- T01 done 11 Nov: project renamed Vinmon → VieAni, encyclopedia Vindex → VieIndex; TypeScript + Phaser; private repo → itch.io (butler); store accounts skipped.
- itch.io account created by PO: https://hirumatran.itch.io/ (ITCH_USER = hirumatran).
- Next: T02 GDD + T03 game skeleton, then T04 itch.io deploy (PO still to do: create the game page + API key → GitHub secret BUTLER_API_KEY).
- PO is sketching sprites on iPad directly in the board PDF.
