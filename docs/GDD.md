# VieAni – Game Design Document v1 (draft for PO review)

Status: **draft v1, 11 Nov 2026** – every number below is a starting value for balancing. They
all live in one file, `game/src/core/config.ts`, so changing a number never needs code changes.
Data (VieAni, types, synergies, items, relations, effects) comes from `data/*.json` and the Google Sheet.

## 1. One-line pitch
An auto-chess game where you build a team of Vietnamese animals and legends, place them on a
board, and watch them fight. Win by being the last of 8 players standing.

## 2. Match overview
| Item | Value |
|---|---|
| Players | 8: you + 7 AI opponents (bots) – alpha and beta are single player |
| Player HP | 100; reach 0 = eliminated; last one alive wins (rank 1–8) |
| Typical length | ~30–35 rounds, 15-20 minutes |
| Board | Battle grid 8 columns × 8 rows; each player owns their half (8 × 4) |
| Bench | 8 slots (units waiting, do not fight) |
| Units on board | = player level (1–10) |

### Round flow
1. **Prep phase – 15 s** (single player: can also press "Sẵn sàng" to start early).
   Buy/sell VieAni, reroll the shop, buy XP, place units, equip items.
2. **Battle phase – max 45 s.** Fully automatic. The opponent's team is mirrored onto the top half.
3. **Result – 3 s.** Loser takes damage; gold is paid; next round.

