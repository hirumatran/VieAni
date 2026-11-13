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
| `assets/palette/vieani.{gpl,hex,png}` | Shared 32-colour palette (load `.gpl` in Aseprite / Pixelorama) |

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

"VieIndex – Dữ liệu VieAni" in the user's Google Drive (created 11/11/2026), 4 tabs:
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
- T02 done (11 Nov): `docs/GDD.md` v1.1 after PO review – prep 15 s, start gold 5, interest max +3, max level 12 (full Con Giáp), 15–20 min matches, 8 random Vietnamese landscape backgrounds (`data/backgrounds.json`, new task T44). Open: 'Thư thả' no-timer setting (suggested). Numbers mirrored in `game/src/core/config.ts`.
- T03 done (11 Nov): `game/` = Vite + TypeScript + Phaser 4.2.1, Vitest (9 tests pass), `npm run build` OK.
  Board scene shows the 8×8 board + bench + 5 sprites. Assets served from `../assets` (publicDir), base "./" for itch.io.
  Phone portrait is small – landscape/phone layout is T33.
- T44 started (11 Nov): procedural pixel-art drafts of the 8 backgrounds – `scripts/draft_backgrounds.py` → `assets/backgrounds/<id>.png` (180×200, game scales ×4) + own palette `assets/palette/backgrounds.hex`. Not yet shown in the game. Hạ Long v2 wide pixel version: `scripts/draft_bg_wide.py`.
- Art direction decided: painted backgrounds (Gemini, by PO) + pixel sprites. Prompts: `docs/BACKGROUND_PROMPTS.md`. Pixel drafts = placeholders. Landscape 16:9 layout still to be confirmed by PO.
- First Gemini background from PO: `assets/backgrounds/painted/bg_ha_long.webp` (1365×768, has Gemini ✦ mark bottom-right). Board on it, Underlords-style camera: `scripts/board_overlay.py BG OUT --units` (board corners + bench in 1280×720 screen px = numbers for the game).
- T04 (11 Nov): itch.io page https://hirumatran.itch.io/vieani (PO created, HTML/Draft). Workflow `.github/workflows/itch.yml` builds `game/` and pushes `game/dist` with butler to `hirumatran/vieani:html5` on every push to main or this branch (needs secret BUTLER_API_KEY).
- Board overlay: transparent cells, bigger board (corners 352/928 top y58, 256/1024 bottom y604; bench y632–706), sprites ×1.3 cell.
- T04 done 11 Nov: first successful butler upload (run 3). PO to tick "played in the browser" + embed 720×800 on itch edit page.
- v0.2.0 (11 Nov): game switched to landscape 16:9 (1280×720). `game/src/core/layout.ts` = board/bench corners + homography (perspective grid); BoardScene draws the painted background, transparent cells and bench. itch embed must be 1280×720.
- v0.3.0 (11 Nov): start screen `TitleScene` – Hạ Long background (slow drift), logo "VieAni – Huyền Thoại Dã Thú" (Google Fonts Baloo 2 + Be Vietnam Pro), buttons Bắt Đầu / Luyện Tập (both → board for now) / VieIndex (opens vieindex.html in an overlay; shipped in the build by a Vite plugin) / Cài Đặt (sound, speed ×1/×2, relaxed mode – stored in localStorage) / Đăng Nhập (toast "after beta"). VI/EN switch (`src/core/i18n.ts`). Board scene has "← Menu".
- v0.4.0 (11 Nov): T09 + T10 done.
  - `game/src/core/battle.ts`: deterministic simulation (10 ticks/s, 45 s cap → draw). HP = 200+10·HP, damage = 40·A/D·type·prey·roll(0.9–1.1)·star, interval = clamp(2·100/(Spe+50), 0.6–2.5 s), move 1 cell/0.4 s with BFS pathing, Chebyshev range, targeting nearest (ties: lowest HP, uid), Thiên địch prey within 3 cells (or unlimited for Thạch Sùng/Thằn Lằn vs insects) + damage mult. Energy +10/attack, +5/hit; at 100 a PLACEHOLDER skill (2× strike) until T11. `playerDamage()` and `mirror()`.
  - Sim check (300 random 5v5, ★1): median 24.5 s, p90 45 s (≈10% timeouts/draws), A/B wins even.
  - `game/src/core/team.ts`: own half + bench, board limit, swap, save/load (localStorage "vieani.practice.team").
  - BoardScene: drag & drop (mouse/touch) with cell highlight via inverse homography (`Grid.cellAt`), "Trên sân n/5" (practice level 5), "⚔ Đấu thử" vs random tier≤3 team → replay (moves, lunges, damage numbers, HP bars, deaths) → THẮNG/THUA/HÒA + HP lost → "Về bàn".
  - 29 unit tests.
