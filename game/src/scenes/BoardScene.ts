import Phaser from "phaser";
import { BENCH_SLOTS, BOARD_COLS, BOARD_ROWS, HALF_ROWS, VERSION } from "../core/config";
import type { GameData, Species } from "../core/data";
import { BACKGROUNDS, BENCH_CORNERS, BOARD_CORNERS, Grid, SCREEN_H, SCREEN_W, type Pt } from "../core/layout";

const ENEMY_TINT = 0x96e6dc;
const OWN_TINT = 0xffd68c;
const TEXT = "#fbe9c4";

/** Battle screen (landscape 16:9): painted background, transparent perspective board, bench. */
export class BoardScene extends Phaser.Scene {
  private board = new Grid(BOARD_CORNERS, BOARD_COLS, BOARD_ROWS);
  private bench = new Grid(BENCH_CORNERS, BENCH_SLOTS, 1);
  private bgKey = "";

  constructor(private data_: GameData) {
    super("board");
  }

  preload() {
    const bg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    this.bgKey = "bg:" + bg;
    this.load.image(this.bgKey, bg);
    for (const s of this.sample()) this.load.image(`sp${s.id}`, `sprites/${String(s.id).padStart(2, "0")}.png`);
  }

  private sample(): Species[] {
    // one VieAni of each tier, for the skeleton demo
    return [1, 2, 3, 4, 5].map((t) => this.data_.species.find((s) => s.tier === t)!).filter(Boolean);
  }

  create() {
    const bg = this.add.image(SCREEN_W / 2, SCREEN_H / 2, this.bgKey);
    bg.setScale(Math.max(SCREEN_W / bg.width, SCREEN_H / bg.height)); // cover the screen
    bg.texture.setFilter(Phaser.Textures.FilterMode.LINEAR); // painted background: smooth scaling

    const g = this.add.graphics();
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) {
        const own = r >= BOARD_ROWS - HALF_ROWS;
        const tint = own ? OWN_TINT : ENEMY_TINT;
        this.cell(g, this.board.cellQuad(r, c), tint, (r + c) % 2 === 0 ? 0.24 : 0.13);
      }
    for (let i = 0; i < BENCH_SLOTS; i++) this.cell(g, this.bench.cellQuad(0, i, 0.04), OWN_TINT, 0.16);

    // sample VieAni on the bench (pixel sprites stay crisp)
    this.sample().forEach((s, i) => {
      const [x, y] = this.bench.foot(0, i);
      const w = this.bench.cellWidth(0, i) * 1.15;
      this.add.ellipse(x, y, w * 0.6, w * 0.16, 0x281e14, 0.45);
      this.add.image(x, y + w * 0.05, `sp${s.id}`).setOrigin(0.5, 0.95).setDisplaySize(w, w);
    });

    this.add.text(16, 12, "VieAni", { fontFamily: "sans-serif", fontSize: "26px", color: TEXT, fontStyle: "bold" }).setShadow(2, 2, "#000", 4);
    this.add.text(SCREEN_W - 12, 10, `v${VERSION}`, { fontFamily: "sans-serif", fontSize: "13px", color: TEXT }).setOrigin(1, 0).setShadow(1, 1, "#000", 2);
    this.add
      .text(16, SCREEN_H - 14, `${this.data_.species.length} VieAni · ${this.data_.synergies.length} tộc hệ · ${this.data_.items.length} vật phẩm`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: TEXT,
      })
      .setOrigin(0, 1)
      .setShadow(1, 1, "#000", 3);
  }

  private cell(g: Phaser.GameObjects.Graphics, quad: Pt[], tint: number, alpha: number) {
    const pts = quad.map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(tint, alpha).fillPoints(pts, true);
    g.lineStyle(2, tint, 0.8).strokePoints(pts, true);
  }
}
