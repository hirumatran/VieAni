// Tộc hệ balance simulation (17 Nov 2026).   npm run balance  (N=100 battles per pairing by default)   → docs/balance/synergy_balance.json
// Comp per tộc hệ: 8 VieAni at ★2 – its members (random 8 if it has more), topped up with random tier-1–3 non-members.
// Only that tộc hệ is active for the comp (fillers cannot add others). Draw = ½ win. Sides alternate.
import { writeFileSync, mkdirSync } from "node:fs";
import { it } from "vitest";
import { simulate, mirror, type Placed } from "../src/core/battle";
import { loadData, type Species } from "../src/core/data";
import { Rng } from "../src/core/rng";

const d = loadData();
const N = Number(process.env.N ?? 100);
/** SKILLS=1: T11/T12 skill engine + the tộc hệ parts that need it (20 Nov 2026) → synergy_balance_skills.json */
const SKILLS = process.env.SKILLS === "1";
const BOARD = 8, STAR = 2;
const ROLE_ROWS: Record<string, number[]> = {
  "Đỡ Đòn": [4, 5, 6, 7], "Chiến Đấu": [4, 5, 6, 7], "Săn Mồi": [5, 4, 6, 7], "Phép Thuật": [7, 6, 5, 4], "Hỗ Trợ": [7, 6, 5, 4],
};
const COLS = [3, 4, 2, 5, 1, 6, 0, 7];
const names = d.synergies.map((s) => s.name);

function members(name: string): Species[] {
  const g = d.synergies.find((s) => s.name === name)!;
  return g.byZodiac ? d.roster.filter((s) => s.zodiac) : g.members.map((m) => d.byId.get(m)!);
}

function comp(name: string, rng: Rng): Species[] {
  const g = d.synergies.find((s) => s.name === name)!;
  let pool = [...members(name)];
  const pick: Species[] = [];
  if (g.byZodiac) {
    // one VieAni per sign, 8 different signs → Mười Hai Con Giáp (6)
    const signs = [...new Set(pool.map((s) => s.zodiac!))];
    while (pick.length < BOARD && signs.length) {
      const z = signs.splice(rng.int(0, signs.length - 1), 1)[0];
      const c = pool.filter((s) => s.zodiac === z);
      pick.push(c[rng.int(0, c.length - 1)]);
    }
  } else {
    while (pick.length < BOARD && pool.length) pick.push(pool.splice(rng.int(0, pool.length - 1), 1)[0]);
  }
  const fill = d.roster.filter((s) => s.tier <= 3 && !pick.includes(s) && !members(name).includes(s));
  while (pick.length < BOARD) pick.push(fill.splice(rng.int(0, fill.length - 1), 1)[0]);
  return pick;
}

function place(list: Species[], side: "A" | "B", uid0: number): Placed[] {
  const used = new Set<string>();
  return list.map((sp, i) => {
    let spot: [number, number] = [4, 0];
    outer: for (const r of ROLE_ROWS[sp.role ?? ""] ?? [5, 4, 6, 7]) for (const c of COLS) if (!used.has(`${r},${c}`)) { spot = [r, c]; break outer; }
    used.add(`${spot[0]},${spot[1]}`);
    const [row, col] = side === "A" ? spot : mirror(spot[0], spot[1]);
    return { uid: uid0 + i, speciesId: sp.id, star: STAR, row, col, side };
  });
}

/** win rate of comp x (its tộc hệ on = xOn) vs comp y */
function duel(x: string, y: string, opts: { xOn?: boolean; yOn?: boolean; same?: boolean } = {}): number {
  const rng = new Rng(hash(x + "|" + y + JSON.stringify(opts)));
  let score = 0;
  for (let i = 0; i < N; i++) {
    const cx = comp(x, rng), cy = opts.same ? cx : comp(y, rng);
    const xA = i % 2 === 0; // alternate sides
    const ux = place(cx, xA ? "A" : "B", 100), uy = place(cy, xA ? "B" : "A", 200);
    const sx = opts.xOn === false ? [] : [x], sy = opts.yOn === false ? [] : [y];
    const res = simulate(d, [...ux, ...uy], rng.int(1, 1e9), {}, { skills: SKILLS, synergies: xA ? { A: sx, B: sy } : { A: sy, B: sx } });
    const xSide = xA ? "A" : "B";
    if (res.winner !== "draw") { score += res.winner === xSide ? 1 : 0; continue; }
    // draw at the 45 s limit: the side with more HP left (share of its total max HP) takes it
    draws++;
    const maxBy = new Map((res.start ?? []).map((s) => [s.uid, s.maxHp]));
    const share = (side: "A" | "B") => {
      const tot = [...ux, ...uy].filter((u) => u.side === side).reduce((n, u) => n + (maxBy.get(u.uid) ?? 1), 0);
      return res.survivors.filter((s) => s.side === side).reduce((n, s) => n + s.hp, 0) / tot;
    };
    const mine = share(xSide), theirs = share(xSide === "A" ? "B" : "A");
    score += mine > theirs ? 1 : mine < theirs ? 0 : 0.5;
  }
  return score / N;
}
let draws = 0;

