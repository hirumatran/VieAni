// One match: two players (you + a bot) sharing a VieAni pool – shop, gold, XP/levels, ★ merging,
// rounds and HP. Pure logic, no graphics (MatchScene draws it). Rules = config.ts / GDD §4–§5.

import * as C from "./config";
import { mirror, playerDamage, simulate, type BattleResult, type Placed } from "./battle";
import type { GameData, Species } from "./data";
import { Rng } from "./rng";
import { Team, type OwnedUnit, type Spot } from "./team";
import manifest from "../../../assets/illustrations/manifest.json";
import { DROPPABLE, ITEM_RULES } from "./items";
import { synergyStates } from "./synergy";

/** species id of Rồng Lạc Việt (needed on the board for Ấn Thống Nhất) */
export const RONG_LAC_VIET = 1;

/** test scenario: only illustrated VieAni are in the shop (all 87 now) */
/** roster codes (V001…) that have both illustrations – the test shop offers exactly these, so new uploads join automatically */
export const TEST_CODES = Object.keys(manifest as Record<string, { front?: unknown; back?: unknown }>)
  .filter((c) => (manifest as Record<string, { front?: unknown; back?: unknown }>)[c].front && (manifest as Record<string, { front?: unknown; back?: unknown }>)[c].back)
  .sort();
/** PO 17 Nov 2026: rewards run to round 36 and charms to round 30, so the match uses the full 100 HP again (was 40) */
export const TEST_HP = C.PLAYER_HP;

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
  /** item bag (ids), max INVENTORY_MAX */
  items: number[];
  /** team items (category Toàn đội) – work without a carrier, max TEAM_ITEM_SLOTS */
  teamItems: number[];
  /** item reward waiting to be chosen (3 ids) */
  itemOffer: number[] | null;
  /** Linh Vật charms owned (ids 51–53) – no stats, no item slot */
  charms: number[];
  /** round in which Ấn Thống Nhất was first active (null = not yet) */
  unityRound: number | null;
}

