// One match: two players (you + a bot) sharing a VieAni pool – shop, gold, XP/levels, ★ merging,
// rounds and HP. Pure logic, no graphics (MatchScene draws it). Rules = config.ts / GDD §4–§5.

import * as C from "./config";
import { mirror, playerDamage, simulate, type BattleResult, type Placed } from "./battle";
import type { GameData, Species } from "./data";
import { Rng } from "./rng";
import { Team, type OwnedUnit, type Spot } from "./team";
import manifest from "../../../assets/illustrations/manifest.json";

/** test scenario: only illustrated VieAni are in the shop, and players start with less HP so a match is short */
/** roster codes (V001…) that have both illustrations – the test shop offers exactly these, so new uploads join automatically */
export const TEST_CODES = Object.keys(manifest as Record<string, { front?: unknown; back?: unknown }>)
  .filter((c) => (manifest as Record<string, { front?: unknown; back?: unknown }>)[c].front && (manifest as Record<string, { front?: unknown; back?: unknown }>)[c].back)
  .sort();
export const TEST_HP = 40;

export interface PlayerState {
  hp: number;
  gold: number;
  level: number;
  xp: number;
  /** > 0 = wins in a row, < 0 = losses in a row */
  streak: number;
  team: Team;
  /** species id per shop slot; null = bought */
  shop: (number | null)[];
  /** shop locked: the same offers stay for the next round (until unlocked or rerolled) */
  locked: boolean;
}

export interface RoundReport {
  round: number;
  winner: "A" | "B" | "draw";
  damage: { A: number; B: number };
  /** gold the human gets for the next round, split up for the result panel */
  income: { base: number; interest: number; streak: number; result: number };
  levelUp: boolean;
}

const copies = (star: number) => 3 ** (star - 1);
/** board spots per role: front line first for tanks, back line for mages/support (own half rows 4..7) */
const ROLE_ROWS: Record<string, number[]> = {
  "Đỡ Đòn": [4, 5, 6, 7], "Chiến Đấu": [4, 5, 6, 7], "Săn Mồi": [5, 4, 6, 7], "Phép Thuật": [7, 6, 5, 4], "Hỗ Trợ": [7, 6, 5, 4],
};
const COL_ORDER = [3, 4, 2, 5, 1, 6, 0, 7];

export class Match {
  readonly pool = new Map<number, number>();
  readonly players: [PlayerState, PlayerState];
  readonly species: Species[];
  round = 1;
  private rng: Rng;
  private nextUid = 1;

  constructor(readonly d: GameData, species: Species[], seed: number, readonly startHp = C.PLAYER_HP) {
    this.species = species;
    this.rng = new Rng(seed);
    for (const s of species) this.pool.set(s.id, C.POOL_COPIES[s.tier] ?? 10);
    const mk = (): PlayerState => ({ hp: startHp, gold: C.START_GOLD, level: 1, xp: 0, streak: 0, team: new Team(1), shop: [], locked: false });
    this.players = [mk(), mk()];
    for (const p of this.players) this.rollShop(p);
  }

  get human() { return this.players[0]; }
  get bot() { return this.players[1]; }
  get over(): boolean { return this.players.some((p) => p.hp <= 0); }
  sp(id: number) { return this.d.byId.get(id)!; }
  cost(id: number) { return this.sp(id).tier; }
  /** XP still needed for the next level (null at max level) */
  xpNeeded(p: PlayerState): number | null { return p.level >= C.MAX_LEVEL ? null : C.XP_TO_NEXT[p.level - 1]; }
  interest(p: PlayerState) { return Math.min(C.INTEREST_MAX, Math.floor(p.gold / C.INTEREST_PER)); }
  sellValue(u: OwnedUnit) { return this.cost(u.speciesId) * copies(u.star); }

  // ------------------------------------------------------------------ shop
  /** put unbought offers back and draw a new shop, weighted by the copies left in the pool */
  rollShop(p: PlayerState) {
    for (const id of p.shop) if (id != null) this.pool.set(id, this.pool.get(id)! + 1);
    p.shop = [];
    for (let i = 0; i < C.SHOP_SLOTS; i++) {
      const w = this.species.map((s) => this.pool.get(s.id)!);
      if (w.every((n) => n <= 0)) { p.shop.push(null); continue; }
      const id = this.species[this.rng.weighted(w)].id;
      this.pool.set(id, this.pool.get(id)! - 1);
      p.shop.push(id);
    }
  }

