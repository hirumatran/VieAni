// Deterministic auto-battle simulation (GDD §6). No graphics: it returns a list of events that the
// Phaser scene replays. Same teams + same seed => exactly the same events on every device.

import * as C from "./config";
import { typeMultiplier, type GameData, type Species } from "./data";
import { Rng } from "./rng";

export type Side = "A" | "B"; // A = bottom half (the player), B = top half (opponent)

/** a unit as placed before the battle */
export interface Placed {
  uid: number;
  speciesId: number;
  star: 1 | 2 | 3;
  row: number; // full board row 0..7 (A uses 4..7, B uses 0..3)
  col: number;
  side: Side;
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
}

export type BattleEvent =
  | { t: number; type: "move"; uid: number; row: number; col: number }
  // en / tEn = energy (mana) of the attacker / target right after the hit, for the info card
  | { t: number; type: "attack"; uid: number; target: number; dmg: number; mult: number; en: number; tEn: number }
  | { t: number; type: "cast"; uid: number; target: number; dmg: number; en: number; tEn: number }
  | { t: number; type: "death"; uid: number };

export interface BattleResult {
  winner: Side | "draw";
  ticks: number;
  events: BattleEvent[];
  survivors: { uid: number; side: Side; hp: number; tier: number }[];
}

// ------------------------------------------------------------------ battle stats (GDD §6.1)
export function maxHp(sp: Species, star: 1 | 2 | 3) {
  return Math.round((C.HP_BASE + C.HP_PER_STAT * sp.stats.hp) * C.STAR_MULT[star - 1]);
}

/** attack interval in seconds */
export function attackInterval(sp: Species) {
  const s = (C.ATTACK_INTERVAL_BASE * 100) / (sp.stats.spe + 50);
  return Math.min(C.ATTACK_INTERVAL_CLAMP[1], Math.max(C.ATTACK_INTERVAL_CLAMP[0], s));
}

const dist = (a: { row: number; col: number }, b: { row: number; col: number }) =>
  Math.max(Math.abs(a.row - b.row), Math.abs(a.col - b.col)); // Chebyshev: diagonal = 1

// ------------------------------------------------------------------ Thiên địch (natural predator)
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
  return rules.get(hunter.speciesId)?.find((r) => r.prey.has(target.speciesId) || (r.preyType && target.sp.types.includes(r.preyType as never)));
}

// ------------------------------------------------------------------ simulation
export function simulate(d: GameData, units: Placed[], seed: number): BattleResult {
  const rng = new Rng(seed);
  const rules = preyRules(d);
  const TPS = C.TICKS_PER_SECOND;
  const maxTicks = C.BATTLE_MAX_SECONDS * TPS;
  const moveTicks = Math.round(C.MOVE_SECONDS_PER_CELL * TPS);

  const fighters: Fighter[] = units
    .map((u) => {
      const sp = d.byId.get(u.speciesId);
      if (!sp) throw new Error(`unknown species ${u.speciesId}`);
      const hp = maxHp(sp, u.star);
      const interval = attackInterval(sp) * TPS;
      // first attack after half an interval, so fast units strike first
      return { ...u, sp, maxHp: hp, hp, energy: 0, atkCd: interval / 2, moveCd: 0, interval, targetUid: null, alive: true };
    })
    .sort((a, b) => a.uid - b.uid);

  const events: BattleEvent[] = [];
  const occ = new Map<string, number>(); // "r,c" -> uid
  const key = (r: number, c: number) => `${r},${c}`;
  for (const f of fighters) occ.set(key(f.row, f.col), f.uid);
  const byUid = new Map(fighters.map((f) => [f.uid, f]));

  const enemiesOf = (f: Fighter) => fighters.filter((o) => o.alive && o.side !== f.side);

  function inRange(f: Fighter, t: Fighter) {
    const r = preyRule(rules, f, t);
    return (r?.unlimited ?? false) || dist(f, t) <= f.sp.range;
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
    if (current?.alive) return current;
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

  function hit(t: number, f: Fighter, target: Fighter, power: number, kind: "attack" | "cast") {
    const physical = f.sp.attackClass === "physical";
    const A = physical ? f.sp.stats.atk : f.sp.stats.spa;
    const D = physical ? target.sp.stats.def : target.sp.stats.spd;
    const typeM = typeMultiplier(d, f.sp.attackType, f.sp.types, target.sp.types);
    const preyM = preyRule(rules, f, target)?.mult ?? 1;
    const roll = rng.range(C.DAMAGE_RANDOM[0], C.DAMAGE_RANDOM[1]);
    const dmg = Math.max(1, Math.round(C.DAMAGE_BASE * (A / D) * typeM * preyM * roll * C.STAR_MULT[f.star - 1] * power));
    target.hp -= dmg;
    target.energy = Math.min(C.ENERGY_MAX, target.energy + C.ENERGY_PER_HIT);
    const en = f.energy; // a full bar shows for a moment, then the cast event that follows reports 0
    events.push(kind === "attack"
      ? { t, type: "attack", uid: f.uid, target: target.uid, dmg, mult: typeM * preyM, en, tEn: target.energy }
      : { t, type: "cast", uid: f.uid, target: target.uid, dmg, en, tEn: target.energy });
    if (target.hp <= 0 && target.alive) {
      target.alive = false;
      occ.delete(key(target.row, target.col));
      events.push({ t, type: "death", uid: target.uid });
    }
  }

  let t = 0;
  for (; t < maxTicks; t++) {
    const aliveA = fighters.some((f) => f.alive && f.side === "A");
    const aliveB = fighters.some((f) => f.alive && f.side === "B");
    if (!aliveA || !aliveB) break;
    for (const f of fighters) {
      if (!f.alive) continue;
      f.atkCd -= 1;
      f.moveCd -= 1;
      const target = chooseTarget(f);
      if (!target) continue;
      f.targetUid = target.uid;
      if (inRange(f, target)) {
        if (f.atkCd <= 0) {
          f.atkCd += f.interval;
          f.energy += C.ENERGY_PER_ATTACK;
          hit(t, f, target, 1, "attack");
          if (f.energy >= C.ENERGY_MAX && target.alive) {
            // placeholder skill until the skill templates (task T11): a strong strike for 2× damage
            f.energy = 0;
            hit(t, f, target, 2, "cast");
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
            f.moveCd = moveTicks;
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
    survivors: [...aliveA, ...aliveB].map((f) => ({ uid: f.uid, side: f.side, hp: f.hp, tier: f.sp.tier })),
  };
}

/** damage the losing player takes (GDD §6.5); on a draw both take damage from the other side's survivors */
export function playerDamage(res: BattleResult, round: number): { A: number; B: number } {
  const sum = (side: Side) => res.survivors.filter((s) => s.side === side).reduce((n, s) => n + s.tier, 0);
  const base = C.stageDamage(round);
  if (res.winner === "A") return { A: 0, B: base + sum("A") };
  if (res.winner === "B") return { A: base + sum("B"), B: 0 };
  return { A: base + sum("B"), B: base + sum("A") };
}

/** mirror an opponent's own-half placement (rows 4..7) onto the top half, rotated 180° */
export function mirror(row: number, col: number): [number, number] {
  return [C.BOARD_ROWS - 1 - row, C.BOARD_COLS - 1 - col];
}
