// Deterministic auto-battle simulation (GDD §6). No graphics: it returns a list of events that the
// Phaser scene replays. Same teams + same seed => exactly the same events on every device.

import * as C from "./config";
import type { GameData, Species } from "./data";
import { Rng } from "./rng";
import { ELEPHANT_IDS, ITEM_RULES, PAIR, type ItemRule } from "./items";
import { at, isMember, sideSynergies, type SideSynergies } from "./synergyRules";

export type Side = "A" | "B"; // A = bottom half (the player), B = top half (opponent)

/** a unit as placed before the battle */
export interface Placed {
  uid: number;
  speciesId: number;
  star: 1 | 2 | 3;
  row: number; // full board row 0..7 (A uses 4..7, B uses 0..3)
  col: number;
  side: Side;
  /** carried item id (one per VieAni) */
  item?: number;
  /** permanent max-HP bonus in % (Hạt Dưa) */
  hpBonusPct?: number;
}

export interface Fighter extends Placed {
  sp: Species;
  maxHp: number;
  hp: number;
  energy: number;
  atkCd: number; // ticks until next attack
  moveCd: number; // ticks until next step
  interval: number; // attack interval in ticks (float)
  targetUid: number | null;
  alive: boolean;
  // effective stats after items + tộc hệ (v3: Tấn Công, Giáp %, Tốc Độ Đánh via interval)
  atk: number; armor: number; armorPen: number;
  moveTicks: number;
  rule: ItemRule;
  dmgMult: number; crit: number; critMult: number;
  lowHealUsed: boolean; reviveUsed: boolean; dodged: boolean;
  lastHitT: number;
  bleeds: { next: number; left: number; per: number }[];
  // ----- tộc hệ state
  dodge: number; rangedDodge: number;
  stealthUntil: number; revealCrit: boolean;
  rabidUntil: number; rabidImmune: boolean;
  shield: number; shieldUsed: boolean;
  /** attack speed multiplier (dogs' loyalty, Sông Nước rain) and a timed buff (cats) */
  haste: number; buffPct: number; buffUntil: number;
  defShred: number;
  regenPct: number;
  /** damage multiplier vs Côn Trùng members (Săn Côn Trùng) */
  vsInsect: number;
  /** damage taken from Biển Đông / Sông Nước members (Sơn Tinh: ×0.5 / ×0) */
  waterTaken: number;
  /** members of these tộc hệ (cached for the retargeted rules) */
  water: boolean; insect: boolean;
}

export type BattleEvent =
  | { t: number; type: "move"; uid: number; row: number; col: number }
  // en / tEn = energy (mana) of the attacker / target right after the hit, for the info card
  | { t: number; type: "attack"; uid: number; target: number; dmg: number; mult: number; en: number; tEn: number; miss?: boolean; crit?: boolean }
  | { t: number; type: "cast"; uid: number; target: number; dmg: number; en: number; tEn: number }
  | { t: number; type: "death"; uid: number }
  /** HP change outside a normal hit: heals (+), bleeding, lightning, extra shots (−) */
  | { t: number; type: "hp"; uid: number; delta: number; kind: "heal" | "bleed" | "zap" | "shot" }
  | { t: number; type: "revive"; uid: number; hp: number; row: number; col: number }
  /** tộc hệ statuses: Dại (attacks its own allies), Ẩn mình (cannot be targeted), khiên (shield) */
  | { t: number; type: "status"; uid: number; kind: "rabid" | "stealth" | "shield"; ticks: number; amount?: number };

export interface BattleResult {
  winner: Side | "draw";
  ticks: number;
  events: BattleEvent[];
  survivors: { uid: number; side: Side; hp: number; tier: number; star?: number }[];
  /** max HP of every fighter at the start (after items) – for the HP bars */
  start?: { uid: number; maxHp: number }[];
}

// ------------------------------------------------------------------ battle stats (v3, PO 19 Nov 2026)
/** Máu at a star level */
export function maxHp(sp: Species, star: 1 | 2 | 3) {
  return Math.round(sp.stats.hp * C.STAR_MULT[star - 1]);
}

/** seconds between two attacks (from Tốc Độ Đánh = attacks per second) */
export function attackInterval(sp: Species, bonusPct = 0) {
  const s = 1 / (sp.stats.aspd * (1 + bonusPct));
  return Math.min(C.ATTACK_INTERVAL_CLAMP[1], Math.max(C.ATTACK_INTERVAL_CLAMP[0], s));
}

const dist = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)); // Chebyshev: diagonal = 1

