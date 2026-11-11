import { describe, expect, it } from "vitest";
import { loadData, typeMultiplier, validate } from "../src/core/data";

const d = loadData();

describe("game data", () => {
  it("loads all VieAni, synergies, items", () => {
    expect(d.species.length).toBe(108);
    expect(d.synergies.length).toBe(31);
    expect(d.items.length).toBe(50);
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
  it("every zodiac sign has at least one VieAni (level 12 = full Con Giáp)", () => {
    const signs = new Set(d.species.map((s) => s.zodiac).filter(Boolean));
    expect(signs.size).toBe(12);
  });
});
