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
