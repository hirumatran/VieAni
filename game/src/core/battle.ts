// Deterministic auto-battle simulation (GDD §6). No graphics: it returns a list of events that the
// Phaser scene replays. Same teams + same seed => exactly the same events on every device.

import * as C from "./config";
import type { GameData, Species } from "./data";
import { Rng } from "./rng";
import { ELEPHANT_IDS, ITEM_RULES, PAIR, type ItemRule } from "./items";
import { at, isMember, sideSynergies, type SideSynergies } from "./synergyRules";
import { BIRDS, SKILL_SPECS, val, type AEff, type Eff, type Hit, type Passive, type Skill, type Spec } from "./skillSpecs";

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
  /** skill engine state (only with SimOptions.skills) */
  x?: SkState;
}

/** per-fighter state of the T11/T12 skill engine */
export interface SkState {
  spec?: Spec & { pct: number; name?: string; templates?: string[] }; sk: Skill; hit?: Hit; pv: Passive; energyNeed: number;
  until: Record<string, number>; slowV: number; charmBy: number; tauntBy: number; tauntUntil: number;
  mods: { stat: string; v: number; until: number }[];
  antiHeal: number; antiHealUntil: number; guardV: number; guardUntil: number; wallHp: number; wallUntil: number; shieldUntil: number;
  sameUid: number; sameN: number; tick3: number; hurtHp: number; dieAtk: number; stackAtk: number;
  firstDone: boolean; hitTargets: Set<number>; lowDone: boolean; cheatDone: boolean; deathDone: boolean;
  transformed: boolean; copied: boolean; lightCd: number; dodgeNext: boolean; skillDodged: boolean;
  summon: boolean; eggOf?: number; hatchAt?: number; tempUntil?: number; noCatUntil: number; ccImmuneSyn: boolean; atkMul: number;
}

export type BattleEvent =
  | { t: number; type: "move"; uid: number; row: number; col: number }
  // en / tEn = energy (mana) of the attacker / target right after the hit, for the info card
  | { t: number; type: "attack"; uid: number; target: number; dmg: number; mult: number; en: number; tEn: number; miss?: boolean; crit?: boolean }
  | { t: number; type: "cast"; uid: number; target: number; dmg: number; en: number; tEn: number }
  | { t: number; type: "death"; uid: number }
  /** HP change outside a normal hit: heals (+), bleeding, lightning, extra shots (−) */
  | { t: number; type: "hp"; uid: number; delta: number; kind: "heal" | "bleed" | "zap" | "shot"; src?: number }
  /** a skill is cast: its name, the kind of effect to draw, who it hits (foes) and helps (allies) – the damage comes as "cast" events */
  | { t: number; type: "skill"; uid: number; name: string; fx: SkillFx; tint?: number; foes: number[]; allies: number[] }
  /** a carried / team item does something (Nắm Xôi heals, Quả Thị revives, Búa Tầm Sét strikes…) */
  | { t: number; type: "item"; uid: number; id: number }
  | { t: number; type: "revive"; uid: number; hp: number; row: number; col: number }
  /** tộc hệ statuses: Dại (attacks its own allies), Ẩn mình (cannot be targeted), khiên (shield) */
  | { t: number; type: "status"; uid: number; kind: "rabid" | "stealth" | "shield" | StatusKind; ticks: number; amount?: number }
  /** skill engine: a summoned VieAni appears (copy of speciesId with reduced stats) */
  | { t: number; type: "spawn"; uid: number; speciesId: number; side: Side; row: number; col: number; hp: number };
