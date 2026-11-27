// All game-rule numbers in one place (see docs/GDD.md). Balance by editing this file.

export const VERSION = "0.19.1";

export const PLAYERS = 8;
export const PLAYER_HP = 100;
/** player damage after a lost round = Σ over surviving enemy VieAni of (tierPts[tier] + ★ − 1), ÷ divisor, rounded up
 *  (PO 19 Nov 2026: tier + ★ − 1, ÷ 2). Kept as an object so balance tools can try other numbers. */
export const DAMAGE = { tierPts: [0, 1, 2, 3, 4, 5], divisor: 2 };

export const BOARD_COLS = 8;
export const BOARD_ROWS = 8; // full battle grid; each player owns 4 rows
export const HALF_ROWS = 4;
export const BENCH_SLOTS = 8;

export const PREP_SECONDS = 15;
export const BATTLE_MAX_SECONDS = 45;
export const TICKS_PER_SECOND = 10;

// --- economy ---
export const START_GOLD = 5;
/** gold every round (PO test feedback 13 Nov 2026: was 2/3/4 then 5) */
export const BASE_INCOME = 7;
/** +1 gold per INTEREST_PER gold held, at most INTEREST_MAX (PO: +1…+5) */
export const INTEREST_PER = 10;
export const INTEREST_MAX = 5;
/** round result bonus (PO: +3 win, +1 loss; a draw counts as a loss) */
export const WIN_BONUS = 3;
export const LOSS_BONUS = 1;
/** [minStreak, bonus] – highest matching row wins */
export const STREAK_BONUS: [number, number][] = [[2, 1], [4, 2], [6, 3]];
export const REROLL_COST = 2;
export const XP_BUY_COST = 4;
export const XP_BUY_AMOUNT = 4;
export const XP_PER_ROUND = 2;
/** XP needed to go from level i+1 to i+2 */
export const XP_TO_NEXT = [1, 2, 6, 10, 20, 36, 56, 80, 100];
/** computer opponent (main menu, PO 20 Nov 2026): Dễ = the old simple bot, Thường = botAI.ts, Khó = botAI.ts + extra gold */
export type Difficulty = "easy" | "normal" | "hard";
export const HARD_BOT_GOLD = 2;
/** player's shop: a VieAni they already own (★1/★2, board or bench) is this many times more likely to be drawn within its
 *  tier – easier ★2/★3 (PO 20 Nov 2026: Dễ and Thường only; tier odds per level stay the same) */
export const OWNED_SHOP_BOOST: Record<Difficulty, number> = { easy: 3, normal: 2, hard: 1 };
export const MAX_LEVEL = 10; // full 12 Con Giáp needs Ấn Thống Nhất (3 Linh Vật + Rồng Lạc Việt at level 10)

// --- shop ---
export const SHOP_SLOTS = 5;
/** copies of each species in the shared pool, by tier 1..5 */
export const POOL_COPIES: Record<number, number> = { 1: 20, 2: 16, 3: 12, 4: 10, 5: 6 };
/** shop odds in % by level (row = level 1..10, columns = tier 1..5) */
export const SHOP_ODDS: number[][] = [
  [100, 0, 0, 0, 0],
  [75, 25, 0, 0, 0],
  [60, 30, 10, 0, 0],
  [45, 35, 18, 2, 0],
  [35, 35, 25, 5, 0],
  [25, 30, 33, 10, 2],
  [18, 25, 35, 17, 5],
  [12, 20, 35, 25, 8],
  [8, 15, 30, 32, 15],
  [5, 10, 25, 35, 25],
];

