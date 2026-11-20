import Phaser from "phaser";
import { HARD_BOT_GOLD, VERSION, type Difficulty } from "../core/config";
import { saveSettings, settings, t, type Lang } from "../core/i18n";
import { pickScenery, SCENERY, sceneryPath, sceneryThumb, SCREEN_H, SCREEN_W } from "../core/layout";
import { button, coverImage, CREAM, FONT_LOGO, FONT_UI, GOLD, toast, WOOD } from "../ui/widgets";

/** Start screen: painted background (the chosen scenery), logo, main menu, match setup (difficulty + scenery), language switch. */
export class TitleScene extends Phaser.Scene {
  constructor() {
    super("title");
  }

  private bg?: Phaser.GameObjects.Image;
  /** the scenery on screen (for "random": one picked when the menu opens) */
  private shownKey = "";

  preload() {
    this.shownKey = pickScenery(settings.background);
    this.load.image(`bg:${this.shownKey}`, sceneryPath(this.shownKey));
    for (const s of SCENERY) this.load.image(`thumb:${s.key}`, sceneryThumb(s.key));
  }

  create() {
    this.bg = undefined;
    this.showBackground(this.shownKey);

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
    button(this, x, y, 320, 64, t("start"), () => this.scene.start("match", { fresh: true }), true);
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
    this.matchSetup();
    button(this, 132, SCREEN_H - 40, 240, 42, "🎬 Xưởng hoạt ảnh", () => this.scene.start("animlab", { code: "V001" }));
    button(this, 392, SCREEN_H - 40, 264, 42, "✨ Hiệu ứng trạng thái", () => this.scene.start("auralab"));
    button(this, 682, SCREEN_H - 40, 300, 42, "🐉 Mô phỏng Ấn Thống Nhất", () => this.scene.start("match", { demo: true }));
    this.add.text(SCREEN_W - 14, SCREEN_H - 12, `${t("alphaNote")} · v${VERSION}`, { fontFamily: FONT_UI, fontSize: "14px", color: CREAM })
      .setOrigin(1, 1).setShadow(1, 1, "#000", 3);
  }

