import { describe, expect, it } from "vitest";
import * as C from "../src/core/config";
import { loadData } from "../src/core/data";
import { Match, TEST_CODES } from "../src/core/match";
import { playerDamage } from "../src/core/battle";
import { PERSONAS } from "../src/core/botAI";

const d = loadData();
const species = () => TEST_CODES.map((c) => d.roster[Number(c.slice(1)) - 1]);
const copies = (star: number) => 3 ** (star - 1);

// whole 8-player matches take a few seconds
describe("8-player match (PO 27 Nov 2026)", { timeout: 60_000 }, () => {
  it("every player still in fights exactly once a round; odd numbers get one ghost fight; the human is always side A", () => {
    const m = new Match(d, species(), 3, undefined, 8);
    expect(m.players).toHaveLength(8);
    expect(m.players[0].name).toBe("Bạn");
    expect(new Set(m.players.slice(1).map((p) => p.name))).toEqual(new Set(PERSONAS.map((x) => x.name))); // 7 different personalities
    for (let r = 0; r < 60 && m.aliveIdx().length > 1; r++) {
      const alive = m.aliveIdx();
      const fighters = m.pairings.flatMap((x) => (x.ghost ? [x.a] : [x.a, x.b])).sort((a, b) => a - b);
      expect(fighters).toEqual(alive);
      expect(m.pairings.filter((x) => x.ghost)).toHaveLength(alive.length % 2);
      for (const x of m.pairings) if (x.b === 0) expect(x.ghost).toBe(true);
      for (const i of alive) m.botTurn(m.players[i]);
      m.finishRound(m.humanPairing() ? m.battle(500 + r).res : undefined, 900 + r);
    }
  });

  it("plays to one winner with unique places 1–8; knocked-out VieAni go back to the shared pool", () => {
    const m = new Match(d, species(), 11, undefined, 8);
    const total = new Map([...m.pool].map(([id, n]) => [id, n]));
    // pool is the only store at the start except for the opening shops
    for (const p of m.players) for (const id of p.shop) if (id != null) total.set(id, total.get(id)! + 1);
    while (m.aliveIdx().length > 1 && m.round <= 80) {
      for (const i of m.aliveIdx()) m.botTurn(m.players[i]);
      m.finishRound(m.humanPairing() ? m.battle(m.round).res : undefined, m.round * 3);
      // copies are conserved: pool + shops + owned (★2 = 3 copies, ★3 = 9)
      const seen = new Map([...m.pool]);
      for (const p of m.players) {
        for (const id of p.shop) if (id != null) seen.set(id, seen.get(id)! + 1);
        for (const u of p.team.units()) seen.set(u.speciesId, seen.get(u.speciesId)! + copies(u.star));
      }
      for (const [id, n] of total) expect(seen.get(id)).toBe(n);
      for (const p of m.players) if (p.hp <= 0) expect(p.team.units()).toHaveLength(0);
    }
    expect(m.aliveIdx()).toHaveLength(1);
    expect(m.players.map((p) => p.place).sort((a, b) => a! - b!)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("a ghost board takes no damage; HP changes come only from each player's own fight; Khó pays every computer player", () => {
    const m = new Match(d, species(), 5, undefined, 3); // 3 players → one ghost fight every round
    m.difficulty = "hard";
    for (let r = 0; r < 12; r++) for (const i of m.aliveIdx()) m.botTurn(m.players[i]);
    for (const p of m.players) p.gold = 0;
    const seed = 77;
    const expectHp = m.players.map((p) => p.hp);
    for (const pr of m.pairings) {
      const res = pr.a === 0 ? m.battle(1).res : m.fight(pr.a, pr.b, seed + pr.a * 101 + pr.b).res;
      const dmg = playerDamage(res, m.round);
      expectHp[pr.a] = Math.max(0, expectHp[pr.a] - dmg.A);
      if (!pr.ghost) expectHp[pr.b] = Math.max(0, expectHp[pr.b] - dmg.B);
    }
    expect(m.pairings.filter((x) => x.ghost)).toHaveLength(1);
    m.finishRound(m.battle(1).res, seed);
    expect(m.players.map((p) => p.hp)).toEqual(expectHp);
    for (let i = 1; i < 3; i++) if (m.players[i].hp > 0) expect(m.players[i].gold).toBeGreaterThanOrEqual(C.BASE_INCOME + C.LOSS_BONUS + C.HARD_BOT_GOLD);
  });
});
