import { describe, expect, it } from "vitest";
import { Team } from "../src/core/team";

const team = () => {
  const t = new Team(2);
  for (let i = 1; i <= 4; i++) t.addToBench({ uid: i, speciesId: i, star: 1 });
  return t;
};

describe("Team placement", () => {
  it("moves a unit from bench to own half", () => {
    const t = team();
    expect(t.move(1, { where: "board", row: 6, col: 3 })).toBe(true);
    expect(t.locate(1)).toEqual({ where: "board", row: 6, col: 3 });
    expect(t.bench[0]).toBeNull();
  });
  it("refuses the enemy half", () => {
    expect(team().move(1, { where: "board", row: 3, col: 3 })).toBe(false);
  });
  it("enforces the board limit (= level)", () => {
    const t = team();
    t.move(1, { where: "board", row: 7, col: 0 });
    t.move(2, { where: "board", row: 7, col: 1 });
    expect(t.move(3, { where: "board", row: 7, col: 2 })).toBe(false);
    // but swapping a bench unit with a board unit is fine
    expect(t.move(3, { where: "board", row: 7, col: 0 })).toBe(true);
    expect(t.locate(1)?.where).toBe("bench");
    expect(t.boardCount).toBe(2);
  });
  it("swaps two board units and survives save/load", () => {
    const t = team();
    t.move(1, { where: "board", row: 7, col: 0 });
    t.move(2, { where: "board", row: 5, col: 5 });
    t.move(1, { where: "board", row: 5, col: 5 });
    const u = Team.load(t.serialize());
    expect(u.locate(1)).toEqual({ where: "board", row: 5, col: 5 });
    expect(u.locate(2)).toEqual({ where: "board", row: 7, col: 0 });
    expect(u.toPlaced().length).toBe(2);
  });
});
