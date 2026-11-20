import { describe, expect, it } from "vitest";
import * as C from "../src/core/config";
import { loadData } from "../src/core/data";
import { Match, TEST_CODES } from "../src/core/match";

const d = loadData();
const newMatch = (seed: number) => new Match(d, TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]), seed);

describe("smarter bot (PO 20 Nov 2026)", () => {
  it("plays whole matches within the rules (board ≤ level, bench ≤ 8, gold ≥ 0)", () => {
    for (const seed of [1, 2]) {
      const m = newMatch(seed);
      while (!m.over && m.round <= 60) {
        m.botTurn(m.human); m.botTurn();
        for (const p of m.players) {
          expect(p.team.boardCount).toBeLessThanOrEqual(p.level);
          expect(p.team.bench.length).toBeLessThanOrEqual(C.BENCH_SLOTS);
          expect(p.gold).toBeGreaterThanOrEqual(0);
          expect(p.team.bench.every((u) => u == null || u.item == null)).toBe(true); // no item idles on the bench
        }
        m.finishRound(m.battle(seed * 1000 + m.round).res);
      }
      expect(m.over).toBe(true);
    }
  });

  it("beats the old simple bot most of the time", () => {
    let wins = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const m = newMatch(seed);
      while (!m.over && m.round <= 60) { m.botTurn(m.human, "smart"); m.botTurn(m.bot, "easy"); m.finishRound(m.battle(seed * 1000 + m.round).res); }
      if (m.bot.hp <= 0 && m.human.hp > 0) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(4);
  });
});

describe("difficulty (main menu, PO 20 Nov 2026)", () => {
  it("Khó gives the computer HARD_BOT_GOLD extra each round; Dễ and Thường do not", () => {
    const gold = (diff: C.Difficulty) => {
      const m = newMatch(5);
      m.difficulty = diff;
      m.human.gold = m.bot.gold = 0;
      m.finishRound({ winner: "draw", ticks: 0, events: [], survivors: [] });
      return [m.human.gold, m.bot.gold];
    };
    expect(gold("normal")[1]).toBe(gold("normal")[0]);
    expect(gold("easy")[1]).toBe(gold("easy")[0]);
    expect(gold("hard")[1]).toBe(gold("hard")[0] + C.HARD_BOT_GOLD);
  });

  it("Dễ uses the old simple bot for the computer only", () => {
    const a = newMatch(9), b = newMatch(9);
    a.difficulty = "easy";
    a.botTurn(); b.botTurn(b.bot, "easy");
    expect(a.bot.team.units().map((u) => u.speciesId)).toEqual(b.bot.team.units().map((u) => u.speciesId));
  });
});
