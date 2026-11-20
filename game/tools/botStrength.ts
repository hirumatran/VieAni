// Bot strength check (PO 20 Nov 2026 "win is very easy against the bot"): whole matches without graphics,
// strategy X in seat A vs strategy Y in seat B, both seat orders. Prints win rates + level / ★ by round.
// npx vitest run --config vitest.balance.config.ts tools/botStrength.ts   (N=games per order, default 100)
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { loadData } from "../src/core/data";
import { Match, TEST_CODES, type PlayerState } from "../src/core/match";
import { smartTurn, SMART } from "../src/core/botAI";

const d = loadData();
const N = Number(process.env.N ?? 100);
type Strat = (m: Match, p: PlayerState) => void;
const STRATS: Record<string, Strat> = {
  old: (m, p) => m.botTurn(p, "easy"),
  smart: (m, p) => smartTurn(m, p),
  // tuning variants
  fast: (m, p) => smartTurn(m, p, { ...SMART, levelCurve: [[2, 3], [3, 4], [5, 5], [7, 6], [10, 7], [13, 8], [17, 9], [22, 10]] }),
  slow: (m, p) => smartTurn(m, p, { ...SMART, levelCurve: [[3, 3], [5, 4], [8, 5], [11, 6], [15, 7], [20, 8], [26, 9], [32, 10]] }),
  econ50: (m, p) => smartTurn(m, p, { ...SMART, econ: 50 }),
  econ10: (m, p) => smartTurn(m, p, { ...SMART, econ: 10 }),
  panic25: (m, p) => smartTurn(m, p, { ...SMART, panicHp: 25 }),
  rolls3: (m, p) => smartTurn(m, p, { ...SMART, maxRolls: 3 }),
  e50r3: (m, p) => smartTurn(m, p, { ...SMART, econ: 50, maxRolls: 3 }),
  e50r5: (m, p) => smartTurn(m, p, { ...SMART, econ: 50, maxRolls: 5 }),
  e40r3: (m, p) => smartTurn(m, p, { ...SMART, econ: 40, maxRolls: 3 }),
};

function play(a: Strat, b: Strat, seed: number) {
  const m = new Match(d, TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]), seed);
  const snap: Record<number, number[]> = {};
  while (!m.over && m.round <= 60) {
    a(m, m.human); b(m, m.bot);
    if (m.round === 10 || m.round === 20) snap[m.round] = [m.human.level, m.bot.level, m.human.hp, m.bot.hp];
    m.finishRound(m.battle(seed * 1000 + m.round).res);
  }
  return { aWins: m.human.hp > 0 && m.bot.hp <= 0, bWins: m.bot.hp > 0 && m.human.hp <= 0, rounds: m.round - 1, snap };
}

it("bot strength", () => {
  const out: Record<string, unknown> = {};
  const pairs = (process.env.PAIRS ?? "smart:old,old:old,smart:smart").split(",");
  for (const pr of pairs) {
    const [x, y] = pr.split(":");
    let xw = 0, games = 0, rounds = 0;
    const lv10: number[][] = [];
    for (let seed = 1; seed <= N; seed++) {
      const r1 = play(STRATS[x], STRATS[y], seed);      // x in seat A
      const r2 = play(STRATS[y], STRATS[x], seed + 5000); // x in seat B
      xw += Number(r1.aWins) + Number(r2.bWins); games += 2; rounds += r1.rounds + r2.rounds;
      if (r1.snap[10]) lv10.push([r1.snap[10][0], r1.snap[10][1]]);
    }
    const res = { winRate: +(xw / games).toFixed(3), games, avgRounds: +(rounds / games).toFixed(1),
      avgLevelR10: lv10.length ? [+(lv10.reduce((n, l) => n + l[0], 0) / lv10.length).toFixed(1), +(lv10.reduce((n, l) => n + l[1], 0) / lv10.length).toFixed(1)] : null };
    out[`${x} vs ${y}`] = res;
    console.log(`BOT ${x} vs ${y}:`, JSON.stringify(res));
  }
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify({ N, style: SMART, results: out }, null, 1) + "\n");
}, 3_600_000);
