import { describe, expect, it } from "vitest";
import { attackInterval, maxHp, mirror, playerDamage, simulate, type Placed } from "../src/core/battle";
import { loadData, type GameData, type Species } from "../src/core/data";

const d = loadData();
const id = (vi: string) => d.species.find((s) => s.vi === vi)!.id;

/** copy of the data with extra test-only species */
function withSpecies(extra: Species[]): GameData {
  const species = [...d.species, ...extra];
  return { ...d, species, byId: new Map(species.map((s) => [s.id, s])) };
}
const base = (over: Partial<Species>): Species => ({
  id: 9000, dex: 999, vi: "test", en: "test", group: "Common", tier: 1, types: ["Fire"],
  stats: { hp: 80, atk: 80, def: 80, spa: 80, spd: 80, spe: 80 }, attackType: "Fire", attackClass: "physical",
  range: 1, skill: "", ...over,
});
const P = (uid: number, speciesId: number, side: "A" | "B", row: number, col: number, star: 1 | 2 | 3 = 1): Placed => ({ uid, speciesId, star, side, row, col });

describe("battle stats", () => {
  it("HP and attack interval follow the GDD formulas", () => {
    const s = base({ stats: { hp: 100, atk: 1, def: 1, spa: 1, spd: 1, spe: 150 } });
    expect(maxHp(s, 1)).toBe(1200);
    expect(maxHp(s, 2)).toBe(2160);
    expect(attackInterval(s)).toBeCloseTo(1.0);
    expect(attackInterval({ ...s, stats: { ...s.stats, spe: 20 } })).toBeCloseTo(2.5); // clamped
  });
});

describe("simulate", () => {
  const teams: Placed[] = [
    P(1, id("Hổ Đông Dương"), "A", 7, 2), P(2, id("Voi châu Á"), "A", 6, 4), P(3, id("Chó Phú Quốc"), "A", 5, 5),
    P(11, id("Gấu chó"), "B", 0, 3), P(12, id("Trâu"), "B", 1, 4), P(13, id("Rắn Hổ Mang"), "B", 2, 1),
  ];

  it("is deterministic: same teams + seed => identical events", () => {
    expect(simulate(d, teams, 42)).toEqual(simulate(d, teams, 42));
  });

  it("ends with a winner or a draw within 45 s", () => {
    const r = simulate(d, teams, 7);
    expect(["A", "B", "draw"]).toContain(r.winner);
    expect(r.ticks).toBeLessThanOrEqual(450);
    expect(r.events.some((e) => e.type === "attack")).toBe(true);
    expect(r.events.some((e) => e.type === "move")).toBe(true);
  });

  it("a ★3 legend beats a lone ★1 mouse", () => {
    const r = simulate(d, [P(1, id("Rồng Lạc Việt"), "A", 7, 3, 3), P(2, id("Chuột Nhắt"), "B", 0, 3)], 1);
    expect(r.winner).toBe("A");
  });

  it("type advantage decides a mirror match (Water beats Fire)", () => {
    const dd = withSpecies([base({ id: 9001, types: ["Water"], attackType: "Water" }), base({ id: 9002, types: ["Fire"], attackType: "Fire" })]);
    let water = 0;
    for (let seed = 1; seed <= 20; seed++) if (simulate(dd, [P(1, 9001, "A", 7, 3), P(2, 9002, "B", 0, 3)], seed).winner === "A") water++;
    expect(water).toBe(20);
  });

  it("times out as a draw when nobody can finish", () => {
    const tank = base({ id: 9003, stats: { hp: 100000, atk: 10, def: 200, spa: 10, spd: 200, spe: 20 } });
    const dd = withSpecies([tank]);
    const r = simulate(dd, [P(1, 9003, "A", 7, 3), P(2, 9003, "B", 0, 3)], 3);
    expect(r.winner).toBe("draw");
    expect(r.ticks).toBe(450);
  });

  it("Thiên địch: the tiger goes for its prey (Mang lớn) over a closer target", () => {
    const tiger = P(1, id("Hổ Đông Dương"), "A", 4, 3);
    const near = P(11, id("Trâu"), "B", 3, 3); // adjacent
    const prey = P(12, id("Mang lớn"), "B", 2, 6); // 3 cells away
    const r = simulate(d, [tiger, near, prey], 5);
    const first = r.events.find((e) => e.type === "attack" && e.uid === 1) as { target: number } | undefined;
    expect(first?.target).toBe(12);
  });

  it("Thạch Sùng hits insects at unlimited range", () => {
    const gecko = P(1, id("Thạch Sùng"), "A", 7, 0);
    const insect = d.species.find((s) => s.types.includes("Insect"))!;
    const r = simulate(d, [gecko, P(11, insect.id, "B", 0, 7)], 2);
    expect(r.events.filter((e) => e.uid === 1 && e.type === "move")).toHaveLength(0);
    expect(r.events.some((e) => e.type === "attack" && e.uid === 1)).toBe(true);
  });
});

describe("player damage and mirroring", () => {
  it("loser takes stage damage + tiers of surviving enemy units", () => {
    const res = { winner: "B" as const, ticks: 0, events: [], survivors: [{ uid: 1, side: "B" as const, hp: 1, tier: 3 }, { uid: 2, side: "B" as const, hp: 1, tier: 1 }] };
    expect(playerDamage(res, 14)).toEqual({ A: 3 + 3 + 1, B: 0 });
  });
  it("mirrors the opponent's half by rotating 180°", () => {
    expect(mirror(7, 0)).toEqual([0, 7]);
    expect(mirror(4, 3)).toEqual([3, 4]);
  });
});
