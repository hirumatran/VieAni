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
    expect([C.PREP_SECONDS, C.START_GOLD, C.INTEREST_MAX, C.MAX_LEVEL, C.XP_PER_ROUND]).toEqual([15, 5, 5, 10, 2]);
    expect([C.BASE_INCOME, C.WIN_BONUS, C.LOSS_BONUS]).toEqual([7, 3, 1]);
  });
  it("PO 17 Nov 2026: no PvE; item rewards at rounds 1, 4, 8 … 36; every Linh Vật window has reward rounds", () => {
    expect(C.ITEM_ROUNDS).toEqual([1, 4, 8, 12, 16, 20, 24, 28, 32, 36]);
    const inWindow = Object.values(C.CHARM_ROUND_WINDOWS).map(([lo, hi]) => C.ITEM_ROUNDS.filter((r) => r >= lo && r <= hi));
    expect(inWindow).toEqual([[1, 4, 8], [12, 16, 20], [24, 28]]);
  });
  it("stage damage and item tier by round", () => {
    expect([1, 4, 8, 12, 16, 20, 24, 28, 32, 36].map(C.itemTierForRound)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
});
