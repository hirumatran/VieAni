import { describe, expect, it } from "vitest";
import * as C from "../src/core/config";
import { loadData } from "../src/core/data";
import { RONG_LAC_VIET, testMatch } from "../src/core/match";

const d = loadData();

describe("Linh Vật + Ấn Thống Nhất", () => {
  it("offers each charm only in its window, at most once", () => {
    const m = testMatch(d, 21);
    const p = m.human;
    expect(p.itemOffer).toContain(51); // round 1 = Bắc Bộ window
    m.chooseItem(p, p.itemOffer!.indexOf(51));
    expect(p.charms).toEqual([51]);
    m.round = 4; m.rollItems(p);
    expect(p.itemOffer).not.toContain(51); // already owned
    m.round = 12; m.rollItems(p);
    expect(p.itemOffer).toContain(52);
    m.round = 32; m.rollItems(p);
    expect(p.itemOffer!.some((id) => m.isCharm(id))).toBe(false); // after the last window
  });

  it("adds 2 zodiac signs only with level 10 + Rồng Lạc Việt on the board + 3 charms", () => {
    const m = testMatch(d, 22);
    const p = m.human;
    p.level = C.MAX_LEVEL; p.team.maxOnBoard = C.MAX_LEVEL;
    const signs = [...new Set(d.roster.filter((s) => s.zodiac && s.id !== RONG_LAC_VIET).map((s) => s.zodiac))].slice(0, 9);
    const units = [RONG_LAC_VIET, ...signs.map((z) => d.roster.find((s) => s.zodiac === z && s.id !== RONG_LAC_VIET)!.id)];
    units.forEach((speciesId, i) => p.team.place({ uid: 500 + i, speciesId, star: 1 }, { where: "board", row: 4 + Math.floor(i / 8), col: i % 8 }));
    expect(m.zodiacCount(p)).toBe(10);
    p.charms = [51, 52];
    expect(m.unityActive(p)).toBe(false);
    p.charms = [51, 52, 53];
    expect(m.unityActive(p)).toBe(true);
    expect(m.zodiacCount(p)).toBe(12);
    p.level = 9;
    expect(m.zodiacCount(p)).toBe(10);
  });

  // 27 Nov 2026: against the smart bots (8 players) the zodiac strategy reaches it in ~3 % of matches (2 of 60: seeds 7 and 32,
  // both round 29) – a fixed seed keeps this test fast; the rate is measured by the balance tools, not here
  it("a computer player with the zodiac strategy reaches Ấn Thống Nhất + 12 signs in an 8-player match (seed 7)", () => {
    const seed = 7;
    const m = testMatch(d, seed, 8);
    while (m.human.hp > 0 && m.aliveIdx().length > 1 && m.round <= 45 && m.human.unityRound == null) {
      m.zodiacTurn(m.human);
      m.botTurns();
      m.finishRound(m.battle(seed * 1000 + m.round).res);
    }
    expect(m.human.unityRound).not.toBeNull();
  }, 60000);
});
