import { describe, expect, it } from "vitest";
import * as C from "../src/core/config";

describe("rules config", () => {
  it("shop odds: 10 levels, each row sums to 100", () => {
    expect(C.SHOP_ODDS.length).toBe(C.MAX_LEVEL);
    for (const row of C.SHOP_ODDS) expect(row.reduce((a, b) => a + b, 0)).toBe(100);
  });
  it("XP table covers levels 1→10", () => {
    expect(C.XP_TO_NEXT.length).toBe(C.MAX_LEVEL - 1);
  });
  it("PO decisions: 15 s prep, 5 start gold, interest max 3, max level 10, +2 XP per round", () => {
    expect([C.PREP_SECONDS, C.START_GOLD, C.INTEREST_MAX, C.MAX_LEVEL, C.XP_PER_ROUND]).toEqual([15, 5, 3, 10, 2]);
  });
  it("Linh Vật windows: Bắc ≤10, Trung 11–20, Nam 21–30, each containing a PvE round", () => {
    for (const [lo, hi] of Object.values(C.CHARM_ROUND_WINDOWS)) {
      expect(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i).some(C.isPveRound)).toBe(true);
    }
  });
  it("PvE rounds are 1–3 then every 6 from 9", () => {
    const pve = Array.from({ length: 40 }, (_, i) => i + 1).filter(C.isPveRound);
    expect(pve).toEqual([1, 2, 3, 9, 15, 21, 27, 33, 39]);
  });
  it("stage damage and item tier by round", () => {
    expect([1, 11, 21, 31].map(C.stageDamage)).toEqual([1, 3, 5, 8]);
    expect([1, 9, 15, 21, 27].map(C.itemTierForRound)).toEqual([1, 2, 3, 4, 5]);
  });
});
