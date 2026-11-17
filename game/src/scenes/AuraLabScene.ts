import Phaser from "phaser";
import { attachAura, AURA_OPTIONS, AURA_TITLES, type AuraKind } from "../anim/aura";
import { typeColour, VieAniView } from "../anim/VieAniView";
import { preloadIllustrations, texturesFor, vcode } from "../anim/illustrations";
import type { GameData, Species } from "../core/data";
import { BACKGROUNDS, SCREEN_H, SCREEN_W } from "../core/layout";
import { AURA_CHOICE } from "../core/config";
import { button, coverImage, CREAM, FONT_LOGO, FONT_UI, GOLD, WOOD } from "../ui/widgets";

/** "Hiệu ứng trạng thái": the 3 options for each status aura side by side, so the PO can choose (17 Nov 2026). */
const ROWS: { kind: AuraKind; code: string }[] = [
  { kind: "legend", code: "V024" },      // Lân
  { kind: "extinct", code: "V022" },     // Hổ Đông Dương
  { kind: "endangered", code: "V001" },  // Báo Gấm
];
const COL_X = [470, 790, 1110];
const ROW_FEET = [236, 462, 688];
const SIZE = 150;

export class AuraLabScene extends Phaser.Scene {
  constructor(private data_: GameData) { super("auralab"); }

  private sp(code: string): Species {
    return this.data_.roster.find((s) => vcode(this.data_, s) === code)!;
  }

  preload() {
    this.load.image("lab-bg", BACKGROUNDS[0]);
    preloadIllustrations(this, this.data_, ROWS.map((r) => this.sp(r.code)));
  }

  create() {
    coverImage(this, "lab-bg");
    this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.35);
    button(this, 78, 34, 130, 44, "← Menu", () => this.scene.start("title")).setDepth(100);
    this.add.text(SCREEN_W / 2 + 60, 16, "Hiệu ứng trạng thái – đã chọn: Huyền thoại A · Đã mất A · Nguy cấp C", { fontFamily: FONT_LOGO, fontSize: "24px", color: "#ffe6a3", fontStyle: "800" })
      .setOrigin(0.5, 0).setShadow(1, 2, "#000", 4);
    ROWS.forEach((row, ri) => {
      const sp = this.sp(row.code);
      const y = ROW_FEET[ri];
      const g = this.add.graphics();
      g.fillStyle(WOOD, 0.82).fillRoundedRect(14, y - 172, SCREEN_W - 28, 200, 16).lineStyle(2, GOLD, 0.7).strokeRoundedRect(14, y - 172, SCREEN_W - 28, 200, 16);
      this.add.text(32, y - 150, AURA_TITLES[row.kind], { fontFamily: FONT_LOGO, fontSize: "22px", color: "#ffe6a3", fontStyle: "800", wordWrap: { width: 250 } }).setShadow(1, 1, "#000", 3);
      this.add.text(32, y - 92, `Ví dụ: ${sp.vi.replace(/\s*\(.*\)/, "")}`, { fontFamily: FONT_UI, fontSize: "15px", color: CREAM });
      COL_X.forEach((x, oi) => {
        const { tex } = texturesFor(this, this.data_, sp, "front");
        const v = new VieAniView(this, x, y, tex, -1, typeColour(sp.attackType));
        v.setSize(SIZE); v.idle(); v.c.setDepth(10 + ri);
        attachAura(this, v, row.kind, oi);
        const chosen = AURA_CHOICE[row.kind] === oi;
        this.add.text(x, y + 6, (chosen ? "✓ " : "") + AURA_OPTIONS[row.kind][oi], { fontFamily: FONT_UI, fontSize: "15px", color: chosen ? "#1b120c" : "#ffffff", fontStyle: "bold", backgroundColor: chosen ? "#e7c05f" : "#00000080", padding: { x: 8, y: 3 } })
          .setOrigin(0.5, 0).setDepth(50);
      });
    });
  }
}