// ------------------------------------------------------------------ Thiên địch (natural predator)
let INSECT_IDS = new Set<number>();
interface PreyRule { prey: Set<number>; preyType?: string; mult: number; unlimited: boolean }

function preyRules(d: GameData): Map<number, PreyRule[]> {
  const m = new Map<number, PreyRule[]>();
  for (const r of d.relations) {
    if (r.kind !== "Thiên địch") continue;
    const rule: PreyRule = {
      prey: new Set(r.b),
      preyType: r.bType,
      mult: r.mult ?? 1,
      unlimited: (r as { range?: string }).range === "vô hạn",
    };
    for (const a of r.a) m.set(a, [...(m.get(a) ?? []), rule]);
  }
  return m;
}

function preyRule(rules: Map<number, PreyRule[]>, hunter: Fighter, target: Fighter): PreyRule | undefined {
  // v3: no types – a type-wide prey ("Insect") means the members of the Côn Trùng tộc hệ
  return rules.get(hunter.speciesId)?.find((r) => r.prey.has(target.speciesId) || (r.preyType === "Insect" && INSECT_IDS.has(target.speciesId)));
}

// ------------------------------------------------------------------ simulation
export interface SimOptions {
  /** missing zodiac signs counted as present (Ấn Thống Nhất) per side */
  zodiacBonus?: Partial<Record<Side, number>>;
  /** only these tộc hệ work for that side (balance experiments); null/undefined = all */
  synergies?: Partial<Record<Side, string[] | null>>;
  /** balance experiments only (tools/unitBalance.ts): skill damage per species until T11 is built –
   *  pct = % of Tấn Công, hit = "1" one target · "2" target + nearest enemy · "aoe" target + 2 nearest · "" no damage */
  castPower?: Map<number, { pct: number; hit: string }>;
}

