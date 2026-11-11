# Vinmon – session notes (handoff)

Last session: 11/11/2026 (started 10/11/2026). Branch: `claude/vibrant-feynman-rjzlhw` (not merged to `main` yet).
Start the next session with this repo selected and ask Claude to read this file.

## What exists

| Path | What it is |
|---|---|
| `data/vindex.json` | Game data for 50 Vinmon: names, IUCN, habitat, types, `typeChart`, `legendaryRule`, stats, attack type/class, range |
| `data/synergies.json` | 17 Tộc hệ (synergies): members by id, activation levels, effects, basis |
| `data/relations.json` | Thiên địch (predator → prey) and Cộng sinh (symbiosis) pairs with multiplier, effect, basis |
| `data/vn_info.json` | Vietnamese info-card text: notes for all 50; population, habitat, location, threats, how to help and sources for the 37 real species |
| `src/vindex.template.html` | Vindex page template (search, type filters, sort, popup, type chart dialog) |
| `vindex.html` | Built page – open in a browser. Rebuild after any data change |
| `assets/sprites/<id>.png` | Draft 32×32 sprites drawn by `scripts/sprites.py` |
| `assets/sprites/custom/<id>.png` | Your own sprites; override the drawn ones and are never overwritten |
| `assets/palette/vinmon.{gpl,hex,png}` | Shared 32-colour palette (load `.gpl` in Aseprite / Pixelorama) |

## Commands

```bash
python3 scripts/build_vindex.py            # rebuild vindex.html after editing data
python3 scripts/pixelize.py sketch.jpg --id 20 [--flip] [--colors 8]   # sketch -> draft sprite
python3 scripts/sprites.py                 # redraw the built-in sprites
python3 scripts/draft_stats.py [--force]   # (re)draft stats; --force overwrites hand edits
```

## Design decisions so far

- 10 types: Legendary, Fire, Water, Electric, Grass, Ground, Rock, Sky, Insect, Poison.
- Type chart = Pokémon Gen 6+ (Sky = Flying, Insect = Bug); Pokémon's 0× immunities
  (Electric→Ground, Ground→Sky) softened to 0.5× for auto-battle.
- Legendary: deals ×1.25 and takes ×0.75 against every type.
- Stats: Pokémon-style six stats; total by tier 420 / 450 / 480 / 510 / 530 (Legendary).
- Dex numbers are temporary (A–Z by English name). Cards show Vietnamese name first.

## Google Sheet (design master for editing)

"Vindex – Dữ liệu Vinmon" in the user's Google Drive (created 11/11/2026), 4 tabs:
Vinmon (auto ID V001…, Vietnamese types, tier, 2 synergy columns, stats, auto total, stat basis),
Bảng khắc hệ (editable type matrix + Legendary ×1.25/×0.75 + quick lookup),
Thiên địch & Cộng sinh, Tộc hệ (member list/count auto-updates).
Sheet locale is en_US so formulas work (numbers show 1.25). If the sheet is edited, sync changes
back into `data/*.json` before rebuilding the page.

## Open items / ideas for next time

1. Decide: keep immunities at 0.5× or use 0× like Pokémon.
2. ~~Differentiate identical stats~~ – done 11/11: every Vinmon now has a unique stat line with a
   biology note (`statNote`); totals still fixed by tier.
3. Fire (2), Electric (1), Insect (0) are thin – candidates: electric ray, firefly/beetle (check IUCN first).
4. Optionally translate type badges to Vietnamese (Lửa, Nước, Điện, Cỏ, Đất, Đá, Trời, Côn trùng, Độc, Huyền thoại).
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