/** tộc hệ team vs a random team with the same unit tiers (non-members, no tộc hệ): win rate with the tộc hệ on and off */
function tierMatched(x: string): { on: number; off: number } {
  const res = { on: 0, off: 0 };
  for (const mode of ["on", "off"] as const) {
    const rng = new Rng(hash("tm|" + x + mode));
    let score = 0;
    for (let i = 0; i < N; i++) {
      const cx = comp(x, rng);
      const pool = d.roster.filter((s) => !members(x).includes(s));
      const cy = cx.map((u) => { const c = pool.filter((s) => s.tier === u.tier && !s.zodiac === !u.zodiac || s.tier === u.tier); return c[rng.int(0, c.length - 1)]; });
      const xA = i % 2 === 0;
      const ux = place(cx, xA ? "A" : "B", 100), uy = place(cy, xA ? "B" : "A", 200);
      const sx = mode === "on" ? [x] : [];
      const r = simulate(d, [...ux, ...uy], rng.int(1, 1e9), {}, { skills: SKILLS, synergies: xA ? { A: sx, B: [] } : { A: [], B: sx } });
      const xSide = xA ? "A" : "B";
      if (r.winner !== "draw") { score += r.winner === xSide ? 1 : 0; continue; }
      const maxBy = new Map((r.start ?? []).map((q) => [q.uid, q.maxHp]));
      const share = (side: "A" | "B") => r.survivors.filter((q) => q.side === side).reduce((n, q) => n + q.hp, 0)
        / [...ux, ...uy].filter((u) => u.side === side).reduce((n, u) => n + (maxBy.get(u.uid) ?? 1), 0);
      const m = share(xSide), t = share(xSide === "A" ? "B" : "A");
      score += m > t ? 1 : m < t ? 0 : 0.5;
    }
    res[mode] = score / N;
  }
  return res;
}
function hash(s: string) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }

it("tộc hệ balance", () => {
const t0 = Date.now();
const matrix: number[][] = names.map((a) => names.map((b) => (a === b ? 0.5 : NaN)));
for (let i = 0; i < names.length; i++)
  for (let j = i + 1; j < names.length; j++) { const w = duel(names[i], names[j]); matrix[i][j] = w; matrix[j][i] = 1 - w; }
const tm = names.map((n) => tierMatched(n));
const uplift = tm.map((x) => x.on), baseline = tm.map((x) => x.off);
const avgTier = names.map((n) => { const r = new Rng(7); let s = 0; for (let i = 0; i < 50; i++) s += comp(n, r).reduce((a, x) => a + x.tier, 0) / BOARD; return s / 50; });
const tierReached = names.map((n) => { const g = d.synergies.find((s) => s.name === n)!; const th = Object.keys(g.tiers).map(Number).sort((a, b) => a - b);
  const cnt = g.byZodiac ? BOARD : Math.min(BOARD, g.members.length); return th.filter((t) => cnt >= t).pop() ?? 0; });
const drawRate = draws / (N * (names.length * (names.length - 1) / 2 + names.length));
const overall = names.map((_, i) => matrix[i].reduce((a, w, j) => (j === i ? a : a + w), 0) / (names.length - 1));
mkdirSync("../docs/balance", { recursive: true });
writeFileSync(`../docs/balance/synergy_balance${SKILLS ? "_skills" : ""}.json`, JSON.stringify({ date: SKILLS ? "2026-11-20" : "2026-11-17", skills: SKILLS, battlesPerCell: N, board: BOARD, star: STAR, names, matrix, uplift, baseline, avgTier, tierReached, overall, drawRate, drawRule: "draw at 45 s → more HP left (share of max HP) wins" }, null, 1));
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)} s`);
names.map((n, i) => ({ n, o: overall[i], u: uplift[i], t: avgTier[i], r: tierReached[i] })).sort((a, b) => b.o - a.o)
  .forEach((x) => console.log(`${x.n.padEnd(20)} overall ${(x.o * 100).toFixed(0).padStart(3)}%  tier-matched ${(x.u * 100).toFixed(0).padStart(3)}%  avg tier ${x.t.toFixed(1)}  tier (${x.r})`));
}, 3_600_000);
