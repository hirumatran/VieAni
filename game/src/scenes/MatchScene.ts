import Phaser from "phaser";
import { maxHp as battleMaxHp, type BattleResult } from "../core/battle";
import * as C from "../core/config";
import type { GameData } from "../core/data";
import { settings, t } from "../core/i18n";
import { HUD_REGIONS, hudToScreen, MATCH_BENCH_CORNERS, MATCH_BOARD_CORNERS, MATCH_SHOP_TOP, SCREEN_H, SCREEN_W, screenToHud, SHOP_TOP_SCREEN, UI_SCALE } from "../core/layout";
import { RONG_LAC_VIET, TEST_CODES, testMatch, type Match, type RoundReport } from "../core/match";
import type { Team } from "../core/team";
import { texturesFor, vcode } from "../anim/illustrations";
import { button, CREAM, FONT_LOGO, FONT_UI, GOLD, toast, WOOD } from "../ui/widgets";
import { BoardScene, type View } from "./BoardScene";
import type { CardSubject } from "../ui/InfoCard";
import { activeSynergies, type SynergyState } from "../core/synergy";
import synIndex from "../../../assets/icons/synergies/index.json";
import { DROPPABLE } from "../core/items";
import { NOT_MODELLED } from "../core/synergyRules";

/** tộc hệ icons (scripts/synergy_icons.py): name -> svg slug + tile colour */
const SYN_ICON = synIndex as Record<string, { icon: string; colour: string; symbol: string }>;
const SYN_X = 1236, SYN_Y0 = 96, SYN_STEP = 54, SYN_ICON_PX = 44;
/** item bag panel (left, under the HUD) */
const BAG = { y: 418, h: 136, slot: 36, team: 28, teamX: 176 };
const ITEM_CAT: Record<string, string> = { TC: "Tấn công", PT: "Phòng thủ", HT: "Hỗ trợ", TD: "Toàn đội", NEM: "Ném", SAN: "Đặt trên sân", LV: "Linh vật" };
const ITEM_RANGED = new Set([3, 26, 27, 41]);

// shop strip along the bottom (PO, 13 Nov 2026): [Làm mới / Mua XP] [5 cards] [Sẵn sàng]; drop a VieAni on it to sell
const STRIP_X = 10, STRIP_W = SCREEN_W - 20, STRIP_H = SCREEN_H - MATCH_SHOP_TOP - 6;
const STRIP_CY = MATCH_SHOP_TOP + STRIP_H / 2;
const BTN_CX = 100, BTN_W = 172;
const CARD_W = 168, CARD_H = 136, CARD_X0 = 196, CARD_STEP = 178;
const READY_CX = 1176, READY_W = 176;
const LOCK = { x: 160, y: MATCH_SHOP_TOP + 16, w: 46, h: 26 };
const RING = { x: 58, y: 248, r: 30 };
const TIER_COL: Record<number, number> = { 1: 0x9aa0a8, 2: 0x4caf6a, 3: 0x3c84d6, 4: 0xa35ad8, 5: 0xe8b13c };
const shortName = (vi: string) => vi.replace(/\s*\(.*\)\s*/, "");

/**
 * Playable test match (PO request, 13 Nov 2026): you vs one bot, shop limited to V001–V004.
 * Real rules from config.ts – gold, interest, streaks, XP/levels, shared pool, ★ merging, player HP – with
 * TEST_HP instead of 100 so a match takes ~10 rounds. No PvE rounds / items / synergies yet.
 */
export class MatchScene extends BoardScene {
  private match!: Match;
  private cards: Phaser.GameObjects.Container[] = [];
  private sellZone!: Phaser.GameObjects.Container;
  private sellText!: Phaser.GameObjects.Text;
  private hudG!: Phaser.GameObjects.Graphics;
  private txt: Record<string, Phaser.GameObjects.Text> = {};
  private timeLeft = 0;
  private pendingToast = "";
  private hint!: Phaser.GameObjects.Text;
  /** 8-player scoreboard along the top (rebuilt on every HUD refresh) */
  private scoreObjs: Phaser.GameObjects.GameObject[] = [];

  constructor(d: GameData) {
    super(d, "match", MATCH_BOARD_CORNERS, MATCH_BENCH_CORNERS);
  }

  /** demo of Ấn Thống Nhất: the bottom side was played by the computer ("zodiac" strategy) until it got all 12 signs */
  private demo: { round: number; seed: number; tries: number; log: string[]; shown?: boolean } | null = null;

  init(data?: { fresh?: boolean; demo?: boolean }) {
    if (data?.demo) { this.runDemo(); return; }
    if (data?.fresh) this.demo = null;
    if (data?.fresh || !this.match || this.match.over) {
      this.demo = null;
      this.match = testMatch(this.data_, Math.floor(Math.random() * 1e9), C.PLAYERS); // you + 7 computer players
      this.match.difficulty = settings.difficulty; // main menu choice (Dễ / Thường / Khó)
      this.pendingToast = t("testNote")(TEST_CODES.length, TEST_CODES[TEST_CODES.length - 1] ?? "");
    }
  }

  /** play whole matches without graphics (computer on both sides) until the bottom player activates Ấn Thống Nhất with 12 signs */
  private runDemo() {
    const start = Math.floor(Math.random() * 1e6);
    for (let tries = 1; tries <= 200; tries++) {
      const seed = start + tries;
      const m = testMatch(this.data_, seed);
      const log: string[] = [];
      const seen = { rong: false, lv: false, charms: 0 };
      while (!m.over && m.round <= 45) {
        m.zodiacTurn(m.human);
        m.botTurn();
        const p = m.human;
        if (p.charms.length > seen.charms) { seen.charms = p.charms.length; log.push(`Vòng ${m.round}: nhận ${m.item(p.charms[p.charms.length - 1]).name}`); }
        if (!seen.rong && p.team.units().some((u) => u.speciesId === RONG_LAC_VIET)) { seen.rong = true; log.push(`Vòng ${m.round}: mua được Rồng Lạc Việt`); }
        if (!seen.lv && p.level >= C.MAX_LEVEL) { seen.lv = true; log.push(`Vòng ${m.round}: đạt cấp 10`); }
        m.finishRound(m.battle(seed * 1000 + m.round).res);
        if (p.unityRound != null) {
          if (p.itemOffer) m.zodiacTurn(p); // take this round's reward the same way
          log.push(`Vòng ${p.unityRound}: ẤN THỐNG NHẤT – đủ 12 con giáp`);
          this.match = m;
          this.demo = { round: p.unityRound, seed, tries, log };
          return;
        }
      }
    }
    this.match = testMatch(this.data_, start);
    this.demo = null;
  }

  protected loadTeam(): Team {
    return this.match.human.team;
  }

  protected saveTeam() {
    /* the match lives in memory */
  }

  /** debug handle for automated tests */
  get state() {
    return this.match;
  }

