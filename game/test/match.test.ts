import { describe, expect, it } from "vitest";
import * as C from "../src/core/config";
import { loadData } from "../src/core/data";
import { Match, TEST_HP, testMatch } from "../src/core/match";

const d = loadData();
const ids = () => [1, 2, 3, 4].map((n) => d.roster[n - 1].id);

/** give the human a shop full of one species */
const rig = (m: Match, id: number) => { m.human.shop = [id, id, id, id, id]; };

describe("Test match (V001–V004)", () => {
  it("only offers V001–V004 and draws them out of the shared pool", () => {
    const m = testMatch(d, 1);
    expect(m.species.map((s) => s.vi)).toEqual(["Báo Gấm", "Bò Biển (Cá Nàng Tiên)", "Bò Xám", "Cá Nược (Cá Heo Sông)"]);
    for (const p of m.players) for (const id of p.shop) expect(ids()).toContain(id);
    const inShops = m.players.flatMap((p) => p.shop).length;
    const left = [...m.pool.values()].reduce((a, b) => a + b, 0);
    expect(left + inShops).toBe(12 + 12 + 10 + 12); // T3 = 12 copies, Bò Xám T4 = 10
    expect(m.human.hp).toBe(TEST_HP);
    expect(m.human.gold).toBe(C.START_GOLD);
  });

  it("buys for the tier cost and merges 3 copies into ★2 (board copy kept)", () => {
    const m = testMatch(d, 2);
    const p = m.human;
    const id = ids()[0];
    p.gold = 50;
    rig(m, id);
    expect(m.buy(p, 0)).toEqual([]);
    expect(p.gold).toBe(47);
    const first = p.team.units()[0];
    p.team.maxOnBoard = 1;
    p.team.move(first.uid, { where: "board", row: 6, col: 3 });
    m.buy(p, 1);
    expect(m.buy(p, 2)).toEqual([first.uid]);
    expect(p.team.units()).toHaveLength(1);
    expect(p.team.at({ where: "board", row: 6, col: 3 })?.star).toBe(2);
    // selling a ★2 refunds 3 copies
    expect(m.sell(p, first.uid)).toBe(3 * 3);
  });

  it("makes ★3 from nine copies", () => {
    const m = testMatch(d, 3);
    const p = m.human;
    p.gold = 100;
    const id = ids()[1];
    for (let i = 0; i < 9; i++) { rig(m, id); m.buy(p, 0); }
    expect(p.team.units().map((u) => u.star)).toEqual([3]);
  });

  it("can buy into a full bench only when it completes a ★2", () => {
    const m = testMatch(d, 4);
    const p = m.human;
    p.gold = 100;
    const [a, b, c, e] = ids();
    // bench: a a b c e b c e (no triple, so nothing merges)
    [a, a, b, c, e, b, c, e].forEach((speciesId, i) => p.team.addToBench({ uid: 900 + i, speciesId, star: 1 }));
    expect(p.team.bench.includes(null)).toBe(false);
    p.team.bench[7] = null; p.team.bench[6] = null; p.team.bench[5] = null;
    p.team.addToBench({ uid: 990, speciesId: c, star: 2 });
    p.team.addToBench({ uid: 991, speciesId: e, star: 2 });
    p.team.addToBench({ uid: 992, speciesId: b, star: 2 });
    rig(m, c);
    expect(m.canBuy(p, 0)).toBe(false); // only one ★1 c
    rig(m, a);
    expect(m.canBuy(p, 0)).toBe(true); // pair of a → ★2 straight away
    expect(m.buy(p, 0)).toEqual([900]);
    expect(p.team.units().filter((u) => u.speciesId === a).map((u) => u.star)).toEqual([2]);
  });

  it("levels up with XP (board limit = level)", () => {
    const m = testMatch(d, 5);
    const p = m.human;
    p.gold = 8;
    expect(m.buyXp(p)).toBe(true); // 4 XP: 1 → 2 (1) → 3 (2), 1 left
    expect(p.level).toBe(3);
    expect(p.xp).toBe(1);
    expect(p.team.maxOnBoard).toBe(3);
  });

  it("plays whole rounds against the bot until someone is out", () => {
    const m = testMatch(d, 6);
    let reports = 0;
    while (!m.over && m.round < 60) {
      const p = m.human;
      for (let s = 0; s < 5; s++) m.buy(p, s);
      m.autoFill(p);
      m.botTurn();
      expect(m.bot.team.boardCount).toBeLessThanOrEqual(m.bot.level);
      const { res } = m.battle(1000 + m.round);
      const goldBefore = p.gold;
      const r = m.finishRound(res);
      reports++;
      expect(r.income.base).toBe(7);
      expect(r.income.result).toBe(r.winner === "A" ? 3 : 1);
      expect(r.income.interest).toBe(Math.min(5, Math.floor(goldBefore / 10)));
      expect(p.gold - goldBefore).toBe(r.income.base + r.income.interest + r.income.streak + r.income.result);
      for (const q of m.players) for (const u of q.team.units()) expect(ids()).toContain(u.speciesId);
      const pool = [...m.pool.values()];
      expect(pool.every((n) => n >= 0)).toBe(true);
    }
    expect(m.over).toBe(true);
    expect(reports).toBeGreaterThan(3);
  });
});
