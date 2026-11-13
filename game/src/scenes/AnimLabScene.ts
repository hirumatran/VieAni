import Phaser from "phaser";
import { typeColour, VieAniView } from "../anim/VieAniView";
import { preloadIllustrations, texturesFor, vcode } from "../anim/illustrations";
import type { GameData, Species } from "../core/data";
import { BOARD_COLS, BOARD_ROWS, HALF_ROWS } from "../core/config";
import { settings } from "../core/i18n";
import { BACKGROUNDS, BOARD_CORNERS, Grid, SCREEN_H, SCREEN_W } from "../core/layout";
import { button, coverImage, CREAM, FONT_UI } from "../ui/widgets";

/** "Xưởng hoạt ảnh": preview every animation of one VieAni on both sides of the board. */
export class AnimLabScene extends Phaser.Scene {
  private board = new Grid(BOARD_CORNERS, BOARD_COLS, BOARD_ROWS);
  private sp!: Species;
  private ours!: VieAniView;
  private theirs!: VieAniView;

  constructor(private data_: GameData) { super("animlab"); }

  init(params: { code?: string }) {
    const code = params.code ?? "V001";
    this.sp = this.data_.roster.find((s) => vcode(this.data_, s) === code) ?? this.data_.roster[0];
  }

  preload() {
    this.load.image("lab-bg", BACKGROUNDS[0]);
    this.load.image(`sp${this.sp.id}`, `sprites/${String(this.sp.id).padStart(2, "0")}.png`);
    preloadIllustrations(this, this.data_, [this.sp]);
  }

  create() {
    coverImage(this, "lab-bg");
    const g = this.add.graphics();
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) {
        const own = r >= BOARD_ROWS - HALF_ROWS, tint = own ? 0xffd68c : 0x96e6dc;
        const pts = this.board.cellQuad(r, c).map(([x, y]) => new Phaser.Math.Vector2(x, y));
        g.fillStyle(tint, (r + c) % 2 ? 0.13 : 0.24).fillPoints(pts, true).lineStyle(2, tint, 0.8).strokePoints(pts, true);
      }
    const col = typeColour(this.sp.attackType);
    const mk = (row: number, colIdx: number, view: "front" | "back") => {
      const [x, y] = this.board.foot(row, colIdx);
      const { tex, illustrated } = texturesFor(this, this.data_, this.sp, view);
      const v = new VieAniView(this, x, y, tex, view === "back" ? 1 : -1, col, !illustrated && view === "front");
      v.setSize(this.board.cellWidth(row, colIdx) * (illustrated ? 1.9 : 1.3));
      v.c.setDepth(y); v.idle();
      return v;
    };
    this.theirs = mk(2, 4, "front");
    this.ours = mk(5, 3, "back");

    const sp = settings.speed;
    const both = (fn: (v: VieAniView, o: VieAniView) => Promise<void> | void) => { fn(this.ours, this.theirs); fn(this.theirs, this.ours); };
    const actions: [string, () => void][] = [
      ["Tấn công", () => both((v, o) => v.attack(o.c.x, o.c.y, this.sp.attackClass === "special", sp).then(() => o.hit(v.c.x, v.c.y)))],
      ["Kỹ năng", () => both((v) => v.cast(col, sp))],
      ["Trúng đòn", () => both((v) => v.hit())],
      ["Thắng", () => both((v) => v.win())],
      ["Thua", () => both((v) => v.lose())],
      ["Gục ngã", () => both((v) => v.die(sp))],
      ["Hồi phục", () => both((v) => v.reset())],
      ["★1", () => both((v) => v.setStar(1))],
      ["★2", () => both((v) => v.setStar(2))],
      ["★3", () => both((v) => v.setStar(3))],
    ];
    actions.forEach(([label, fn], i) => button(this, 86, 120 + i * 52, 150, 42, label, fn).setDepth(9999));
    button(this, 78, 34, 130, 44, "← Menu", () => this.scene.start("title")).setDepth(9999);
    this.add.text(SCREEN_W / 2, 16, `Xưởng hoạt ảnh · ${vcode(this.data_, this.sp)} ${this.sp.vi}`, {
      fontFamily: FONT_UI, fontSize: "18px", color: CREAM, backgroundColor: "#2b1d14c0", padding: { x: 12, y: 5 },
    }).setOrigin(0.5, 0).setDepth(9999);
    this.add.text(SCREEN_W - 16, SCREEN_H - 14, "Trên: phe đối thủ (nhìn trước) · Dưới: phe ta (nhìn sau)", {
      fontFamily: FONT_UI, fontSize: "14px", color: CREAM,
    }).setOrigin(1, 1).setShadow(1, 1, "#000", 3).setDepth(9999);
    (window as unknown as { __lab: unknown }).__lab = { ours: this.ours, theirs: this.theirs };
  }
}
