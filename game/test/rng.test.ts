import { describe, expect, it } from "vitest";
import { Rng } from "../src/core/rng";

describe("Rng", () => {
  it("is deterministic for the same seed", () => {
    const a = new Rng(42), b = new Rng(42);
    for (let i = 0; i < 100; i++) expect(a.next()).toBe(b.next());
  });
  it("weighted() follows the weights", () => {
    const r = new Rng(1);
    const n = [0, 0, 0];
    for (let i = 0; i < 10000; i++) n[r.weighted([70, 30, 0])]++;
    expect(n[2]).toBe(0);
    expect(n[0] / 10000).toBeGreaterThan(0.67);
    expect(n[0] / 10000).toBeLessThan(0.73);
  });
});