  /** background with a slow drift; the painting is loaded on demand when the scenery changes */
  private showBackground(key: string) {
    const tex = `bg:${key}`;
    const put = () => {
      const old = this.bg;
      const bg = coverImage(this, tex).setDepth(-10).setAlpha(old ? 0 : 1);
      this.bg = bg;
      this.tweens.add({ targets: bg, scale: bg.scale * 1.06, x: bg.x - 20, duration: 24000, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      if (old) this.tweens.add({ targets: bg, alpha: 1, duration: 350, onComplete: () => old.destroy() });
    };
    this.shownKey = key;
    if (this.textures.exists(tex)) return put();
    this.load.image(tex, sceneryPath(key));
    this.load.once(Phaser.Loader.Events.COMPLETE, () => { if (this.sys.isActive() && this.shownKey === key) put(); });
    this.load.start();
  }

  /** right-hand card: difficulty (Dễ / Thường / Khó) and scenery (◀ thumbnail ▶), both saved in the settings */
  private matchSetup() {
    const cx = 1062, w = 330, top = 292, h = 352;
    const g = this.add.graphics();
    g.fillStyle(WOOD, 0.88).fillRoundedRect(cx - w / 2, top, w, h, 16);
    g.lineStyle(2, GOLD, 0.85).strokeRoundedRect(cx - w / 2, top, w, h, 16);
    this.add.text(cx, top + 22, t("matchSetup"), { fontFamily: FONT_LOGO, fontSize: "24px", color: "#ffe6a3", fontStyle: "800" }).setOrigin(0.5);

    // difficulty: three segments
    this.add.text(cx - w / 2 + 18, top + 50, t("difficulty"), { fontFamily: FONT_UI, fontSize: "15px", color: CREAM, fontStyle: "bold" });
    const levels: [Difficulty, string][] = [["easy", t("diffEasy")], ["normal", t("diffNormal")], ["hard", t("diffHard")]];
    const segW = 96, segH = 38, sy = top + 74, sx0 = cx - (segW * 3 + 8) / 2;
    const seg = this.add.graphics();
    const labels = levels.map(([, label], i) =>
      this.add.text(sx0 + i * (segW + 4) + segW / 2, sy + segH / 2, label, { fontFamily: FONT_UI, fontSize: "17px", fontStyle: "bold", color: CREAM }).setOrigin(0.5));
    const note = this.add.text(cx, sy + segH + 10, "", { fontFamily: FONT_UI, fontSize: "13px", color: CREAM, align: "center", wordWrap: { width: w - 30 } }).setOrigin(0.5, 0);
    const drawDiff = () => {
      seg.clear();
      levels.forEach(([lv], i) => {
        const on = settings.difficulty === lv;
        seg.fillStyle(on ? GOLD : 0x4a3424, 1).fillRoundedRect(sx0 + i * (segW + 4), sy, segW, segH, 10);
        labels[i].setColor(on ? "#2b1d14" : CREAM);
      });
      note.setText(settings.difficulty === "easy" ? t("diffEasyNote") : settings.difficulty === "hard" ? t("diffHardNote")(HARD_BOT_GOLD) : t("diffNormalNote"));
    };
    levels.forEach(([lv], i) => this.add.zone(sx0 + i * (segW + 4) + segW / 2, sy + segH / 2, segW, segH).setInteractive({ useHandCursor: true })
      .on("pointerup", () => { settings.difficulty = lv; saveSettings(settings); drawDiff(); }));
    drawDiff();

    // scenery: ◀ thumbnail ▶ + name
    this.add.text(cx - w / 2 + 18, top + 160, t("scenery"), { fontFamily: FONT_UI, fontSize: "15px", color: CREAM, fontStyle: "bold" });
    const choices = ["random", ...SCENERY.map((s) => s.key)];
    const ty = top + 184, tw = 224, th = 126;
    const frame = this.add.graphics();
    frame.lineStyle(3, GOLD, 1).strokeRoundedRect(cx - tw / 2 - 3, ty - 3, tw + 6, th + 6, 8);
    const thumb = this.add.image(cx, ty + th / 2, `thumb:${SCENERY[0].key}`).setDisplaySize(tw, th);
    const dice = this.add.text(cx, ty + th / 2, "?", { fontFamily: FONT_LOGO, fontSize: "64px", color: "#ffe6a3", fontStyle: "800" }).setOrigin(0.5).setStroke("#2b1d14", 8);
    const name = this.add.text(cx, ty + th + 10, "", { fontFamily: FONT_UI, fontSize: "16px", color: "#ffe6a3", fontStyle: "bold" }).setOrigin(0.5, 0);
    const drawScenery = () => {
      const random = settings.background === "random" || !SCENERY.some((s) => s.key === settings.background);
      const key = random ? this.shownKey : settings.background;
      thumb.setTexture(`thumb:${key}`).setDisplaySize(tw, th).setTint(random ? 0x777777 : 0xffffff);
      dice.setVisible(random);
      name.setText(random ? t("sceneryRandom") : SCENERY.find((s) => s.key === key)!.name);
    };
    const step = (d: number) => {
      const i = Math.max(0, choices.indexOf(settings.background));
      settings.background = choices[(i + d + choices.length) % choices.length];
      saveSettings(settings);
      if (settings.background !== "random") this.showBackground(settings.background);
      drawScenery();
    };
    for (const [dx, label, d] of [[-tw / 2 - 26, "◀", -1], [tw / 2 + 26, "▶", 1]] as [number, string, number][]) {
      const b = this.add.text(cx + dx, ty + th / 2, label, { fontFamily: FONT_UI, fontSize: "26px", color: "#ffe6a3" }).setOrigin(0.5)
        .setInteractive({ useHandCursor: true }).on("pointerup", () => step(d));
      b.on("pointerover", () => b.setColor("#ffffff")).on("pointerout", () => b.setColor("#ffe6a3"));
    }
    thumb.setInteractive({ useHandCursor: true }).on("pointerup", () => step(1));
    drawScenery();
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
