import { describe, expect, it } from "vitest";
import { simulate, type Placed } from "../src/core/battle";
import { loadData } from "../src/core/data";
import { SKILL_SPECS } from "../src/core/skillSpecs";

const d = loadData();
const id = (vi: string) => d.roster.find((s) => s.vi === vi)!.id;
const duel = (a: string, b: string, star: 1 | 2 | 3 = 2, extraA: string[] = []): Placed[] => [
  { uid: 1, speciesId: id(a), star, row: 4, col: 3, side: "A" },
  ...extraA.map((n, i) => ({ uid: 10 + i, speciesId: id(n), star, row: 5, col: 2 + i, side: "A" as const })),
  { uid: 2, speciesId: id(b), star, row: 3, col: 3, side: "B" },
];

describe("skill engine (T11/T12, SimOptions.skills)", () => {
  it("every VieAni in the roster has a skill spec", () => {
    for (const s of d.roster) expect(SKILL_SPECS.has(s.id), s.vi).toBe(true);
  });
  it("is deterministic", () => {
    const u = duel("Hổ Đông Dương", "Bò Xám");
    expect(simulate(d, u, 5, {}, { skills: true })).toEqual(simulate(d, u, 5, {}, { skills: true }));
  });
  it("a stun really stops the target", () => {
    const r = simulate(d, duel("Bò Xám", "Hổ Đông Dương"), 1, {}, { skills: true });
    const stun = r.events.find((e) => e.type === "status" && e.kind === "stun" && e.uid === 2)!;
    expect(stun).toBeTruthy();
    const acted = r.events.some((e) => (e.type === "attack" || e.type === "cast") && e.uid === 2 && e.t > stun.t && e.t < stun.t + (stun as { ticks: number }).ticks);
    expect(acted).toBe(false);
  });
  it("Heo Móng Cái calls a piglet and Phượng Hoàng is reborn from its egg", () => {
    const r1 = simulate(d, duel("Heo Móng Cái", "Voi chín ngà", 1), 2, {}, { skills: true });
    expect(r1.events.some((e) => e.type === "spawn")).toBe(true);
    const r2 = simulate(d, duel("Phượng Hoàng", "Voi chín ngà", 1, []), 3, {}, { skills: true });
    const died = r2.events.findIndex((e) => e.type === "death" && e.uid === 1);
    expect(died).toBeGreaterThan(-1);
    expect(r2.events.some((e) => e.type === "spawn")).toBe(true);
  });
  it("healers heal and shields appear", () => {
    const u = duel("Voi châu Á", "Hổ Đông Dương", 2, ["Cá Ông", "Cầy vằn bắc"]);
    u[u.length - 1].star = 3; // a ★3 tiger lasts long enough for both healers to cast
    const r = simulate(d, u, 4, {}, { skills: true });
    expect(r.events.some((e) => e.type === "hp" && e.kind === "heal")).toBe(true);
    expect(r.events.some((e) => e.type === "status" && e.kind === "shield")).toBe(true);
  });
});
