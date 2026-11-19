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
  stats: { hp: 600, atk: 50, aspd: 0.7, armor: 10, energy: 80 }, attackType: "Fire", attackClass: "physical",
  range: 1, skill: "", ...over,
});
const P = (uid: number, speciesId: number, side: "A" | "B", row: number, col: number, star: 1 | 2 | 3 = 1): Placed => ({ uid, speciesId, star, side, row, col });

describe("battle stats", () => {
  it("v3: Máu × ★ multiplier, attack interval = 1 / Tốc Độ Đánh (clamped 0.4–3 s)", () => {
    const s = base({ stats: { hp: 1000, atk: 50, aspd: 1, armor: 0, energy: 80 } });
    expect(maxHp(s, 1)).toBe(1000);
    expect(maxHp(s, 2)).toBe(1800);
    expect(attackInterval(s)).toBeCloseTo(1.0);
    expect(attackInterval({ ...s, stats: { ...s.stats, aspd: 0.2 } })).toBeCloseTo(3); // clamped
    expect(attackInterval(s, 0.25)).toBeCloseTo(0.8); // +25 % Tốc Độ Đánh
  });
  it("v3: Giáp = % less damage (Giáp 50 halves the hit)", () => {
    const a = base({ id: 9010, stats: { hp: 99999, atk: 100, aspd: 1, armor: 0, energy: 999 } });
    const t0 = base({ id: 9011, stats: { hp: 99999, atk: 1, aspd: 0.2, armor: 0, energy: 999 } });
    const t50 = base({ id: 9012, stats: { hp: 99999, atk: 1, aspd: 0.2, armor: 50, energy: 999 } });
    const dd = withSpecies([a, t0, t50]);
    const hit = (target: number) => (simulate(dd, [P(1, 9010, "A", 4, 3), P(2, target, "B", 3, 3)], 9).events.find((e) => e.type === "attack" && e.uid === 1) as { dmg: number }).dmg;
    expect(hit(9012) / hit(9011)).toBeCloseTo(0.5, 1);
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

  it("v3: no type advantage – the old Water/Fire pair wins only by side, never by type", () => {
    const dd = withSpecies([base({ id: 9001, types: ["Water"], attackType: "Water" }), base({ id: 9002, types: ["Fire"], attackType: "Fire" })]);
    const w1 = simulate(dd, [P(1, 9001, "A", 7, 3), P(2, 9002, "B", 0, 3)], 5).winner;
    const w2 = simulate(dd, [P(1, 9002, "A", 7, 3), P(2, 9001, "B", 0, 3)], 5).winner;
    expect(w1).toBe(w2); // same side wins whichever type it has
  });
  it("times out as a draw when nobody can finish", () => {
    const tank = base({ id: 9003, stats: { hp: 100000, atk: 10, aspd: 0.3, armor: 60, energy: 999 } });
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
    const insect = d.byId.get(d.synergies.find((g) => g.name === "Côn Trùng")!.members[0])!; // v3: insects = Côn Trùng members
    const r = simulate(d, [gecko, P(11, insect.id, "B", 0, 7)], 2);
    expect(r.events.filter((e) => e.uid === 1 && e.type === "move")).toHaveLength(0);
    expect(r.events.some((e) => e.type === "attack" && e.uid === 1)).toBe(true);
  });
});

describe("player damage and mirroring", () => {
  it("PO 19 Nov: loser takes Σ (tier + ★ − 1) of the winner's survivors ÷ 2 (rounded up) – PO example 20 → 10 HP", () => {
    const sv = (tier: number, star: number) => ({ uid: tier * 10 + star, side: "B" as const, hp: 1, tier, star });
    const res = { winner: "B" as const, ticks: 0, events: [], survivors: [sv(4, 2), sv(3, 3), sv(5, 1), sv(5, 1)] };
    expect(playerDamage(res)).toEqual({ A: 10, B: 0 });
    expect(playerDamage({ ...res, survivors: [sv(3, 1)] })).toEqual({ A: 2, B: 0 }); // 3 ÷ 2 → 2
    expect(playerDamage({ ...res, survivors: [] })).toEqual({ A: 0, B: 0 });
  });
  it("mirrors the opponent's half by rotating 180°", () => {
    expect(mirror(7, 0)).toEqual([0, 7]);
    expect(mirror(4, 3)).toEqual([3, 4]);
  });
});
