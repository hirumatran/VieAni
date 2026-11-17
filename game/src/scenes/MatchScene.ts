import Phaser from "phaser";
import { maxHp as battleMaxHp, type BattleResult } from "../core/battle";
import * as C from "../core/config";
import type { GameData } from "../core/data";
import { settings, t } from "../core/i18n";
import { MATCH_BENCH_CORNERS, MATCH_BOARD_CORNERS, MATCH_SHOP_TOP, SCREEN_H, SCREEN_W } from "../core/layout";
import { RONG_LAC_VIET, TEST_CODES, testMatch, type Match, type RoundReport } from "../core/match";
import type { Team } from "../core/team";
import { texturesFor, vcode } from "../anim/illustrations";
import { button, CREAM, FONT_LOGO, FONT_UI, GOLD, toast, WOOD } from "../ui/widgets";
import { BoardScene, type View } from "./BoardScene";
import type { CardSubject } from "../ui/InfoCard";
import { activeSynergies, type SynergyState } from "../core/synergy";
import synIndex from "../../../assets/icons/synergies/index.json";
import { DROPPABLE } from "../core/items";

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
      this.match = testMatch(this.data_, Math.floor(Math.random() * 1e9));
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
    for (const id of [...DROPPABLE, ...C.CHARM_ITEM_IDS]) if (!this.textures.exists(`item:${id}`)) this.load.svg(`item:${id}`, `icons/items/${id}.svg`, { width: 72, height: 72 });
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
    const foot = txt(P, y + 4, "Bản thử: hiệu ứng tộc hệ chưa được tính trong trận đấu.", 10.5, "#8a7a6a"); y += foot.height + 4 + P;
    g.fillStyle(0x000000, 0.45).fillRoundedRect(4, 6, W, y, 14);
    g.fillStyle(0x1b120c, 0.97).fillRoundedRect(0, 0, W, y, 14);
    g.lineStyle(3, Phaser.Display.Color.HexStringToColor(ic?.colour ?? "#e7c05f").color, 1).strokeRoundedRect(0, 0, W, y, 14);
    box.setPosition(SYN_X - SYN_ICON_PX / 2 - 230 - W, Phaser.Math.Clamp(rowY - 30, 8, MATCH_SHOP_TOP - y - 8));
    // the row label sits at most ~230 px left of the icon; keep the panel fully left of it but on screen
    box.x = Math.max(8, box.x);
    this.synPopup = box;
    this.synOpen = a.syn.name;
  }

  private refreshHud() {
    const m = this.match, h = m.human, b = m.bot;
    this.txt.round.setText(t("round")(m.round));
    this.txt.you.setText("❤ " + t("you"));
    this.txt.youHp.setText(`${h.hp}/${maxHpOf(m)}`);
    this.txt.bot.setText("❤ " + t("opponent"));
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

  private drawCards() {
    for (const c of this.cards) c.destroy();
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
      const ok = m.canBuy(p, slot);
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
      const hit = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      // hover: the VieAni wiggles on its feet (PO request) and the info card opens beside the shop card
      let wiggle: Phaser.Tweens.Tween | null = null;
      hit.on("pointerover", () => {
        c.setScale(1.04);
        wiggle?.stop();
        img.setAngle(-6);
        wiggle = this.tweens.add({ targets: img, angle: 6, scaleX: base * 1.06, scaleY: base * 0.95, duration: 140, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
        this.card.show(this.shopSubject(id), x, y);
        this.card.placeBottomRight(SCREEN_W - 10, MATCH_SHOP_TOP - 6); // empty space right of the board
      });
      hit.on("pointerout", () => {
        c.setScale(1);
        wiggle?.stop(); wiggle = null;
        img.setAngle(0).setScale(base);
        this.card.hide();
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
    if (y >= MATCH_SHOP_TOP) return;
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
    if (this.fighting) return;
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
    box.setPosition(Phaser.Math.Clamp(x - W / 2, 6, SCREEN_W - W - 6), y);
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
      const overTeam = pt.y >= BAG.y && pt.y <= BAG.y + 6 + BAG.team && pt.x >= BAG.teamX - 4;
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
    box.setPosition(Phaser.Math.Clamp(x - W / 2, 6, SCREEN_W - W - 6), Phaser.Math.Clamp(y - h, 6, SCREEN_H - h - 6));
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
    const CW = 270, CH = 290, gap = 26;
    offer.forEach((id, k) => {
      const it = this.itemData(id);
      const x = SCREEN_W / 2 + (k - (offer.length - 1) / 2) * (CW + gap), y = 330;
      const c = this.add.container(x, y);
      const g = this.add.graphics();
      g.fillStyle(0x1b120c, 0.97).fillRoundedRect(-CW / 2, -CH / 2, CW, CH, 16).lineStyle(3, GOLD, 0.9).strokeRoundedRect(-CW / 2, -CH / 2, CW, CH, 16);
      const ic = this.add.image(0, -CH / 2 + 62, `item:${id}`).setDisplaySize(92, 92);
      const name = this.add.text(0, -CH / 2 + 118, it.name, { fontFamily: FONT_UI, fontSize: "18px", color: "#ffe6a3", fontStyle: "bold", align: "center", wordWrap: { width: CW - 30 } }).setOrigin(0.5, 0);
      const sub = this.add.text(0, name.y + name.height + 4, it.cat === "LV" ? "LINH VẬT – mảnh Ấn Thống Nhất" : `Bậc ${it.tier} · ${ITEM_CAT[it.cat] ?? it.cat}` + (this.match.isTeamItem(id) ? " – không cần người mang" : ""),
        { fontFamily: FONT_UI, fontSize: "12px", color: "#cdbb98", fontStyle: "bold", align: "center", wordWrap: { width: CW - 30 } }).setOrigin(0.5, 0);
      const eff = this.add.text(0, sub.y + sub.height + 10, it.effect, { fontFamily: FONT_UI, fontSize: "13.5px", color: CREAM, align: "center", wordWrap: { width: CW - 34 }, lineSpacing: 3 }).setOrigin(0.5, 0);
      const hit = this.add.zone(0, 0, CW, CH).setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => c.setScale(1.04));
      hit.on("pointerout", () => c.setScale(1));
      hit.on("pointerup", () => {
        this.match.chooseItem(this.match.human, k);
        this.itemModal?.destroy(); this.itemModal = undefined;
        toast(this, this.match.isCharm(id) ? `${it.name}: mảnh Ấn Thống Nhất (${this.match.human.charms.length}/3)` : this.match.isTeamItem(id) ? `${it.name}: đặt vào ô Toàn đội` : `${it.name} vào túi – kéo lên một VieAni để trang bị`);
        this.syncItems();
      });
      c.add([g, ic, name, sub, eff, hit]);
      box.add(c);
    });
    this.itemModal = box;
  }

  // ------------------------------------------------------------------ shop actions
  private buy(slot: number) {
    if (this.fighting) return;
    const m = this.match, p = m.human, id = p.shop[slot];
    if (id == null) return;
    if (p.gold < m.cost(id)) return toast(this, t("noGold"));
    const up = m.buy(p, slot);
    if (!up) return toast(this, t("benchFull"));
    this.syncUnits(up);
    this.refreshAll();
  }

  private reroll() {
    if (this.fighting) return;
    if (!this.match.reroll(this.match.human)) return toast(this, t("noGold"));
    this.refreshAll();
  }

  private buyXp() {
    if (this.fighting) return;
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
    this.sellZone.setVisible(true).setAlpha(p.y >= MATCH_SHOP_TOP ? 1 : 0.55);
    v.c.setDepth(5200); // keep the dragged VieAni above the sell zone
  }

  protected onDrop(p: Phaser.Input.Pointer, v: View): boolean {
    this.sellZone.setVisible(false);
    if (p.y < MATCH_SHOP_TOP) return false;
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
    m.botTurn();
    const seed = Math.floor(Math.random() * 1e9);
    const { units, res } = m.battle(seed);
    this.txt.timer.setText("");
    this.hint.setVisible(false);
    for (const c of this.cards) c.setAlpha(0.35);
    this.updateCounter();
    this.startBattle(units.filter((u) => u.side === "A"), units.filter((u) => u.side === "B"), seed, res);
  }

  protected afterBattle(res: BattleResult) {
    const rep = this.match.finishRound(res);
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

  private showRoundPanel(rep: RoundReport) {
    const title = rep.winner === "A" ? t("win") : rep.winner === "B" ? t("lose") : t("draw");
    const color = rep.winner === "A" ? "#ffe6a3" : rep.winner === "B" ? "#ff8a7a" : "#e6e0d4";
    const { base, interest, streak, result } = rep.income;
    const layer = this.panel(title, color, [
      [rep.damage.A ? t("hpLost")(rep.damage.A) : "", rep.damage.B ? t("enemyHpLost")(rep.damage.B) : ""].filter(Boolean).join("   ·   "),
      t("income")(base, interest, streak, result, rep.winner === "A") + (rep.income.items ? `  · Lì Xì +${rep.income.items}` : ""),
      `❤ ${t("you")} ${this.match.human.hp}   ·   ❤ ${t("opponent")} ${this.match.bot.hp}`,
    ]);
    if (rep.levelUp) this.pendingToast = t("levelUp")(this.match.human.level);
    layer.add(button(this, SCREEN_W / 2, SCREEN_H / 2 + 120, 240, 56, t("nextRound"), () => this.scene.restart({}), true));
  }

  private showGameOver(rep: RoundReport) {
    const won = this.match.human.hp > 0, both = this.match.players.every((p) => p.hp <= 0);
    const layer = this.panel(both ? t("draw") : won ? t("champion") : t("eliminated"), both ? "#e6e0d4" : won ? "#ffe6a3" : "#ff8a7a", [
      t("finalLine")(rep.round),
      `❤ ${t("you")} ${this.match.human.hp}   ·   ❤ ${t("opponent")} ${this.match.bot.hp}`,
    ]);
    layer.add(button(this, SCREEN_W / 2 - 130, SCREEN_H / 2 + 110, 220, 56, t("playAgain"), () => this.scene.restart({ fresh: true }), true));
    layer.add(button(this, SCREEN_W / 2 + 130, SCREEN_H / 2 + 110, 220, 56, "← " + t("back"), () => this.scene.start("title")));
  }
}

function maxHpOf(m: Match) {
  return Math.max(m.startHp, m.human.hp, m.bot.hp);
}

const ZODIAC_ORDER = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
/** the zodiac signs Ấn Thống Nhất fills in (the first missing ones, in zodiac order) */
function missingSigns(a: SynergyState): string[] {
  const have = new Set(a.present.map((s) => s.zodiac));
  return ZODIAC_ORDER.filter((z) => !have.has(z)).slice(0, a.bonus);
}