export function simulate(d: GameData, units: Placed[], seed: number, teamItems: Partial<Record<Side, number[]>> = {}, opts: SimOptions = {}): BattleResult {
  const rng = new Rng(seed);
  const rules = preyRules(d);
  INSECT_IDS = new Set(d.synergies.find((g) => g.name === "Côn Trùng")?.members ?? []);
  const TPS = C.TICKS_PER_SECOND;
  const maxTicks = C.BATTLE_MAX_SECONDS * TPS;

  // team rules per side: team-slot items, plus Bánh Chưng + Bánh Giầy pair
  const sideRules = (side: Side): ItemRule[] => {
    const rules = (teamItems[side] ?? []).map((id) => ITEM_RULES[id]).filter(Boolean);
    const carried = units.filter((u) => u.side === side).map((u) => u.item);
    if (carried.includes(PAIR[0]) && carried.includes(PAIR[1])) rules.push({ teamAllPct: PAIR[2] });
    return rules;
  };
  const team: Record<Side, ItemRule[]> = { A: sideRules("A"), B: sideRules("B") };
  const onSide = (side: Side, speciesId: number) => units.some((u) => u.side === side && u.speciesId === speciesId);
  const syn: Record<Side, SideSynergies> = {
    A: sideSynergies(d, units.filter((u) => u.side === "A").map((u) => u.speciesId), opts.zodiacBonus?.A ?? 0, opts.synergies?.A),
    B: sideSynergies(d, units.filter((u) => u.side === "B").map((u) => u.speciesId), opts.zodiacBonus?.B ?? 0, opts.synergies?.B),
  };
  const lv = (side: Side, name: string) => syn[side].get(name) ?? -1;
  /** reached tier index if this species is a member of an active tộc hệ, else −1 */
  const mlv = (side: Side, name: string, sp: Species) => (lv(side, name) >= 0 && isMember(d, name, sp) ? lv(side, name) : -1);
  const other = (side: Side): Side => (side === "A" ? "B" : "A");

  const fighters: Fighter[] = units
    .map((u) => {
      const sp = d.byId.get(u.speciesId);
      if (!sp) throw new Error(`unknown species ${u.speciesId}`);
      let rule: ItemRule = (u.item != null && ITEM_RULES[u.item]) || {};
      if (rule.rangedOnly && sp.range < 2) rule = {}; // ranged-only items do nothing on melee VieAni
      const S = u.side;
      let atk = sp.stats.atk + (rule.flatAtk ?? 0);
      let armor = sp.stats.armor + (rule.armor ?? 0);
      let hpMul = 1 + (u.hpBonusPct ?? 0) / 100 + (rule.hpPct ?? 0);
      let aspd = (rule.atkSpeedPct ?? 0) + (rule.aspdPct ?? 0);
      let atkPct = 0, all = 0, crit = rule.crit ?? 0, critMult = rule.critMult ?? C.CRIT_MULT;
      if (rule.nearElephantAtkPct && units.some((o) => o.side === S && ELEPHANT_IDS.includes(o.speciesId) && dist(o, u) <= 1)) atkPct += rule.nearElephantAtkPct;
      let multi = rule.multiShot ?? 0;
      // team items
      for (const tr of team[S]) {
        const k = tr.doubledBy != null && onSide(S, tr.doubledBy) ? 2 : 1;
        all += (tr.teamAllPct ?? 0) + (sp.tier === 1 ? tr.teamTier1AllPct ?? 0 : 0);
        atkPct += (tr.teamAtkPct ?? 0) * k;
        aspd += (tr.teamAspdPct ?? 0) * k;
        armor += tr.teamArmor ?? 0;
        if (sp.range >= 2) multi += tr.teamRangedMultiShot ?? 0;
      }
      // ----- tộc hệ (v3 numbers: "Phòng thủ" bonuses became Giáp points, "Tốc độ" became Tốc Độ Đánh)
      all += at(mlv(S, "Tứ Linh", sp), [0.15, 0.15]) + at(lv(S, "Tứ Linh"), [0, 0.15]);
      const zl = lv(S, "Mười Hai Con Giáp");
      all += zl >= 3 ? 0.25 : at(mlv(S, "Mười Hai Con Giáp", sp), [0.05, 0.1, 0.15]);
      armor += at(lv(S, "Hộ Quốc"), [5, 10, 15]);
      crit += at(mlv(S, "Săn Mồi", sp), [0.15, 0.3, 0.45]);
      if (mlv(S, "Săn Mồi", sp) >= 1) critMult = Math.max(critMult, mlv(S, "Săn Mồi", sp) >= 2 ? 2 : 1.75);
      hpMul += at(mlv(S, "Cự Thú", sp), [0.15, 0.3, 0.45]);
      armor += at(mlv(S, "Cao Nguyên Bắc Bộ", sp), [5, 10, 15]) + at(mlv(S, "Biển Đông", sp), [5, 10, 15]);
      atkPct += at(mlv(S, "Biển Đông", sp), [0, 0.15, 0.3]);
      aspd += at(mlv(S, "Tây Nguyên", sp), [0.1, 0.2, 0.3]) + at(mlv(S, "Côn Trùng", sp), [0.15, 0.25, 0.25]);
      aspd -= at(lv(other(S), "Sông Nước"), [0, 0, 0.15]);
      const gs = mlv(S, "Gia Súc", sp);
      hpMul += at(gs, [0.1, 0.2, 0.3]); armor += at(gs, [4, 8, 12]);
      const sct = mlv(S, "Săn Côn Trùng", sp);
      atkPct += at(sct, [0.1, 0.15, 0.2]); // buff 19 Nov: also stronger against everyone
      if (all) { atkPct += all; hpMul += all; aspd += all; armor *= 1 + all; }
      atk *= 1 + atkPct;
      const hp = Math.round(maxHp(sp, u.star) * hpMul);
      const interval = attackInterval(sp, aspd) * TPS;
      const ts = mlv(S, "Trường Sơn", sp);
      const insect = isMember(d, "Côn Trùng", sp);
      // first attack after half an interval, so fast units strike first
      return {
        ...u, sp, maxHp: hp, hp, energy: 0, atkCd: interval / 2, moveCd: 0, interval, targetUid: null, alive: true,
        atk, armor: Math.min(C.ARMOR_CAP, Math.max(0, armor)), armorPen: rule.armorPen ?? 0,
        moveTicks: Math.round((C.ROLE_MOVE_SECONDS[sp.role ?? ""] ?? C.MOVE_SECONDS_PER_CELL) * TPS),
        rule: { ...rule, multiShot: multi }, dmgMult: 1 + (rule.dmgPct ?? 0), crit, critMult,
        lowHealUsed: false, reviveUsed: false, dodged: false, lastHitT: -999, bleeds: [],
        dodge: at(ts, [0.1, 0.2, 0.3]) + (insect ? at(mlv(S, "Côn Trùng", sp), [0, 0.15, 0.15]) : 0),
        rangedDodge: at(mlv(S, "Cao Nguyên Bắc Bộ", sp), [0.15, 0.25, 0.25]),
        stealthUntil: at(ts, [2, 3, 4]) * TPS, revealCrit: ts >= 2,
        rabidUntil: -1, rabidImmune: gs >= 1 || (zl >= 2 && !!sp.zodiac) || u.item === 11,
        shield: 0, shieldUsed: false,
        haste: 1, buffPct: 0, buffUntil: -1, defShred: 0,
        // buff 19 Nov: Sông Nước regen 2 / 3 / 4 % per second (was 1 / 1,5 / 2)
        regenPct: Math.max(at(mlv(S, "Sông Nước", sp), [0.02, 0.03, 0.04]), at(lv(S, "Sông Nước"), [0, 0.03, 0.04])),
        vsInsect: 1 + at(sct, [0.25, 0.5, 0.5]) + at(lv(S, "Săn Côn Trùng"), [0, 0, 0.25]),
        waterTaken: [1, 0.5, 0][Math.max(0, mlv(S, "Sơn Tinh", sp) + 1)],
        water: isMember(d, "Biển Đông", sp) || isMember(d, "Sông Nước", sp), insect,
      };
    })
    .sort((a, b) => a.uid - b.uid);
  const rally: Record<Side, number> = { A: 0, B: 0 };
  const allyRevive: Record<Side, boolean> = { A: false, B: false };
  const pendingRevives: { t: number; f: Fighter; pct: number }[] = [];
  const once: Record<string, boolean> = {}; // one-time tộc hệ effects per side ("A:hoquoc", …)
  const firstOnce = (k: string) => (once[k] ? false : (once[k] = true));

  const events: BattleEvent[] = [];
  const occ = new Map<string, number>(); // "r,c" -> uid
  const key = (r: number, c: number) => `${r},${c}`;
  for (const f of fighters) occ.set(key(f.row, f.col), f.uid);
  const byUid = new Map(fighters.map((f) => [f.uid, f]));

  let now = 0;
  /** who f attacks: enemies, or its own allies while Dại; stealthed fighters cannot be targeted */
  const enemiesOf = (f: Fighter) => {
    const rabid = f.rabidUntil > now;
    return fighters.filter((o) => o.alive && o !== f && (rabid ? o.side === f.side : o.side !== f.side) && o.stealthUntil <= now);
  };

  function inRange(f: Fighter, t: Fighter) {
    const r = preyRule(rules, f, t);
    return (r?.unlimited ?? false) || !!f.rule.infiniteRange || dist(f, t) <= f.sp.range;
  }

  function chooseTarget(f: Fighter): Fighter | undefined {
    const foes = enemiesOf(f);
    if (!foes.length) return undefined;
    const current = f.targetUid != null ? byUid.get(f.targetUid) : undefined;
    // Thiên địch: prey within PREY_RADIUS (or anywhere, for unlimited-range hunters) takes priority
    const prey = foes
      .filter((o) => {
        const r = preyRule(rules, f, o);
        return r && (r.unlimited || dist(f, o) <= C.PREY_RADIUS);
      })
      .sort((a, b) => dist(f, a) - dist(f, b) || a.hp - b.hp || a.uid - b.uid);
    if (prey.length) return prey[0];
    if (current?.alive && foes.includes(current)) return current;
    return foes.sort((a, b) => dist(f, a) - dist(f, b) || a.hp - b.hp || a.uid - b.uid)[0];
  }

  /** BFS over free cells: first step towards any cell from which `t` is in range */
  function nextStep(f: Fighter, t: Fighter): [number, number] | null {
    const start = key(f.row, f.col);
    const prev = new Map<string, string>([[start, ""]]);
    const queue: [number, number][] = [[f.row, f.col]];
    while (queue.length) {
      const [r, c] = queue.shift()!;
      if ((r !== f.row || c !== f.col) && dist({ row: r, col: c }, t) <= f.sp.range) {
        let k = key(r, c);
        while (prev.get(k) !== start) k = prev.get(k)!;
        const [nr, nc] = k.split(",").map(Number);
        return [nr, nc];
      }
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if ((!dr && !dc) || nr < 0 || nc < 0 || nr >= C.BOARD_ROWS || nc >= C.BOARD_COLS) continue;
          const k = key(nr, nc);
          if (prev.has(k) || occ.has(k)) continue;
          prev.set(k, key(r, c));
          queue.push([nr, nc]);
        }
    }
    return null; // boxed in: wait
  }

  /** base damage of f on target (Tấn Công × ★ × power × (1 − Giáp %) × prey × items) – no randomness */
  function baseDamage(f: Fighter, target: Fighter, power: number) {
    const A = f.atk * (1 + rally[f.side]);
    const armor = Math.max(0, Math.min(C.ARMOR_CAP, target.armor - f.armorPen - 2 * target.defShred));
    const preyM = preyRule(rules, f, target)?.mult ?? 1;
    let itemM = f.dmgMult;
    for (const [name, m] of Object.entries(f.rule.vsSyn ?? {})) if (isMember(d, name, target.sp)) itemM *= m;
    if (f.water) { itemM *= target.waterTaken; for (const m of Object.values(target.rule.fromWater ?? {})) itemM *= m; }
    if (target.sp.tier > f.sp.tier) itemM *= 1 + (f.rule.vsHigherTier ?? 0);
    if (target.insect) itemM *= f.vsInsect;
    return { base: A * (1 - armor / 100) * preyM * itemM * C.STAR_MULT[f.star - 1] * power, typeM: 1, preyM };
  }

  function heal(t: number, f: Fighter, pct: number) {
    if (!f.alive || f.hp >= f.maxHp) return;
    const amount = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * pct));
    if (amount <= 0) return;
    f.hp += amount;
    events.push({ t, type: "hp", uid: f.uid, delta: amount, kind: "heal" });
  }

  /** take damage; handles Nắm Xôi, knock-outs, Hịch Tướng Sĩ, revives */
  function damage(t: number, target: Fighter, dmg: number, by?: Fighter) {
    if (target.shield > 0) { const a = Math.min(target.shield, dmg); target.shield -= a; dmg -= a; }
    target.hp -= dmg;
    target.lastHitT = t;
    target.energy = Math.min(target.sp.stats.energy, target.energy + C.ENERGY_PER_HIT);
    if (target.hp > 0 && !target.lowHealUsed && target.rule.lowHpHeal && target.hp < target.maxHp * 0.3) {
      target.lowHealUsed = true;
      heal(t, target, target.rule.lowHpHeal);
    }
    // Hộ Quốc (4): an ally under 30 % gets a shield of 20 % max HP (once)
    if (target.hp > 0 && !target.shieldUsed && lv(target.side, "Hộ Quốc") >= 1 && target.hp < target.maxHp * 0.3) {
      target.shieldUsed = true;
      target.shield = Math.round(target.maxHp * 0.2);
      events.push({ t, type: "status", uid: target.uid, kind: "shield", ticks: 0, amount: target.shield });
    }
    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      target.bleeds = [];
      occ.delete(key(target.row, target.col));
      events.push({ t, type: "death", uid: target.uid });
      const side = target.side;
      // Hịch Tướng Sĩ: the first fall rallies the team
      if (!rally[side]) rally[side] = Math.max(0, ...team[side].map((r) => r.rallyAtkPct ?? 0));
      // Lá Đa Thần (an ally carries it) revives the first fallen ally; Quả Thị revives its carrier
      const leaf = fighters.find((o) => o.side === side && o.alive && o.rule.reviveAlly);
      if (leaf && !allyRevive[side]) { allyRevive[side] = true; pendingRevives.push({ t: t + 2 * TPS, f: target, pct: leaf.rule.reviveAlly! }); }
      else if (target.rule.selfRevive && !target.reviveUsed) { target.reviveUsed = true; pendingRevives.push({ t: t + 4 * TPS, f: target, pct: target.rule.selfRevive }); }
      // tộc hệ revives: Mười Hai Con Giáp (12) first zodiac 50 %, Hội Nhà Mèo (3) first cat 20 %, Côn Trùng (9) 30 % chance
      else if (lv(side, "Mười Hai Con Giáp") >= 3 && target.sp.zodiac && firstOnce(side + ":zodiacRevive")) pendingRevives.push({ t: t + 2 * TPS, f: target, pct: 0.5 });
      else if (mlv(side, "Hội Nhà Mèo", target.sp) >= 1 && firstOnce(side + ":catRevive")) pendingRevives.push({ t: t + 2 * TPS, f: target, pct: 0.2 });
      else if (mlv(side, "Côn Trùng", target.sp) >= 2 && rng.next() < 0.3) pendingRevives.push({ t: t + 2 * TPS, f: target, pct: 0.3 });
      // Hộ Quốc (6) 'giữ nước': first fall heals the team 15 %
      if (lv(side, "Hộ Quốc") >= 2 && firstOnce(side + ":hoquoc")) for (const o of fighters) if (o.side === side && o.alive) heal(t, o, 0.15);
      // Bầy Chó Dữ (4) Trung thành: an ally falls → dogs +25 % attack and speed (once)
      if (lv(side, "Bầy Chó Dữ") >= 1 && firstOnce(side + ":loyal"))
        for (const o of fighters) if (o.side === side && o.alive && isMember(d, "Bầy Chó Dữ", o.sp)) { o.atk *= 1.25; o.haste *= 1.25; }
      // killer heals: Săn Mồi (6) 15 %, Săn Côn Trùng (4) 10 % for an Insect
      if (by && by.alive && by.side !== side) {
        if (mlv(by.side, "Săn Mồi", by.sp) >= 2) heal(t, by, 0.15);
        if (mlv(by.side, "Săn Côn Trùng", by.sp) >= 1 && target.insect) heal(t, by, 0.1);
      }
    }
  }

  function freeCellNear(row: number, col: number): [number, number] | null {
    for (let r = 0; r <= C.BOARD_ROWS; r++)
      for (let dr = -r; dr <= r; dr++)
        for (let dc = -r; dc <= r; dc++) {
          const nr = row + dr, nc = col + dc;
          if (Math.max(Math.abs(dr), Math.abs(dc)) !== r || nr < 0 || nc < 0 || nr >= C.BOARD_ROWS || nc >= C.BOARD_COLS) continue;
          if (!occ.has(key(nr, nc))) return [nr, nc];
        }
    return null;
  }

  function hit(t: number, f: Fighter, target: Fighter, power: number, kind: "attack" | "cast") {
    // dodge (Trường Sơn, Côn Trùng), ranged dodge (Cao Nguyên), fog (Cao Nguyên 6: 3 s of every 10 s, enemy ranged −25 %)
    if (kind === "attack") {
      let miss = target.dodge;
      if (f.sp.range >= 2) {
        miss += target.rangedDodge;
        if (lv(target.side, "Cao Nguyên Bắc Bộ") >= 2 && t >= 10 * TPS && t % (10 * TPS) < 3 * TPS) miss += 0.25;
      }
      if (target.insect && lv(f.side, "Săn Côn Trùng") >= 2) miss -= 0.2;
      if (miss > 0 && rng.next() < miss) {
        events.push({ t, type: "attack", uid: f.uid, target: target.uid, dmg: 0, mult: 1, en: f.energy, tEn: target.energy, miss: true });
        return;
      }
    }
    const { base, typeM, preyM } = baseDamage(f, target, power);
    const roll = rng.range(C.DAMAGE_RANDOM[0], C.DAMAGE_RANDOM[1]);
    let critHit = f.crit > 0 && rng.next() < f.crit;
    if (f.revealCrit && kind === "attack") { critHit = true; f.revealCrit = false; } // Trường Sơn (6): first hit after hiding
    let dmg = Math.max(1, Math.round(base * roll * (critHit ? f.critMult : 1)));
    if (kind === "cast" && target.rule.dodgeFirstCast && !target.dodged) { target.dodged = true; dmg = 0; } // Ngọc Dã Tràng
    events.push(kind === "attack"
      ? { t, type: "attack", uid: f.uid, target: target.uid, dmg, mult: typeM * preyM, en: f.energy, tEn: Math.min(target.sp.stats.energy, target.energy + C.ENERGY_PER_HIT), crit: critHit || undefined }
      : { t, type: "cast", uid: f.uid, target: target.uid, dmg, en: f.energy, tEn: Math.min(target.sp.stats.energy, target.energy + C.ENERGY_PER_HIT) });
    damage(t, target, dmg, f);
    if (f.water && mlv(target.side, "Sơn Tinh", target.sp) >= 1) target.armor = Math.min(C.ARMOR_CAP, target.armor + 2); // núi cao thêm
    if (kind !== "attack" || !target.alive) return;
    // Bầy Gặm Nhấm: each hit −3 Phòng thủ (stacks 10 / 15)
    const gn = mlv(f.side, "Bầy Gặm Nhấm", f.sp);
    if (gn >= 0) target.defShred = Math.min(gn >= 1 ? 15 : 10, target.defShred + 1); // −2 Giáp per stack (buff 19 Nov)
    // Bầy Chó Dữ: dog bites may cause Dại (the target attacks its own allies)
    const dog = mlv(f.side, "Bầy Chó Dữ", f.sp);
    const ctrlImmune = lv(target.side, "Tứ Linh") >= 1 && isMember(d, "Tứ Linh", target.sp) && t < 4 * TPS;
    if (dog >= 0 && !target.rabidImmune && !ctrlImmune && target.rabidUntil <= t && rng.next() < (dog >= 1 ? 0.25 : 0.15)) {
      const ticks = (dog >= 1 ? 4 : 3) * TPS;
      target.rabidUntil = t + ticks; target.targetUid = null;
      events.push({ t, type: "status", uid: target.uid, kind: "rabid", ticks });
    }
    // on-attack item effects
    if (f.rule.bleed && rng.next() < f.rule.bleed && target.alive)
      target.bleeds.push({ next: t + TPS, left: 3, per: Math.max(1, Math.round(target.maxHp * 0.03)) });
    if (f.rule.zap && rng.next() < f.rule.zap) {
      const near = fighters.find((o) => o.alive && o.side === target.side && o !== target && dist(o, target) <= 1);
      for (const z of [target, near]) {
        if (!z || !z.alive) continue;
        const zd = Math.max(1, Math.round(baseDamage(f, z, 0.6).base));
        events.push({ t, type: "hp", uid: z.uid, delta: -zd, kind: "zap" });
        damage(t, z, zd);
      }
    }
    const extra = f.rule.multiShot ?? 0;
    if (extra > 0)
      fighters.filter((o) => o.alive && o.side === target.side && o !== target)
        .sort((a, b) => dist(a, target) - dist(b, target) || a.uid - b.uid).slice(0, extra)
        .forEach((o) => {
          const sd = Math.max(1, Math.round(baseDamage(f, o, 1).base * rng.range(C.DAMAGE_RANDOM[0], C.DAMAGE_RANDOM[1])));
          events.push({ t, type: "hp", uid: o.uid, delta: -sd, kind: "shot" });
          damage(t, o, sd);
        });
  }

  /** per-tick upkeep: revives, bleeding, regeneration */
  function upkeep(t: number) {
    for (const r of pendingRevives.filter((p) => p.t === t)) {
      const cell = freeCellNear(r.f.row, r.f.col);
      if (!cell) continue;
      [r.f.row, r.f.col] = cell;
      r.f.alive = true; r.f.hp = Math.max(1, Math.round(r.f.maxHp * r.pct)); r.f.energy = 0; r.f.atkCd = r.f.interval / 2;
      r.f.rabidUntil = -1; r.f.targetUid = null;
      occ.set(key(r.f.row, r.f.col), r.f.uid);
      events.push({ t, type: "revive", uid: r.f.uid, hp: r.f.hp, row: r.f.row, col: r.f.col });
    }
    for (const f of fighters) {
      if (!f.alive) continue;
      for (const b of f.bleeds) if (b.left > 0 && t >= b.next) {
        b.left--; b.next += TPS;
        events.push({ t, type: "hp", uid: f.uid, delta: -b.per, kind: "bleed" });
        damage(t, f, b.per);
        if (!f.alive) break;
      }
      if (!f.alive) continue;
      if (f.rule.regen5s && t > 0 && t % (5 * TPS) === 0) heal(t, f, f.rule.regen5s);
      if (f.rule.idleRegen && t - f.lastHitT >= 2 * TPS && t % TPS === 0) heal(t, f, f.rule.idleRegen);
      if (f.regenPct && t > 0 && t % TPS === 0) heal(t, f, f.regenPct); // Sông Nước
    }
    for (const side of ["A", "B"] as Side[]) {
      // Tây Nguyên (4): cồng chiêng every 8 s, team +4 % HP
      if (lv(side, "Tây Nguyên") >= 1 && t > 0 && t % (8 * TPS) === 0) for (const f of fighters) if (f.side === side && f.alive) heal(t, f, 0.04);
      // Hội Nhà Mèo: every 4 s each cat licks the nearest cat: heal 5 % / 8 %, both +15 % / +30 % attack speed for 3 s
      const cl = lv(side, "Hội Nhà Mèo");
      if (cl >= 0 && t > 0 && t % (4 * TPS) === 0) {
        const cats = fighters.filter((f) => f.side === side && f.alive && isMember(d, "Hội Nhà Mèo", f.sp));
        for (const c of cats) {
          const mate = cats.filter((o) => o !== c).sort((a, b) => dist(a, c) - dist(b, c) || a.uid - b.uid)[0];
          if (!mate) continue;
          heal(t, mate, cl >= 1 ? 0.12 : 0.08); // buff 19 Nov (was 5 / 8 %)
          for (const x of [c, mate]) { x.buffPct = cl >= 1 ? 0.3 : 0.15; x.buffUntil = t + 3 * TPS; }
        }
      }
    }
    for (const side of ["A", "B"] as Side[]) {
      const pct = team[side].reduce((n, r) => n + (r.teamRegen10s ?? 0), 0);
      if (pct && t > 0 && t % (10 * TPS) === 0) for (const f of fighters) if (f.side === side && f.alive) heal(t, f, pct);
    }
  }

  let t = 0;
  for (const f of fighters) if (f.stealthUntil > 0) events.push({ t: 0, type: "status", uid: f.uid, kind: "stealth", ticks: f.stealthUntil });
  for (; t < maxTicks; t++) {
    now = t;
    upkeep(t);
    const standing = (side: Side) => fighters.some((f) => f.alive && f.side === side) || pendingRevives.some((p) => p.t > t && p.f.side === side);
    if (!standing("A") || !standing("B")) break;
    for (const f of fighters) {
      if (!f.alive) continue;
      f.atkCd -= f.haste * (1 + (f.buffUntil > t ? f.buffPct : 0));
      f.moveCd -= 1;
      const target = chooseTarget(f);
      if (!target) continue;
      f.targetUid = target.uid;
      if (inRange(f, target)) {
        if (f.atkCd <= 0) {
          f.atkCd += f.interval;
          f.energy += C.ENERGY_PER_ATTACK;
          hit(t, f, target, 1, "attack");
          if (f.energy >= f.sp.stats.energy && target.alive) {
            // placeholder skill until the skill templates (task T11): a strong strike for 2× damage
            f.energy = 0;
            const cp = opts.castPower?.get(f.sp.id);
            if (!cp) hit(t, f, target, 2, "cast");
            else if (cp.hit && cp.pct > 0) {
              const extra = cp.hit === "2" ? 1 : cp.hit === "aoe" ? 2 : 0;
              const others = fighters.filter((o) => o.alive && o.side !== f.side && o !== target)
                .sort((a, b) => dist(a, target) - dist(b, target)).slice(0, extra);
              for (const o of [target, ...others]) if (o.alive) hit(t, f, o, cp.pct / 100, "cast");
            }
          }
        }
      } else {
        f.atkCd = Math.max(f.atkCd, 0);
        if (f.moveCd <= 0) {
          const step = nextStep(f, target);
          if (step) {
            occ.delete(key(f.row, f.col));
            [f.row, f.col] = step;
            occ.set(key(f.row, f.col), f.uid);
            events.push({ t, type: "move", uid: f.uid, row: f.row, col: f.col });
            // Tây Nguyên (6): members +30 % movement speed for the first 4 s
            f.moveCd = t < 4 * TPS && mlv(f.side, "Tây Nguyên", f.sp) >= 2 ? Math.round(f.moveTicks / 1.3) : f.moveTicks;
          }
        }
      }
    }
  }

  const aliveA = fighters.filter((f) => f.alive && f.side === "A");
  const aliveB = fighters.filter((f) => f.alive && f.side === "B");
  const winner: Side | "draw" = aliveA.length && !aliveB.length ? "A" : aliveB.length && !aliveA.length ? "B" : "draw";
  return {
    winner,
    ticks: t,
    events,
    survivors: [...aliveA, ...aliveB].map((f) => ({ uid: f.uid, side: f.side, hp: f.hp, tier: f.sp.tier, star: f.star })),
    start: fighters.map((f) => ({ uid: f.uid, maxHp: f.maxHp })),
  };
}

/** damage the losing player takes (PO 19 Nov 2026): Σ over the winner's surviving VieAni of tier + (★ − 1), then halved
 *  (rounded up) so a match lasts ~30 rounds and the rewards up to round 36 / the Nam Bộ charm stay reachable.
 *  On a draw both players take damage from the other side's survivors. */
export function playerDamage(res: BattleResult, _round = 0): { A: number; B: number } {
  const sum = (side: Side) => Math.ceil(res.survivors.filter((s) => s.side === side).reduce((n, s) => n + s.tier + ((s.star ?? 1) - 1), 0) / 2);
  if (res.winner === "A") return { A: 0, B: sum("A") };
  if (res.winner === "B") return { A: sum("B"), B: 0 };
  return { A: sum("B"), B: sum("A") };
}

/** mirror an opponent's own-half placement (rows 4..7) onto the top half, rotated 180° */
export function mirror(row: number, col: number): [number, number] {
  return [C.BOARD_ROWS - 1 - row, C.BOARD_COLS - 1 - col];
}
