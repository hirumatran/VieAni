import Phaser from "phaser";
import { BENCH_SLOTS, BOARD_COLS, BOARD_ROWS, HALF_ROWS, VERSION } from "../core/config";
import type { GameData, Species } from "../core/data";

const CELL = 64;
const COLORS = {
  bg: 0x1b120c,
  enemyCell: [0x3a2a1f, 0x33251b],
  ownCell: [0x5b7a3a, 0x52703a],
  bench: 0x2c1f16,
  line: 0x8c1c13,
  text: "#fbe9c4",
};

/** M0 scene: empty 8×8 battle board, bench, title. Shows a few VieAni on the bench to prove sprites load. */
export class BoardScene extends Phaser.Scene {
  constructor(private data_: GameData) {
    super("board");
  }

  preload() {
    for (const s of this.sample()) this.load.image(`sp${s.id}`, `sprites/${String(s.id).padStart(2, "0")}.png`);
  }

  private sample(): Species[] {
    // one VieAni of each tier, for the skeleton demo
    return [1, 2, 3, 4, 5].map((t) => this.data_.species.find((s) => s.tier === t)!).filter(Boolean);
  }

  create() {
    const w = BOARD_COLS * CELL;
    const x0 = (this.scale.width - w) / 2;
    const y0 = 70;
    this.add.text(this.scale.width / 2, 24, "VieAni", { fontFamily: "sans-serif", fontSize: "32px", color: COLORS.text, fontStyle: "bold" }).setOrigin(0.5);
    this.add.text(this.scale.width - 8, 8, `v${VERSION}`, { fontFamily: "sans-serif", fontSize: "12px", color: COLORS.text }).setOrigin(1, 0);

    for (let r = 0; r < BOARD_ROWS; r++) {
      const own = r >= BOARD_ROWS - HALF_ROWS;
      for (let c = 0; c < BOARD_COLS; c++) {
        const col = (own ? COLORS.ownCell : COLORS.enemyCell)[(r + c) % 2];
        this.add.rectangle(x0 + c * CELL + CELL / 2, y0 + r * CELL + CELL / 2, CELL, CELL, col);
      }
    }
    this.add.rectangle(x0 + w / 2, y0 + HALF_ROWS * CELL, w, 3, COLORS.line);

    const by = y0 + BOARD_ROWS * CELL + 16;
    this.add.text(x0, by, "Hàng chờ", { fontFamily: "sans-serif", fontSize: "14px", color: COLORS.text });
    for (let i = 0; i < BENCH_SLOTS; i++)
      this.add.rectangle(x0 + i * CELL + CELL / 2, by + 20 + CELL / 2, CELL - 4, CELL - 4, COLORS.bench).setStrokeStyle(1, 0x7a6656);

    this.sample().forEach((s, i) => {
      this.add.image(x0 + i * CELL + CELL / 2, by + 20 + CELL / 2, `sp${s.id}`).setDisplaySize(CELL - 8, CELL - 8);
    });
    this.add
      .text(this.scale.width / 2, by + CELL + 40, `${this.data_.species.length} VieAni · ${this.data_.synergies.length} tộc hệ · ${this.data_.items.length} vật phẩm`, {
        fontFamily: "sans-serif",
        fontSize: "14px",
        color: COLORS.text,
      })
      .setOrigin(0.5);
  }
}
