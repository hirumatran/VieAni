import { describe, expect, it } from "vitest";
import { loadData } from "../src/core/data";
import { activeSynergies, synergyStates } from "../src/core/synergy";

const d = loadData();
const id = (vi: string) => d.species.find((s) => s.vi === vi)!.id;

describe("tộc hệ on the board", () => {
  it("forms Bầy Chó Dữ with 2 different dogs, not with 2 copies of one", () => {
    expect(activeSynergies(d, [id("Chó Cỏ"), id("Chó Cỏ")]).map((s) => s.syn.name)).not.toContain("Bầy Chó Dữ");
    const s = activeSynergies(d, [id("Chó Cỏ"), id("Chó Lài")]).find((x) => x.syn.name === "Bầy Chó Dữ")!;
    expect([s.count, s.level, s.thresholds]).toEqual([2, 0, [2, 4]]);
  });
  it("counts different zodiac signs for Mười Hai Con Giáp", () => {
    const zod = d.roster.filter((s) => s.zodiac);
    const signs = [...new Set(zod.map((s) => s.zodiac))];
    const pick = signs.slice(0, 3).map((z) => zod.find((s) => s.zodiac === z)!.id);
    const s = synergyStates(d, pick).find((x) => x.syn.byZodiac)!;
    expect(s.count).toBe(3);
    expect(s.level).toBe(0); // threshold 3
  });
  it("every synergy has an icon", async () => {
    const idx = (await import("../../assets/icons/synergies/index.json")).default as Record<string, { icon: string }>;
    for (const g of d.synergies) expect(idx[g.name]?.icon).toBeTruthy();
  });
});