export interface RoundReport {
  round: number;
  winner: "A" | "B" | "draw";
  damage: { A: number; B: number };
  /** gold the human gets for the next round, split up for the result panel */
  income: { base: number; interest: number; streak: number; result: number; items: number };
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
    const mk = (): PlayerState => ({ hp: startHp, gold: C.START_GOLD, level: 1, xp: 0, streak: 0, team: new Team(1), shop: [], locked: false, items: [], teamItems: [], itemOffer: null, charms: [], unityRound: null });
    this.players = [mk(), mk()];
    for (const p of this.players) this.rollShop(p);
    if (C.isItemRound(1)) for (const p of this.players) this.rollItems(p);
  }

  // ------------------------------------------------------------------ items
  item(id: number) { return this.d.items.find((i) => i.id === id)!; }
  isTeamItem(id: number) { return this.item(id).cat === "TD"; }

  /** offer ITEM_CHOICES different items of this round's tier (only items the battle can already use) */
  rollItems(p: PlayerState) {
    const tier = C.itemTierForRound(this.round);
    const pool = DROPPABLE.filter((id) => this.item(id).tier === tier);
    const offer: number[] = [];
    while (offer.length < Math.min(C.ITEM_CHOICES, pool.length)) {
      const id = pool[this.rng.int(0, pool.length - 1)];
      if (!offer.includes(id)) offer.push(id);
    }
    // Linh Vật: in its round window, one of the 3 choices is that charm (if the player does not have it yet)
    const charm = C.CHARM_ITEM_IDS.find((id) => {
      const [lo, hi] = C.CHARM_ROUND_WINDOWS[id];
      return this.round >= lo && this.round <= hi && !p.charms.includes(id);
    });
    if (charm != null) offer[this.rng.int(0, offer.length - 1)] = charm;
    p.itemOffer = offer;
  }

  isCharm(id: number) { return this.item(id).cat === "LV"; }

  /** Ấn Thống Nhất: max level + Rồng Lạc Việt on the board + all 3 Linh Vật → 2 missing zodiac signs count as present */
  unityActive(p: PlayerState): boolean {
    return p.level >= C.MAX_LEVEL && C.CHARM_ITEM_IDS.every((id) => p.charms.includes(id))
      && p.team.toPlaced().some((u) => u.speciesId === RONG_LAC_VIET);
  }

  zodiacBonus(p: PlayerState) { return this.unityActive(p) ? C.CHARM_BONUS_ZODIAC : 0; }

  chooseItem(p: PlayerState, index: number): number | null {
    const id = p.itemOffer?.[index];
    if (id == null) return null;
    p.itemOffer = null;
    this.addItem(p, id);
    return id;
  }

  /** into a free team slot (team items) or the bag; false if there is no room */
  addItem(p: PlayerState, id: number): boolean {
    if (this.isCharm(id)) { if (!p.charms.includes(id)) p.charms.push(id); return true; }
    if (this.isTeamItem(id) && p.teamItems.length < C.TEAM_ITEM_SLOTS) { p.teamItems.push(id); return true; }
    if (p.items.length < C.INVENTORY_MAX) { p.items.push(id); return true; }
    return false;
  }

  /** give the bag item at `index` to a VieAni (swaps with what it carried); team items go to a team slot instead */
  equip(p: PlayerState, index: number, uid: number): boolean {
    const id = p.items[index];
    if (id == null) return false;
    if (this.isTeamItem(id)) return this.equipTeam(p, index);
    const u = p.team.units().find((x) => x.uid === uid);
    if (!u) return false;
    if (u.item != null) p.items[index] = u.item; else p.items.splice(index, 1);
    u.item = id;
    return true;
  }

  equipTeam(p: PlayerState, index: number): boolean {
    const id = p.items[index];
    if (id == null || !this.isTeamItem(id) || p.teamItems.length >= C.TEAM_ITEM_SLOTS) return false;
    p.items.splice(index, 1);
    p.teamItems.push(id);
    return true;
  }

  /** an item comes back from a unit that leaves (sold / merged) */
  private returnItem(p: PlayerState, u: OwnedUnit) {
    if (u.item != null) { this.addItem(p, u.item); u.item = undefined; }
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
  /** put unbought offers back and draw a new shop: tier by the level's SHOP_ODDS (tiers with no copies left or no species
   *  in this match are skipped and the odds renormalised), then a species of that tier weighted by the copies left */
  rollShop(p: PlayerState) {
    for (const id of p.shop) if (id != null) this.pool.set(id, this.pool.get(id)! + 1);
    p.shop = [];
    const odds = C.SHOP_ODDS[Math.min(p.level, C.SHOP_ODDS.length) - 1];
    for (let i = 0; i < C.SHOP_SLOTS; i++) {
      const left = (tier: number) => this.species.filter((s) => s.tier === tier && this.pool.get(s.id)! > 0);
      let w = odds.map((o, t) => (left(t + 1).length ? o : 0));
      // early levels can only roll tiers that may be missing from a small test set: fall back to any tier with copies left
      if (w.every((n) => n <= 0)) w = odds.map((_, t) => left(t + 1).reduce((n, s) => n + this.pool.get(s.id)!, 0));
      if (w.every((n) => n <= 0)) { p.shop.push(null); continue; }
      const cands = left(this.rng.weighted(w) + 1);
      const id = cands[this.rng.weighted(cands.map((s) => this.pool.get(s.id)!))].id;
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
    const gone = ones[ones.length - 1];
    p.team.remove(gone.uid);
    if (gone.item != null && ones[0].item == null) { ones[0].item = gone.item; gone.item = undefined; }
    this.returnItem(p, gone);
    ones[0].star = 2;
    return [ones[0].uid, ...this.mergeAll(p)];
  }

  sell(p: PlayerState, uid: number): number {
    const u = p.team.remove(uid);
    if (!u) return 0;
    this.returnItem(p, u);
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
          for (const x of [a, b]) {
            if (x.item != null && keep.item == null) { keep.item = x.item; x.item = undefined; }
            this.returnItem(p, x);
          }
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
  /** bot items: take the first offer, put team items in team slots, give the rest to its strongest board units */
  private botItems(p: PlayerState) {
    if (p.itemOffer) this.chooseItem(p, 0);
    for (let i = p.items.length - 1; i >= 0; i--) {
      const id = p.items[i];
      if (this.isTeamItem(id)) { this.equipTeam(p, i); continue; }
      const ranged = ITEM_RULES[id]?.rangedOnly;
      const target = p.team.toPlaced().map((x) => p.team.units().find((u) => u.uid === x.uid)!)
        .filter((u) => u.item == null && (!ranged || this.sp(u.speciesId).range >= 2))
        .sort((a, b) => this.sellValue(b) - this.sellValue(a))[0];
      if (target) this.equip(p, i, target.uid);
    }
  }

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
    for (const u of all.slice(p.level)) if (!team.addToBench(u)) { this.returnItem(p, u); p.gold += this.sellValue(u); this.pool.set(u.speciesId, this.pool.get(u.speciesId)! + copies(u.star)); }
    p.team = team;
    this.botItems(p);
  }

  // ------------------------------------------------------------------ "Ấn Thống Nhất" strategy (demo of the charm rule)
  /** distinct zodiac signs on the board (+ Ấn Thống Nhất bonus) = Mười Hai Con Giáp count */
  zodiacCount(p: PlayerState): number {
    return synergyStates(this.d, p.team.toPlaced().map((u) => u.speciesId), this.zodiacBonus(p)).find((x) => x.syn.byZodiac)!.count;
  }

  /**
   * A player that goes for the 12 zodiac signs: always takes the Linh Vật, buys one VieAni per zodiac sign (Rồng Lạc Việt
   * first) plus copies of them for ★2/★3, levels fast, rerolls for missing signs and fields one VieAni per sign.
   */
  zodiacTurn(p: PlayerState) {
    if (p.itemOffer) {
      const i = p.itemOffer.findIndex((id) => this.isCharm(id));
      this.chooseItem(p, i >= 0 ? i : 0);
    }
    const signOf = (id: number) => this.sp(id).zodiac ?? null;
    const units = () => p.team.units();
    const ownedSigns = () => new Set(units().map((u) => signOf(u.speciesId)).filter(Boolean));
    const ownedIds = () => new Set(units().map((u) => u.speciesId));
    const newSign = (id: number) => (id === RONG_LAC_VIET ? !ownedIds().has(id) : !!signOf(id) && !ownedSigns().has(signOf(id)!));
    const reserve = () => (p.level >= 8 ? 0 : 10); // interest early, all-in late
    const needRong = () => !ownedIds().has(RONG_LAC_VIET);
    for (let rolls = 0; rolls < 15; rolls++) {
      for (let slot = 0; slot < p.shop.length; slot++) {
        const id = p.shop[slot];
        if (id == null || !this.canBuy(p, slot)) continue;
        const spare = p.gold - this.cost(id) >= reserve();
        const copy = ownedIds().has(id);                              // towards ★2/★3
        const filler = units().length < p.level + 2 && spare;        // keep the board full while the zodiac set grows
        if (newSign(id) || (copy && spare) || filler) this.buy(p, slot);
      }
      // level when the board can already be filled
      while (p.level < C.MAX_LEVEL && units().length >= p.level && p.gold - C.XP_BUY_COST >= reserve()) this.buyXp(p);
      const missing = 12 - ownedSigns().size;
      const chase = p.level >= 8 && (missing > 2 || needRong());
      if (!chase || p.gold < C.REROLL_COST + (needRong() ? 5 : 1)) break;
      this.reroll(p);
    }
    // field: Rồng Lạc Việt, then the best copy of every other sign, then the strongest others to fill the level
    const all = units().sort((a, b) => Number(b.speciesId === RONG_LAC_VIET) - Number(a.speciesId === RONG_LAC_VIET) || this.sellValue(b) - this.sellValue(a));
    const field: OwnedUnit[] = [];
    const seen = new Set<string>();
    for (const u of all) { const z = signOf(u.speciesId); if (z && !seen.has(z) && field.length < p.level) { seen.add(z); field.push(u); } }
    for (const u of all) if (field.length < p.level && !field.includes(u)) field.push(u);
    const team = new Team(p.level);
    for (const u of field) { const s = this.spotFor(team, u); if (s) team.place(u, s); }
    // bench: zodiac VieAni first (future signs / copies), sell the rest if it overflows
    const rest = all.filter((u) => !field.includes(u)).sort((a, b) => Number(!!signOf(b.speciesId)) - Number(!!signOf(a.speciesId)) || this.sellValue(b) - this.sellValue(a));
    for (const u of rest) if (!team.addToBench(u)) { this.returnItem(p, u); p.gold += this.sellValue(u); this.pool.set(u.speciesId, this.pool.get(u.speciesId)! + copies(u.star)); }
    p.team = team;
    this.botItems(p);
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
      return { units, res: { winner, ticks: 0, events: [], survivors, start: [] } };
    }
    return { units, res: simulate(this.d, units, seed, { A: this.human.teamItems, B: this.bot.teamItems }) };
  }

  /** damage, streaks, income, XP, next round, fresh shops */
  finishRound(res: BattleResult): RoundReport {
    const damage = playerDamage(res, this.round);
    const [h, b] = this.players;
    h.hp = Math.max(0, h.hp - damage.A);
    b.hp = Math.max(0, b.hp - damage.B);
    let income = { base: 0, interest: 0, streak: 0, result: 0, items: 0 };
    let levelUp = false;
    this.players.forEach((p, i) => {
      const won = res.winner === (i === 0 ? "A" : "B");
      const lost = res.winner === (i === 0 ? "B" : "A");
      p.streak = won ? Math.max(1, p.streak + 1) : lost ? Math.min(-1, p.streak - 1) : 0;
      // items that pay off after a won round, if their carrier is still standing: Lì Xì (+gold), Hạt Dưa (+2 % max HP, max 30)
      let itemGold = 0;
      if (won) {
        const standing = new Set(res.survivors.filter((x) => x.side === (i === 0 ? "A" : "B")).map((x) => x.uid));
        for (const u of p.team.units()) {
          if (u.item == null || !standing.has(u.uid)) continue;
          const r = ITEM_RULES[u.item];
          itemGold += r?.goldOnWin ?? 0;
          if (r?.hpPctPerWin) u.hpBonus = Math.min(30, (u.hpBonus ?? 0) + r.hpPctPerWin);
        }
      }
      const inc = {
        items: itemGold,
        base: C.BASE_INCOME,
        interest: this.interest(p),
        streak: C.STREAK_BONUS.filter(([n]) => Math.abs(p.streak) >= n).reduce((m, [, g]) => Math.max(m, g), 0),
        result: won ? C.WIN_BONUS : C.LOSS_BONUS,
      };
      p.gold += inc.base + inc.interest + inc.streak + inc.result + inc.items;
      const up = this.addXp(p, C.XP_PER_ROUND);
      if (i === 0) { income = inc; levelUp = up; }
    });
    for (const p of this.players) if (p.unityRound == null && this.unityActive(p) && this.zodiacCount(p) >= 12) p.unityRound = this.round;
    const report: RoundReport = { round: this.round, winner: res.winner, damage, income, levelUp };
    this.round++;
    for (const p of this.players) if (!p.locked) this.rollShop(p);
    if (C.isItemRound(this.round)) for (const p of this.players) { if (p.itemOffer) this.chooseItem(p, 0); this.rollItems(p); }
    return report;
  }
}

/** the PO test scenario: shop limited to V001–V004 */
export function testMatch(d: GameData, seed: number): Match {
  const species = TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]).filter(Boolean);
  return new Match(d, species, seed, TEST_HP);
}
