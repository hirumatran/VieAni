// All game-rule numbers in one place (see docs/GDD.md). Balance by editing this file.

export const VERSION = "0.3.0";

export const PLAYERS = 8;
export const PLAYER_HP = 100;

export const BOARD_COLS = 8;
export const BOARD_ROWS = 8; // full battle grid; each player owns 4 rows
export const HALF_ROWS = 4;
export const BENCH_SLOTS = 8;

export const PREP_SECONDS = 15;
export const BATTLE_MAX_SECONDS = 45;
export const TICKS_PER_SECOND = 10;

// --- economy ---
export const START_GOLD = 5;
/** income after round r (1-based); index 0 = round 1 */
export const BASE_INCOME = [2, 3, 4];
export const BASE_INCOME_LATER = 5;
export const INTEREST_PER = 10;
export const INTEREST_MAX = 3;
export const WIN_BONUS = 1;
/** [minStreak, bonus] – highest matching row wins */
export const STREAK_BONUS: [number, number][] = [[2, 1], [4, 2], [6, 3]];
export const REROLL_COST = 2;
export const XP_BUY_COST = 4;
export const XP_BUY_AMOUNT = 4;
export const XP_PER_ROUND = 1;
/** XP needed to go from level i+1 to i+2 */
export const XP_TO_NEXT = [1, 2, 6, 10, 20, 36, 56, 80, 100, 130, 160];
export const MAX_LEVEL = 12; // 12 = a full 12 Con Giáp team

// --- shop ---
export const SHOP_SLOTS = 5;
/** copies of each species in the shared pool, by tier 1..5 */
export const POOL_COPIES: Record<number, number> = { 1: 20, 2: 16, 3: 12, 4: 10, 5: 6 };
/** shop odds in % by level (row = level 1..12, columns = tier 1..5) */
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
  [3, 8, 22, 37, 30],
  [2, 6, 20, 37, 35],
];

// --- units / combat ---
export const STAR_MULT = [1, 1.8, 3.2]; // ★1, ★2, ★3
export const HP_BASE = 200;
export const HP_PER_STAT = 10;
export const DAMAGE_BASE = 40;
export const DAMAGE_RANDOM: [number, number] = [0.9, 1.1];
export const ATTACK_INTERVAL_BASE = 2.0; // seconds at Speed 50
export const ATTACK_INTERVAL_CLAMP: [number, number] = [0.6, 2.5];
export const MOVE_SECONDS_PER_CELL = 0.4;
export const CRIT_MULT = 1.5;
export const ENERGY_MAX = 100;
export const ENERGY_PER_ATTACK = 10;
export const ENERGY_PER_HIT = 5;
export const PREY_RADIUS = 3; // Thiên địch: prefer prey within this many cells

// --- rounds ---
export const PVE_EARLY_ROUNDS = [1, 2, 3];
export const PVE_EVERY = 6; // then rounds 9, 15, 21, ...
export const PVE_FIRST_LATE = 9;

/** item tier dropped by a PvE round */
export function itemTierForRound(round: number): number {
  if (round <= 3) return 1;
  if (round < 15) return 2;
  if (round < 21) return 3;
  if (round < 27) return 4;
  return 5;
}

export function isPveRound(round: number): boolean {
  return PVE_EARLY_ROUNDS.includes(round) || (round >= PVE_FIRST_LATE && (round - PVE_FIRST_LATE) % PVE_EVERY === 0);
}

/** damage to the losing player before adding surviving enemy unit tiers */
export function stageDamage(round: number): number {
  if (round <= 10) return 1;
  if (round <= 20) return 3;
  if (round <= 30) return 5;
  return 8;
}

export const INVENTORY_MAX = 10;
export const TEAM_ITEM_SLOTS = 2;
export const BOARD_OBJECTS_MAX = 2;