- Next: T11 skill templates + T12 status effects (→ M1), T13 Cộng sinh, T14 balance report.
- PO is sketching sprites on iPad directly in the board PDF.

## Naming rule (PO, 11 Nov 2026)
- Always **VieAni** (never Vinmon) and **VieIndex** (never Vindex) – in code, data, file names, docs, sheet and Drive. Only the rename-history notes keep the old names. The local checkout folder and the cloud environment are still called "vinmon" (outside the repo).

## Branch rule (PO, 11 Nov 2026)
- **All work happens on `main`** (repo hirumatran/VieAni). The old branch `claude/vibrant-feynman-rjzlhw` was merged into main and is no longer used. Pushes to main auto-publish to itch.io.

## End of day 11 Nov 2026 – where we are
- Google Sheet renamed **"VieIndex – Dữ liệu VieAni"** (https://docs.google.com/spreadsheets/d/1VaVYNbxFFHY_s3qoXF0eDwNFNCJEpNgc2Es8LBGtsGU/edit).
  New tabs: **Luật chơi** (all GDD numbers, XP table, shop odds with sum check, pool copies) and **Bối cảnh** (8 backgrounds + image status).
  VieAni tab: new formula columns Y "Máu trong trận (★1)" = 200+10·HP and Z "Giây giữa 2 đòn" = clamp(200/(Tốc độ+50), 0.6–2.5).
- The game reads `data/*.json` + `game/src/core/config.ts`, NOT the sheet. When the PO edits the sheet (lineup, types,
  synergies, rules), the next session must pull the sheet back into the repo (sheet → data/*.json + config.ts),
  check it with `npm test` (data validation), and push. Ask the PO which tabs changed.
- PO will work on: VieAni line-up, types, synergies; more Gemini backgrounds (prompts in docs/BACKGROUND_PROMPTS.md).
- Next dev tasks: T11 skills + T12 status effects (→ M1), T13, T14.

## PO review 2 – 13 Nov 2026 (sheet + data v2)
- Source of truth for the redesign: `scripts/design_v2.py` (roles, ranges, 12 synergies, 3 skills per VieAni, Linh Vật);
  `scripts/apply_v2.py OUT` regenerates data/*.json (+ sheet payloads). Species now carry `status` (keep/later/removed),
  `role`, `skills{active,passive,star3}`; `GameData.roster` = playable 87.
- Sheet: VieAni tab = 87 rows (IDs renumbered V001–V087 by formula); 21 rows moved to tab "Lưu trữ (bản sau / đã xoá)".
  New columns used: B action, G role (dropdown), U range, X active, Y passive, Z ★3. Tộc hệ = 12 rows (formulas).
  Luật chơi: max level 10, +2 XP/round, XP/odds to level 10, Linh Vật rule, roles, skill format + damage budget.
  Vật phẩm: #ERROR cells fixed ('+…' text), VP51–53 Linh Vật. Thiên địch: 27 relations (only playable VieAni). Hiệu ứng: +7 effects.
- Renamed: Cá heo Irrawaddy → **Cá Nược (Cá Heo Sông)** (documented VN name; PO asked "Cá Ông Nược"); Thân (khỉ) carried by Chà vá chân xám while Khỉ Vàng waits.
- Config: MAX_LEVEL 10, XP_PER_ROUND 2, CHARM_BONUS_ZODIAC 2. 30 tests pass. Skills/synergy effects are DATA ONLY – the battle engine still uses the placeholder skill until T11/T12.
- PO review 3 (13 Nov): Đại Ngàn → Cao Nguyên Bắc Bộ / Trường Sơn / Tây Nguyên (by habitat); Làng Quê → Bầy Chó Dữ / Hội Nhà Mèo /
  Bầy Gặm Nhấm (+ Sóc); lizards, toad, sparrow, starling → new Săn Côn Trùng. Now **17 synergies**. Linh Vật windows: Bắc vòng 1–10,
  Trung 11–20, Nam 21–30 (config CHARM_ROUND_WINDOWS); tiers 1/3/4.

## Illustrations + animations (13 Nov)
- Art direction: clean 2D illustrations generated by the PO (prompts: docs/SPRITE_PROMPTS.md), raw files in assets/illustrations/raw/V###_{front,back}.png
  (white background, V-code = sheet ID = position in the roster).
- `python3 scripts/cutout.py [V001]` → assets/illustrations/cut/ (background removed by border flood-fill, 512×512, feet on the bottom line,
  plus _star2 silver outline and _star3 golden glow layers) + assets/illustrations/manifest.json.
- `game/src/anim/VieAniView.ts`: tween-based animations for ANY VieAni (illustration or pixel fallback): idle, attack (slash / projectile),
  cast (aura ring, sparks, burst), hit (flash + knock-back), die (topple, dust, spirit wisp), win (hops), lose (droop, dim), reset, setStar(1/2/3).
  `game/src/anim/illustrations.ts` picks the illustration (back view on our side, front view for the opponent) or falls back to the pixel sprite.
- Title screen → "🎬 Xưởng hoạt ảnh" (AnimLabScene) previews every animation for V001 on both sides. Practice battles now use VieAniView;
  Báo Gấm is in the demo roster (save key bumped to vieani.practice.team.v2).

## Test match V001–V004 (13 Nov, v0.6.0)
- PO: V001 too big on the board → illustration size 1.9 → **1.33 × cell width** (70 %), bench 1.45 → 1.0; same in the animation lab.
- V002–V004 cut out (`scripts/cutout.py` now also removes pure-white holes enclosed by the drawing, e.g. inside the dugong's tail).
- **Bắt Đầu** on the title screen opens the test match (`MatchScene` + pure logic in `game/src/core/match.ts`, 7 tests):
  - you vs one bot; shop shows **only V001–V004**; shared pool (T3 = 12 copies, Bò Xám T4 = 10), 5 slots weighted by copies left
    (tier odds by level are ignored here because there is no tier 1–2 VieAni in the test set);
  - real config rules: start 5 gold, cost = tier, reroll 2, buy 4 XP for 4, +2 XP and income per round
    (base 2/3/4 then 5, interest 1 per 10 gold max 3, streak bonus, +1 per win), board limit = level, max level 10;
  - 3 identical VieAni of the same ★ merge automatically (★2 silver outline, ★3 golden glow); full bench may still buy a copy that completes a ★2;
  - sell = drag a VieAni onto the shop panel (refund tier × copies);
  - prep timer 15 s (off in Settings → relaxed mode); free board slots are auto-filled from the bench at the fight;
  - bot uses the same rules: buys copies it owns first, keeps 10 gold for interest from round 5, buys XP from round 3, places tanks front / mages back;
  - **test HP 40** (not 100) so one match is ~10 rounds; damage = stage damage + tiers of surviving enemies.
  - Not in the test yet: PvE rounds, items, synergies/tộc hệ bonuses, 8 players.
