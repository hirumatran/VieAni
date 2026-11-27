import { describe, expect, it } from "vitest";
import { simulate, type Placed } from "../src/core/battle";
import { loadData } from "../src/core/data";
import { DROPPABLE, ITEM_RULES, NOT_YET } from "../src/core/items";

const d = loadData();
const id = (vi: string) => d.species.find((s) => s.vi === vi)!.id;
const items = new Map((d.items as { id: number; cat: string; name: string }[]).map((i) => [i.id, i]));
/** one attacker vs one dummy, far apart enough that only the first hits matter */
const duel = (aItem?: number, bItem?: number, a = "Báo Gấm", b = "Bò Xám"): Placed[] => [
  { uid: 1, speciesId: id(a), star: 1, row: 4, col: 3, side: "A", item: aItem },
  { uid: 2, speciesId: id(b), star: 1, row: 3, col: 3, side: "B", item: bItem },
];
const firstHit = (units: Placed[], uid = 1) => {
  const e = simulate(d, units, 7).events.find((x) => x.type === "attack" && x.uid === uid);
  return e && e.type === "attack" ? e.dmg : 0;
};

describe("items in battle", () => {
  it("every item is either implemented or listed as not yet", () => {
    const all = [...items.keys()];
    expect(all.filter((i) => !DROPPABLE.includes(i) && !NOT_YET.includes(i))).toEqual([]);
    expect(DROPPABLE.length).toBe(33);
  });
  it("Gậy Tre (+10 Tấn công) and Gươm Thuận Thiên raise damage", () => {
    const plain = firstHit(duel());
    expect(firstHit(duel(1))).toBeGreaterThan(plain);
    expect(firstHit(duel(38))).toBeGreaterThan(firstHit(duel(1)));
  });
  it("Khiên Mây on the target lowers damage taken", () => {
    expect(firstHit(duel(undefined, 4))).toBeLessThan(firstHit(duel()));
  });
  it("Bánh Chưng raises max HP by 15 %", () => {
    const r0 = simulate(d, duel(), 1).start!.find((s) => s.uid === 2)!.maxHp;
    const r1 = simulate(d, duel(undefined, 7), 1).start!.find((s) => s.uid === 2)!.maxHp;
    expect(r1).toBe(Math.round(r0 * 1.15));
  });
  it("Quả Thị revives its carrier once, Nắm Xôi heals under 30 %", () => {
    const rev = simulate(d, duel(undefined, 34, "Hổ Đông Dương", "Chuột Nhắt"), 3).events;
    expect(rev.some((e) => e.type === "revive" && e.uid === 2)).toBe(true);
    const heal = simulate(d, duel(undefined, 9, "Hổ Đông Dương", "Trâu"), 3).events;
    expect(heal.some((e) => e.type === "hp" && e.uid === 2 && e.kind === "heal")).toBe(true);
  });
  it("team item Trống Đồng is doubled with Chim Lạc on the board", () => {
    const base = duel();
    const withChim: Placed[] = [...base, { uid: 3, speciesId: id("Chim Lạc"), star: 1, row: 7, col: 0, side: "A" }];
    const a = firstHit(base);
    const b = simulate(d, base, 7, { A: [25] }).events.find((x) => x.type === "attack" && x.uid === 1);
    const c = simulate(d, withChim, 7, { A: [25] }).events.find((x) => x.type === "attack" && x.uid === 1);
    expect(b && b.type === "attack" ? b.dmg : 0).toBeGreaterThan(a);
    expect(c && c.type === "attack" ? c.dmg : 0).toBeGreaterThan(b && b.type === "attack" ? b.dmg : 0);
  });
  it("ranged-only items do nothing on melee VieAni", () => {
    expect(ITEM_RULES[41].rangedOnly).toBe(true);
    expect(firstHit(duel(41))).toBe(firstHit(duel())); // Báo Gấm is melee (range 1)
  });
  it("battles with items stay deterministic", () => {
    const u = duel(15, 12);
    expect(simulate(d, u, 11)).toEqual(simulate(d, u, 11));
  });
});

