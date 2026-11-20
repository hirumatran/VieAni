// Per-VieAni balance test (19 Nov 2026).   npm run balance -- tools/unitBalance.ts   → docs/balance/unit_balance.json
// For each tier: random teams of 5 VieAni of that tier (4 for tier 4, which has only 5), all ★2, tộc hệ OFF (unit strength only),
// fight random teams of the same tier. A VieAni's score = win rate of the teams it was in (draw = ½). 50 % = average for its tier.
// Modes: "now" = the current game (placeholder skill: one 2× hit when energy is full);
//        "t11" = only the proposed T11 skill damage from data/skills_v3.json (% Tấn Công, 1 / 2 / 3 targets);
//        "full" = the whole T11/T12 skill engine (SimOptions.skills, 20 Nov 2026): skills, control, heals, shields, passives.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { it } from "vitest";
import { simulate, mirror, type Placed } from "../src/core/battle";
import { loadData, type Species } from "../src/core/data";
import { Rng } from "../src/core/rng";

const d = loadData();
const STAR = 2, APPEAR = Number(process.env.APPEAR ?? 400);
const ROLE_ROWS: Record<string, number[]> = {
  "Đỡ Đòn": [4, 5, 6, 7], "Chiến Đấu": [4, 5, 6, 7], "Săn Mồi": [5, 4, 6, 7], "Phép Thuật": [7, 6, 5, 4], "Hỗ Trợ": [7, 6, 5, 4],
};
const COLS = [3, 4, 2, 5, 1, 6, 0, 7];
const skills = JSON.parse(readFileSync("../data/skills_v3.json", "utf-8")).skills as { id: number; active: { atkPct: number | null; hit: string } }[];
const T11 = new Map(skills.map((s) => [s.id, { pct: s.active.atkPct ?? 0, hit: s.active.hit }]));
const OFF = { A: [] as string[], B: [] as string[] };

function place(list: Species[], side: "A" | "B", uid0: number, star: 1 | 2 | 3 = STAR): Placed[] {
  const used = new Set<string>();
  return list.map((sp, i) => {
    let spot: [number, number] = [4, 0];
    outer: for (const r of ROLE_ROWS[sp.role ?? ""] ?? [5, 4, 6, 7]) for (const c of COLS) if (!used.has(`${r},${c}`)) { spot = [r, c]; break outer; }
    used.add(`${spot[0]},${spot[1]}`);
    const [row, col] = side === "A" ? spot : mirror(spot[0], spot[1]);
    return { uid: uid0 + i, speciesId: sp.id, star, row, col, side };
  });
}
function pick(pool: Species[], k: number, rng: Rng): Species[] {
  const p = [...pool], out: Species[] = [];
  while (out.length < k) out.push(p.splice(rng.int(0, p.length - 1), 1)[0]);
  return out;
}
/** score of team a vs b (1 win, ½ draw, 0 loss), sides alternate by i */
type Mode = "now" | "t11" | "full" | "fix";
/** experiment "fix" (20 Nov): supports / mages +5 / +3 energy per second, tier 5 ×1.11 Máu and Tấn Công (= tier factor 2.0 instead of 1.8) */
const FIX = { energyPerSec: { "Hỗ Trợ": 5, "Phép Thuật": 3 }, tierScale: { 5: 2.0 / 1.8 } };
function fight(a: Species[], b: Species[], i: number, mode: Mode, star: 1 | 2 | 3 = STAR): number {
  const flip = i % 2 === 1;
  const units = [...place(flip ? b : a, "A", 1, star), ...place(flip ? a : b, "B", 100, star)];
  const r = simulate(d, units, 1000 + i, {}, { synergies: OFF, castPower: mode === "t11" ? T11 : undefined, skills: mode === "full" || mode === "fix", ...(mode === "fix" ? FIX : {}) });
  const w = r.winner === "draw" ? 0.5 : r.winner === "A" ? 1 : 0;
  return flip ? 1 - w : w;
}

it("per-VieAni balance", () => {
  const out: Record<string, unknown> = { note: "win rate inside random same-tier teams, ★2, tộc hệ off; 50% = tier average", units: [], ladder: [] };
  const units: Record<number, Record<string, number | string>> = {};
  for (const mode of ["now", "t11", "full", "fix"] as const) {
    for (let tier = 1; tier <= 5; tier++) {
      const pool = d.roster.filter((s) => s.tier === tier);
      const k = Math.min(5, pool.length - 1);
      const games = Math.ceil((APPEAR * pool.length) / (2 * k));
      const rng = new Rng(tier * 7919);
      const sum = new Map<number, number>(), n = new Map<number, number>();
      for (let i = 0; i < games; i++) {
        const a = pick(pool, k, rng), b = pick(pool, k, rng);
        const w = fight(a, b, i, mode);
        for (const s of a) { sum.set(s.id, (sum.get(s.id) ?? 0) + w); n.set(s.id, (n.get(s.id) ?? 0) + 1); }
        for (const s of b) { sum.set(s.id, (sum.get(s.id) ?? 0) + 1 - w); n.set(s.id, (n.get(s.id) ?? 0) + 1); }
      }
      for (const s of pool) {
        const u = (units[s.id] ??= { id: s.id, vi: s.vi, tier: s.tier, role: s.role ?? "" });
        u[mode] = Math.round((1000 * (sum.get(s.id) ?? 0)) / (n.get(s.id) ?? 1)) / 10;
        u["n_" + mode] = n.get(s.id) ?? 0;
      }
      console.log(mode, "tier", tier, "games", games);
    }
    // tier ladder: 4 random tier-t VieAni vs 4 random tier-(t−1)
    for (let tier = 2; tier <= 5; tier++) {
      const hi = d.roster.filter((s) => s.tier === tier), lo = d.roster.filter((s) => s.tier === tier - 1), rng = new Rng(tier * 31);
      let w = 0; const G = 300;
      for (let i = 0; i < G; i++) w += fight(pick(hi, 4, rng), pick(lo, 4, rng), i, mode);
      (out.ladder as unknown[]).push({ mode, tier, vsTier: tier - 1, winRate: Math.round((1000 * w) / G) / 10 });
    }
  }
  // ★3 check (full engine only): same test with every VieAni at ★3 – the ★3 bonuses only exist there
  for (let tier = 1; tier <= 5; tier++) {
    const pool = d.roster.filter((s) => s.tier === tier), k = Math.min(5, pool.length - 1), games = Math.ceil((APPEAR / 2 * pool.length) / (2 * k));
    const rng = new Rng(tier * 104729), sum = new Map<number, number>(), n = new Map<number, number>();
    for (let i = 0; i < games; i++) {
      const a = pick(pool, k, rng), b = pick(pool, k, rng), w = fight(a, b, i, "full", 3);
      for (const s of a) { sum.set(s.id, (sum.get(s.id) ?? 0) + w); n.set(s.id, (n.get(s.id) ?? 0) + 1); }
      for (const s of b) { sum.set(s.id, (sum.get(s.id) ?? 0) + 1 - w); n.set(s.id, (n.get(s.id) ?? 0) + 1); }
    }
    for (const s of pool) units[s.id].star3 = Math.round((1000 * (sum.get(s.id) ?? 0)) / (n.get(s.id) ?? 1)) / 10;
  }
  out.units = Object.values(units).sort((a, b) => (a.tier as number) - (b.tier as number) || (b.full as number) - (a.full as number));
  mkdirSync("../docs/balance", { recursive: true });
  writeFileSync("../docs/balance/unit_balance.json", JSON.stringify(out, null, 1) + "\n");
  console.log(JSON.stringify(out.ladder));
});
