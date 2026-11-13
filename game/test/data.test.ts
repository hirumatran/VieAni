import { describe, expect, it } from "vitest";
import { loadData, typeMultiplier, validate } from "../src/core/data";

const d = loadData();

describe("game data", () => {
  it("loads the v2 roster (PO review 13 Nov): 87 playable, 12 synergies, 53 items", () => {
    expect(d.species.length).toBe(108);
    expect(d.roster.length).toBe(87);
    expect(d.synergies.length).toBe(12);
    expect(d.items.length).toBe(53);
    expect(d.items.filter((i) => i.cat === "LV").map((i) => i.name)).toEqual(["Linh Vật Bắc Bộ", "Linh Vật Trung Bộ", "Linh Vật Nam Bộ"]);
  });
  it("every roster VieAni has a role, 3 skills and at most 2 synergies (checked by validate)", () => {
    expect(d.roster.every((s) => s.role && s.skills)).toBe(true);
  });
  it("passes validation", () => {
    expect(validate(d)).toEqual([]);
  });
  it("applies type chart and Legendary rule", () => {
    expect(typeMultiplier(d, "Water", ["Water"], ["Fire"])).toBe(2);
    expect(typeMultiplier(d, "Fire", ["Fire"], ["Water"])).toBe(0.5);
    expect(typeMultiplier(d, "Fire", ["Legendary", "Fire"], ["Grass"])).toBeCloseTo(2.5);
    expect(typeMultiplier(d, "Fire", ["Legendary"], ["Legendary"])).toBeCloseTo(0.9375);
  });
});

import backgrounds from "../../data/backgrounds.json";
describe("backgrounds", () => {
  it("has 8 battle backgrounds linked to existing VieAni", () => {
    expect(backgrounds.backgrounds.length).toBe(8);
    for (const b of backgrounds.backgrounds) for (const id of b.vieani) expect(d.byId.has(id)).toBe(true);
  });
  it("every zodiac sign has at least one playable VieAni (full Con Giáp via Ấn Thống Nhất)", () => {
    const signs = new Set(d.roster.map((s) => s.zodiac).filter(Boolean));
    expect(signs.size).toBe(12);
  });
});
