import { describe, expect, it } from "vitest";
import { BOARD_CORNERS, Grid, homography, project } from "../src/core/layout";

describe("board projection", () => {
  it("maps the unit square corners onto the board corners", () => {
    const h = homography(BOARD_CORNERS);
    const uv: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
    uv.forEach(([u, v], i) => {
      const [x, y] = project(h, u, v);
      expect(x).toBeCloseTo(BOARD_CORNERS[i][0], 6);
      expect(y).toBeCloseTo(BOARD_CORNERS[i][1], 6);
    });
  });
  it("finds the cell under a screen point (inverse projection)", () => {
    const g = new Grid(BOARD_CORNERS, 8, 8);
    for (const [r, c] of [[0, 0], [3, 5], [7, 7], [4, 2]]) {
      const [x, y] = g.foot(r, c);
      expect(g.cellAt(x, y)).toEqual([r, c]);
    }
    expect(g.cellAt(5, 5)).toBeNull();
  });
  it("far cells look smaller than near cells (perspective)", () => {
    const g = new Grid(BOARD_CORNERS, 8, 8);
    expect(g.cellWidth(0, 3)).toBeLessThan(g.cellWidth(7, 3));
  });
});
