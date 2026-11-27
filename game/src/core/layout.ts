// Screen layout for the landscape 16:9 game (1280×720), Underlords-style camera.
// The board is a flat 8×8 grid projected onto a trapezoid (far edge narrower) with a homography.

export type Pt = [number, number];

export const SCREEN_W = 1280;
export const SCREEN_H = 720;

/** board corners on screen: top-left, top-right, bottom-right, bottom-left */
export const BOARD_CORNERS: Pt[] = [[352, 58], [928, 58], [1024, 604], [256, 604]];
/** bench (8 slots) corners on screen, same order */
export const BENCH_CORNERS: Pt[] = [[256, 632], [1024, 632], [1044, 706], [236, 706]];

/** match screen (PO, 13 Nov 2026): shop strip along the bottom, so board + bench are scaled to ~79 % and moved up */
export const MATCH_BOARD_CORNERS: Pt[] = [[413, 50], [867, 50], [943, 480], [337, 480]];
export const MATCH_BENCH_CORNERS: Pt[] = [[337, 494], [943, 494], [958, 552], [322, 552]];
/** the shop strip: everything below this line (drop a VieAni here to sell it) */
export const MATCH_SHOP_TOP = 562;

/** painted backgrounds from the PO (Drive folder, 20 Nov 2026): key → Vietnamese place name. 1600×900 webp + 256×144 thumbs */
export const SCENERY: { key: string; name: string }[] = [
  { key: "ha_long", name: "Vịnh Hạ Long" },
  { key: "trang_an", name: "Tràng An" },
  { key: "phong_nha", name: "Phong Nha – Kẻ Bàng" },
  { key: "hoan_kiem", name: "Hồ Hoàn Kiếm" },
  { key: "mu_cang_chai", name: "Mù Cang Chải" },
  { key: "tram_chim", name: "Tràm Chim" },
  { key: "nam_cat_tien", name: "Nam Cát Tiên" },
  { key: "con_dao", name: "Côn Đảo" },
];
export const sceneryPath = (key: string) => `backgrounds/painted/bg_${key}.webp`;
export const sceneryThumb = (key: string) => `backgrounds/thumbs/bg_${key}.webp`;
/** all battle backgrounds (labs use the first) */
export const BACKGROUNDS = SCENERY.map((s) => sceneryPath(s.key));
/** the chosen scenery, or a random one for "random" / an unknown key */
/** "random" is rolled once per visit and then kept (PO 27 Nov 2026: not a new background every round / match) */
let rolled: string | null = null;
export function pickScenery(choice: string): string {
  const s = SCENERY.find((x) => x.key === choice);
  if (s) return s.key;
  rolled ??= SCENERY[Math.floor(Math.random() * SCENERY.length)].key;
  return rolled;
}

const UNIT: Pt[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

/** 3×3 homography (as 8 numbers, h33 = 1) mapping quad `src` (default: unit square) to quad `dst` */
export function homography(dst: Pt[], src: Pt[] = UNIT): number[] {
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
  private inv: number[];
  constructor(corners: Pt[], readonly cols: number, readonly rows: number) {
    this.h = homography(corners);
    this.inv = homography(UNIT, corners);
  }
  /** screen point -> [row, col] of the cell under it, or null if outside the grid */
  cellAt(x: number, y: number): [number, number] | null {
    const [u, v] = project(this.inv, x, y);
    if (u < 0 || v < 0 || u >= 1 || v >= 1) return null;
    return [Math.floor(v * this.rows), Math.floor(u * this.cols)];
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

// ------------------------------------------------------------------ HUD scale (PO 27 Nov 2026: option B, 75 %)
/** the match HUD is laid out at full size and drawn smaller by one camera per screen area, anchored to its corner */
export const UI_SCALE = 0.75;
/** HUD areas in layout coordinates (x0, y0, x1, y1) and the point that stays fixed when scaling (the area's corner) */
export const HUD_REGIONS: { x0: number; y0: number; x1: number; y1: number; ax: number; ay: number }[] = [
  { x0: 150, y0: 0, x1: 1045, y1: 52, ax: 597, ay: 3 },     // scoreboard (top centre)
  { x0: 0, y0: 0, x1: 150, y1: 60, ax: 8, ay: 8 },           // menu button (top left)
  { x0: 0, y0: 60, x1: 250, y1: 558, ax: 8, ay: 62 },        // round / HP / level / gold + item bag (left)
  { x0: 1045, y0: 0, x1: 1280, y1: 558, ax: 1275, ay: 8 },   // Linh Vật, tộc hệ, carried items (right)
  { x0: 0, y0: 558, x1: 1280, y1: 720, ax: 640, ay: 716 },   // shop strip (bottom centre)
];
const inRect = (x: number, y: number, x0: number, y0: number, x1: number, y1: number) => x >= x0 && x < x1 && y >= y0 && y < y1;
/** layout point of a HUD element → where it is on the screen */
export function hudToScreen(x: number, y: number, s = UI_SCALE): { x: number; y: number } {
  const r = HUD_REGIONS.find((q) => inRect(x, y, q.x0, q.y0, q.x1, q.y1));
  return r ? { x: r.ax + (x - r.ax) * s, y: r.ay + (y - r.ay) * s } : { x, y };
}
/** screen point → HUD layout point (unchanged outside the HUD areas) */
export function screenToHud(x: number, y: number, s = UI_SCALE): { x: number; y: number } {
  for (const r of HUD_REGIONS) {
    const a = hudToScreen(r.x0, r.y0, s), b = { x: r.ax + (r.x1 - r.ax) * s, y: r.ay + (r.y1 - r.ay) * s };
    if (inRect(x, y, a.x, a.y, b.x, b.y)) return { x: r.ax + (x - r.ax) / s, y: r.ay + (y - r.ay) / s };
  }
  return { x, y };
}
/** top of the shop strip on the screen (drop a VieAni below it to sell) */
export const SHOP_TOP_SCREEN = 716 + (MATCH_SHOP_TOP - 716) * UI_SCALE;

// ------------------------------------------------------------------ native Full HD (PO 27 Nov 2026: text was blurry)
/** the canvas is 1920×1080; every scene keeps its 1280×720 layout and the cameras draw it 1.5× (text at 2× resolution) */
export const RENDER_SCALE = 1.5;
export const GAME_W = SCREEN_W * RENDER_SCALE, GAME_H = SCREEN_H * RENDER_SCALE;
/** pointer (canvas pixels) → layout coordinates */
export const lp = (p: { x: number; y: number }) => ({ x: p.x / RENDER_SCALE, y: p.y / RENDER_SCALE });
/** call first in every scene's create(): the main camera shows the 1280×720 layout on the 1920×1080 canvas */
export function fitCamera(scene: { cameras: { main: { setOrigin(x: number, y: number): unknown; setZoom(z: number): unknown; setScroll(x: number, y: number): unknown } } }) {
  const c = scene.cameras.main;
  c.setOrigin(0, 0); c.setZoom(RENDER_SCALE); c.setScroll(0, 0);
}