// --- units / combat ---
export const STAR_MULT = [1, 1.8, 3.2]; // ★1, ★2, ★3
/** Giáp is "% less damage", capped here */
export const ARMOR_CAP = 60;
export const DAMAGE_RANDOM: [number, number] = [0.9, 1.1];
/** seconds between attacks are clamped to this range (Tốc Độ Đánh = attacks per second) */
export const ATTACK_INTERVAL_CLAMP: [number, number] = [0.4, 3];
export const MOVE_SECONDS_PER_CELL = 0.4;
/** movement speed by role (PO 19 Nov 2026, hidden – not a stat): seconds per cell */
export const ROLE_MOVE_SECONDS: Record<string, number> = { "Săn Mồi": 0.3, "Chiến Đấu": 0.4, "Đỡ Đòn": 0.5, "Phép Thuật": 0.45, "Hỗ Trợ": 0.45 };
export const CRIT_MULT = 1.5;
export const ENERGY_MAX = 100;
export const ENERGY_PER_ATTACK = 10;
export const ENERGY_PER_HIT = 5;
export const PREY_RADIUS = 3;
/** skills (T11/T12) are live in the game – PO approved the skill table as-is on 20 Nov 2026 */
export const SKILLS_ON = true;
/** hidden rule for Hỗ Trợ (PO 20 Nov 2026): energy regenerates faster the more HP they have lost –
 *  per second SUPPORT_ENERGY_BASE × (1 + SUPPORT_ENERGY_SLOPE × share of own HP lost): 3/s at full HP, 12/s at half, 21/s near 0 */
export const SUPPORT_ENERGY_BASE = 3;
export const SUPPORT_ENERGY_SLOPE = 6; // Thiên địch: prefer prey within this many cells

// --- rounds ---
// PO 17 Nov 2026: no PvE (monster) rounds – every round is PvP. Items come as a 1-of-3 reward at fixed rounds.
export const ITEM_ROUNDS = [1, 4, 8, 12, 16, 20, 24, 28, 32, 36];
/** item tier offered in each reward round (same order as ITEM_ROUNDS) */
export const ITEM_ROUND_TIERS = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
export function isItemRound(round: number): boolean {
  return ITEM_ROUNDS.includes(round);
}
export function itemTierForRound(round: number): number {
  const i = ITEM_ROUNDS.indexOf(round);
  return i >= 0 ? ITEM_ROUND_TIERS[i] : ITEM_ROUND_TIERS[ITEM_ROUND_TIERS.length - 1];
}

/** player damage = Σ (tier + ★ − 1) of the winner's surviving VieAni – see battle.ts playerDamage (PO 19 Nov 2026) */

export const INVENTORY_MAX = 10;
export const TEAM_ITEM_SLOTS = 2;
export const BOARD_OBJECTS_MAX = 2;

// --- Linh Vật charms (Ấn Thống Nhất) ---
/** at MAX_LEVEL, with Rồng Lạc Việt on board and all 3 charms, this many missing zodiac signs count as present */
export const CHARM_BONUS_ZODIAC = 2;
export const CHARM_ITEM_IDS = [51, 52, 53];
/** round window in which each charm can be offered (Bắc Bộ, Trung Bộ, Nam Bộ) */
export const CHARM_ROUND_WINDOWS: Record<number, [number, number]> = { 51: [1, 10], 52: [11, 20], 53: [21, 30] };
export const ROLES = ["Đỡ Đòn", "Chiến Đấu", "Săn Mồi", "Phép Thuật", "Hỗ Trợ"] as const;

// --- mid-battle transformations (alternate illustration form) ---
/** Cá Chép (V042) passive "Cá Chép Hóa Rồng": alive after 20 s in battle → Rồng Con until the end; ★3 "Long Môn": after 12 s.
 *  Only the look changes for now – the ×1,3/1,4/1,5 stats and Bay come with the skill system (task T11). */
export const TRANSFORMS: Record<string, { name: string; seconds: [number, number, number] }> = {
  V042: { name: "Rồng Con", seconds: [20, 20, 12] },
};

// --- status auras (PO choice 17 Nov 2026; options in anim/aura.ts, preview: title → "Hiệu ứng trạng thái") ---
/** option index per group: 0 = A, 1 = B, 2 = C. Legendary A golden aura · Extinct A grey smoke · Endangered C red heartbeat */
export const AURA_CHOICE = { legend: 0, extinct: 0, endangered: 2 } as const;
/** which group a VieAni belongs to, by tier (5 Huyền thoại, 4 Đã mất, 3 Nguy cấp; tiers 1–2 have no aura) */
export function auraKindForTier(tier: number): "legend" | "extinct" | "endangered" | null {
  return tier === 5 ? "legend" : tier === 4 ? "extinct" : tier === 3 ? "endangered" : null;
}

// --- items in the match ---
export const ITEM_CHOICES = 3;