Battle ends when one side has no units left. If both sides still have units at 45 s, it is a
**draw: both players take damage** (counted from the other side's surviving units).

### Round types
| Rounds | Type | Opponent |
|---|---|---|
| 1, 2, 3 | **PvE – Thú hoang** (wild animals) | Fixed packs of wild VieAni (e.g. 2 Chuột Đồng → 3 Chuột → Heo Rừng + 2 Chuột) |
| 9, 15, 21, 27, 33, 39… (every 6) | **PvE – Thú dữ** (boss packs) | Stronger packs (Sói Đỏ pack, Hổ, Cá Sấu, …) |
| all other rounds | **PvP** | A random living player, never the same one twice in a row. Odd number alive → one player fights a "ghost" copy of another player's team |

**PvE rewards = items.** Win: choose 1 of 3 items. Lose: get 1 random item.
Item tier by round: R1–3 → tier 1, R9 → tier 2, R15 → tier 3, R21 → tier 4, R27+ → tier 5.

## 3. Economy
| Rule | Value |
|---|---|
| Starting gold | 5 |
| Base income after each round | R1: +2, R2: +3, R3: +4, R4 and later: +5 |
| Interest | +1 gold per 10 gold you have at end of round, max +3 |
| PvP win bonus | +1 |
| Streak bonus (win or loss streak) | 2–3 in a row: +1; 4–5: +2; 6+: +3 |
| Reroll shop | 2 gold |
| Lock shop | free (shop is kept for next round) |
| Buy XP | 4 gold → 4 XP |
| Free XP | +1 XP at the end of every round |
| Unit price | = its tier (tier 1 costs 1 gold … tier 5 costs 5 gold) |
| Sell | full refund of the gold spent on it (★2 of a tier-1 = 3 gold) |

### Levels (XP needed to reach the next level)
| Level | 1→2 | 2→3 | 3→4 | 4→5 | 5→6 | 6→7 | 7→8 | 8→9 | 9→10 |
|---|---|---|---|---|---|---|---|---|---|
| XP | 1 | 2 | 6 | 10 | 20 | 36 | 56 | 80 | 100 |
### Make it upto level 12, I want it so we can have a full set of zodiac on board

## 4. Shop
- 5 slots, refreshed for free every round (unless locked).
- **Shared pool:** all 8 players buy from one pool. Copies per species:

| Tier | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| Species in data | 42 | 14 | 33 | 6 | 13 |
| Copies of each species | 20 | 16 | 12 | 10 | 6 |

- **Shop odds (%) by player level** – each slot first rolls a tier, then a random species of that
  tier still in the pool:

| Level | T1 | T2 | T3 | T4 | T5 |
|---|---|---|---|---|---|
| 1 | 100 | 0 | 0 | 0 | 0 |
| 2 | 75 | 25 | 0 | 0 | 0 |
| 3 | 60 | 30 | 10 | 0 | 0 |
| 4 | 45 | 35 | 18 | 2 | 0 |
| 5 | 35 | 35 | 25 | 5 | 0 |
| 6 | 25 | 30 | 33 | 10 | 2 |
| 7 | 18 | 25 | 35 | 17 | 5 |
| 8 | 12 | 20 | 35 | 25 | 8 |
| 9 | 8 | 15 | 30 | 32 | 15 |
| 10 | 5 | 10 | 25 | 35 | 25 |

Note for PO: tier 2 has only 14 species but tier 3 has 33, so a given tier-2 VieAni turns up
more often than a given tier-3 one. That is fine (tier 2 = easy early ★2), but keep it in mind
when adding new VieAni.

## 5. Star-up (combining)
- 3 copies of the same VieAni (★1) merge automatically into **★2**; 3 × ★2 → **★3**.
- Merge works from bench and board; the merged unit keeps the best item (others go to inventory).
- Multipliers on HP, attack damage and skill power: **★1 ×1, ★2 ×1.8, ★3 ×3.2**.

## 6. Combat
### 6.1 Battle stats from the Pokémon-style base stats
| Battle value | Formula (★1) | Range in current data |
|---|---|---|
| Max HP | 200 + 10 × HP | 550 – 1,550 |
| Attack damage per hit | 40 × A / D × type × Legendary × random(0.9–1.1) | A/D = Atk/Def if physical, SpA/SpD if special |
| Attack interval | 2.0 s × 100 / (Speed + 50), clamped to 0.6 – 2.5 s | Speed 20 → 2.5 s; Speed 150 → 1.0 s |
| Move | 1 cell per 0.4 s (Bay units fly over other units) | |
| Range | `range` in data, in cells; diagonal counts as 1 | 1 = melee, 2–3 = ranged |
| Crit | 0% base (items/skills add it); crit = ×1.5 damage | |

- **Type effectiveness** from `typeChart` (×2 / ×0.5 / ×0); **Legendary rule** ×1.25 dealt, ×0.75 taken.
- The battle is **deterministic**: the same teams + same seed always give the same result
  (needed for the balance simulator, replays and future online "ghost" PvP).
- Simulation tick: 10 per second (100 ms). Graphics only replay what the simulation decided.

### 6.2 Targeting and movement
1. Target = nearest enemy (grid distance). Ties: lowest current HP, then lowest unit id.
2. **Thiên địch:** a unit always prefers a "natural prey" enemy within 3 cells (relations.json).
3. Keep the target until it dies or a Thiên địch prey comes within 3 cells.
4. Not in range → move one cell along the shortest free path (A*). One unit per cell.

### 6.3 Energy and skills
- Energy (năng lượng): **+10 per own attack, +5 when hit**; at 100 the unit casts its skill, then returns to 0.
- Passive skills (e.g. "Ẩn nấp: 25% né đòn") are always on.
- Skills are built from ~12 reusable templates: damage (single/AoE/line), heal, shield, buff,
  debuff, stun/root, summon, revive, transform, dash/jump, projectile, aura. Each VieAni's skill =
  one template + numbers in data. The 20 folklore skills (Cá Chép hóa rồng, Cóc, Hồ Tinh, …) get
  custom code on top.
- Status effects (Bay, Dại, Độc, Bỏng, Choáng, Trói, Nhốt, …) follow `data/mechanics.json`.

### 6.4 Synergies (Tộc hệ)
- Counted by **different species** on the board (2 Chó Cỏ count once). Bench does not count.
- Thresholds and effects from `data/synergies.json` (31 synergies, incl. 12 Con Giáp counted by zodiac).
- **Cộng sinh** pairs give their bonus when both species are on the board.

### 6.5 Player damage when losing a round
Damage = **stage damage + sum of the tiers of the winner's surviving units**.
Stage damage: rounds 1–10 → 1, 11–20 → 3, 21–30 → 5, 31+ → 8.
(Example: round 14, opponent has a tier-3 and a tier-1 left → 3 + 3 + 1 = 7 damage.)

## 7. Items
- **Inventory:** up to 10 items.
- **TC / PT / HT** (attack/defence/support): equip on a VieAni, **1 item per unit**.
  Can be moved freely during prep.
- **TD – Toàn đội** (team-wide): placed in a **team slot** (max 2), affects the whole team.
- **NEM – Ném** (thrown): assigned to an enemy position before battle; used once at battle start,
  then returns to inventory for the next round.
- **SAN – Đặt trên sân** (board objects, e.g. Hũ Mật, Bẫy Chông Tre): occupy a cell on your half;
  do not count towards the unit limit; max 2 per board.
- Effects from `data/items.json` (50 items, tiers 1–5).

## 8. AI opponents (bots)
7 bots with names and personalities, all following the same rules and shop pool as the player:
| Bot | Style |
|---|---|
| Thợ Săn | Picks one synergy early and commits to it |
| Nhà Buôn | Saves gold for maximum interest, levels late build up with multiple 3 stars low tier |
| Liều Lĩnh | Rerolls a lot to get ★2/★3 early |
| Huyền Thoại | Levels fast, aims for tier-5 Legendary units |
| Bầy Đàn | Plays the pet packs (Chó, Mèo, Gà) |
| Thành Đồng | Defensive front line, ranged back line |
| Ngẫu Nhiên | Semi-random (easiest bot) |
Difficulty (Dễ / Thường / Khó) changes how well bots place units and use items.

## 9. Screens (alpha)
Title → Match (board, bench, shop, synergy list, player list with HP, inventory) → Result/ranking.
Plus: VieIndex (encyclopedia) and Settings (sound, speed ×1/×2, language later).
UI language: Vietnamese (English toggle in beta).
Background for battle ground: famous scenes of Vietnam like: Vịnh Hạ Long, Phong Nha Kẻ Bàng, Rừng Quốc Gia Nam Cát Tiên, etc... randomly upto 8 backgrounds

## 10. Out of scope for alpha/beta
Online multiplayer, accounts, payments, ads, leaderboards, native store apps.

## 11. Questions for the PO
1. Board 8 × 8 with 8 players (like Underlords/TFT) – OK, or smaller (6 players) for shorter games? 8x8 with 8 players are okay
2. 1 item per unit (simple) – OK? Underlords also uses 1. 1 item per unit is okay
4. Should the time limit (45 s draw) instead give the win to the side with more total HP left? Draw is okay