export type SkillFx = "strike" | "area" | "chain" | "heal" | "shield" | "buff" | "summon" | "revive" | "copy" | "special";
export type StatusKind = "cleanse" | "stun" | "root" | "blind" | "silence" | "charm" | "slow" | "taunt" | "buff" | "debuff" | "immune" | "dot" | "transform" | "copy" | "guard" | "wall";

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
  /** T11/T12 skill engine + the tộc hệ parts that need it (proposal 19 Nov 2026; off in the game until the PO approves) */
  skills?: boolean;
  /** balance experiments: energy gained per second by role (supports at the back hardly get energy otherwise) */
  energyPerSec?: Partial<Record<string, number>>;
  /** balance experiments: × Máu and Tấn Công by tier */
  tierScale?: Partial<Record<number, number>>;
  /** balance experiments: Hỗ Trợ energy per second = base × (1 + slope × missing HP share); team = use the team's missing HP */
  supportRegen?: { base: number; slope: number; team?: boolean };
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

  // ================================================================== skill engine (T11 + T12), only with opts.skills
  const SK = !!opts.skills;
  let nextUid = 900;
  const deadOrder: Fighter[] = [];
  const nameIs = (f: Fighter, ...names: string[]) => names.includes(f.sp.vi);
  const X = (f: Fighter) => f.x!;
  const sec = (s: number) => Math.round(s * TPS);
  const until = (f: Fighter, k: string) => (f.x ? f.x.until[k] ?? -1 : -1);
  const isMelee = (f: Fighter) => f.sp.range < 2;
  const alliesOf = (f: Fighter) => fighters.filter((o) => o.alive && o.side === f.side);
  const foesOf = (f: Fighter, withStealth = false) => fighters.filter((o) => o.alive && o.side !== f.side && (withStealth || o.stealthUntil <= now));

  function newState(f: Fighter, spec?: Spec & { pct: number; name?: string; templates?: string[] }): SkState {
    let sk: Skill = spec?.skill ?? {}, hitS = sk.hit, pv: Passive = spec?.passive ?? {};
    if (spec && f.star === 3 && spec.s3) {
      const s3 = spec.s3;
      if (hitS || s3.hit || s3.skill?.hit) hitS = { ...(hitS ?? { sel: "cur" }), ...(s3.skill?.hit ?? {}), ...(s3.hit ?? {}) } as Hit;
      if (hitS && s3.hit?.eff) hitS = { ...hitS, eff: s3.hit.eff };
      let ally = [...(sk.ally ?? [])];
      for (const g of s3.skill?.ally ?? []) {
        const i = g.replace ? ally.findIndex((a) => a.eff[0]?.k === g.eff[0]?.k) : -1;
        if (i >= 0) ally[i] = g; else ally = [...ally, g];
      }
      sk = { hit: hitS, ally };
      pv = { ...pv, ...(s3.passive ?? {}) };
    }
    return {
      spec, sk, hit: hitS, pv, energyNeed: (f.star === 3 ? spec?.s3?.energy : undefined) ?? (spec ? f.sp.stats.energy : Infinity),
      until: {}, slowV: 0, charmBy: -1, tauntBy: -1, tauntUntil: -1, mods: [], antiHeal: 0, antiHealUntil: -1,
      guardV: 0, guardUntil: -1, wallHp: 0, wallUntil: -1, shieldUntil: -1, sameUid: -1, sameN: 0, tick3: 0, hurtHp: 0, dieAtk: 0, stackAtk: 0,
      firstDone: false, hitTargets: new Set(), lowDone: false, cheatDone: false, deathDone: false, transformed: false, copied: false,
      lightCd: 0, dodgeNext: false, skillDodged: false, summon: false, noCatUntil: -1, ccImmuneSyn: false, atkMul: 1,
    };
  }

  /** timed modifiers + auras */
  function mod(f: Fighter, stat: string): number {
    if (!f.x) return 0;
    let v = 0;
    for (const m of f.x.mods) if (m.stat === stat && m.until > now) v += m.v;
    for (const o of fighters) {
      const a = o.alive && o.x?.pv.aura;
      if (!a || a.stat !== stat || dist(o, f) > a.r) continue;
      if ((a.who === "ally") !== (o.side === f.side)) continue;
      if (a.filter === "ranged" && f.sp.range < 2) continue;
      if (a.filter === "water" && !f.water) continue;
      if (a.filter && !["ranged", "water"].includes(a.filter) && !isMember(d, a.filter, f.sp)) continue;
      v += (a.who === "ally" ? 1 : -1) * val(a.v, o.star);
    }
    return v;
  }
  const lowOn = (f: Fighter) => !!f.x?.pv.low && f.hp < f.maxHp * f.x.pv.low.below;

  /** extra attack-speed factor from the engine (mods, auras, stacks, slow) */
  function aspdFactor(f: Fighter): number {
    if (!f.x) return 1;
    let a = 1 + mod(f, "aspd");
    const st = f.x.pv.stack;
    if (st?.on === "hitSame" && st.stat === "aspd") a += val(st.v, f.star) * f.x.sameN;
    if (until(f, "slow") > now) a *= 1 - f.x.slowV;
    return Math.max(0.2, a);
  }

  function ccBlocked(o: Fighter, k: string): boolean {
    if (!o.x) return false;
    if (until(o, "immCC") > now) return true;
    if (k === "knock" && (o.x.pv.immuneKnock || until(o, "immKnock") > now)) return true;
    if (k === "slow" && (o.x.pv.immuneSlow || until(o, "immSlow") > now)) return true;
    if (o.x.ccImmuneSyn && (k === "stun" || k === "knock")) return true; // Cự Thú (4)
    return false;
  }

  function status(t: number, f: Fighter, kind: StatusKind, ticks: number, amount?: number) {
    events.push({ t, type: "status", uid: f.uid, kind, ticks, ...(amount != null ? { amount } : {}) });
  }

  function knock(t: number, src: Fighter, o: Fighter, cells: number) {
    let dr = Math.sign(o.row - src.row), dc = Math.sign(o.col - src.col);
    if (!dr && !dc) dr = o.side === "A" ? 1 : -1;
    for (let i = 0; i < cells; i++) {
      const nr = o.row + dr, nc = o.col + dc;
      if (nr < 0 || nc < 0 || nr >= C.BOARD_ROWS || nc >= C.BOARD_COLS || occ.has(key(nr, nc))) break;
      occ.delete(key(o.row, o.col)); o.row = nr; o.col = nc; occ.set(key(nr, nc), o.uid);
      events.push({ t, type: "move", uid: o.uid, row: nr, col: nc });
    }
  }

  /** a control / damage-over-time / debuff effect on an enemy */
  function applyEff(t: number, src: Fighter, o: Fighter, e: Eff, star: 1 | 2 | 3) {
    if (!o.alive || !o.x) return;
    if ("onlySyn" in e && e.onlySyn && !isMember(d, e.onlySyn, o.sp)) return;
    const ctrl = ["stun", "root", "blind", "silence", "charm", "lift", "knock", "slow", "taunt"].includes(e.k);
    if (ctrl && ccBlocked(o, e.k === "lift" ? "stun" : e.k)) return;
    if (ctrl && o.x.pv.reflectCC && src.x && rng.next() < val(o.x.pv.reflectCC, o.star)) { applyEff(t, o, src, e, star); return; } // Mắt Công
    switch (e.k) {
      case "stun": case "lift": case "root": case "blind": case "silence": case "charm": {
        const k = e.k === "lift" ? "stun" : e.k, d2 = sec(val(e.d, star));
        o.x.until[k] = Math.max(until(o, k), t + d2);
        if (k === "charm") { o.x.charmBy = src.uid; o.targetUid = null; }
        status(t, o, k as StatusKind, d2); break;
      }
      case "knock": knock(t, src, o, val(e.cells, star)); break;
      case "slow": { const d2 = sec(val(e.d, star)); o.x.slowV = Math.max(until(o, "slow") > t ? o.x.slowV : 0, val(e.v, star)); o.x.until.slow = t + d2; status(t, o, "slow", d2); break; }
      case "dot": {
        const d2 = Math.round(val(e.d, star)), per = Math.max(1, Math.round(o.maxHp * val(e.v, star)));
        const add = (z: Fighter) => z.bleeds.push({ next: t + TPS, left: d2, per });
        add(o);
        if (e.antiHeal) { o.x.antiHeal = e.antiHeal; o.x.antiHealUntil = t + sec(d2); }
        if (e.spread) fighters.filter((z) => z.alive && z.side === o.side && z !== o && dist(z, o) <= 1).slice(0, e.spread).forEach(add);
        status(t, o, "dot", sec(d2)); break;
      }
      case "debuff": {
        const d2 = sec(val(e.v === undefined ? 0 : e.d, star)), v = val(e.v, star);
        o.x.mods.push({ stat: e.stat, v: e.stat === "miss" ? v : -v, until: t + d2 }); status(t, o, "debuff", d2); break;
      }
      case "taunt": { o.x.tauntBy = src.uid; o.x.tauntUntil = t + sec(val(e.d, star)); o.targetUid = src.uid; status(t, o, "taunt", sec(val(e.d, star))); break; }
      case "execute": if (o.hp < o.maxHp * e.below) { const z = o.hp; events.push({ t, type: "hp", uid: o.uid, delta: -z, kind: "shot" }); damage(t, o, z, src); } break;
    }
  }

  function freeCellNearIn(row: number, col: number, prefer?: Side): [number, number] | null {
    if (!prefer) return freeCellNear(row, col);
    const back = prefer === "A" ? C.BOARD_ROWS - 1 : 0;
    for (let k = 0; k < C.BOARD_COLS; k++) for (const c of [col + k, col - k]) if (c >= 0 && c < C.BOARD_COLS && !occ.has(key(back, c))) return [back, c];
    return freeCellNear(row, col);
  }
  function moveTo(t: number, f: Fighter, cell: [number, number] | null) {
    if (!cell) return;
    occ.delete(key(f.row, f.col)); [f.row, f.col] = cell; occ.set(key(f.row, f.col), f.uid);
    events.push({ t, type: "move", uid: f.uid, row: f.row, col: f.col });
  }

  function makeSummon(t: number, src: Fighter, pct: number, egg = false): Fighter | null {
    const cell = freeCellNear(src.row, src.col);
    if (!cell) return null;
    const s: Fighter = {
      ...src, uid: nextUid++, row: cell[0], col: cell[1], item: undefined, rule: {}, alive: true,
      maxHp: Math.max(1, Math.round(src.maxHp * pct)), hp: Math.max(1, Math.round(src.maxHp * pct)), atk: egg ? 0 : src.atk * pct,
      energy: 0, atkCd: egg ? Infinity : src.interval / 2, moveCd: egg ? Infinity : 0, targetUid: null, bleeds: [], shield: 0,
      stealthUntil: -1, rabidUntil: -1, lowHealUsed: true, reviveUsed: true, buffUntil: -1, haste: 1,
    };
    s.x = newState(s); s.x.summon = true; s.x.energyNeed = Infinity;
    fighters.push(s); byUid.set(s.uid, s); occ.set(key(s.row, s.col), s.uid);
    events.push({ t, type: "spawn", uid: s.uid, speciesId: s.speciesId, side: s.side, row: s.row, col: s.col, hp: s.hp });
    return s;
  }

  function reviveNow(t: number, f: Fighter, pct: number) {
    const cell = freeCellNear(f.row, f.col);
    if (!cell || f.alive) return;
    [f.row, f.col] = cell;
    f.alive = true; f.hp = Math.max(1, Math.round(f.maxHp * pct)); f.energy = 0; f.atkCd = f.interval / 2; f.rabidUntil = -1; f.targetUid = null;
    occ.set(key(f.row, f.col), f.uid);
    events.push({ t, type: "revive", uid: f.uid, hp: f.hp, row: f.row, col: f.col });
  }

  /** who a skill hits */
  function pickEnemies(f: Fighter, cur: Fighter, h: Hit, star: 1 | 2 | 3): Fighter[] {
    const foes = foesOf(f);
    if (!foes.length) return [];
    const byD = (a: Fighter, b: Fighter) => dist(f, a) - dist(f, b) || a.uid - b.uid;
    const n = Math.max(1, val(h.n, star) || 1);
    let primary: Fighter[] = [];
    switch (h.sel) {
      case "cur": case "self": primary = [cur.alive && cur.side !== f.side ? cur : foes.sort(byD)[0]]; break;
      case "lowHp": primary = [foes.sort((a, b) => a.hp - b.hp || a.uid - b.uid)[0]]; break;
      case "far": primary = [foes.sort((a, b) => -byD(a, b))[0]]; break;
      case "far3": { const w = foes.filter((o) => dist(f, o) <= 3).sort((a, b) => -byD(a, b)); primary = [w[0] ?? cur]; break; }
      case "back": primary = [foes.sort((a, b) => -byD(a, b))[0]]; break;
      case "backLow": { const w = foes.filter((o) => dist(f, o) >= 2).sort((a, b) => a.hp - b.hp); primary = [w[0] ?? foes.sort((a, b) => a.hp - b.hp)[0]]; break; }
      case "highTier3": { const w = foes.filter((o) => dist(f, o) <= 3).sort((a, b) => b.sp.tier - a.sp.tier || a.hp - b.hp); primary = [w[0] ?? cur]; break; }
      case "insect": { const w = foes.filter((o) => o.insect).sort(byD); primary = w.length ? w.slice(0, n) : [cur]; break; }
      case "nearest": primary = [foes.sort(byD)[0]]; break;
      case "stealthLow": { const w = foesOf(f, true).filter((o) => o.stealthUntil > now); primary = [w[0] ?? foes.sort((a, b) => a.hp - b.hp)[0]]; break; }
      case "highAtk": primary = [foes.sort((a, b) => b.atk - a.atk)[0]]; break;
      case "random": { const p = [...foes]; while (primary.length < n && p.length) primary.push(p.splice(rng.int(0, p.length - 1), 1)[0]); break; }
      case "highHp": primary = foes.sort((a, b) => b.hp - a.hp || a.uid - b.uid).slice(0, n); break;
      case "itemHolder": primary = [foes.filter((o) => o.item != null).sort((a, b) => b.sp.tier - a.sp.tier)[0] ?? foes.sort((a, b) => b.sp.tier - a.sp.tier)[0]]; break;
      case "preyHawk": { const w = foes.filter((o) => /^(Gà|Chuột|Rắn)/.test(o.sp.vi)); primary = [w[0] ?? cur]; break; }
    }
    primary = primary.filter((o) => o && o.alive);
    if (!primary.length) return [];
    const p0 = primary[0];
    // chains: "cur"/"insect" with n > 1 add the enemies nearest to the first target
    if (n > 1 && (h.sel === "cur" || h.sel === "insect") && primary.length < n)
      primary = [...primary, ...foes.filter((o) => !primary.includes(o)).sort((a, b) => dist(a, p0) - dist(b, p0) || a.uid - b.uid).slice(0, n - primary.length)];
    if (!h.area) return primary;
    const r = val(h.area.r, star) || 1;
    const fwd = f.side === "A" ? -1 : 1; // B sits at the top: A looks to smaller rows
    let set: Fighter[] = [];
    switch (h.area.shape) {
      case "around": set = foes.filter((o) => dist(o, p0) <= r); break;
      case "self": set = foes.filter((o) => dist(o, f) <= r); break;
      case "row": set = foes.filter((o) => o.row === p0.row); break;
      case "all": set = foes; break;
      case "behind": set = [p0, ...foes.filter((o) => o.col === p0.col && o.row === p0.row + fwd)]; break;
      case "front3": set = foes.filter((o) => o.row === p0.row && Math.abs(o.col - p0.col) <= 1); break;
      case "cone": set = foes.filter((o) => dist(o, f) <= r && Math.sign(o.row - f.row) === fwd); if (!set.includes(p0)) set.push(p0); break;
      case "line": {
        const steps = Math.max(1, dist(f, p0)) * 2, cells = new Set<string>();
        for (let i = 1; i <= steps * 4; i++) { const k2 = i / steps; cells.add(key(Math.round(f.row + (p0.row - f.row) * k2), Math.round(f.col + (p0.col - f.col) * k2))); }
        set = foes.filter((o) => cells.has(key(o.row, o.col)));
        if (!set.includes(p0)) set.push(p0);
        break;
      }
    }
    return [...new Set([...primary, ...set])];
  }

  function pickAllies(f: Fighter, to: string, star: 1 | 2 | 3): Fighter[] {
    const al = alliesOf(f), ratio = (a: Fighter) => a.hp / a.maxHp;
    switch (to) {
      case "self": return [f];
      case "team": return al;
      case "adj": return al.filter((a) => a !== f && dist(a, f) <= 1);
      case "near1": return al.filter((a) => dist(a, f) <= 2);
      case "row": return al.filter((a) => a.row === f.row);
      case "lowest": return al.sort((a, b) => ratio(a) - ratio(b))[0] ? [al.sort((a, b) => ratio(a) - ratio(b))[0]] : [];
      case "lowestIn2": return al.filter((a) => dist(a, f) <= 2).sort((a, b) => ratio(a) - ratio(b)).slice(0, 1);
      case "low2": return al.sort((a, b) => ratio(a) - ratio(b)).slice(0, 2);
      case "low3": return al.sort((a, b) => ratio(a) - ratio(b)).slice(0, 3);
    }
    void star;
    const g = to.slice(4);
    if (g === "water") return al.filter((a) => a.water);
    return al.filter((a) => isMember(d, g, a.sp));
  }

  function cleanse(a: Fighter) {
    if (!a.x) return;
    for (const k of ["stun", "root", "blind", "silence", "charm", "slow"]) a.x.until[k] = -1;
    a.x.mods = a.x.mods.filter((m) => m.v > 0 && m.stat !== "miss");
    a.bleeds = []; a.x.tauntUntil = -1; a.rabidUntil = -1;
    events.push({ t: now, type: "status", uid: a.uid, kind: "cleanse", ticks: 0 });
  }

  function applyAEff(t: number, f: Fighter, a: Fighter, e: AEff, star: 1 | 2 | 3, cur: Fighter) {
    if (!a.x) return;
    switch (e.k) {
      case "heal": heal(t, a, val(e.v, star)); break;
      case "shield": { const s2 = Math.round(f.maxHp * val(e.v, star)); a.shield += s2; a.x.shieldUntil = t + sec(val(e.d, star)); status(t, a, "buff", sec(val(e.d, star)), s2); events.push({ t, type: "status", uid: a.uid, kind: "shield", ticks: sec(val(e.d, star)), amount: a.shield }); break; }
      case "buff": a.x.mods.push({ stat: e.stat, v: val(e.v, star), until: t + sec(val(e.d, star)) }); status(t, a, "buff", sec(val(e.d, star))); break;
      case "cleanse": cleanse(a); break;
      case "immune": { const k = { cc: "immCC", basic: "immBasic", skill: "immSkill", knock: "immKnock", slow: "immSlow" }[e.what]; a.x.until[k] = t + sec(val(e.d, star)); status(t, a, "immune", sec(val(e.d, star))); break; }
      case "dr": a.x.mods.push({ stat: e.melee ? "drMelee" : "dr", v: val(e.v, star), until: t + sec(val(e.d, star)) }); status(t, a, "buff", sec(val(e.d, star))); break;
      case "stealth": a.stealthUntil = Math.max(a.stealthUntil, t + sec(val(e.d, star))); events.push({ t, type: "status", uid: a.uid, kind: "stealth", ticks: sec(val(e.d, star)) }); break;
      case "taunt": {
        const d2 = val(e.d, star);
        const tg = e.who === "highAtk" ? foesOf(a).sort((x, y) => y.atk - x.atk).slice(0, 1) : foesOf(a).filter((o) => dist(o, a) <= val(e.r, star));
        for (const o of tg) applyEff(t, a, o, { k: "taunt", d: d2 }, star);
        break;
      }
      case "summon": for (let i = 0; i < val(e.n, star); i++) makeSummon(t, a, val(e.pct, star)); break;
      case "reviveTemp": {
        const dead = [...deadOrder].reverse().find((o) => o.side === a.side && !o.alive && !o.x?.summon && !pendingRevives.some((p) => p.f === o));
        if (dead && firstOnce(a.uid + ":reviveTemp")) { reviveNow(t, dead, val(e.v, star)); if (e.d > 0) dead.x!.tempUntil = t + sec(e.d); }
        break;
      }
      case "guard": a.x.guardV = val(e.v, star); a.x.guardUntil = t + sec(val(e.d, star)); status(t, a, "guard", sec(val(e.d, star))); break;
      case "wall": a.x.wallHp = Math.round(a.maxHp * val(e.v, star)); a.x.wallUntil = t + sec(val(e.d, star)); status(t, a, "wall", sec(val(e.d, star)), a.x.wallHp); break;
      case "carry": moveTo(t, a, freeCellNearIn(a.row, a.col, a.side)); break;
      case "copy": {
        if (a.x.copied) break;
        const o = foesOf(a, true).sort((x, y) => y.sp.tier - x.sp.tier || y.star - x.star || y.maxHp - x.maxHp)[0];
        if (!o?.x) break;
        const k = star === 3 ? 1.2 : 1, ratio = a.hp / a.maxHp;
        const keepCharm = star === 3 ? a.x.pv.onHit : undefined;
        a.sp = o.sp; a.atk = o.atk * k; a.interval = o.interval; a.armor = Math.min(C.ARMOR_CAP, o.armor * k);
        a.maxHp = Math.round(o.maxHp * k); a.hp = Math.max(1, Math.round(a.maxHp * ratio)); a.moveTicks = o.moveTicks;
        a.x.spec = o.x.spec; a.x.sk = o.x.sk; a.x.hit = o.x.hit; a.x.pv = { ...o.x.pv, ...(keepCharm ? { onHit: keepCharm } : {}) };
        a.x.energyNeed = o.x.energyNeed; a.x.copied = true; status(t, a, "copy", 0, o.speciesId);
        break;
      }
      case "mimic": {
        const o = foesOf(a).filter((z) => dist(z, a) <= star && z.x?.spec && !z.x.sk.ally?.some((g) => g.eff.some((x) => x.k === "mimic" || x.k === "copy"))).sort((x, y) => dist(x, a) - dist(y, a))[0];
        if (o?.x) castSkill(t, a, cur, val(e.v, star), o, o.atk);
        break;
      }
      case "steal": break; // Hoàn Kiếm: items are not part of the balance runs yet – only the damage counts
      case "flee": a.stealthUntil = Math.max(a.stealthUntil, t + sec(e.d)); break;
      case "stackAtk": a.x.stackAtk += e.v; break;
    }
  }

  /** cast f's skill (or another fighter's, for Bắt Chước) */
  function castSkill(t: number, f: Fighter, cur: Fighter, power = 1, from?: Fighter, atkOverride?: number) {
    const src = from ?? f, sx = src.x!, star = src.star;
    if (!sx.spec) { hit(t, f, cur, 2 * power, "cast"); return; }
    const saveAtk = f.atk;
    if (atkOverride != null) f.atk = atkOverride;
    const h = sx.hit;
    let primary = cur;
    const set = h ? pickEnemies(f, cur, h, star) : [];
    const groups = (sx.sk.ally ?? []).map((g) => ({ g, to: pickAllies(f, g.to, star) }));
    events.push({ t, type: "skill", uid: f.uid, name: sx.spec.name ?? "", fx: skillFx(sx), tint: skillTint(sx.spec.name ?? ""),
      foes: set.map((o) => o.uid), allies: [...new Set(groups.flatMap((x) => x.to.map((a) => a.uid)))] });
    if (h) {
      primary = set[0] ?? cur;
      if (h.jump && set[0] && dist(f, set[0]) > 1) moveTo(t, f, freeCellNear(set[0].row, set[0].col));
      const pct = h.pct ?? sx.spec.pct;
      for (const o of set) {
        if (!o.alive) continue;
        let pw = (pct / 100) * power;
        if (h.vsRole && o.sp.role === h.vsRole[0]) pw *= h.vsRole[1];
        if (h.vsSyn && isMember(d, h.vsSyn[0], o.sp)) pw *= h.vsSyn[1];
        if (h.firstBonus && !f.x!.hitTargets.has(o.uid)) pw *= 1 + h.firstBonus;
        if (h.lowHpScale) pw *= 1 + (1 - f.hp / f.maxHp);
        if (pw > 0) {
          const dealt = hit(t, f, o, pw, "cast", { pen: val(h.pen, star), noDodge: h.noDodge });
          if (h.drain && dealt > 0) heal(t, f, (dealt * h.drain) / f.maxHp);
        }
        for (const e of h.eff ?? []) applyEff(t, f, o, e, star);
      }
      if (h.cost) { const c = Math.round(f.hp * h.cost); f.hp = Math.max(1, f.hp - c); events.push({ t, type: "hp", uid: f.uid, delta: -c, kind: "bleed" }); }
    }
    for (const { g, to } of groups) for (const a of to) for (const e of g.eff) applyAEff(t, f, a, e, star, primary);
    f.atk = saveAtk;
  }

  /** what to draw for a skill: from its first template (and whether it hits an area) */
  function skillFx(sx: SkState): SkillFx {
    const tp = sx.spec?.templates?.[0] ?? "";
    const effs = (sx.sk.ally ?? []).flatMap((g) => g.eff.map((e) => e.k));
    if (effs.includes("copy") || effs.includes("mimic")) return "copy";
    if (effs.includes("summon")) return "summon";
    if (effs.includes("reviveTemp")) return "revive";
    if (tp === "Nhiều mục tiêu") return "chain";
    if (tp === "Diện rộng" || (sx.hit?.area && tp !== "Đòn mạnh")) return "area";
    if (tp === "Hồi máu") return "heal";
    if (tp === "Khiên") return "shield";
    if (tp === "Tăng sức" || tp === "Chịu đòn") return "buff";
    if (tp === "Đặc biệt" && !sx.hit) return "special";
    return sx.hit ? "strike" : "buff";
  }
  /** colour hint from the skill name: fire, lightning, water, poison */
  function skillTint(name: string): number | undefined {
    if (/Lửa|Bỏng|Đốt/.test(name)) return 0xff7a2a;
    if (/Sấm|Sét|Điện/.test(name)) return 0xffe14a;
    if (/Nước|Sóng|Mực|Biển|Cá|Hát/.test(name)) return 0x5ab8ff;
    if (/Độc|Nọc|Bệnh|Hút Máu/.test(name)) return 0x8fe04a;
    return undefined;
  }

  /** start of battle: passives, tộc hệ parts that need the engine */
  function initSkills() {
    const birds = new Set(BIRDS);
    for (const f of fighters) {
      const ts = opts.tierScale?.[f.sp.tier];
      if (ts) { f.maxHp = Math.round(f.maxHp * ts); f.hp = f.maxHp; f.atk *= ts; }
      f.x = newState(f, SKILL_SPECS.get(f.speciesId));
      const pv = f.x.pv, st = f.star, al = units.filter((u) => u.side === f.side && u.uid !== f.uid);
      const adj = al.filter((u) => dist(u, f) <= 1).map((u) => d.byId.get(u.speciesId)!);
      const condOk = !pv.cond
        || (pv.cond === "front" && (f.side === "A" ? f.row === 4 : f.row === 3))
        || (pv.cond === "adjAlly" && adj.length > 0)
        || (pv.cond === "adjBird" && adj.some((s) => birds.has(s.vi)))
        || (pv.cond === "nearBuffalo" && adj.some((s) => s.vi === "Trâu"))
        || (pv.cond === "nearDragon" && adj.some((s) => s.vi === "Rồng Lạc Việt" || s.vi === "Cá Chép"));
      let hpP = val(pv.hpPct, st), atkP = val(pv.atkPct, st), aspdP = val(pv.aspdPct, st), arm = val(pv.armor, st);
      if (!condOk) { hpP = 0; atkP = 0; aspdP = 0; arm = 0; }
      if (pv.perSyn) { const n = [...syn[f.side].values()].filter((l) => l >= 0).length; hpP += n * pv.perSyn.hpPct; atkP += n * pv.perSyn.atkPct; aspdP += n * pv.perSyn.aspdPct; }
      if (pv.perBird) aspdP += val(pv.perBird, st) * al.filter((u) => birds.has(d.byId.get(u.speciesId)!.vi)).length;
      if (pv.perHunter) f.dmgMult *= 1 + val(pv.perHunter, st) * al.filter((u) => d.byId.get(u.speciesId)!.role === "Săn Mồi").length;
      if (hpP) { f.maxHp = Math.round(f.maxHp * (1 + hpP)); f.hp = f.maxHp; }
      f.atk *= 1 + atkP;
      if (aspdP) f.interval = Math.max(C.ATTACK_INTERVAL_CLAMP[0] * TPS, f.interval / (1 + aspdP));
      f.armor = Math.min(C.ARMOR_CAP, f.armor + arm);
      f.crit += val(pv.crit, st);
      f.dmgMult *= 1 + val(pv.dmgPct, st);
      const s0 = pv.start;
      if (s0?.untarget) f.stealthUntil = Math.max(f.stealthUntil, sec(s0.untarget));
      if (s0?.dodge) f.x.mods.push({ stat: "dodge", v: val(s0.dodge[0], st), until: sec(val(s0.dodge[1], st)) });
      if (s0?.noCat) f.x.noCatUntil = sec(val(s0.noCat, st));
      // tộc hệ parts that need the engine: Tứ Linh (4) control immunity 4 s, Cự Thú (4) no stun / knock-back
      if (lv(f.side, "Tứ Linh") >= 1 && isMember(d, "Tứ Linh", f.sp)) f.x.until.immCC = sec(4);
      if (mlv(f.side, "Cự Thú", f.sp) >= 1) f.x.ccImmuneSyn = true;
    }
    for (const f of fighters) {
      const pv = f.x!.pv, st = f.star;
      if (pv.start?.teamDodge) for (const a of alliesOf(f)) a.x!.mods.push({ stat: "dodge", v: pv.start.teamDodge[0], until: sec(pv.start.teamDodge[1]) });
      if (pv.start?.waterAspd) for (const a of alliesOf(f).filter((z) => z.water)) a.x!.mods.push({ stat: "aspd", v: pv.start.waterAspd[0], until: sec(pv.start.waterAspd[1]) });
      if (pv.firstLowHp) { const o = foesOf(f).sort((a, b) => a.hp - b.hp)[0]; if (o) f.targetUid = o.uid; }
      if (pv.start?.ambush) {
        const o = foesOf(f).filter((z) => dist(z, f) <= 3).sort((a, b) => b.interval - a.interval)[0];
        if (o) { moveTo(0, f, freeCellNear(o.row, o.col)); f.revealCrit = true; f.targetUid = o.uid; }
      }
      // Cự Thú (6): members taunt enemies within 2 cells for 3 s at the start
      if (mlv(f.side, "Cự Thú", f.sp) >= 2) for (const o of foesOf(f).filter((z) => dist(z, f) <= 2)) applyEff(0, f, o, { k: "taunt", d: 3 }, st);
    }
  }

  /** per-tick engine upkeep */
  function skillUpkeep(t: number) {
    for (const f of [...fighters]) {
      if (!f.x) continue;
      const pv = f.x.pv;
      if (f.x.eggOf != null && f.alive && t >= (f.x.hatchAt ?? Infinity)) { // Phượng Hoàng: the egg survived → reborn at full HP
        const ph = byUid.get(f.x.eggOf)!;
        f.alive = false; occ.delete(key(f.row, f.col)); events.push({ t, type: "death", uid: f.uid });
        ph.row = f.row; ph.col = f.col; reviveNow(t, ph, 1);
        if (ph.star === 3) { ph.x!.mods.push({ stat: "atk", v: 0.3, until: Infinity }); castSkill(t, ph, foesOf(ph)[0] ?? ph); }
        continue;
      }
      if (!f.alive) continue;
      if (f.x.tempUntil != null && t >= f.x.tempUntil) { f.x.tempUntil = undefined; const z = f.hp; events.push({ t, type: "hp", uid: f.uid, delta: -z, kind: "bleed" }); f.hp = 0; damage(t, f, 0); continue; }
      if (pv.regenIdle && t - f.lastHitT >= 2 * TPS && t % TPS === 0) heal(t, f, val(pv.regenIdle, f.star));
      // hidden rule (PO 20 Nov 2026): Hỗ Trợ regenerate energy, faster the more of their own HP is lost
      const sr = opts.supportRegen ?? { base: C.SUPPORT_ENERGY_BASE, slope: C.SUPPORT_ENERGY_SLOPE };
      if (f.sp.role === "Hỗ Trợ" && !f.x.summon && t > 0 && t % TPS === 0) {
        const al = sr.team ? fighters.filter((o) => o.side === f.side && !o.x?.summon) : [f];
        const miss = 1 - al.reduce((n, o) => n + Math.max(0, o.alive ? o.hp : 0), 0) / al.reduce((n, o) => n + o.maxHp, 0);
        f.energy = Math.min(f.x.energyNeed, f.energy + sr.base * (1 + sr.slope * miss));
      }
      const eps = opts.energyPerSec?.[f.sp.role ?? ""];
      if (eps && t > 0 && t % TPS === 0) f.energy = Math.min(f.x.energyNeed, f.energy + eps);
      if (pv.stack?.on === "tick3" && t > 0 && t % (3 * TPS) === 0) f.x.stackAtk = Math.min(val(pv.stack.max, f.star) || 9, f.x.stackAtk + val(pv.stack.v, f.star));
      if (pv.every && t > 0 && t % sec(pv.every.s) === 0) {
        if (pv.every.k === "cleanseAdj") { const a = alliesOf(f).find((z) => z !== f && dist(z, f) <= 1 && z.x && (z.bleeds.length || until(z, "stun") > t || until(z, "root") > t || until(z, "slow") > t)); if (a) cleanse(a); }
        if (pv.every.k === "hop") { f.x.dodgeNext = true; }
        if (pv.every.k === "spawn") makeSummon(t, f, val(pv.every.pct, f.star));
      }
      if (pv.transform && !f.x.transformed && t >= sec(val(pv.transform.s, f.star))) {
        const m = val(pv.transform.mult, f.star);
        f.x.transformed = true; f.atk *= m; f.maxHp = Math.round(f.maxHp * m); f.hp = Math.round(f.hp * m); f.armor = Math.min(C.ARMOR_CAP, f.armor * m);
        status(t, f, "transform", 0);
      }
    }
    // Biển Đông (6): every 8 s a wave pushes the enemy front row back 1 cell
    for (const side of ["A", "B"] as Side[]) {
      if (lv(side, "Biển Đông") < 2 || t === 0 || t % (8 * TPS) !== 0) continue;
      const foes = fighters.filter((o) => o.alive && o.side !== side);
      if (!foes.length) continue;
      const front = side === "A" ? Math.max(...foes.map((o) => o.row)) : Math.min(...foes.map((o) => o.row));
      const src = { row: side === "A" ? C.BOARD_ROWS : -1, col: 0 } as Fighter;
      for (const o of foes.filter((z) => z.row === front && !ccBlocked(z, "knock"))) { const dc = o.col; knock(t, { ...src, col: dc }, o, 1); }
    }
  }

  /** who f attacks: enemies, or its own allies while Dại; stealthed fighters cannot be targeted */
  const enemiesOf = (f: Fighter) => {
    const rabid = f.rabidUntil > now;
    const list = fighters.filter((o) => o.alive && o !== f && (rabid ? o.side === f.side : o.side !== f.side) && o.stealthUntil <= now);
    if (!SK || !f.x) return list;
    // Mê hoặc (Bò Biển): cannot attack the charmer and its neighbours · Đám Cưới Chuột: enemy cats leave mice alone
    const ch = until(f, "charm") > now ? byUid.get(f.x.charmBy) : undefined;
    const cat = isMember(d, "Hội Nhà Mèo", f.sp);
    return list.filter((o) => !(ch && dist(o, ch) <= 1) && !(cat && o.x && o.x.noCatUntil > now));
  };

  function inRange(f: Fighter, t: Fighter) {
    const r = preyRule(rules, f, t);
    const extra = SK && lowOn(f) && f.x!.pv.low!.sweep ? 1 : 0; // Nhổ Tre Đánh Giặc: +1 range
    return (r?.unlimited ?? false) || !!f.rule.infiniteRange || dist(f, t) <= f.sp.range + extra;
  }

  function chooseTarget(f: Fighter): Fighter | undefined {
    const foes = enemiesOf(f);
    if (!foes.length) return undefined;
    if (SK && f.x && f.x.tauntUntil > now) { const tb = byUid.get(f.x.tauntBy); if (tb && foes.includes(tb)) return tb; }
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
  function baseDamage(f: Fighter, target: Fighter, power: number, pen = 0) {
    let A = f.atk * (1 + rally[f.side]);
    let armorRaw = target.armor - f.armorPen - 2 * target.defShred;
    let engM = 1;
    if (SK && f.x && target.x) {
      const pv = f.x.pv, st = f.star;
      A *= 1 + mod(f, "atk") + f.x.stackAtk + f.x.dieAtk + (lowOn(f) ? val(pv.low!.atkPct, st) : 0);
      armorRaw = (armorRaw + mod(target, "armor")) * (1 - pen);
      engM *= 1 + mod(f, "dmg") + (lowOn(f) ? val(pv.low!.dmgPct, st) : 0);
      if (pv.stack?.on === "hitSame" && pv.stack.stat === "dmg" && f.x.sameUid === target.uid) engM *= 1 + val(pv.stack.v, st) * f.x.sameN;
      const vs = pv.vs;
      if (vs && ((vs.ids && vs.ids.includes(target.sp.vi)) || (vs.syn === "higherTier" && target.sp.tier > f.sp.tier) || (vs.syn && vs.syn !== "higherTier" && isMember(d, vs.syn, target.sp)))) engM *= val(vs.m, st);
    }
    const armor = Math.max(0, Math.min(C.ARMOR_CAP, armorRaw));
    const preyM = preyRule(rules, f, target)?.mult ?? 1;
    let itemM = f.dmgMult;
    for (const [name, m] of Object.entries(f.rule.vsSyn ?? {})) if (isMember(d, name, target.sp)) itemM *= m;
    if (f.water) { itemM *= target.waterTaken; for (const m of Object.values(target.rule.fromWater ?? {})) itemM *= m; }
    if (target.sp.tier > f.sp.tier) itemM *= 1 + (f.rule.vsHigherTier ?? 0);
    if (target.insect) itemM *= f.vsInsect;
    return { base: A * (1 - armor / 100) * preyM * itemM * engM * C.STAR_MULT[f.star - 1] * power, typeM: 1, preyM };
  }

  function heal(t: number, f: Fighter, pct: number) {
    if (!f.alive || f.hp >= f.maxHp) return;
    const cut = SK && f.x && f.x.antiHealUntil > now ? 1 - f.x.antiHeal : 1;
    const amount = Math.min(f.maxHp - f.hp, Math.round(f.maxHp * pct * cut));
    if (amount <= 0) return;
    f.hp += amount;
    events.push({ t, type: "hp", uid: f.uid, delta: amount, kind: "heal" });
  }

  /** take damage; handles Nắm Xôi, knock-outs, Hịch Tướng Sĩ, revives */
  function damage(t: number, target: Fighter, dmg: number, by?: Fighter) {
    if (SK && target.x) {
      if (target.shield > 0 && target.x.shieldUntil >= 0 && t > target.x.shieldUntil) { target.shield = 0; target.x.shieldUntil = -1; }
      // Trấn Giữ (Nghê): an adjacent guardian takes part of the damage
      const g = by && fighters.find((o) => o.alive && o !== target && o.side === target.side && o.x && o.x.guardUntil > t && dist(o, target) <= 1);
      if (g && dmg > 0) { const part = Math.round(dmg * g.x!.guardV); dmg -= part; damage(t, g, part); }
      // Đứt Đuôi (Thằn Lằn Bóng): the first deadly blow leaves some HP and the lizard runs
      const pv = target.x.pv;
      if (pv.cheatDeath && !target.x.cheatDone && target.hp + target.shield - dmg <= 0 && target.alive) {
        target.x.cheatDone = true; target.shield = 0;
        const left = Math.max(1, Math.round(target.maxHp * val(pv.cheatDeath, target.star)));
        // the hit event already showed the full damage: give the bar back what the lizard kept
        events.push({ t, type: "hp", uid: target.uid, delta: left - (target.hp - dmg), kind: "heal" });
        target.hp = left;
        target.stealthUntil = t + TPS;
        if (target.star === 3 && pv.regenIdle) target.x.mods.push({ stat: "regen", v: 0.1, until: t + 3 * TPS });
        return;
      }
      if (pv.stack?.on === "hurt" && dmg > 0 && target.x.hurtHp < val(pv.stack.max, target.star)) { // Lì Lợm
        target.x.hurtHp += val(pv.stack.v, target.star);
        const add = Math.round(target.sp.stats.hp * C.STAR_MULT[target.star - 1] * val(pv.stack.v, target.star));
        target.maxHp += add; target.hp += add;
      }
    }
    if (target.shield > 0) { const a = Math.min(target.shield, dmg); target.shield -= a; dmg -= a; }
    target.hp -= dmg;
    target.lastHitT = t;
    target.energy = Math.min(target.sp.stats.energy, target.energy + C.ENERGY_PER_HIT);
    if (target.hp > 0 && !target.lowHealUsed && target.rule.lowHpHeal && target.hp < target.maxHp * 0.3) {
      target.lowHealUsed = true;
      if (target.item != null) events.push({ t, type: "item", uid: target.uid, id: target.item });
      heal(t, target, target.rule.lowHpHeal);
    }
    // Hộ Quốc (4): an ally under 30 % gets a shield of 20 % max HP (once)
    if (target.hp > 0 && !target.shieldUsed && lv(target.side, "Hộ Quốc") >= 1 && target.hp < target.maxHp * 0.3) {
      target.shieldUsed = true;
      target.shield = Math.round(target.maxHp * 0.2);
      events.push({ t, type: "status", uid: target.uid, kind: "shield", ticks: 0, amount: target.shield });
    }
    if (SK && target.x && target.hp > 0 && target.alive && !target.x.lowDone && target.x.pv.low && target.hp < target.maxHp * target.x.pv.low.below) {
      const lo = target.x.pv.low;
      if (lo.flee || lo.heal || lo.skillX2) target.x.lowDone = true;
      if (lo.flee) target.stealthUntil = Math.max(target.stealthUntil, t + sec(lo.flee));
      if (lo.heal) heal(t, target, val(lo.heal, target.star));
      if (lo.skillX2) { target.stealthUntil = Math.max(target.stealthUntil, t + 2 * TPS); const o = foesOf(target)[0]; if (o) castSkill(t, target, o, 2); }
    }
    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      target.bleeds = [];
      if (SK) deadOrder.push(target);
      occ.delete(key(target.row, target.col));
      events.push({ t, type: "death", uid: target.uid });
      const side = target.side;
      // Hịch Tướng Sĩ: the first fall rallies the team
      if (!rally[side]) rally[side] = Math.max(0, ...team[side].map((r) => r.rallyAtkPct ?? 0));
      // Lá Đa Thần (an ally carries it) revives the first fallen ally; Quả Thị revives its carrier
      const leaf = fighters.find((o) => o.side === side && o.alive && o.rule.reviveAlly);
      if (leaf && !allyRevive[side]) {
        allyRevive[side] = true; pendingRevives.push({ t: t + 2 * TPS, f: target, pct: leaf.rule.reviveAlly! });
        if (leaf.item != null) events.push({ t, type: "item", uid: leaf.uid, id: leaf.item });
      } else if (target.rule.selfRevive && !target.reviveUsed) {
        target.reviveUsed = true; pendingRevives.push({ t: t + 4 * TPS, f: target, pct: target.rule.selfRevive });
        if (target.item != null) events.push({ t, type: "item", uid: target.uid, id: target.item });
      }
      // tộc hệ revives: Mười Hai Con Giáp (12) first zodiac 50 %, Hội Nhà Mèo (3) first cat 20 %, Côn Trùng (9) 30 % chance
      else if (lv(side, "Mười Hai Con Giáp") >= 3 && target.sp.zodiac && firstOnce(side + ":zodiacRevive")) pendingRevives.push({ t: t + 2 * TPS, f: target, pct: 0.5 });
      else if (mlv(side, "Hội Nhà Mèo", target.sp) >= 1 && firstOnce(side + ":catRevive")) pendingRevives.push({ t: t + 2 * TPS, f: target, pct: 0.2 });
      else if (mlv(side, "Côn Trùng", target.sp) >= 2 && rng.next() < 0.3) pendingRevives.push({ t: t + 2 * TPS, f: target, pct: 0.3 });
      if (SK && target.x && !target.x.summon) onDeathSkills(t, target);
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

  function hit(t: number, f: Fighter, target: Fighter, power: number, kind: "attack" | "cast", xo: { pen?: number; noDodge?: boolean } = {}): number {
    // dodge (Trường Sơn, Côn Trùng), ranged dodge (Cao Nguyên), fog (Cao Nguyên 6: 3 s of every 10 s, enemy ranged −25 %)
    if (kind === "attack") {
      let miss = target.dodge;
      if (SK && f.x && target.x) {
        const tp = target.x.pv, ts = target.star;
        miss += mod(target, "dodge") + val(tp.dodge, ts) + (isMelee(f) ? val(tp.dodgeMelee, ts) : val(tp.dodgeRanged, ts)) + mod(f, "miss") - mod(f, "acc");
        if (f.x.pv.noDodge) miss = 0;
        if (until(f, "blind") > t) miss = Math.max(miss, 0.5);
        if (target.x.dodgeNext) { target.x.dodgeNext = false; miss = 1; }
      }
      if (f.sp.range >= 2) {
        miss += target.rangedDodge;
        if (lv(target.side, "Cao Nguyên Bắc Bộ") >= 2 && t >= 10 * TPS && t % (10 * TPS) < 3 * TPS) miss += 0.25;
      }
      if (target.insect && lv(f.side, "Săn Côn Trùng") >= 2) miss -= 0.2;
      if (miss > 0 && rng.next() < miss) {
        events.push({ t, type: "attack", uid: f.uid, target: target.uid, dmg: 0, mult: 1, en: f.energy, tEn: target.energy, miss: true });
        return 0;
      }
    }
    void xo.noDodge;
    const { base, typeM, preyM } = baseDamage(f, target, power, xo.pen ?? (SK && kind === "attack" && f.x ? val(f.x.pv.penBasic, f.star) : 0));
    const roll = rng.range(C.DAMAGE_RANDOM[0], C.DAMAGE_RANDOM[1]);
    let critHit = f.crit > 0 && rng.next() < f.crit;
    if (f.revealCrit && kind === "attack") { critHit = true; f.revealCrit = false; } // Trường Sơn (6): first hit after hiding
    if (SK && f.x && kind === "attack" && f.x.pv.firstCritPerTarget && !f.x.hitTargets.has(target.uid)) critHit = true;
    let dmg = Math.max(1, Math.round(base * roll * (critHit ? f.critMult : 1)));
    if (kind === "cast" && target.rule.dodgeFirstCast && !target.dodged) { // Ngọc Dã Tràng
      target.dodged = true; dmg = 0;
      if (target.item != null) events.push({ t, type: "item", uid: target.uid, id: target.item });
    }
    if (SK && f.x && target.x) {
      const tp = target.x.pv, ts = target.star;
      if (kind === "attack" && !f.x.firstDone) { f.x.firstDone = true; dmg = Math.round(dmg * (val(f.x.pv.firstMult, f.star) || 1)); }
      if (kind === "attack" && until(target, "immBasic") > t) dmg = 0;
      if (kind === "cast" && until(target, "immSkill") > t) dmg = 0;
      if (kind === "cast" && tp.dodgeFirstSkill && !target.x.skillDodged) { target.x.skillDodged = true; dmg = 0; }
      let m = 1 - (kind === "attack" ? val(tp.drBasic, ts) : val(tp.drSkill, ts)) - mod(target, "dr");
      if (isMelee(f)) m -= val(tp.drFront, ts) + mod(target, "drMelee");
      if (f.water) {
        if (tp.drWater != null) m *= tp.drWater;
        if (fighters.some((o) => o.alive && o.side === target.side && o.x?.pv.waterAura)) m *= 0.88; // Ông Nam Hải
        if (tp.waterArmor) target.armor = Math.min(C.ARMOR_CAP, target.armor + tp.waterArmor); // Núi Dâng
      }
      dmg = Math.round(dmg * Math.max(0, m));
      // Dã Tràng Xe Cát: the sand wall of an allied Cua Đồng takes ranged hits aimed at allies within 2 cells
      const wall = !isMelee(f) && fighters.find((o) => o.alive && o !== target && o.side === target.side && o.x && o.x.wallUntil > t && o.x.wallHp > 0 && dist(o, target) <= 2);
      if (wall && dmg > 0) { const a = Math.min(wall.x!.wallHp, dmg); wall.x!.wallHp -= a; dmg -= a; if (wall.x!.wallHp <= 0 && wall.star === 3) wall.x!.mods.push({ stat: "armor", v: 12, until: t + 4 * TPS }); }
      f.x.hitTargets.add(target.uid);
    }
    events.push(kind === "attack"
      ? { t, type: "attack", uid: f.uid, target: target.uid, dmg, mult: typeM * preyM, en: f.energy, tEn: Math.min(target.sp.stats.energy, target.energy + C.ENERGY_PER_HIT), crit: critHit || undefined }
      : { t, type: "cast", uid: f.uid, target: target.uid, dmg, en: f.energy, tEn: Math.min(target.sp.stats.energy, target.energy + C.ENERGY_PER_HIT) });
    damage(t, target, dmg, f);
    if (f.water && mlv(target.side, "Sơn Tinh", target.sp) >= 1) target.armor = Math.min(C.ARMOR_CAP, target.armor + 2); // núi cao thêm
    if (SK && kind === "attack") afterAttack(t, f, target, dmg);
    if (kind !== "attack" || !target.alive) return dmg;
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
    if (f.rule.bleed && rng.next() < f.rule.bleed && target.alive) {
      target.bleeds.push({ next: t + TPS, left: 3, per: Math.max(1, Math.round(target.maxHp * 0.03)) });
      if (f.item != null) events.push({ t, type: "item", uid: f.uid, id: f.item });
    }
    if (f.rule.zap && rng.next() < f.rule.zap) {
      if (f.item != null) events.push({ t, type: "item", uid: f.uid, id: f.item });
      const near = fighters.find((o) => o.alive && o.side === target.side && o !== target && dist(o, target) <= 1);
      for (const z of [target, near]) {
        if (!z || !z.alive) continue;
        const zd = Math.max(1, Math.round(baseDamage(f, z, 0.6).base));
        events.push({ t, type: "hp", uid: z.uid, delta: -zd, kind: "zap", src: f.uid });
        damage(t, z, zd);
      }
    }
    const extra = f.rule.multiShot ?? 0;
    if (extra > 0)
      fighters.filter((o) => o.alive && o.side === target.side && o !== target)
        .sort((a, b) => dist(a, target) - dist(b, target) || a.uid - b.uid).slice(0, extra)
        .forEach((o) => {
          const sd = Math.max(1, Math.round(baseDamage(f, o, 1).base * rng.range(C.DAMAGE_RANDOM[0], C.DAMAGE_RANDOM[1])));
          events.push({ t, type: "hp", uid: o.uid, delta: -sd, kind: "shot", src: f.uid });
          damage(t, o, sd);
        });
    return dmg;
  }

  /** passives that react to a basic attack (both sides) */
  function afterAttack(t: number, f: Fighter, target: Fighter, dmg: number) {
    if (!f.x || !target.x) return;
    const pv = f.x.pv, st = f.star;
    if (f.x.sameUid === target.uid) f.x.sameN = Math.min(10, f.x.sameN + 1); else { f.x.sameUid = target.uid; f.x.sameN = 0; }
    if (target.alive && pv.onHit && rng.next() < val(pv.onHit.p, st)) {
      if ("shred" in pv.onHit) { const mx = val(pv.onHit.max, st); target.x.mods.push({ stat: "armor", v: -pv.onHit.shred, until: Infinity }); const sh = target.x.mods.filter((m) => m.stat === "armor" && m.until === Infinity && m.v < 0); if (sh.length > mx) target.x.mods.splice(target.x.mods.indexOf(sh[0]), 1); }
      else applyEff(t, f, target, pv.onHit.eff, st);
    }
    if (pv.vs?.healPct && target.insect) heal(t, f, val(pv.vs.healPct, st));
    if (lowOn(f) && pv.low!.sweep) // Nhổ Tre Đánh Giặc: the attack sweeps the row
      for (const o of fighters.filter((z) => z.alive && z.side === target.side && z !== target && z.row === target.row && Math.abs(z.col - target.col) === 1)) {
        const sd = Math.max(1, Math.round(baseDamage(f, o, 1).base)); events.push({ t, type: "hp", uid: o.uid, delta: -sd, kind: "shot", src: f.uid }); damage(t, o, sd, f);
      }
    const tp = target.x.pv, ts = target.star;
    if (tp.lightning && t >= target.x.lightCd && f.alive) { // Cậu Ông Trời
      target.x.lightCd = t + sec(val(tp.lightning.cd, ts));
      const z = Math.round(f.maxHp * tp.lightning.pct); events.push({ t, type: "hp", uid: f.uid, delta: -z, kind: "zap", src: target.uid }); damage(t, f, z);
    }
    const oh = tp.onHurt;
    if (oh && f.alive && (!oh.melee || isMelee(f))) {
      if (oh.reflect && dmg > 0) { const z = Math.max(1, Math.round(dmg * val(oh.reflect, ts))); events.push({ t, type: "hp", uid: f.uid, delta: -z, kind: "zap" }); damage(t, f, z); }
      if (oh.eff && rng.next() < val(oh.p ?? 1, ts)) applyEff(t, target, f, oh.eff, ts);
    }
  }

  /** passives and tộc hệ parts that trigger when a VieAni falls */
  function onDeathSkills(t: number, f: Fighter) {
    const pv = f.x!.pv, st = f.star, side = f.side;
    for (const a of fighters.filter((o) => o.alive && o.side === side && o.x && dist(o, f) <= 1)) {
      const s2 = a.x!.pv.stack;
      if (s2?.on !== "allyDieAdj") continue;
      if (s2.stat === "atk" && (s2.max == null || a.x!.dieAtk < val(s2.max, a.star))) a.x!.dieAtk += val(s2.v, a.star);
      if (s2.stat === "hpPct") { const add = Math.round(a.maxHp * val(s2.v, a.star)); a.maxHp += add; a.hp += add; a.armor = Math.min(C.ARMOR_CAP, a.armor + 3); }
    }
    const pending = pendingRevives.some((p) => p.f === f);
    const dth = pv.death;
    if (dth?.egg && !pending && firstOnce(f.uid + ":egg")) {
      const egg = makeSummon(t, f, 0.3, true);
      if (egg) { egg.x!.eggOf = f.uid; egg.x!.hatchAt = t + 6 * TPS; }
    } else if (dth?.revive && !pending && !f.x!.deathDone && rng.next() < (val(dth.p, st) || 1)) {
      f.x!.deathDone = true; pendingRevives.push({ t: t + TPS, f, pct: val(dth.revive, st) });
    }
    if (dth?.spawn) for (let i = 0; i < val(dth.spawn[0], st); i++) makeSummon(t, f, val(dth.spawn[1], st));
    if (dth?.ghost && firstOnce(f.uid + ":ghost")) { const o = foesOf(f)[0]; if (o) castSkill(t, f, o); }
    // Bầy Gặm Nhấm (3) Sinh sôi: the first member to fall leaves 2 young (20 % stats)
    if (mlv(side, "Bầy Gặm Nhấm", f.sp) >= 1 && firstOnce(side + ":gnBabies")) for (let i = 0; i < 2; i++) makeSummon(t, f, 0.2);
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
      if (SK && t > 0 && t % TPS === 0) { const r2 = mod(f, "regen"); if (r2 > 0) heal(t, f, r2); }
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
    if (SK) skillUpkeep(t);
  }

  let t = 0;
  if (SK) initSkills();
  for (const f of fighters) if (f.stealthUntil > 0) events.push({ t: 0, type: "status", uid: f.uid, kind: "stealth", ticks: f.stealthUntil });
  for (; t < maxTicks; t++) {
    now = t;
    upkeep(t);
    const standing = (side: Side) => fighters.some((f) => f.alive && f.side === side) || pendingRevives.some((p) => p.t > t && p.f.side === side);
    if (!standing("A") || !standing("B")) break;
    for (const f of fighters) {
      if (!f.alive) continue;
      if (SK && f.x && until(f, "stun") > t) continue; // Choáng / nhấc lên: no action at all
      f.atkCd -= f.haste * (1 + (f.buffUntil > t ? f.buffPct : 0)) * (SK ? aspdFactor(f) : 1);
      f.moveCd -= 1;
      const target = chooseTarget(f);
      if (!target) continue;
      f.targetUid = target.uid;
      if (inRange(f, target)) {
        if (f.atkCd <= 0) {
          f.atkCd += f.interval;
          f.energy += C.ENERGY_PER_ATTACK;
          hit(t, f, target, 1, "attack");
          if (SK && f.x) {
            if (f.alive && f.energy >= f.x.energyNeed && until(f, "silence") <= t) { f.energy = 0; castSkill(t, f, target); }
          } else if (f.energy >= f.sp.stats.energy && target.alive) {
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
        if (SK && f.x && until(f, "root") > t) continue; // Trói: cannot move
        if (f.moveCd <= 0) {
          const step = nextStep(f, target);
          if (step) {
            occ.delete(key(f.row, f.col));
            [f.row, f.col] = step;
            occ.set(key(f.row, f.col), f.uid);
            events.push({ t, type: "move", uid: f.uid, row: f.row, col: f.col });
            // Tây Nguyên (6): members +30 % movement speed for the first 4 s
            f.moveCd = t < 4 * TPS && mlv(f.side, "Tây Nguyên", f.sp) >= 2 ? Math.round(f.moveTicks / 1.3) : f.moveTicks;
            if (SK && f.x && until(f, "slow") > t) f.moveCd = Math.round(f.moveCd * (1 + f.x.slowV));
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
    survivors: [...aliveA, ...aliveB].filter((f) => !f.x?.summon).map((f) => ({ uid: f.uid, side: f.side, hp: f.hp, tier: f.sp.tier, star: f.star })),
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