  reroll(p: PlayerState): boolean {
    if (p.gold < C.REROLL_COST) return false;
    p.gold -= C.REROLL_COST;
    p.locked = false; // a paid reroll replaces the locked offers, so the lock is released
    this.rollShop(p);
    return true;
  }

  buyXp(p: PlayerState): boolean {
    if (p.gold < C.XP_BUY_COST || p.level >= C.MAX_LEVEL) return false;
    p.gold -= C.XP_BUY_COST;
    this.addXp(p, C.XP_BUY_AMOUNT);
    return true;
  }

  /** returns true if the player levelled up */
  addXp(p: PlayerState, n: number): boolean {
    const before = p.level;
    p.xp += n;
    for (let need = this.xpNeeded(p); need != null && p.xp >= need; need = this.xpNeeded(p)) {
      p.xp -= need;
      p.level++;
    }
    if (p.level >= C.MAX_LEVEL) p.xp = 0;
    p.team.maxOnBoard = p.level;
    return p.level > before;
  }

  canBuy(p: PlayerState, slot: number): boolean {
    const id = p.shop[slot];
    if (id == null || p.gold < this.cost(id)) return false;
    if (p.team.bench.includes(null)) return true;
    // full bench: allowed only if the new copy completes a ★2 right away
    return p.team.units().filter((u) => u.speciesId === id && u.star === 1).length >= 2;
  }

  /** buy a shop slot; returns the uids that were upgraded by merging (empty array = plain buy), or null */
  buy(p: PlayerState, slot: number): number[] | null {
    if (!this.canBuy(p, slot)) return null;
    const id = p.shop[slot]!;
    p.gold -= this.cost(id);
    p.shop[slot] = null;
    const u: OwnedUnit = { uid: this.nextUid++, speciesId: id, star: 1 };
    if (p.team.addToBench(u)) return this.mergeAll(p);
    // bench full: fold the new copy straight into the existing pair
    const ones = p.team.units().filter((x) => x.speciesId === id && x.star === 1);
    p.team.remove(ones[ones.length - 1].uid);
    ones[0].star = 2;
    return [ones[0].uid, ...this.mergeAll(p)];
  }

  sell(p: PlayerState, uid: number): number {
    const u = p.team.remove(uid);
    if (!u) return 0;
    const value = this.sellValue(u);
    p.gold += value;
    this.pool.set(u.speciesId, (this.pool.get(u.speciesId) ?? 0) + copies(u.star));
    return value;
  }

  /** three of the same VieAni and ★ become one with ★+1 (the copy on the board is kept); repeats for ★2 → ★3 */
  mergeAll(p: PlayerState): number[] {
    const upgraded: number[] = [];
    for (let again = true; again; ) {
      again = false;
      for (const star of [1, 2] as const) {
        const groups = new Map<number, OwnedUnit[]>();
        for (const u of p.team.units()) if (u.star === star) groups.set(u.speciesId, [...(groups.get(u.speciesId) ?? []), u]);
        for (const g of groups.values()) {
          if (g.length < 3) continue;
          const [keep, a, b] = g; // units() lists the board first, so a board copy is kept
          p.team.remove(a.uid);
          p.team.remove(b.uid);
          keep.star = (star + 1) as 2 | 3;
          upgraded.push(keep.uid);
          again = true;
          break;
        }
        if (again) break;
      }
    }
    return [...new Set(upgraded)];
  }

  // ------------------------------------------------------------------ placement
  /** a free spot on the own half that suits the unit's role */
  spotFor(team: Team, u: OwnedUnit): Spot | null {
    const rows = ROLE_ROWS[this.sp(u.speciesId).role ?? ""] ?? [5, 4, 6, 7];
    for (const row of rows) for (const col of COL_ORDER) if (!team.at({ where: "board", row, col })) return { where: "board", row, col };
    return null;
  }

  /** before a fight, fill free board slots from the bench (strongest first), like the real game does */
  autoFill(p: PlayerState): number[] {
    const moved: number[] = [];
    const bench = p.team.bench.filter((u): u is OwnedUnit => !!u).sort((a, b) => this.sellValue(b) - this.sellValue(a));
    for (const u of bench) {
      if (p.team.boardCount >= p.level) break;
      const s = this.spotFor(p.team, u);
      if (s && p.team.move(u.uid, s)) moved.push(u.uid);
    }
    return moved;
  }

