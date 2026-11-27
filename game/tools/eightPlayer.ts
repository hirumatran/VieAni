// 8-player match study (PO 27 Nov 2026): 8 computer players (smart bot) play until one is left.
// Reports match length, first knock-out, rounds per knock-out and time per round.  N = matches (default 40).
import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { loadData } from "../src/core/data";
import { Match, TEST_CODES } from "../src/core/match";
const d = loadData();
const N = Number(process.env.N ?? 40);
const P = Number(process.env.PLAYERS ?? 8);
const q = (a: number[], f: number) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(f * s.length))]; };
it("eight players", () => {
  const ends: number[] = [], firstOut: number[] = [], humanOut: number[] = [], ms: number[] = [], ghosts: number[] = [];
  const outRounds: number[][] = [];
  for (let seed = 1; seed <= N; seed++) {
    const m = new Match(d, TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]), seed, undefined, P);
    const outs: number[] = [];
    let g = 0;
    while (m.aliveIdx().length > 1 && m.round <= 80) {
      const t0 = performance.now();
      for (const i of m.aliveIdx()) m.botTurn(m.players[i]);
      g += m.pairings.filter((x) => x.ghost).length;
      const hp = m.humanPairing();
      const r = m.finishRound(hp ? m.battle(seed * 1000 + m.round).res : undefined, seed * 7 + m.round);
      for (const _ of r.knockedOut) outs.push(r.round);
      if (m.human.hp <= 0 && !humanOut[seed]) humanOut[seed] = r.round;
      ms.push(performance.now() - t0);
    }
    ends.push(m.round - 1); firstOut.push(outs[0] ?? 0); outRounds.push(outs); ghosts.push(g);
    const places = m.players.map((p) => p.place).sort();
    if (places.join() !== "1,2,3,4,5,6,7,8".slice(0, P * 2 - 1)) console.log("PLACES?", places.join());
  }
  const res = {
    players: P, matches: N,
    lengthRounds: { min: Math.min(...ends), median: q(ends, 0.5), p90: q(ends, 0.9), max: Math.max(...ends) },
    firstKnockOut: { median: q(firstOut, 0.5), min: Math.min(...firstOut) },
    knockOutByPlace: Array.from({ length: P - 1 }, (_, k) => q(outRounds.map((o) => o[k] ?? 0), 0.5)),
    msPerRound: { median: +q(ms, 0.5).toFixed(1), p90: +q(ms, 0.9).toFixed(1) },
    ghostFightsPerMatch: +(ghosts.reduce((a, b) => a + b, 0) / N).toFixed(1),
  };
  console.log("EIGHT", JSON.stringify(res));
  if (process.env.OUT) writeFileSync(process.env.OUT, JSON.stringify(res, null, 1) + "\n");
}, 3_600_000);
