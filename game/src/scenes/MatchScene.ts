import Phaser from "phaser";
import { maxHp as battleMaxHp, type BattleResult } from "../core/battle";
import * as C from "../core/config";
import type { GameData } from "../core/data";
import { settings, t } from "../core/i18n";
import { SCREEN_H, SCREEN_W } from "../core/layout";
import { testMatch, type Match, type RoundReport } from "../core/match";
import type { Team } from "../core/team";
import { texturesFor, vcode } from "../anim/illustrations";
import { button, CREAM, FONT_LOGO, FONT_UI, GOLD, toast, WOOD } from "../ui/widgets";
import { BoardScene, type View } from "./BoardScene";

const PANEL_X = 1048; // shop panel (right) – drop a VieAni here to sell it
const PANEL_CX = (PANEL_X + SCREEN_W) / 2;
const CARD_W = 214, CARD_H = 84, CARD_Y0 = 64, CARD_STEP = 92;
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
    super(d, "match");
  }

  init(data?: { fresh?: boolean }) {
    if (data?.fresh || !this.match || this.match.over) {
      this.match = testMatch(this.data_, Math.floor(Math.random() * 1e9));
      this.pendingToast = t("testNote");
    }
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
    g.fillStyle(WOOD, 0.86).fillRoundedRect(10, 66, 234, 330, 14).lineStyle(2, GOLD, 0.8).strokeRoundedRect(10, 66, 234, 330, 14);
    // right: shop
    g.fillStyle(WOOD, 0.86).fillRoundedRect(PANEL_X - 2, 8, SCREEN_W - PANEL_X - 4, SCREEN_H - 16, 14).lineStyle(2, GOLD, 0.8)
      .strokeRoundedRect(PANEL_X - 2, 8, SCREEN_W - PANEL_X - 4, SCREEN_H - 16, 14);
    this.hudG = this.add.graphics().setDepth(top);
    const text = (key: string, x: number, y: number, size: number, color = CREAM, font = FONT_UI) =>
      (this.txt[key] = this.add.text(x, y, "", { fontFamily: font, fontSize: `${size}px`, color, fontStyle: "bold" }).setShadow(1, 1, "#000", 3).setDepth(top));
    text("round", 127, 92, 30, "#ffe6a3", FONT_LOGO).setOrigin(0.5);
    text("you", 26, 122, 16);
    text("youHp", 228, 122, 16).setOrigin(1, 0);
    text("bot", 26, 172, 16);
    text("botHp", 228, 172, 16).setOrigin(1, 0);
    text("level", 26, 224, 22, "#ffe6a3");
    text("xp", 228, 230, 15).setOrigin(1, 0);
    text("gold", 26, 282, 20, "#ffd84a");
    text("timer", 26, 352, 18, "#ffb3a3");
    this.counter = text("count", 26, 318, 17);
    this.add.text(PANEL_CX, 34, t("shop"), { fontFamily: FONT_LOGO, fontSize: "26px", color: "#ffe6a3", fontStyle: "800" }).setOrigin(0.5).setShadow(1, 1, "#000", 3).setDepth(top);

    button(this, PANEL_CX, 556, CARD_W, 46, t("reroll")(C.REROLL_COST), () => this.reroll()).setDepth(top);
    button(this, PANEL_CX, 610, CARD_W, 46, t("buyXp")(C.XP_BUY_COST), () => this.buyXp()).setDepth(top);
    button(this, PANEL_CX, 672, CARD_W, 56, t("ready"), () => this.fight(), true).setDepth(top);

    // sell zone (shown while dragging one of our VieAni)
    const zg = this.add.graphics();
    zg.fillStyle(0x8a1f12, 0.88).fillRoundedRect(PANEL_X - 2, 8, SCREEN_W - PANEL_X - 4, SCREEN_H - 16, 14)
      .lineStyle(4, 0xffd84a, 1).strokeRoundedRect(PANEL_X - 2, 8, SCREEN_W - PANEL_X - 4, SCREEN_H - 16, 14);
    this.sellText = this.add.text(PANEL_CX, SCREEN_H / 2, "", { fontFamily: FONT_LOGO, fontSize: "26px", color: "#fff3c4", fontStyle: "800", align: "center" })
      .setOrigin(0.5).setShadow(1, 2, "#000", 4);
    this.sellZone = this.add.container(0, 0, [zg, this.sellText]).setDepth(top + 10).setVisible(false);

    this.cards = [];
    this.drawCards();
    this.refreshHud();
    this.startTimer();
    if (this.pendingToast) { toast(this, this.pendingToast); this.pendingToast = ""; }
  }

  protected updateCounter() {
    this.counter?.setText(t("onBoard")(this.team.boardCount, this.team.maxOnBoard));
  }

  private refreshHud() {
    const m = this.match, h = m.human, b = m.bot;
    this.txt.round.setText(t("round")(m.round));
    this.txt.you.setText("❤ " + t("you"));
    this.txt.youHp.setText(`${h.hp}/${maxHpOf(m)}`);
    this.txt.bot.setText("❤ " + t("opponent"));
    this.txt.botHp.setText(`${b.hp}/${maxHpOf(m)}`);
    this.txt.level.setText(t("level")(h.level));
    const need = m.xpNeeded(h);
    this.txt.xp.setText(t("xp")(h.xp, need));
    this.txt.gold.setText("● " + t("gold")(h.gold, m.interest(h)));
    const g = this.hudG.clear();
    const bar = (y: number, frac: number, col: number) => {
      g.fillStyle(0x000000, 0.55).fillRoundedRect(26, y, 202, 12, 5);
      if (frac > 0) g.fillStyle(col, 1).fillRoundedRect(26, y, Math.max(8, 202 * frac), 12, 5);
    };
    bar(146, h.hp / maxHpOf(m), 0x5bd36b);
    bar(196, b.hp / maxHpOf(m), 0xe0533d);
    bar(256, need ? h.xp / need : 1, 0x6fb6ff);
    this.updateCounter();
  }

  private drawCards() {
    for (const c of this.cards) c.destroy();
    this.cards = [];
    const m = this.match, p = m.human;
    p.shop.forEach((id, slot) => {
      const y = CARD_Y0 + slot * CARD_STEP + CARD_H / 2;
      const c = this.add.container(PANEL_CX, y).setDepth(5001);
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
      g.fillStyle(0x1b120c, 0.95).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      g.fillStyle(col, 0.28).fillRoundedRect(-CARD_W / 2, -CARD_H / 2, 84, CARD_H, { tl: 10, bl: 10, tr: 0, br: 0 });
      g.lineStyle(3, col, 1).strokeRoundedRect(-CARD_W / 2, -CARD_H / 2, CARD_W, CARD_H, 10);
      const { tex } = texturesFor(this, this.data_, sp, "front");
      const img = this.add.image(-CARD_W / 2 + 42, CARD_H / 2 - 2, tex.body).setOrigin(0.5, 1);
      img.setScale(Math.min(96 / img.width, 96 / img.height));
      const code = vcode(this.data_, sp) ?? "";
      const name = this.add.text(-CARD_W / 2 + 92, -CARD_H / 2 + 8, shortName(sp.vi), { fontFamily: FONT_UI, fontSize: "16px", color: CREAM, fontStyle: "bold", wordWrap: { width: 118 } });
      const sub = this.add.text(-CARD_W / 2 + 92, CARD_H / 2 - 24, `${code} · ${sp.role ?? ""}`, { fontFamily: FONT_UI, fontSize: "12px", color: "#d8cbb0" });
      const cost = this.add.text(CARD_W / 2 - 8, -CARD_H / 2 + 6, `● ${sp.tier}`, { fontFamily: FONT_LOGO, fontSize: "20px", color: "#ffd84a", fontStyle: "800" }).setOrigin(1, 0);
      const have = p.team.units().filter((u) => u.speciesId === id).reduce((n, u) => n + 3 ** (u.star - 1), 0);
      c.add([img, name, sub, cost]);
      if (have) c.add(this.add.text(CARD_W / 2 - 8, -CARD_H / 2 + 32, t("owned")(have), { fontFamily: FONT_UI, fontSize: "12px", color: "#9df0a8", fontStyle: "bold" }).setOrigin(1, 0));
      c.setAlpha(ok ? 1 : 0.45);
      const hit = this.add.zone(0, 0, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      hit.on("pointerover", () => c.setScale(1.03));
      hit.on("pointerout", () => c.setScale(1));
      hit.on("pointerup", () => this.buy(slot));
      c.add(hit);
    });
  }

  private refreshAll() {
    this.drawCards();
    this.refreshHud();
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
    if (p.level > before) toast(this, t("levelUp")(p.level));
    this.refreshAll();
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
    this.sellZone.setVisible(true).setAlpha(p.x >= PANEL_X ? 1 : 0.55);
    v.c.setDepth(5200); // keep the dragged VieAni above the sell zone
  }

  protected onDrop(p: Phaser.Input.Pointer, v: View): boolean {
    this.sellZone.setVisible(false);
    if (p.x < PANEL_X) return false;
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
    const { base, interest, streak, win } = rep.income;
    const layer = this.panel(title, color, [
      [rep.damage.A ? t("hpLost")(rep.damage.A) : "", rep.damage.B ? t("enemyHpLost")(rep.damage.B) : ""].filter(Boolean).join("   ·   "),
      t("income")(base, interest, streak, win),
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