describe("items that grow over time come early (PO 20 Nov 2026)", () => {
  it("Lì Xì and Hạt Dưa Mai An Tiêm are tier 1, offered from the first reward rounds", async () => {
    const { loadData } = await import("../src/core/data");
    const d = loadData();
    for (const id of [24, 35]) expect(d.items.find((i) => i.id === id)!.tier).toBe(1);
  });
});

describe("kills and Hạt Dưa Mai An Tiêm (+1 % max HP per kill, PO 20 Nov 2026)", () => {
  it("the battle credits each defeated enemy to the unit that finished it", () => {
    const units: Placed[] = [
      { uid: 1, speciesId: id("Báo Gấm"), star: 3, row: 4, col: 3, side: "A" },
      { uid: 2, speciesId: id("Bò Xám"), star: 1, row: 3, col: 3, side: "B" },
      { uid: 3, speciesId: id("Bò Xám"), star: 1, row: 3, col: 4, side: "B" },
    ];
    const res = simulate(d, units, 3, {}, { skills: true });
    expect(res.winner).toBe("A");
    expect(res.kills?.[1]).toBe(2);
    const deaths = res.events.filter((e) => e.type === "death");
    expect(deaths.every((e) => e.type === "death" && e.by === 1)).toBe(true);
  });

  it("finishRound stores kills on the unit and gives the Hạt Dưa carrier +1 % per kill, capped at +30 %", async () => {
    const { testMatch } = await import("../src/core/match");
    const m = testMatch(d, 11);
    const p = m.human;
    p.team.addToBench({ uid: 501, speciesId: d.roster[0].id, star: 1, item: 35 });
    p.team.addToBench({ uid: 502, speciesId: d.roster[1].id, star: 1 });
    m.finishRound({ winner: "B", ticks: 0, events: [], survivors: [], kills: { 501: 3, 502: 2 } });
    const u = (uid: number) => p.team.units().find((x) => x.uid === uid)!;
    expect(u(501).kills).toBe(3);
    expect(u(501).hpBonus).toBe(3); // counts even in a lost round
    expect(u(502).kills).toBe(2);
    expect(u(502).hpBonus).toBeUndefined(); // no Hạt Dưa, no bonus
    m.finishRound({ winner: "A", ticks: 0, events: [], survivors: [], kills: { 501: 40 } });
    expect(u(501).kills).toBe(43);
    expect(u(501).hpBonus).toBe(30);
    expect(ITEM_RULES[35].hpPctPerKill).toBe(1);
  });
});

describe("info card item bonuses match the battle (PO 27 Nov 2026)", () => {
  it("Gậy Tre / Bánh Chưng / Khiên Mây: the card's numbers equal the battle's", async () => {
    const { itemStatBonus } = await import("../src/core/items");
    const { maxHp } = await import("../src/core/battle");
    const sp = d.species.find((s) => s.vi === "Báo Gấm")!;
    for (const [item, star] of [[1, 1], [7, 2], [4, 3]] as [number, 1 | 2 | 3][]) {
      const units: Placed[] = [
        { uid: 1, speciesId: sp.id, star, row: 4, col: 3, side: "A", item },
        { uid: 2, speciesId: id("Bò Xám"), star: 1, row: 3, col: 3, side: "B" },
      ];
      const res = simulate(d, units, 7);
      const b = itemStatBonus(sp.range, item);
      expect(res.start!.find((s) => s.uid === 1)!.maxHp).toBe(Math.round(maxHp(sp, star) * (1 + b.hpPct)));
    }
    expect(itemStatBonus(1, 1).flatAtk).toBe(10);
    expect(itemStatBonus(1, 4).armor).toBe(10);
    // a ranged-only item gives nothing to a melee VieAni
    const rangedOnly = Object.entries(ITEM_RULES).find(([, r]) => r.rangedOnly && (r.flatAtk || r.atkSpeedPct || r.aspdPct));
    if (rangedOnly) expect(itemStatBonus(1, Number(rangedOnly[0]))).toEqual({ flatAtk: 0, armor: 0, hpPct: 0, aspdPct: 0 });
  });
});
