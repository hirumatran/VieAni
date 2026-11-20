// Difficulty check: the smart bot in seat A vs seat B with the Khó gold bonus (HARD_BOT_GOLD per round), or the old bot (Dễ).
// N=games, BONUS=gold per round to try (overrides config), e.g. BONUS=1,2,3
import { it } from "vitest";
import * as C from "../src/core/config";
import { loadData } from "../src/core/data";
import { Match, TEST_CODES } from "../src/core/match";
const d = loadData();
const N = Number(process.env.N ?? 100);
it("difficulty", () => {
  for (const mode of (process.env.MODES ?? "easy,normal,hard").split(",")) {
    let bWins = 0, rounds = 0;
    for (let seed = 1; seed <= N; seed++) {
      const m = new Match(d, TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]), seed);
      m.difficulty = mode as C.Difficulty;
      while (!m.over && m.round <= 60) { m.botTurn(m.human, "smart"); m.botTurn(); m.finishRound(m.battle(seed * 1000 + m.round).res); }
      if (m.bot.hp > 0 && m.human.hp <= 0) bWins++;
      rounds += m.round - 1;
    }
    console.log(`DIFF ${mode} (hard bonus ${C.HARD_BOT_GOLD}): computer wins ${(bWins / N * 100).toFixed(1)}% vs the smart bot, avg ${(rounds / N).toFixed(1)} rounds`);
  }
}, 3_600_000);