  // ------------------------------------------------------------------ bot (same rules as the player)
  botTurn(p: PlayerState = this.bot) {
    const reserve = this.round >= 5 ? 10 : 0; // keep 10 gold for interest from round 5
    const owned = () => new Set(p.team.units().map((u) => u.speciesId));
    for (let rolls = 0; rolls < 4; rolls++) {
      // copies of what it already has first (toward ★2/★3), then anything it can afford above the reserve
      for (const slot of [0, 1, 2, 3, 4].sort((a, b) => Number(owned().has(p.shop[b] ?? -1)) - Number(owned().has(p.shop[a] ?? -1)))) {
        const id = p.shop[slot];
        if (id == null || !this.canBuy(p, slot)) continue;
        if (owned().has(id) || p.gold - this.cost(id) >= reserve) this.buy(p, slot);
      }
      if (this.round >= 3 && p.level < C.MAX_LEVEL && p.gold - C.XP_BUY_COST >= reserve + 4) this.buyXp(p);
      if (p.gold - C.REROLL_COST < reserve + 6 || !this.reroll(p)) break;
    }
    // best units on the board, by role
    const all = p.team.units().sort((a, b) => this.sellValue(b) - this.sellValue(a));
    const team = new Team(p.level);
    for (const u of all.slice(0, p.level)) { const s = this.spotFor(team, u); if (s) team.place(u, s); }
    for (const u of all.slice(p.level)) if (!team.addToBench(u)) { p.gold += this.sellValue(u); this.pool.set(u.speciesId, this.pool.get(u.speciesId)! + copies(u.star)); }
    p.team = team;
  }

  // ------------------------------------------------------------------ round
  /** human = side A (bottom), bot = side B (top, mirrored) */
  battle(seed: number): { units: Placed[]; res: BattleResult } {
    const a = this.human.team.toPlaced("A");
    const b = this.bot.team.toPlaced("B").map((u) => { const [row, col] = mirror(u.row, u.col); return { ...u, row, col }; });
    const units = [...a, ...b];
    if (!a.length || !b.length) {
      const winner = a.length ? "A" : b.length ? "B" : "draw";
      const survivors = units.map((u) => ({ uid: u.uid, side: u.side, hp: 1, tier: this.sp(u.speciesId).tier }));
      return { units, res: { winner, ticks: 0, events: [], survivors } };
    }
    return { units, res: simulate(this.d, units, seed) };
  }

  /** damage, streaks, income, XP, next round, fresh shops */
  finishRound(res: BattleResult): RoundReport {
    const damage = playerDamage(res, this.round);
    const [h, b] = this.players;
    h.hp = Math.max(0, h.hp - damage.A);
    b.hp = Math.max(0, b.hp - damage.B);
    let income = { base: 0, interest: 0, streak: 0, result: 0 };
    let levelUp = false;
    this.players.forEach((p, i) => {
      const won = res.winner === (i === 0 ? "A" : "B");
      const lost = res.winner === (i === 0 ? "B" : "A");
      p.streak = won ? Math.max(1, p.streak + 1) : lost ? Math.min(-1, p.streak - 1) : 0;
      const inc = {
        base: C.BASE_INCOME,
        interest: this.interest(p),
        streak: C.STREAK_BONUS.filter(([n]) => Math.abs(p.streak) >= n).reduce((m, [, g]) => Math.max(m, g), 0),
        result: won ? C.WIN_BONUS : C.LOSS_BONUS,
      };
      p.gold += inc.base + inc.interest + inc.streak + inc.result;
      const up = this.addXp(p, C.XP_PER_ROUND);
      if (i === 0) { income = inc; levelUp = up; }
    });
    const report: RoundReport = { round: this.round, winner: res.winner, damage, income, levelUp };
    this.round++;
    for (const p of this.players) if (!p.locked) this.rollShop(p);
    return report;
  }
}

/** the PO test scenario: shop limited to V001–V004 */
export function testMatch(d: GameData, seed: number): Match {
  const species = TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]).filter(Boolean);
  return new Match(d, species, seed, TEST_HP);
}
