import { describe, expect, it } from "vitest";
import { loadData } from "../src/core/data";
import { testMatch, type PlayerState } from "../src/core/match";

const d = loadData();
/** a player never keeps 3 copies of the same VieAni at the same ★ (they must have merged) */
function triples(p: PlayerState): string[] {
  const n = new Map<string, number>();
  for (const u of p.team.units()) { const k = `${u.speciesId}★${u.star}`; n.set(k, (n.get(k) ?? 0) + 1); }
  return [...n].filter(([k, c]) => c >= 3 && !k.endsWith("★3")).map(([k, c]) => `${k}×${c}`);
}

describe("merge invariant over many simulated matches", () => {
  it("no unmerged triples for the human or the bot", () => {
    const bad: string[] = [];
    for (let seed = 1; seed <= 200; seed++) {
      const m = testMatch(d, seed);
      while (!m.over && m.round < 40) {
        const h = m.human;
        for (let s = 0; s < 5; s++) m.buy(h, s);
        if (h.gold > 20) m.buyXp(h);
        m.autoFill(h);
        m.botTurn();
        for (const [who, p] of [["human", m.human], ["bot", m.bot]] as const) {
          const t = triples(p);
          if (t.length) bad.push(`seed ${seed} round ${m.round} ${who}: ${t.join(", ")}`);
        }
        m.finishRound(m.battle(seed * 100 + m.round).res);
      }
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });
});