  // ------------------------------------------------------------------ HUD
  protected buildHud() {
    const top = 5000;
    button(this, 78, 34, 130, 44, "← " + t("back"), () => this.scene.start("title")).setDepth(top);
    this.hint = this.add.text(SCREEN_W / 2 - 40, 18, t("matchHint"), { fontFamily: FONT_UI, fontSize: "14px", color: CREAM, backgroundColor: "#2b1d14b0", padding: { x: 10, y: 4 } })
      .setOrigin(0.5, 0).setDepth(top);
    // 8 players: the scoreboard takes the top strip; the tip is shown once as a toast instead
    if (this.match.players.length > 2) this.hint.setVisible(false);
    this.scoreObjs = [];

    // left: round, HP, level, gold
    const g = this.add.graphics().setDepth(top - 1);
    g.fillStyle(WOOD, 0.86).fillRoundedRect(10, 66, 234, 344, 14).lineStyle(2, GOLD, 0.8).strokeRoundedRect(10, 66, 234, 344, 14);
    // bottom: shop strip
    g.fillStyle(WOOD, 0.9).fillRoundedRect(STRIP_X, MATCH_SHOP_TOP, STRIP_W, STRIP_H, 14).lineStyle(2, GOLD, 0.8)
      .strokeRoundedRect(STRIP_X, MATCH_SHOP_TOP, STRIP_W, STRIP_H, 14);
    this.hudG = this.add.graphics().setDepth(top);
    const text = (key: string, x: number, y: number, size: number, color = CREAM, font = FONT_UI) =>
      (this.txt[key] = this.add.text(x, y, "", { fontFamily: font, fontSize: `${size}px`, color, fontStyle: "bold" }).setShadow(1, 1, "#000", 3).setDepth(top));
    text("round", 127, 92, 30, "#ffe6a3", FONT_LOGO).setOrigin(0.5);
    text("you", 26, 122, 16);
    text("youHp", 228, 122, 16).setOrigin(1, 0);
    text("bot", 26, 172, 16);
    text("botHp", 228, 172, 16).setOrigin(1, 0);
    // level: circular XP ring with the level number inside (PO request)
    text("lvlCap", RING.x, RING.y - 15, 10, "#cdbb98").setOrigin(0.5).setText(t("levelShort"));
    text("level", RING.x, RING.y + 4, 28, "#ffe6a3", FONT_LOGO).setOrigin(0.5);
    text("xp", 104, 228, 17);
    text("xpNext", 104, 252, 12, "#cdbb98");
    text("gold", 26, 300, 20, "#ffd84a");
    text("timer", 26, 372, 18, "#ffb3a3");
    this.counter = text("count", 26, 338, 17);
    this.add.text(24, MATCH_SHOP_TOP + 16, t("shop").toUpperCase(), { fontFamily: FONT_LOGO, fontSize: "17px", color: "#ffe6a3", fontStyle: "800" }).setOrigin(0, 0.5).setShadow(1, 1, "#000", 3).setDepth(top);
    this.buildLock(top);

    button(this, BTN_CX, MATCH_SHOP_TOP + 56, BTN_W, 44, t("reroll")(C.REROLL_COST), () => this.reroll()).setDepth(top);
    button(this, BTN_CX, MATCH_SHOP_TOP + 110, BTN_W, 44, t("buyXp")(C.XP_BUY_COST), () => this.buyXp()).setDepth(top);
    button(this, READY_CX, STRIP_CY, READY_W, STRIP_H - 24, t("ready"), () => this.fight(), true).setDepth(top);

    // sell zone (shown while dragging one of our VieAni)
    const zg = this.add.graphics();
    zg.fillStyle(0x8a1f12, 0.9).fillRoundedRect(STRIP_X, MATCH_SHOP_TOP, STRIP_W, STRIP_H, 14)
      .lineStyle(4, 0xffd84a, 1).strokeRoundedRect(STRIP_X, MATCH_SHOP_TOP, STRIP_W, STRIP_H, 14);
    this.sellText = this.add.text(SCREEN_W / 2, STRIP_CY, "", { fontFamily: FONT_LOGO, fontSize: "26px", color: "#fff3c4", fontStyle: "800", align: "center" })
      .setOrigin(0.5).setShadow(1, 2, "#000", 4);
    this.sellZone = this.add.container(0, 0, [zg, this.sellText]).setDepth(top + 10).setVisible(false);

    this.cards = [];
    this.synRows = []; this.synSig = ""; this.synPopup = undefined; this.synOpen = "";
    this.equipObjs = []; this.equipSig = ""; this.itemModal = undefined; this.itemTip = undefined;
    this.charmObjs = []; this.charmSig = "";
    this.buildBag();
    // a click on empty space closes the tộc hệ details
    this.input.on("pointerdown", (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (!this.synPopup || over.some((o) => o.getData?.("synRow"))) return; // a row click toggles by itself
      const b = this.synPopup.getBounds();
      if (!b.contains(p.x, p.y)) this.closeSynPopup();
    });
    this.drawCards();
    this.refreshHud();
    this.startTimer();
    this.setupHudCameras();
    if (this.pendingToast) { toast(this, this.pendingToast); this.pendingToast = ""; }
    this.syncItems();
    this.showItemChoice();
    this.showDemoBanner();
  }

  protected updateCounter() {
    this.counter?.setText(t("onBoard")(this.team.boardCount, this.team.maxOnBoard));
    this.refreshSynergies();
  }

  preload() {
    super.preload();
    for (const g of this.data_.synergies) {
      const ic = SYN_ICON[g.name]?.icon;
      if (ic && !this.textures.exists(`syn:${ic}`)) this.load.svg(`syn:${ic}`, `icons/synergies/${ic}.svg`, { width: 96, height: 96 });
    }
    // item icons are loaded by BoardScene.preload (battle effects need them too)
  }

  // ------------------------------------------------------------------ tộc hệ (synergies) on the right (PO, 17 Nov 2026)
  private synRows: Phaser.GameObjects.Container[] = [];
  private synSig = "";
  private synPopup?: Phaser.GameObjects.Container;
  private synOpen = "";

