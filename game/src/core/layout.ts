// Screen layout for the landscape 16:9 game (1280×720), Underlords-style camera.
// The board is a flat 8×8 grid projected onto a trapezoid (far edge narrower) with a homography.

export type Pt = [number, number];

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

/** board corners on screen: top-left, top-right, bottom-right, bottom-left */
export const BOARD_CORNERS: Pt[] = [[352, 58], [928, 58], [1024, 604], [256, 604]];
/** bench (8 slots) corners on screen, same order */
export const BENCH_CORNERS: Pt[] = [[256, 632], [1024, 632], [1044, 706], [236, 706]];

/** painted battle backgrounds (one picked at random per battle) */
export const BACKGROUNDS = ["backgrounds/painted/bg_ha_long.webp"];

/** 3×3 homography (as 8 numbers, h33 = 1) mapping the unit square to the quad `dst` */
export function homography(dst: Pt[]): number[] {
  const src: Pt[] = [[0, 0], [1, 0], [1, 1], [0, 1]];
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = src[i];
    const [x, y] = dst[i];
    A.push([u, v, 1, 0, 0, 0, -x * u, -x * v]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -y * u, -y * v]); b.push(y);
  }
  return solve(A, b);
}

/** apply homography: unit-square coords (u,v) → screen */
export function project(h: number[], u: number, v: number): Pt {
  const d = h[6] * u + h[7] * v + 1;
  return [(h[0] * u + h[1] * v + h[2]) / d, (h[3] * u + h[4] * v + h[5]) / d];
}

/** Gaussian elimination with partial pivoting */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
    [M[c], M[p]] = [M[p], M[c]];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  return M.map((row, i) => row[n] / row[i]);
}

export class Grid {
  readonly h: number[];
  constructor(corners: Pt[], readonly cols: number, readonly rows: number) {
    this.h = homography(corners);
  }
  /** corner points of cell (row, col), inset by `gap` (fraction of a cell) */
  cellQuad(row: number, col: number, gap = 0.05): Pt[] {
    const u0 = (col + gap) / this.cols, u1 = (col + 1 - gap) / this.cols;
    const v0 = (row + gap) / this.rows, v1 = (row + 1 - gap) / this.rows;
    return [project(this.h, u0, v0), project(this.h, u1, v0), project(this.h, u1, v1), project(this.h, u0, v1)];
  }
  /** where a unit stands in the cell (a bit below the centre, so it looks grounded) */
  foot(row: number, col: number): Pt {
    return project(this.h, (col + 0.5) / this.cols, (row + 0.62) / this.rows);
  }
  /** on-screen width of a cell at that row (for scaling sprites with depth) */
  cellWidth(row: number, col: number): number {
    const v = (row + 0.62) / this.rows;
    return project(this.h, (col + 1) / this.cols, v)[0] - project(this.h, col / this.cols, v)[0];
  }
}
