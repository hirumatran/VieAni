import Phaser from "phaser";
import { VERSION } from "../core/config";
import { saveSettings, settings, t, type Lang } from "../core/i18n";
import { SCREEN_H, SCREEN_W } from "../core/layout";
import { button, coverImage, CREAM, FONT_LOGO, FONT_UI, GOLD, toast, WOOD } from "../ui/widgets";

const TITLE_BG = "backgrounds/painted/bg_ha_long.webp";

/** Start screen: Hạ Long background, logo, main menu, language switch. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  preload() {
    this.load.image("title-bg", TITLE_BG);
  }

  create() {
    const bg = coverImage(this, "title-bg");
    // slow drift over the bay
    this.tweens.add({ targets: bg, scale: bg.scale * 1.06, x: bg.x - 20, duration: 24000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    // darken the centre column a little so the menu reads well
    const shade = this.add.graphics();
    shade.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.0, 0.0, 0.45, 0.45).fillRect(0, SCREEN_H * 0.35, SCREEN_W, SCREEN_H * 0.65);

    // logo
    const logo = this.add
      .text(SCREEN_W / 2, 132, "VieAni", { fontFamily: FONT_LOGO, fontSize: "112px", color: "#ffe6a3", fontStyle: "800" })
      .setOrigin(0.5)
      .setStroke("#5a2a12", 14)
      .setShadow(0, 8, "#000000", 12, true, true);
    logo.setTint(0xfff2c4, 0xfff2c4, 0xe7a63c, 0xe7a63c);
    const tag = this.add
      .text(SCREEN_W / 2, 214, t("tagline").toUpperCase(), { fontFamily: FONT_LOGO, fontSize: "30px", color: CREAM, fontStyle: "700" })
      .setOrigin(0.5)
      .setStroke("#2b1d14", 8)
      .setLetterSpacing?.(4);
    const line = this.add.graphics();
    line.lineStyle(2, GOLD, 0.9).lineBetween(SCREEN_W / 2 - 230, 244, SCREEN_W / 2 - 40, 244).lineBetween(SCREEN_W / 2 + 40, 244, SCREEN_W / 2 + 230, 244);
    line.fillStyle(GOLD, 1).fillCircle(SCREEN_W / 2, 244, 5);
    this.tweens.add({ targets: logo, y: 126, duration: 2600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    void tag;

    // menu
    const x = SCREEN_W / 2;
    let y = 316;
    button(this, x, y, 320, 64, t("start"), () => this.scene.start("board", { mode: "match" }), true);
    y += 78;
    const items: [string, () => void][] = [
      [t("practice"), () => this.scene.start("board", { mode: "practice" })],
      [t("vieindex"), () => openVieIndex()],
      [t("settings"), () => this.openSettings()],
      [t("login"), () => toast(this, t("loginSoon"))],
    ];
    for (const [label, fn] of items) {
      button(this, x, y, 280, 52, label, fn);
      y += 64;
    }

    this.languageSwitch();
    this.add.text(SCREEN_W - 14, SCREEN_H - 12, `${t("alphaNote")} · v${VERSION}`, { fontFamily: FONT_UI, fontSize: "14px", color: CREAM })
      .setOrigin(1, 1).setShadow(1, 1, "#000", 3);
  }

  /** VI | EN pill, top-right */
  private languageSwitch() {
    const langs: Lang[] = ["vi", "en"];
    const w = 64, h = 36, x0 = SCREEN_W - 20 - w * 2, y0 = 20;
    const g = this.add.graphics();
    g.fillStyle(WOOD, 0.85).fillRoundedRect(x0 - 4, y0 - 4, w * 2 + 8, h + 8, 22);
    g.lineStyle(2, GOLD, 0.8).strokeRoundedRect(x0 - 4, y0 - 4, w * 2 + 8, h + 8, 22);
    langs.forEach((l, i) => {
      const active = settings.lang === l;
      if (active) g.fillStyle(GOLD, 1).fillRoundedRect(x0 + i * w, y0, w, h, 18);
      this.add.text(x0 + i * w + w / 2, y0 + h / 2, l.toUpperCase(), { fontFamily: FONT_UI, fontSize: "18px", color: active ? "#2b1d14" : CREAM, fontStyle: "bold" })
        .setOrigin(0.5);
      this.add.zone(x0 + i * w + w / 2, y0 + h / 2, w, h).setInteractive({ useHandCursor: true }).on("pointerup", () => {
        if (settings.lang === l) return;
        settings.lang = l;
        saveSettings(settings);
        document.documentElement.lang = l;
        this.scene.restart();
      });
    });
  }

  /** simple settings panel (values are stored; sound and speed are used once those features exist) */
  private openSettings() {
    const layer = this.add.container(0, 0).setDepth(50);
    const dim = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.55).setInteractive();
    const pw = 520, ph = 330, px = SCREEN_W / 2, py = SCREEN_H / 2;
    const g = this.add.graphics();
    g.fillStyle(WOOD, 0.97).fillRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 18);
    g.lineStyle(3, GOLD, 1).strokeRoundedRect(px - pw / 2, py - ph / 2, pw, ph, 18);
    const title = this.add.text(px, py - ph / 2 + 36, t("settings"), { fontFamily: FONT_LOGO, fontSize: "34px", color: "#ffe6a3", fontStyle: "800" }).setOrigin(0.5);
    layer.add([dim, g, title]);

    const rows: [string, () => string, () => void][] = [
      [t("sound"), () => (settings.sound ? t("on") : t("off")), () => (settings.sound = !settings.sound)],
      [t("battleSpeed"), () => `×${settings.speed}`, () => (settings.speed = settings.speed === 1 ? 2 : 1)],
      [t("relaxed"), () => (settings.relaxed ? t("on") : t("off")), () => (settings.relaxed = !settings.relaxed)],
    ];
    rows.forEach(([label, value, toggle], i) => {
      const ry = py - 60 + i * 62;
      const lt = this.add.text(px - pw / 2 + 32, ry, label, { fontFamily: FONT_UI, fontSize: "18px", color: CREAM, wordWrap: { width: 300 } }).setOrigin(0, 0.5);
      const vt = this.add.text(px + pw / 2 - 90, ry, value(), { fontFamily: FONT_UI, fontSize: "20px", color: "#2b1d14", fontStyle: "bold", backgroundColor: "#e7c05f", padding: { x: 14, y: 6 } })
        .setOrigin(0.5).setInteractive({ useHandCursor: true });
      vt.on("pointerup", () => { toggle(); saveSettings(settings); vt.setText(value()); });
      layer.add([lt, vt]);
    });
    const close = button(this, px, py + ph / 2 - 44, 180, 46, t("close"), () => layer.destroy());
    layer.add(close);
  }
}

/** VieIndex encyclopedia (the existing page) in a full-screen overlay */
function openVieIndex() {
  const wrap = document.createElement("div");
  wrap.style.cssText = "position:fixed;inset:0;z-index:20;background:#1b120c;display:flex;flex-direction:column";
  const bar = document.createElement("button");
  bar.textContent = "✕ " + t("close");
  bar.style.cssText = "align-self:flex-end;margin:8px;padding:8px 16px;font:600 16px 'Be Vietnam Pro',sans-serif;background:#e7c05f;color:#2b1d14;border:0;border-radius:18px;cursor:pointer";
  const frame = document.createElement("iframe");
  frame.src = "vieindex.html";
  frame.style.cssText = "flex:1;border:0;width:100%";
  bar.onclick = () => wrap.remove();
  wrap.append(bar, frame);
  document.body.append(wrap);
}
