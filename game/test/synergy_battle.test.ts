import { describe, expect, it } from "vitest";
import { simulate, type Placed } from "../src/core/battle";
import { loadData } from "../src/core/data";

const d = loadData();
const id = (vi: string) => d.species.find((s) => s.vi === vi)!.id;
const team = (names: string[], side: "A" | "B"): Placed[] =>
  names.map((n, i) => ({ uid: (side === "A" ? 100 : 200) + i, speciesId: id(n), star: 1, row: side === "A" ? 4 + Math.floor(i / 8) : 3 - Math.floor(i / 8), col: i % 8, side }));
const maxHpOf = (units: Placed[], uid: number, only?: string[] | null) =>
  simulate(d, units, 1, {}, { synergies: { A: only, B: [] } }).start!.find((s) => s.uid === uid)!.maxHp;

describe("tộc hệ in battle", () => {
  const giants = team(["Voi châu Á", "Bò Xám", "Trâu", "Dê"], "A");
  const enemy = team(["Chó Cỏ"], "B");
  it("Cự Thú (2) gives its members +15 % max HP, not the others", () => {
    const u = [...giants, ...enemy];
    const off = maxHpOf(u, 100, []), on = maxHpOf(u, 100, null);
    expect(on).toBe(Math.round(off * 1.15)); // Voi châu Á: Cự Thú member (Gia Súc does not include it)
  });
  it("Gia Súc (2) gives members +10 % HP", () => {
    const u = [...giants, ...enemy];
    expect(maxHpOf(u, 103, ["Gia Súc"])).toBe(Math.round(maxHpOf(u, 103, []) * 1.1)); // Dê
  });
  it("Trường Sơn hides its members at the start and lets them dodge", () => {
    const u = [...team(["Sao la", "Mang lớn", "Báo Gấm"], "A"), ...team(["Voi châu Á", "Trâu"], "B")];
    const ev = simulate(d, u, 3).events;
    expect(ev.some((e) => e.type === "status" && e.kind === "stealth")).toBe(true);
    const misses = Array.from({ length: 20 }, (_, s) => simulate(d, u, s).events.filter((e) => e.type === "attack" && e.miss).length).reduce((a, b) => a + b, 0);
    expect(misses).toBeGreaterThan(0);
  });
  it("Bầy Chó Dữ bites cause Dại; Gia Súc (4) members are immune", () => {
    const dogs = team(["Chó Cỏ", "Chó Lài", "Chó Phú Quốc", "Chó H'Mông Cộc Đuôi"], "A");
    const rabid = (b: Placed[]) => Array.from({ length: 15 }, (_, s) => simulate(d, [...dogs, ...b], s).events.filter((e) => e.type === "status" && e.kind === "rabid").length).reduce((a, x) => a + x, 0);
    expect(rabid(team(["Voi châu Á", "Sao la", "Báo Gấm", "Công"], "B"))).toBeGreaterThan(0);
    expect(rabid(team(["Trâu", "Dê", "Heo Ỉ", "Heo Móng Cái"], "B"))).toBe(0);
  });
  it("tộc hệ make a team stronger: win rate of a synergy team rises when its tộc hệ are on", () => {
    const a = team(["Chó Cỏ", "Chó Lài", "Chó Phú Quốc", "Chó H'Mông Cộc Đuôi", "Trâu", "Dê", "Heo Ỉ", "Gà Đông Tảo"], "A");
    const b = team(["Voi châu Á", "Sao la", "Báo Gấm", "Công", "Gấu chó", "Hồng hoàng", "Cá Sấu Nước Ngọt", "Đồi mồi"], "B");
    const wins = (only: string[] | null) => Array.from({ length: 40 }, (_, s) => simulate(d, [...a, ...b], s, {}, { synergies: { A: only, B: [] } }).winner === "A").filter(Boolean).length;
    const on = wins(null), off = wins([]);
    console.log("synergy test wins on/off", on, off);
    expect(on).toBeGreaterThan(off);
  });
});
