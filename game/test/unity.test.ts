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

  it("adds 3 zodiac signs only with level 9+ and Rồng Lạc Việt on the board and all 3 charms (PO 27 Nov 2026)", () => {
    const m = testMatch(d, 22);
    const p = m.human;
    p.level = 9; p.team.maxOnBoard = 9;
    const signs = [...new Set(d.roster.filter((s) => s.zodiac && s.id !== RONG_LAC_VIET).map((s) => s.zodiac))].slice(0, 8);
    const units = [RONG_LAC_VIET, ...signs.map((z) => d.roster.find((s) => s.zodiac === z && s.id !== RONG_LAC_VIET)!.id)];
    units.forEach((speciesId, i) => p.team.place({ uid: 500 + i, speciesId, star: 1 }, { where: "board", row: 4 + Math.floor(i / 8), col: i % 8 }));
    expect(m.zodiacCount(p)).toBe(9);
    p.charms = [51, 52];
    expect(m.unityActive(p)).toBe(false);
    p.charms = [51, 52, 53];
    expect(m.unityActive(p)).toBe(true);
    expect(m.zodiacCount(p)).toBe(12);
    p.level = 8;
    expect(m.zodiacCount(p)).toBe(9);
  });

  // 27 Nov 2026: against the smart bots (8 players) the zodiac strategy almost never gets there (0–3 %, tools/unityRate.ts);
  // this test checks that the rules can be completed, so it plays on Dễ (simple bots: 7 of 20 seeds succeed) with seed 4
  it("a computer player with the zodiac strategy reaches Ấn Thống Nhất + 12 signs in an 8-player match (Dễ, seed 4)", () => {
    const seed = 4;
    const m = testMatch(d, seed, 8);
    m.difficulty = "easy";
    while (m.human.hp > 0 && m.aliveIdx().length > 1 && m.round <= 45 && m.human.unityRound == null) {
      m.zodiacTurn(m.human);
      m.botTurns();
      m.finishRound(m.battle(seed * 1000 + m.round).res);
    }
    expect(m.human.unityRound).not.toBeNull();
  }, 60000);
});