  /** one row per formed tộc hệ: label + count + tier pips, then its icon; click = details */
  private refreshSynergies() {
    if (!this.sys.isActive() && !this.sys.isVisible()) return;
    const act = activeSynergies(this.data_, this.team.toPlaced().map((u) => u.speciesId), this.match.zodiacBonus(this.match.human));
    const sig = act.map((a) => `${a.syn.name}:${a.count}`).join("|");
    this.refreshCharms();
    if (sig === this.synSig && this.synRows.every((r) => r.active)) return;
    this.synSig = sig;
    for (const r of this.synRows) r.destroy();
    this.synRows = [];
    act.forEach((a, i) => {
      const ic = SYN_ICON[a.syn.name];
      const row = this.add.container(SYN_X, SYN_Y0 + i * SYN_STEP).setDepth(5002);
      const next = a.thresholds.find((th) => th > a.count) ?? a.thresholds[a.thresholds.length - 1];
      const label = this.add.text(-SYN_ICON_PX / 2 - 12, -10, a.syn.name, { fontFamily: FONT_UI, fontSize: "14px", color: CREAM, fontStyle: "bold" }).setOrigin(1, 0.5);
      const cnt = this.add.text(-SYN_ICON_PX / 2 - 12, 9, `${a.count} / ${next}`, { fontFamily: FONT_UI, fontSize: "12px", color: "#ffe6a3", fontStyle: "bold" }).setOrigin(1, 0.5);
      const pw = Math.max(label.width, cnt.width + 14 * a.thresholds.length + 6) + 22;
      const bg = this.add.graphics();
      bg.fillStyle(WOOD, 0.88).fillRoundedRect(-SYN_ICON_PX / 2 - pw, -SYN_ICON_PX / 2 + 2, pw + 10, SYN_ICON_PX - 4, 10);
      bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(ic?.colour ?? "#e7c05f").color, 0.9).strokeRoundedRect(-SYN_ICON_PX / 2 - pw, -SYN_ICON_PX / 2 + 2, pw + 10, SYN_ICON_PX - 4, 10);
      // tier pips: filled = reached
      const pips = this.add.graphics();
      a.thresholds.forEach((_, k) => {
        const px = -SYN_ICON_PX / 2 - 12 - cnt.width - 10 - (a.thresholds.length - 1 - k) * 12;
        pips.fillStyle(k <= a.level ? 0xffd84a : 0x5a4a3a, 1).fillCircle(px, 9, 4);
      });
      const icon = this.add.image(0, 0, `syn:${ic?.icon}`).setDisplaySize(SYN_ICON_PX, SYN_ICON_PX);
      const hit = this.add.zone(-pw / 2 + 4, 0, pw + SYN_ICON_PX + 10, SYN_ICON_PX).setInteractive({ useHandCursor: true });
      hit.setData("synRow", true);
      hit.on("pointerup", () => this.toggleSynPopup(a, SYN_Y0 + i * SYN_STEP));
      hit.on("pointerover", () => row.setScale(1.04));
      hit.on("pointerout", () => row.setScale(1));
      row.add([bg, label, cnt, pips, icon, hit]);
      this.synRows.push(row);
    });
    // keep an open details panel up to date (or close it if that tộc hệ is gone)
    if (this.synOpen) {
      const i = act.findIndex((a) => a.syn.name === this.synOpen);
      this.closeSynPopup();
      if (i >= 0) this.openSynPopup(act[i], SYN_Y0 + i * SYN_STEP);
    }
    this.refreshEquipped();
  }

  private toggleSynPopup(a: SynergyState, y: number) {
    const same = this.synOpen === a.syn.name;
    this.closeSynPopup();
    if (!same) this.openSynPopup(a, y);
  }

  private closeSynPopup() {
    this.synPopup?.destroy();
    this.synPopup = undefined;
    this.synOpen = "";
  }

  /** details: icon, name, what it is, each tier's ability (reached tiers in gold), who counts */
  private openSynPopup(a: SynergyState, rowY: number) {
    const W = 360, P = 14, ic = SYN_ICON[a.syn.name];
    const box = this.add.container(0, 0).setDepth(9200);
    const g = this.add.graphics();
    box.add(g);
    const txt = (x: number, y: number, s: string, size: number, color: string, bold = false, wrap = W - 2 * P) => {
      const tx = this.add.text(x, y, s, { fontFamily: FONT_UI, fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal", wordWrap: { width: wrap }, lineSpacing: 2 });
      box.add(tx); return tx;
    };
    box.add(this.add.image(P + 26, P + 26, `syn:${ic?.icon}`).setDisplaySize(52, 52));
    txt(P + 62, P + 2, a.syn.name, 19, "#ffe6a3", true, W - P - 70);
    txt(P + 62, P + 28, `Đang có ${a.count} · mốc ${a.thresholds.join(" / ")}`, 12.5, CREAM, true, W - P - 70);
    let y = P + 62;
    if (a.syn.basis) { const b = txt(P, y, a.syn.basis, 11.5, "#cdbb98"); y += b.height + 8; }
    a.thresholds.forEach((th, k) => {
      const on = k <= a.level;
      const head = txt(P, y, `(${th})`, 13, on ? "#ffd84a" : "#8a7a6a", true, 40);
      const body = txt(P + 34, y, a.syn.tiers[String(th)], 13, on ? "#fff3d6" : "#a89a8a", on, W - 2 * P - 34);
      if (on) { g.fillStyle(0xe7c05f, 0.14).fillRoundedRect(P - 6, y - 3, W - 2 * P + 12, body.height + 6, 6); }
      void head;
      y += body.height + 8;
    });
    const who = a.syn.byZodiac
      ? `Con giáp trên sân: ${[...new Set(a.present.map((s) => s.zodiac))].join(", ")}` + (a.bonus ? `  + ${a.bonus} nhờ Ấn Thống Nhất (${missingSigns(a).join(", ")})` : "")
      : `Trên sân: ${a.present.map((s) => s.vi.replace(/\s*\(.*\)/, "")).join(", ")}`;
    const w1 = txt(P, y, who, 12, CREAM, true); y += w1.height + 4;
    if (!a.syn.byZodiac) {
      const others = a.syn.members.filter((m) => !a.present.some((s) => s.id === m)).map((m) => this.data_.byId.get(m)!.vi.replace(/\s*\(.*\)/, ""));
      if (others.length) { const w2 = txt(P, y, `Còn thiếu: ${others.join(", ")}`, 11.5, "#a89a8a"); y += w2.height + 4; }
    }
    const nm = NOT_MODELLED[a.syn.name];
    const foot = txt(P, y + 4, nm ? `Đã tính trong trận, trừ: ${nm}.` : "Đã tính trong trận đấu.", 10.5, "#8a7a6a"); y += foot.height + 4 + P;
    g.fillStyle(0x000000, 0.45).fillRoundedRect(4, 6, W, y, 14);
    g.fillStyle(0x1b120c, 0.97).fillRoundedRect(0, 0, W, y, 14);
    g.lineStyle(3, Phaser.Display.Color.HexStringToColor(ic?.colour ?? "#e7c05f").color, 1).strokeRoundedRect(0, 0, W, y, 14);
    // the row label sits at most ~230 px left of the icon; keep the (scaled) panel fully left of it, on screen, above the shop
    const at = hudToScreen(SYN_X - SYN_ICON_PX / 2 - 230, rowY - 30), s = UI_SCALE;
    box.setScale(s).setPosition(Math.max(8, at.x - W * s), Phaser.Math.Clamp(at.y, 8, SHOP_TOP_SCREEN - y * s - 8));
    this.synPopup = box;
    this.synOpen = a.syn.name;
  }

  private refreshHud() {
    const m = this.match, h = m.human, b = m.bot;
    this.txt.round.setText(t("round")(m.round));
    this.txt.you.setText("❤ " + t("you"));
    this.txt.youHp.setText(`${h.hp}/${maxHpOf(m)}`);
    const pr = m.humanPairing();
    // 8 players: this round's opponent by short name (full name on the scoreboard hover and in the round panel)
    this.txt.bot.setText("❤ " + (m.players.length > 2 ? `${m.shortName(b)}${pr?.ghost ? " " + t("ghostTag") : ""}` : t("opponent")));
    this.drawScoreboard();
    this.txt.botHp.setText(`${b.hp}/${maxHpOf(m)}`);
    this.txt.level.setText(String(h.level));
    const need = m.xpNeeded(h);
    this.txt.xp.setText(t("xp")(h.xp, need));
    this.txt.xpNext.setText(need ? t("xpToGo")(need - h.xp, h.level + 1) : "");
    this.txt.gold.setText("● " + t("gold")(h.gold, m.interest(h)));
    const g = this.hudG.clear();
    const bar = (y: number, frac: number, col: number) => {
      g.fillStyle(0x000000, 0.55).fillRoundedRect(26, y, 202, 12, 5);
      if (frac > 0) g.fillStyle(col, 1).fillRoundedRect(26, y, Math.max(8, 202 * frac), 12, 5);
    };
    bar(146, h.hp / maxHpOf(m), 0x5bd36b);
    bar(196, b.hp / maxHpOf(m), 0xe0533d);
    // XP ring: dark track, blue progress clockwise from the top
    const frac = need ? h.xp / need : 1;
    g.lineStyle(9, 0x000000, 0.55).beginPath().arc(RING.x, RING.y, RING.r, 0, Math.PI * 2).strokePath();
    if (frac > 0) g.lineStyle(9, need ? 0x6fb6ff : 0xffcc3c, 1).beginPath().arc(RING.x, RING.y, RING.r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * frac).strokePath();
    g.lineStyle(2, GOLD, 0.8).strokeCircle(RING.x, RING.y, RING.r + 6);
    this.drawLock();
    this.updateCounter();
  }

  /** what buying one more copy does: owned at all, and the ★ it would merge into (1 = no merge) – PO 20 Nov 2026 */
  private upgradeOnBuy(id: number): { owned: boolean; star: 1 | 2 | 3 } {
    const units = this.match.human.team.units().filter((u) => u.speciesId === id);
    let c1 = units.filter((u) => u.star === 1).length + 1, c2 = units.filter((u) => u.star === 2).length, star: 1 | 2 | 3 = 1;
    if (c1 >= 3) { c1 -= 3; c2++; star = 2; }
    if (star === 2 && c2 >= 3) star = 3;
    return { owned: units.length > 0, star };
  }

  /** soft glow frame drawn once: a white rounded rectangle with a blur, tinted per card */
  private glowTexture() {
    const key = "fx:cardglow";
    if (this.textures.exists(key)) return key;
    const pad = 18, w = CARD_W + pad * 2, h = CARD_H + pad * 2;
    const tex = this.textures.createCanvas(key, w, h)!, g = tex.getContext();
    g.shadowColor = "#ffffff"; g.shadowBlur = 14; g.strokeStyle = "#ffffff"; g.lineWidth = 5;
    for (let i = 0; i < 2; i++) { g.beginPath(); g.roundRect(pad - 2, pad - 2, CARD_W + 4, CARD_H + 4, 12); g.stroke(); }
    tex.refresh();
    return key;
  }

  /** highlight on a shop card: owned (soft glow), buying makes ★2 (gold pulse) or ★3 (shimmering pulse + light sweep) */
  private highlightCard(c: Phaser.GameObjects.Container, id: number) {
    const { owned, star } = this.upgradeOnBuy(id);
    if (!owned && star === 1) return;
    const glow = this.add.image(0, 0, this.glowTexture()).setBlendMode(Phaser.BlendModes.ADD);
    c.addAt(glow, 0);
    if (star === 1) {
      glow.setTint(0xfff1c4).setAlpha(0.45);
      this.tweens.add({ targets: glow, alpha: 0.8, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      return;
    }
    const gold = star === 2 ? 0xffd84a : 0xffb030;
    glow.setTint(gold).setAlpha(0.75);
    this.tweens.add({ targets: glow, alpha: 1, scaleX: 1.04, scaleY: 1.03, duration: star === 2 ? 650 : 420, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    const badge = this.add.text(0, -CARD_H / 2 - 2, "★".repeat(star), {
      fontFamily: FONT_LOGO, fontSize: star === 3 ? "19px" : "17px", fontStyle: "800", color: star === 3 ? "#fff3b0" : "#ffe27a",
      backgroundColor: "#2b1d14", padding: { x: 7, y: 1 },
    }).setOrigin(0.5).setStroke("#2b1d14", 3);
    c.add(badge);
    this.tweens.add({ targets: badge, scale: 1.12, duration: 520, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    if (star === 3) {
      // shimmering colours and a light sweep across the card
      this.cardFx.push(this.tweens.addCounter({ from: 0, to: 360, duration: 1800, repeat: -1, onUpdate: (tw) => {
        if (!glow.active) return;
        const col = Phaser.Display.Color.HSVToRGB(((tw.getValue() ?? 0) % 360) / 360, 0.45, 1) as Phaser.Types.Display.ColorObject;
        glow.setTint(Phaser.Display.Color.GetColor(col.r, col.g, col.b));
      } }));
      const sweep = this.add.rectangle(-CARD_W / 2 + 10, 0, 16, CARD_H - 8, 0xffffff, 0.22).setAngle(12).setBlendMode(Phaser.BlendModes.ADD);
      c.add(sweep);
      this.tweens.add({ targets: sweep, x: CARD_W / 2 - 10, duration: 900, repeat: -1, repeatDelay: 600, ease: "Quad.easeInOut" });
    }
  }

  /** colour-cycle tweens of the ★3 highlight (not tied to a game object, so stopped by hand on redraw) */
  private cardFx: Phaser.Tweens.Tween[] = [];

  /** the info card is open for a shop card (closed when the cards are redrawn: their 'pointerout' never comes) */
  private shopCardOpen = false;
  private drawCards() {
    if (this.shopCardOpen) { this.card.hide(); this.shopCardOpen = false; }
    for (const tw of this.cardFx) tw.stop();
    this.cardFx = [];
    for (const c of this.cards) { this.tweens.killTweensOf([c, ...c.list]); c.destroy(); }
    this.cards = [];
    const m = this.match, p = m.human;
    p.shop.forEach((id, slot) => {
      const x = CARD_X0 + CARD_W / 2 + slot * CARD_STEP, y = STRIP_CY;
      const c = this.add.container(x, y).setDepth(5001);
      const g = this.add.graphics();
      c.add(g);
      this.cards.push(c);
      if (id == null) {
        g.lineStyle(2, 0xffffff, 0.15).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
        return;
      }
      const sp = m.sp(id);
      const col = TIER_COL[sp.tier] ?? 0xffffff;
      const ok = m.canBuy(p, slot, this.fighting);
      // portrait card: tier-coloured art area on top, name + code/role below
      const ART_H = 90;
      g.fillStyle(0x1b120c, 0.96).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      g.fillStyle(col, 0.3).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, ART_H, { tl: 10, tr: 10, bl: 0, br: 0 });
      g.lineStyle(3, col, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      const { tex } = texturesFor(this, this.data_, sp, "front");
      const feetY = -CARD_H / 2 + ART_H + 4;
      const img = this.add.image(0, feetY, tex.body, tex.bodyFrame).setOrigin(0.5, 1);
      const base = Math.min(108 / img.width, 108 / img.height);
      img.setScale(base);
      const code = vcode(this.data_, sp) ?? "";
      const name = this.add.text(0, -CARD_H / 2 + ART_H + 3, shortName(sp.vi), { fontFamily: FONT_UI, fontSize: "16px", color: CREAM, fontStyle: "bold" }).setOrigin(0.5, 0);
      const sub = this.add.text(0, CARD_H / 2 - 20, `${code} · ${sp.role ?? ""}`, { fontFamily: FONT_UI, fontSize: "11.5px", color: "#d8cbb0" }).setOrigin(0.5, 0);
      const cost = this.add.text(CARD_W / 2 - 7, -CARD_H / 2 + 4, `● ${sp.tier}`, { fontFamily: FONT_LOGO, fontSize: "20px", color: "#ffd84a", fontStyle: "800" }).setOrigin(1, 0).setShadow(1, 1, "#000", 3);
      const have = p.team.units().filter((u) => u.speciesId === id).reduce((n, u) => n + 3 ** (u.star - 1), 0);
      c.add([img, name, sub, cost]);
      if (have) c.add(this.add.text(-CARD_W / 2 + 7, -CARD_H / 2 + 6, t("owned")(have), { fontFamily: FONT_UI, fontSize: "12px", color: "#9df0a8", fontStyle: "bold", backgroundColor: "#1b120cc0", padding: { x: 4, y: 1 } }));
      c.setAlpha(ok ? 1 : 0.45);
      this.highlightCard(c, id);
      const hit = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      // hover: the VieAni wiggles on its feet (PO request) and the info card opens beside the shop card
      let wiggle: Phaser.Tweens.Tween | null = null;
      hit.on("pointerover", () => {
        c.setScale(1.04);
        wiggle?.stop();
        img.setAngle(-6);
        wiggle = this.tweens.add({ targets: img, angle: 6, scaleX: base * 1.06, scaleY: base * 0.95, duration: 140, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.card.show(this.shopSubject(id), x, y);
        this.card.placeBottomRight(SCREEN_W - 10, SHOP_TOP_SCREEN - 6); // empty space right of the board
        this.shopCardOpen = true;
      });
      hit.on("pointerout", () => {
        c.setScale(1);
        wiggle?.stop(); wiggle = null;
        img.setAngle(0).setScale(base);
        this.card.hide();
        this.shopCardOpen = false;
      });
      hit.on("pointerup", () => this.buy(slot));
      c.add(hit);
    });
  }

  /** info card for a shop offer: ★1 values, synergy counts with our current board */
  private shopSubject(id: number): CardSubject {
    const sp = this.data_.byId.get(id)!;
    const onBoard = new Set(this.team.toPlaced().map((u) => u.speciesId));
    onBoard.add(id);
    const synergies = this.data_.synergies.filter((g) => g.members.includes(id))
      .map((g) => [g.name, g.members.filter((m) => onBoard.has(m)).length, Object.keys(g.tiers).map(Number).sort((a, b) => a - b)] as [string, number, number[]]);
    return {
      sp, code: vcode(this.data_, sp), tex: texturesFor(this, this.data_, sp, "front").tex.body, texFrame: texturesFor(this, this.data_, sp, "front").tex.bodyFrame, star: 1, side: "A",
      hp: null, maxHp: battleMaxHp(sp, 1), energy: 0, where: "shop", fighting: false, dead: false, synergies,
    };
  }

  /** the shop strip handles its own hover (cards) */
  protected hoverAt(x: number, y: number) {
    if (y >= SHOP_TOP_SCREEN) return;
    super.hoverAt(x, y);
  }

  // ------------------------------------------------------------------ shop lock (PO request)
  private lockBtn!: Phaser.GameObjects.Container;
  private lockG!: Phaser.GameObjects.Graphics;
  private lockFrame!: Phaser.GameObjects.Graphics;

  private buildLock(depth: number) {
    this.lockG = this.add.graphics();
    const hit = this.add.zone(0, 0, LOCK.w, LOCK.h).setInteractive({ useHandCursor: true });
    hit.on("pointerup", () => this.toggleLock());
    this.lockBtn = this.add.container(LOCK.x, LOCK.y, [this.lockG, hit]).setDepth(depth + 2);
    this.lockFrame = this.add.graphics().setDepth(depth + 2);
  }

  private toggleLock() {
    const p = this.match.human;
    p.locked = !p.locked;
    toast(this, p.locked ? t("lockedOn") : t("lockedOff"));
    this.drawLock();
  }

  /** padlock button (closed + blue when locked) and a blue frame around the locked offers */
  private drawLock() {
    if (!this.lockG) return;
    const on = this.match.human.locked, g = this.lockG.clear();
    g.fillStyle(on ? 0x2f74c8 : 0x1b120c, 1).fillRoundedRect(-LOCK.w / 2, -LOCK.h / 2, LOCK.w, LOCK.h, 8);
    g.lineStyle(2, on ? 0xbfe0ff : GOLD, 1).strokeRoundedRect(-LOCK.w / 2, -LOCK.h / 2, LOCK.w, LOCK.h, 8);
    const col = on ? 0xffffff : 0xe7c05f;
    g.fillStyle(col, 1).fillRoundedRect(-8, -2, 16, 11, 2);
    g.lineStyle(2.5, col, 1).beginPath();
    if (on) g.arc(0, -2, 5, Math.PI, 0); else g.arc(6, -5, 5, Math.PI * 1.05, Math.PI * 0.05);
    g.strokePath();
    this.lockFrame.clear();
    if (on) {
      const x0 = CARD_X0 - 6, x1 = CARD_X0 + 4 * CARD_STEP + CARD_W + 6;
      this.lockFrame.lineStyle(3, 0x6fb6ff, 1).strokeRoundedRect(x0, MATCH_SHOP_TOP + 3, x1 - x0, STRIP_H - 6, 12);
    }
  }

  // ------------------------------------------------------------------ Linh Vật charms + Ấn Thống Nhất (top right)
  private charmObjs: Phaser.GameObjects.GameObject[] = [];
  private charmSig = "";

  private refreshCharms() {
    if (!this.txt.round?.active) return;
    const m = this.match, p = m.human, on = m.unityActive(p);
    const sig = p.charms.join(",") + (on ? "!" : "");
    if (sig === this.charmSig && this.charmObjs.every((o) => o.active)) return;
    this.charmSig = sig;
    for (const o of this.charmObjs) o.destroy();
    this.charmObjs = [];
    const x0 = SCREEN_W - 14 - 3 * 34, y = 40;
    const g = this.add.graphics().setDepth(5001);
    g.fillStyle(WOOD, 0.88).fillRoundedRect(x0 - 112, y - 19, 3 * 34 + 120, 38, 10)
      .lineStyle(2, on ? 0xffd84a : GOLD, on ? 1 : 0.6).strokeRoundedRect(x0 - 112, y - 19, 3 * 34 + 120, 38, 10);
    this.charmObjs.push(g);
    const label = this.add.text(x0 - 104, y, on ? "ẤN THỐNG NHẤT ✓" : `Linh Vật ${p.charms.length}/3`, { fontFamily: FONT_UI, fontSize: "12px", color: on ? "#ffd84a" : CREAM, fontStyle: "bold" })
      .setOrigin(0, 0.5).setDepth(5002);
    this.charmObjs.push(label);
    C.CHARM_ITEM_IDS.forEach((id, k) => {
      const x = x0 + k * 34 + 15;
      const have = p.charms.includes(id);
      const im = this.add.image(x, y, `item:${id}`).setDisplaySize(30, 30).setDepth(5002).setAlpha(have ? 1 : 0.22);
      im.setInteractive({ useHandCursor: true });
      im.on("pointerover", () => this.showCharmTip(id, x, y + 24));
      im.on("pointerout", () => this.hideItemTip());
      this.charmObjs.push(im);
    });
    if (on) {
      const glow = this.add.rectangle(x0 - 112 + (3 * 34 + 120) / 2, y, 3 * 34 + 120, 38).setStrokeStyle(3, 0xffd84a, 1).setDepth(5003);
      this.tweens.add({ targets: glow, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
      this.charmObjs.push(glow);
    }
  }

  private showCharmTip(id: number, x: number, y: number) {
    this.hideItemTip();
    const it = this.itemData(id), m = this.match, p = m.human;
    const [lo, hi] = C.CHARM_ROUND_WINDOWS[id];
    const rounds = C.ITEM_ROUNDS.filter((r) => r >= lo && r <= hi).join(", ");
    const need = [
      `${p.level >= C.MAX_LEVEL ? "✓" : "✗"} Cấp 10 (đang ${p.level})`,
      `${p.team.toPlaced().some((u) => u.speciesId === RONG_LAC_VIET) ? "✓" : "✗"} Rồng Lạc Việt trên sân`,
      `${C.CHARM_ITEM_IDS.every((c) => p.charms.includes(c)) ? "✓" : "✗"} Đủ 3 Linh Vật (${p.charms.length}/3)`,
    ].join("\n");
    const W = 300, box = this.add.container(0, 0).setDepth(9600);
    const title = this.add.text(12, 10, it.name + (p.charms.includes(id) ? "  ✓" : ""), { fontFamily: FONT_UI, fontSize: "15px", color: "#ffe6a3", fontStyle: "bold" });
    const sub = this.add.text(12, 31, `Xuất hiện ở phần thưởng vòng ${rounds}`, { fontFamily: FONT_UI, fontSize: "11.5px", color: "#cdbb98", fontStyle: "bold" });
    const body = this.add.text(12, 52, `Ấn Thống Nhất – 2 con giáp còn thiếu trên sân được tính là có mặt khi:\n${need}`, { fontFamily: FONT_UI, fontSize: "12.5px", color: CREAM, wordWrap: { width: W - 24 }, lineSpacing: 3 });
    const h = 52 + body.height + 12;
    const g = this.add.graphics();
    g.fillStyle(0x1b120c, 0.97).fillRoundedRect(0, 0, W, h, 10).lineStyle(2, GOLD, 0.9).strokeRoundedRect(0, 0, W, h, 10);
    box.add([g, title, sub, body]);
    // (x, y) is a HUD layout point: place the (scaled) tooltip at its screen position
    const at = hudToScreen(x, y), s = UI_SCALE;
    box.setScale(s).setPosition(Phaser.Math.Clamp(at.x - (W * s) / 2, 6, SCREEN_W - W * s - 6), at.y);
    this.itemTip = box;
  }

  /** demo: what the computer did on the way, shown at the start */
  private showDemoBanner() {
    const d = this.demo;
    if (!d || d.shown) return;
    d.shown = true;
    const box = this.add.container(0, 0).setDepth(9100); // under the tộc hệ details (9200)
    const W = 520, lines = [`Máy tự chơi phía dưới (chiến thuật Ấn Thống Nhất) – đạt ở vòng ${d.round}`, ...d.log];
    const txt = this.add.text(18, 14, lines.join("\n"), { fontFamily: FONT_UI, fontSize: "14px", color: CREAM, fontStyle: "bold", lineSpacing: 5, wordWrap: { width: W - 36 } });
    txt.setColor("#fff3d6");
    const h = txt.height + 28;
    const g = this.add.graphics();
    g.fillStyle(0x1b120c, 0.94).fillRoundedRect(0, 0, W, h, 12).lineStyle(3, 0xffd84a, 1).strokeRoundedRect(0, 0, W, h, 12);
    const close = this.add.text(W - 14, 8, "✕", { fontFamily: FONT_UI, fontSize: "16px", color: "#ffe6a3" }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    close.on("pointerup", () => box.destroy());
    box.add([g, txt, close]);
    box.setPosition(SCREEN_W / 2 - W / 2 - 40, 60);
  }

  private refreshAll() {
    this.drawCards();
    this.refreshHud();
    this.refreshBag();
    this.refreshEquipped();
  }

  // ------------------------------------------------------------------ items (PO, 17 Nov 2026)
  private bagObjs: Phaser.GameObjects.GameObject[] = [];
  private equipObjs: Phaser.GameObjects.GameObject[] = [];
  private itemModal?: Phaser.GameObjects.Container;
  private itemTip?: Phaser.GameObjects.Container;
  private equipSig = "";

  private itemData(id: number) { return this.data_.items.find((i) => i.id === id)!; }

  /** bag (10 slots) + 2 team slots, in a panel under the left HUD; drag a bag item onto one of our VieAni to equip */
  private buildBag() {
    const g = this.add.graphics().setDepth(4999);
    g.fillStyle(WOOD, 0.86).fillRoundedRect(10, BAG.y, 234, BAG.h, 14).lineStyle(2, GOLD, 0.8).strokeRoundedRect(10, BAG.y, 234, BAG.h, 14);
    this.add.text(22, BAG.y + 10, "VẬT PHẨM", { fontFamily: FONT_LOGO, fontSize: "15px", color: "#ffe6a3", fontStyle: "800" }).setDepth(5000).setShadow(1, 1, "#000", 2);
    this.add.text(BAG.teamX - 8, BAG.y + 13, "Toàn đội", { fontFamily: FONT_UI, fontSize: "11px", color: "#cdbb98", fontStyle: "bold" }).setOrigin(1, 0).setDepth(5000);
    this.bagObjs = [];
    this.refreshBag();
  }

  private slotRect(g: Phaser.GameObjects.Graphics, x: number, y: number, size: number, team = false) {
    g.fillStyle(0x0f0a07, 0.85).fillRoundedRect(x, y, size, size, 8);
    g.lineStyle(team ? 2 : 1.5, team ? 0x6fb6ff : 0x8a7350, team ? 0.9 : 0.7).strokeRoundedRect(x, y, size, size, 8);
  }

  private refreshBag() {
    if (!this.txt.round?.active) return;
    for (const o of this.bagObjs) o.destroy();
    this.bagObjs = [];
    const p = this.match.human;
    const g = this.add.graphics().setDepth(5000);
    this.bagObjs.push(g);
    // team slots
    for (let k = 0; k < C.TEAM_ITEM_SLOTS; k++) {
      const x = BAG.teamX + k * (BAG.team + 6), y = BAG.y + 6;
      this.slotRect(g, x, y, BAG.team, true);
      const id = p.teamItems[k];
      if (id != null) this.itemIcon(id, x + BAG.team / 2, y + BAG.team / 2, BAG.team - 4, false);
    }
    // bag
    for (let k = 0; k < C.INVENTORY_MAX; k++) {
      const x = 20 + (k % 5) * (BAG.slot + 6), y = BAG.y + 40 + Math.floor(k / 5) * (BAG.slot + 6);
      this.slotRect(g, x, y, BAG.slot);
      const id = p.items[k];
      if (id != null) this.itemIcon(id, x + BAG.slot / 2, y + BAG.slot / 2, BAG.slot - 4, true, k);
    }
  }

  /** an item icon with a tooltip; bag items can be dragged onto a VieAni */
  private itemIcon(id: number, x: number, y: number, size: number, draggable: boolean, bagIndex = -1) {
    const im = this.add.image(x, y, `item:${id}`).setDisplaySize(size, size).setDepth(5001);
    this.bagObjs.push(im);
    im.setInteractive({ useHandCursor: true, draggable });
    im.on("pointerover", () => this.showItemTip(id, x, y - size / 2 - 6));
    im.on("pointerout", () => this.hideItemTip());
    if (!draggable) return im;
    im.on("dragstart", () => { if (this.fighting) return; this.hideItemTip(); im.setDepth(9000).setScale(im.scale * 1.15); });
    im.on("drag", (pt: Phaser.Input.Pointer) => {
      if (this.fighting) return;
      im.setPosition(pt.x, pt.y);
      const v = this.viewAt(pt.x, pt.y);
      this.highlight.clear();
      if (v && v.side === "A") {
        const b = v.sprite.getBounds();
        this.highlight.lineStyle(3, 0xffd84a, 1).strokeRoundedRect(b.x + b.width * 0.15, b.y + b.height * 0.2, b.width * 0.7, b.height * 0.78, 10);
      }
    });
    im.on("dragend", (pt: Phaser.Input.Pointer) => {
      this.highlight.clear();
      if (this.fighting) return this.refreshBag();
      const m = this.match, p = m.human;
      const v = this.viewAt(pt.x, pt.y);
      const ph = screenToHud(pt.x, pt.y);
      const overTeam = ph.y >= BAG.y && ph.y <= BAG.y + 6 + BAG.team && ph.x >= BAG.teamX - 4;
      if (m.isTeamItem(id)) {
        if (m.equipTeam(p, bagIndex)) toast(this, `${this.itemData(id).name}: tác dụng cho cả đội`);
        else toast(this, "Hết ô Toàn đội (tối đa 2)");
      } else if (v && v.side === "A") {
        const sp = this.data_.byId.get(v.speciesId)!;
        m.equip(p, bagIndex, v.uid);
        const rule = this.itemData(id);
        toast(this, `${shortName(sp.vi)} mang ${rule.name}` + ((ITEM_RANGED.has(id) && sp.range < 2) ? " (chỉ có tác dụng với VieAni đánh xa!)" : ""));
      } else if (overTeam) toast(this, "Chỉ vật phẩm Toàn đội mới đặt được vào ô này");
      this.syncItems();
    });
    return im;
  }

  private showItemTip(id: number, x: number, y: number) {
    this.hideItemTip();
    const it = this.itemData(id);
    const box = this.add.container(0, 0).setDepth(9600);
    const W = 250;
    const title = this.add.text(12, 10, it.name, { fontFamily: FONT_UI, fontSize: "15px", color: "#ffe6a3", fontStyle: "bold" });
    const sub = this.add.text(12, 31, it.cat === "LV" ? "Linh Vật · không chiếm ô vật phẩm" : `Bậc ${it.tier} · ${ITEM_CAT[it.cat] ?? it.cat}`, { fontFamily: FONT_UI, fontSize: "11.5px", color: "#cdbb98", fontStyle: "bold" });
    const body = this.add.text(12, 50, it.effect, { fontFamily: FONT_UI, fontSize: "12.5px", color: CREAM, wordWrap: { width: W - 24 }, lineSpacing: 2 });
    const h = 50 + body.height + 12;
    const g = this.add.graphics();
    g.fillStyle(0x1b120c, 0.97).fillRoundedRect(0, 0, W, h, 10).lineStyle(2, GOLD, 0.9).strokeRoundedRect(0, 0, W, h, 10);
    box.add([g, title, sub, body]);
    // (x, y) is a HUD layout point: place the (scaled) tooltip above it on the screen
    const at = hudToScreen(x, y), s = UI_SCALE;
    box.setScale(s).setPosition(Phaser.Math.Clamp(at.x - (W * s) / 2, 6, SCREEN_W - W * s - 6), Phaser.Math.Clamp(at.y - h * s, 6, SCREEN_H - h * s - 6));
    this.itemTip = box;
  }

  private hideItemTip() { this.itemTip?.destroy(); this.itemTip = undefined; }

  /** after equipping / selling / merging: badges on our VieAni, bag, list on the right */
  private syncItems() {
    for (const u of this.team.units()) { const v = this.views.get(u.uid); if (v) { v.item = u.item; this.drawHp(v); } }
    this.refreshBag();
    this.refreshEquipped();
  }

  /** right side, under the tộc hệ: which VieAni carries which item (+ team items) */
  private refreshEquipped() {
    if (!this.txt.round?.active) return;
    const carriers = this.team.units().filter((u) => u.item != null);
    const sig = carriers.map((u) => `${u.uid}:${u.item}`).join("|") + "/" + this.match.human.teamItems.join(",") + "/" + this.synRows.length;
    if (sig === this.equipSig && this.equipObjs.every((o) => o.active)) return;
    this.equipSig = sig;
    for (const o of this.equipObjs) o.destroy();
    this.equipObjs = [];
    const rows: { id: number; label: string; tex?: { key: string; frame?: number } }[] = [
      ...this.match.human.teamItems.map((id) => ({ id, label: "Toàn đội" })),
      ...carriers.map((u) => {
        const sp = this.data_.byId.get(u.speciesId)!;
        const t = texturesFor(this, this.data_, sp, "front").tex;
        return { id: u.item!, label: shortName(sp.vi) + (this.team.locate(u.uid)?.where === "bench" ? " (chờ)" : ""), tex: { key: t.body, frame: t.bodyFrame } };
      }),
    ];
    if (!rows.length) return;
    const top = SYN_Y0 + this.synRows.length * SYN_STEP + (this.synRows.length ? 4 : -20);
    const step = Math.min(40, (MATCH_SHOP_TOP - 10 - (top + 22)) / rows.length);
    const head = this.add.text(SYN_X + SYN_ICON_PX / 2, top, "VẬT PHẨM ĐANG MANG", { fontFamily: FONT_UI, fontSize: "11px", color: "#ffe6a3", fontStyle: "bold" })
      .setOrigin(1, 0).setDepth(5002).setShadow(1, 1, "#000", 2);
    this.equipObjs.push(head);
    rows.forEach((r, i) => {
      const y = top + 22 + i * step + step / 2;
      const c = this.add.container(SYN_X, y).setDepth(5002);
      const icon = this.add.image(0, 0, `item:${r.id}`).setDisplaySize(30, 30);
      const label = this.add.text(-24, 0, r.label, { fontFamily: FONT_UI, fontSize: "12.5px", color: CREAM, fontStyle: "bold" }).setOrigin(1, 0.5);
      const pw = label.width + (r.tex ? 46 : 18);
      const bg = this.add.graphics();
      bg.fillStyle(WOOD, 0.85).fillRoundedRect(-18 - pw, -15, pw + 4, 30, 9);
      c.add(bg);
      if (r.tex) {
        const pic = this.add.image(-24 - label.width - 16, 13, r.tex.key, r.tex.frame).setOrigin(0.5, 1);
        pic.setScale(30 / Math.max(pic.width, pic.height));
        c.add(pic);
      }
      c.add([label, icon]);
      const hit = this.add.zone(-pw / 2, 0, pw + 36, 30).setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => this.showItemTip(r.id, SYN_X - 120, y - 16));
      hit.on("pointerout", () => this.hideItemTip());
      c.add(hit);
      this.equipObjs.push(c);
    });
  }

  /** item reward: choose 1 of 3 (round start); the fight button picks the first one if the player has not chosen */
  private showItemChoice() {
    const offer = this.match.human.itemOffer;
    if (!offer || this.fighting) return;
    this.itemModal?.destroy();
    const box = this.add.container(0, 0).setDepth(9400);
    box.add(this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.55).setInteractive());
    const tier = this.itemData(offer[0]).tier;
    box.add(this.add.text(SCREEN_W / 2, 118, `Phần thưởng vòng ${this.match.round}: chọn 1 vật phẩm (bậc ${tier})`, { fontFamily: FONT_LOGO, fontSize: "28px", color: "#ffe6a3", fontStyle: "800" })
      .setOrigin(0.5).setShadow(1, 2, "#000", 4));
    // cards grow to fit the longest effect text (Linh Vật descriptions are long – PO 20 Nov 2026), all three the same height
    const CW = 270, MIN_H = 290, gap = 26;
    const cards = offer.map((id, k) => {
      const it = this.itemData(id);
      const c = this.add.container(SCREEN_W / 2 + (k - (offer.length - 1) / 2) * (CW + gap), 0);
      const g = this.add.graphics();
      // laid out from the card's top edge (y = 0), centred afterwards
      const ic = this.add.image(0, 62, `item:${id}`).setDisplaySize(92, 92);
      const name = this.add.text(0, 118, it.name, { fontFamily: FONT_UI, fontSize: "18px", color: "#ffe6a3", fontStyle: "bold", align: "center", wordWrap: { width: CW - 30 } }).setOrigin(0.5, 0);
      const sub = this.add.text(0, name.y + name.height + 4, it.cat === "LV" ? "LINH VẬT – mảnh Ấn Thống Nhất" : `Bậc ${it.tier} · ${ITEM_CAT[it.cat] ?? it.cat}` + (this.match.isTeamItem(id) ? " – không cần người mang" : ""),
        { fontFamily: FONT_UI, fontSize: "12px", color: "#cdbb98", fontStyle: "bold", align: "center", wordWrap: { width: CW - 30 } }).setOrigin(0.5, 0);
      const eff = this.add.text(0, sub.y + sub.height + 10, it.effect, { fontFamily: FONT_UI, fontSize: "13.5px", color: CREAM, align: "center", wordWrap: { width: CW - 34 }, lineSpacing: 3 }).setOrigin(0.5, 0);
      c.add([g, ic, name, sub, eff]);
      return { id, k, it, c, g, need: eff.y + eff.height + 18 };
    });
    const CH = Math.max(MIN_H, ...cards.map((x) => x.need));
    // keep the cards below the title (y 118) and above the shop
    const cy = Math.min(Math.max(330, 152 + CH / 2), SCREEN_H - 12 - CH / 2);
    for (const { id, k, it, c, g } of cards) {
      c.setY(cy);
      for (const o of c.list as (Phaser.GameObjects.Components.Transform & Phaser.GameObjects.GameObject)[]) if (o !== g) o.y -= CH / 2;
      g.fillStyle(0x1b120c, 0.97).fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 16).lineStyle(3, GOLD, 0.9).strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, 16);
      const hit = this.add.zone(0, 0, CW, CH).setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => c.setScale(1.04));
      hit.on("pointerout", () => c.setScale(1));
      hit.on("pointerup", () => {
        this.match.chooseItem(this.match.human, k);
        this.itemModal?.destroy(); this.itemModal = undefined;
        toast(this, this.match.isCharm(id) ? `${it.name}: mảnh Ấn Thống Nhất (${this.match.human.charms.length}/3)` : this.match.isTeamItem(id) ? `${it.name}: đặt vào ô Toàn đội` : `${it.name} vào túi – kéo lên một VieAni để trang bị`);
        this.syncItems();
      });
      c.add(hit);
      box.add(c);
    }
    this.itemModal = box;
  }

  // ------------------------------------------------------------------ shop actions
  private buy(slot: number) {
    const m = this.match, p = m.human, id = p.shop[slot];
    if (id == null) return;
    if (p.gold < m.cost(id)) return toast(this, t("noGold"));
    const up = m.buy(p, slot, this.fighting); // during a fight only bench copies merge; the rest merge after it
    if (!up) return toast(this, t("benchFull"));
    this.syncUnits(up);
    this.refreshAll();
  }

  private reroll() {
    if (!this.match.reroll(this.match.human)) return toast(this, t("noGold"));
    this.refreshAll();
  }

  private buyXp() {
    const p = this.match.human;
    if (p.level >= C.MAX_LEVEL) return toast(this, t("maxLevel"));
    const before = p.level;
    if (!this.match.buyXp(p)) return toast(this, t("noGold"));
    this.refreshAll();
    if (p.level > before) {
      toast(this, t("levelUp")(p.level));
      this.tweens.add({ targets: this.txt.level, scale: { from: 1.7, to: 1 }, duration: 450, ease: "Back.easeOut" });
    }
  }

  /** make the views match the team after buying / merging; `upgraded` units celebrate */
  private syncUnits(upgraded: number[]) {
    const alive = new Map(this.team.units().map((u) => [u.uid, u]));
    for (const [uid, v] of this.views) if (v.side === "A" && !alive.has(uid)) { v.anim.destroy(); this.views.delete(uid); }
    for (const u of alive.values()) {
      let v = this.views.get(u.uid);
      if (!v) { v = this.spawn(u, "A"); this.place(v, this.team.locate(u.uid)!, false); }
      if (v.anim.star !== u.star) {
        v.anim.setStar(u.star);
        v.maxHp = v.hp = battleMaxHp(this.data_.byId.get(u.speciesId)!, u.star);
      }
      v.item = u.item;
    }
    for (const uid of upgraded) {
      const v = this.views.get(uid), u = alive.get(uid);
      if (!v || !u) continue;
      void v.anim.cast(0xffd84a);
      toast(this, t("merged")(shortName(this.data_.byId.get(u.speciesId)!.vi), u.star));
    }
    this.layout(true);
  }

  // ------------------------------------------------------------------ selling (drag onto the shop)
  protected onDragMove(p: Phaser.Input.Pointer, v: View) {
    const u = this.team.units().find((x) => x.uid === v.uid);
    if (!u) return;
    this.sellText.setText(t("sellHere")(this.match.sellValue(u)));
    this.sellZone.setVisible(true).setAlpha(p.y >= SHOP_TOP_SCREEN ? 1 : 0.55);
    v.c.setDepth(5200); // keep the dragged VieAni above the sell zone
  }

  protected onDrop(p: Phaser.Input.Pointer, v: View): boolean {
    this.sellZone.setVisible(false);
    if (p.y < SHOP_TOP_SCREEN) return false;
    const gold = this.match.sell(this.match.human, v.uid);
    v.anim.destroy();
    this.views.delete(v.uid);
    toast(this, t("sold")(gold));
    this.refreshAll();
    return true;
  }

  // ------------------------------------------------------------------ round
  private startTimer() {
    this.txt.timer.setText("");
    if (settings.relaxed) return;
    this.timeLeft = C.PREP_SECONDS;
    this.txt.timer.setText("⏱ " + t("prep")(this.timeLeft));
    this.time.addEvent({
      delay: 1000, repeat: C.PREP_SECONDS - 1, callback: () => {
        if (this.fighting) return;
        this.timeLeft--;
        this.txt.timer.setText("⏱ " + t("prep")(this.timeLeft));
        if (this.timeLeft <= 0) this.fight();
      },
    });
  }

  protected fight() {
    if (this.fighting) return;
    const m = this.match;
    if (m.human.itemOffer) { m.chooseItem(m.human, 0); this.itemModal?.destroy(); this.itemModal = undefined; }
    this.hideItemTip();
    this.sellZone.setVisible(false);
    if (m.autoFill(m.human).length) this.layout(false);
    m.botTurns();
    const seed = Math.floor(Math.random() * 1e9);
    const { units, res } = m.battle(seed);
    this.txt.timer.setText("");
    this.hint.setVisible(false);
    this.updateCounter();
    this.startBattle(units.filter((u) => u.side === "A"), units.filter((u) => u.side === "B"), seed, res);
    this.drawScoreboard(); // faded while fighting
  }

  protected afterBattle(res: BattleResult) {
    const rep = this.match.finishRound(res);
    // this battle's kills are now stored on the units (finishRound)
    for (const v of this.views.values()) v.battleKills = 0;
    this.refreshHud();
    if (this.match.over) this.showGameOver(rep);
    else this.showRoundPanel(rep);
  }

  private panel(title: string, color: string, lines: string[]) {
    const layer = this.add.container(0, 0).setDepth(6000);
    const dim = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.5);
    const big = this.add.text(SCREEN_W / 2, SCREEN_H / 2 - 90, title, { fontFamily: FONT_LOGO, fontSize: "92px", color, fontStyle: "800" })
      .setOrigin(0.5).setStroke("#2b1d14", 14).setShadow(0, 6, "#000", 10, true, true);
    const sub = this.add.text(SCREEN_W / 2, SCREEN_H / 2 + 10, lines.filter(Boolean).join("\n"), { fontFamily: FONT_UI, fontSize: "21px", color: CREAM, fontStyle: "bold", align: "center", lineSpacing: 8 })
      .setOrigin(0.5).setShadow(1, 1, "#000", 3);
    layer.add([dim, big, sub]);
    big.setScale(0.6);
    this.tweens.add({ targets: big, scale: 1, duration: 300, ease: "Back.easeOut" });
    return layer;
  }

  /** HUD at UI_SCALE (PO 27 Nov 2026, option B 75 %): the HUD keeps its full-size layout and one camera per screen area
   *  draws it smaller, anchored to that area's corner. HUD objects (depth 4999–5199) are drawn only by these cameras,
   *  everything else only by the main camera; this is re-checked every frame for objects created later. */
  private hudCams: Phaser.Cameras.Scene2D.Camera[] = [];
  private setupHudCameras() {
    for (const c of this.hudCams) this.cameras.remove(c);
    const s = UI_SCALE;
    const areas = HUD_REGIONS.map((r) => {
      const v = hudToScreen(r.x0, r.y0, s);
      return this.cameras.add(v.x, v.y, (r.x1 - r.x0) * s, (r.y1 - r.y0) * s).setOrigin(0, 0).setZoom(s).setScroll(r.x0, r.y0);
    });
    // drawn last: pop-ups, info card, round panels, dragged things and toasts (depth ≥ 5200) stay above the HUD
    const overlay = this.cameras.add(0, 0, SCREEN_W, SCREEN_H);
    this.hudCams = [...areas, overlay];
    const main = this.cameras.main, areaMask = areas.reduce((m, c) => m | c.id, 0);
    // cameraFilter = the cameras that must NOT draw (or hit-test) the object
    const filterFor = (d: number) => (d >= 5200 ? main.id | areaMask : d >= 4999 ? main.id | overlay.id : areaMask | overlay.id);
    const assign = (o: Phaser.GameObjects.GameObject, f: number) => {
      (o as unknown as { cameraFilter: number }).cameraFilter = f;
      if (o instanceof Phaser.GameObjects.Container) for (const ch of o.list) assign(ch, f);
    };
    const classify = () => {
      for (const o of this.children.list) assign(o, filterFor((o as unknown as { depth: number }).depth));
    };
    classify();
    this.events.off("postupdate", this.classifyHud);
    this.classifyHud = classify;
    this.events.on("postupdate", this.classifyHud);
  }
  private classifyHud = () => {};

  /** "❤ Bạn 68 · ❤ Già Làng Tây Nguyên 42" – the human and this round's opponent */
  private vsLine(rep: RoundReport) {
    const m = this.match;
    const opp = rep.opponent >= 0 ? m.players[rep.opponent] : m.bot;
    const name = m.players.length > 2 ? opp.name + (rep.ghost ? " " + t("ghostTag") : "") : t("opponent");
    return `❤ ${t("you")} ${m.human.hp}   ·   ❤ ${name} ${opp.hp}`;
  }

  /** "Bị loại: Nhà Nông (hạng 8)" + players left */
  private knockedOutLine(rep: RoundReport) {
    const m = this.match;
    if (m.players.length <= 2) return "";
    const out = rep.knockedOut.filter((i) => i !== 0).map((i) => `${m.players[i].name} (${t("placeShort")(m.players[i].place ?? 0)})`);
    return [out.length ? t("knockedOutLine")(out.join(", ")) : "", m.human.hp > 0 ? t("playersLeft")(m.aliveIdx().length) : ""].filter(Boolean).join("   ·   ");
  }

  /** top strip: every player with HP, best first; gold frame = you, red = this round's opponent, grey = knocked out */
  private drawScoreboard() {
    for (const o of this.scoreObjs) o.destroy();
    this.scoreObjs = [];
    const m = this.match;
    if (m.players.length <= 2) return;
    const top = 5000, w = 104, h = 42, gap = 6, x0 = 160, y0 = 5;
    const pr = m.humanPairing();
    const order = m.players.map((p, i) => ({ p, i }))
      .sort((a, b) => (b.p.hp > 0 ? 1 : 0) - (a.p.hp > 0 ? 1 : 0) || b.p.hp - a.p.hp || (a.p.place ?? 99) - (b.p.place ?? 99) || a.i - b.i);
    const maxHp = maxHpOf(m);
    order.forEach(({ p, i }, k) => {
      const x = x0 + k * (w + gap), out = p.hp <= 0, me = i === 0, opp = !!pr && pr.b === i;
      const g = this.add.graphics().setDepth(top);
      g.fillStyle(out ? 0x2a2420 : WOOD, 1).fillRoundedRect(x, y0, w, h, 8);
      g.lineStyle(me || opp ? 3 : 1.5, me ? GOLD : opp ? 0xe0533d : 0x8a7350, out ? 0.5 : 1).strokeRoundedRect(x, y0, w, h, 8);
      const col = out ? "#8a8078" : me ? "#ffe6a3" : CREAM;
      const label = (opp ? "⚔ " : "") + (me ? t("you") : m.shortName(p));
      // line 1: name; line 2: HP bar + HP (or the final place when knocked out)
      const nm = this.add.text(x + 7, y0 + 3, label, { fontFamily: FONT_UI, fontSize: "12.5px", color: col, fontStyle: "bold", fixedWidth: w - 12 }).setDepth(top);
      const hpTxt = this.add.text(x + w - 6, y0 + 22, out ? `#${p.place}` : String(p.hp), { fontFamily: FONT_UI, fontSize: "12.5px", color: out ? "#8a8078" : "#ffffff", fontStyle: "bold" })
        .setOrigin(1, 0).setDepth(top);
      const bw = w - 14 - 30;
      if (!out) {
        g.fillStyle(0x000000, 0.55).fillRoundedRect(x + 7, y0 + 27, bw, 7, 3);
        g.fillStyle(me ? 0x5bd36b : opp ? 0xe0533d : 0xd9a441, 1).fillRoundedRect(x + 7, y0 + 27, Math.max(4, bw * p.hp / maxHp), 7, 3);
      }
      // hover: full name + level
      const z = this.add.zone(x + w / 2, y0 + h / 2, w, h).setInteractive().setDepth(top);
      z.on("pointerover", () => { nm.setText(`${me ? t("you") : m.shortName(p)} · ${t("levelShort")} ${p.level}`); });
      z.on("pointerout", () => nm.setText(label));
      this.scoreObjs.push(g, nm, hpTxt, z);
    });
    // always opaque (PO 27 Nov 2026: the faded strip was hard to read); at 75 % it ends above the board grid
  }

  private showRoundPanel(rep: RoundReport) {
    const title = rep.winner === "A" ? t("win") : rep.winner === "B" ? t("lose") : t("draw");
    const color = rep.winner === "A" ? "#ffe6a3" : rep.winner === "B" ? "#ff8a7a" : "#e6e0d4";
    const { base, interest, streak, result } = rep.income;
    const layer = this.panel(title, color, [
      [rep.damage.A ? t("hpLost")(rep.damage.A) : "", rep.damage.B ? t("enemyHpLost")(rep.damage.B) : ""].filter(Boolean).join("   ·   "),
      t("income")(base, interest, streak, result, rep.winner === "A") + (rep.income.items ? `  · Lì Xì +${rep.income.items}` : ""),
      this.vsLine(rep),
      this.knockedOutLine(rep),
    ]);
    if (rep.levelUp) this.pendingToast = t("levelUp")(this.match.human.level);
    layer.add(button(this, SCREEN_W / 2, SCREEN_H / 2 + 120, 240, 56, t("nextRound"), () => this.scene.restart({}), true));
  }

  private showGameOver(rep: RoundReport) {
    const m = this.match, n = m.players.length;
    const won = m.human.hp > 0, both = m.players.every((p) => p.hp <= 0);
    const place = m.human.place ?? (won ? 1 : n);
    const title = n > 2 ? (place === 1 ? t("champion") : t("placeTitle")(place, n)) : both ? t("draw") : won ? t("champion") : t("eliminated");
    const layer = this.panel(title, place === 1 ? "#ffe6a3" : place <= 4 && n > 2 ? "#e6e0d4" : "#ff8a7a", [
      t("finalLine")(rep.round),
      n > 2 ? t("placeLine")(place, n) : this.vsLine(rep),
      this.knockedOutLine(rep),
    ]);
    layer.add(button(this, SCREEN_W / 2 - 130, SCREEN_H / 2 + 110, 220, 56, t("playAgain"), () => this.scene.restart({ fresh: true }), true));
    layer.add(button(this, SCREEN_W / 2 + 130, SCREEN_H / 2 + 110, 220, 56, "← " + t("back"), () => this.scene.start("title")));
  }
}

function maxHpOf(m: Match) {
  if (m.players.length > 2) return Math.max(m.startHp, ...m.players.map((p) => p.hp));
  return Math.max(m.startHp, m.human.hp, m.bot.hp);
}

const ZODIAC_ORDER = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
/** the zodiac signs Ấn Thống Nhất fills in (the first missing ones, in zodiac order) */
function missingSigns(a: SynergyState): string[] {
  const have = new Set(a.present.map((s) => s.zodiac));
  return ZODIAC_ORDER.filter((z) => !have.has(z)).slice(0, a.bonus);
}
