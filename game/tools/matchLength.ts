// Match length check (npm run balance runs it too): how many rounds a bot-vs-bot match lasts with the current damage rule.
import { it } from "vitest";
import { loadData } from "../src/core/data";
import { Match, TEST_CODES } from "../src/core/match";
const d = loadData();
it("len", () => {
 for (const HP of [100]) {
  const ends: number[] = [], dmg: number[] = [];
  for (let seed = 1; seed <= 60; seed++) {
    const m = new Match(d, TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]), seed, HP);
    while (!m.over && m.round <= 60) { m.botTurn(m.human); m.botTurn(); const r = m.finishRound(m.battle(seed * 1000 + m.round).res); dmg.push(Math.max(r.damage.A, r.damage.B)); }
    ends.push(m.round - 1);
  }
  ends.sort((a, b) => a - b); dmg.sort((a, b) => a - b);
  console.log(`LEN HP ${HP}: min ${ends[0]} median ${ends[30]} max ${ends[59]} reach r24 ${Math.round(ends.filter((r) => r >= 24).length / 0.6)}% reach r30 ${Math.round(ends.filter((r) => r >= 30).length / 0.6)}%`);
 }
});
