import Phaser from "phaser";
import { maxHp as battleMaxHp, mirror, playerDamage, simulate, type BattleEvent, type BattleResult, type Placed } from "../core/battle";
import { BENCH_SLOTS, BOARD_COLS, BOARD_ROWS, HALF_ROWS, MOVE_SECONDS_PER_CELL, VERSION } from "../core/config";
import type { GameData } from "../core/data";
import { settings, t } from "../core/i18n";
import { BACKGROUNDS, BENCH_CORNERS, BOARD_CORNERS, Grid, SCREEN_H, SCREEN_W, type Pt } from "../core/layout";
import { Rng } from "../core/rng";
import { Team, type OwnedUnit, type Spot } from "../core/team";
import { button, coverImage, CREAM, FONT_LOGO, FONT_UI, toast } from "../ui/widgets";
import { typeColour, VieAniView } from "../anim/VieAniView";
import { preloadIllustrations, texturesFor } from "../anim/illustrations";

const ENEMY_TINT = 0x96e6dc;
const OWN_TINT = 0xffd68c;
const SAVE_KEY = "vieani.practice.team.v2";
const DEMO_LEVEL = 5; // board limit for practice until levels exist (task T16)
const DEMO_ROSTER = ["Báo Gấm", "Hổ Đông Dương", "Voi châu Á", "Gấu chó", "Chó Phú Quốc", "Mèo Mun", "Rắn Hổ Mang", "Sếu đầu đỏ", "Trâu"];
const SPRITE_SCALE = 1.3; // pixel sprite size relative to the cell width
const ILLU_SCALE = 1.33; // illustration size relative to the cell width (the art has margins); PO: 70% of the first 1.9
const ILLU_BENCH_SCALE = 1.0;

/** one VieAni on screen: shadow + sprite + HP bar */
export interface View {
  uid: number;
  speciesId: number;
  side: "A" | "B";
  c: Phaser.GameObjects.Container;
  sprite: Phaser.GameObjects.Image;
  anim: VieAniView;
  illustrated: boolean;
  hpBar: Phaser.GameObjects.Graphics;
  maxHp: number;
  hp: number;
  row: number;
  col: number;
}

/** Battle screen: drag VieAni between bench and board (task T09), then replay a simulated fight (T10). */
export class BoardScene extends Phaser.Scene {
  protected board = new Grid(BOARD_CORNERS, BOARD_COLS, BOARD_ROWS);
  protected bench = new Grid(BENCH_CORNERS, BENCH_SLOTS, 1);
  protected bgKey = "";
  protected team!: Team;
  protected views = new Map<number, View>();
  protected highlight!: Phaser.GameObjects.Graphics;
  protected counter!: Phaser.GameObjects.Text;
  protected fighting = false;

  constructor(protected data_: GameData, key = "board") {
    super(key);
  }

  preload() {
    const bg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    this.bgKey = "bg:" + bg;
    this.load.image(this.bgKey, bg);
    for (const s of this.data_.species) this.load.image(`sp${s.id}`, `sprites/${String(s.id).padStart(2, "0")}.png`);
    preloadIllustrations(this, this.data_, this.data_.roster);
  }

  create() {
    this.fighting = false;
    this.views.clear();
    this.team = this.loadTeam();
    coverImage(this, this.bgKey);

    const g = this.add.graphics();
    for (let r = 0; r < BOARD_ROWS; r++)
      for (let c = 0; c < BOARD_COLS; c++) {
        const own = r >= BOARD_ROWS - HALF_ROWS;
        this.cell(g, this.board.cellQuad(r, c), own ? OWN_TINT : ENEMY_TINT, (r + c) % 2 === 0 ? 0.24 : 0.13);
      }
    for (let i = 0; i < BENCH_SLOTS; i++) this.cell(g, this.bench.cellQuad(0, i, 0.04), OWN_TINT, 0.16);
    this.highlight = this.add.graphics().setDepth(1);

    for (const u of this.team.units()) this.spawn(u, "A");
    this.layout(false);

    this.buildHud();
    this.setupDrag();
  }

  /** practice HUD (the match scene replaces it) */
  protected buildHud() {
    button(this, 78, 34, 130, 44, "← " + t("back"), () => this.scene.start("title")).setDepth(5000);
    button(this, SCREEN_W - 110, SCREEN_H - 48, 190, 56, t("fight"), () => this.fight(), true).setDepth(5000);
    this.counter = this.add.text(SCREEN_W - 110, SCREEN_H - 92, "", { fontFamily: FONT_UI, fontSize: "18px", color: CREAM, fontStyle: "bold" })
      .setOrigin(0.5).setShadow(1, 1, "#000", 3).setDepth(5000);
    this.add.text(SCREEN_W / 2, 18, t("dragHint"), { fontFamily: FONT_UI, fontSize: "15px", color: CREAM, backgroundColor: "#2b1d14b0", padding: { x: 10, y: 4 } })
      .setOrigin(0.5, 0).setDepth(5000);
    this.add.text(SCREEN_W - 12, 10, `v${VERSION}`, { fontFamily: FONT_UI, fontSize: "13px", color: CREAM }).setOrigin(1, 0).setShadow(1, 1, "#000", 2).setDepth(5000);
    this.updateCounter();
  }

  // ------------------------------------------------------------------ team state
  protected loadTeam(): Team {
    try {
      const saved = localStorage.getItem(SAVE_KEY);
      if (saved) {
        const tm = Team.load(saved);
        if (tm.units().every((u) => this.data_.byId.has(u.speciesId))) return tm;
      }
    } catch {
      /* no storage: start fresh */
    }
    const tm = new Team(DEMO_LEVEL);
    DEMO_ROSTER.forEach((name, i) => {
      const sp = this.data_.species.find((s) => s.vi === name);
      if (sp) tm.addToBench({ uid: i + 1, speciesId: sp.id, star: 1 });
    });
    return tm;
  }

  protected saveTeam() {
    try {
      localStorage.setItem(SAVE_KEY, this.team.serialize());
    } catch {
      /* ignore */
    }
  }

  // ------------------------------------------------------------------ views
  protected spawn(u: OwnedUnit | Placed, side: "A" | "B") {
    const sp = this.data_.byId.get(u.speciesId)!;
    // our side is seen from behind (back view), the opponent from the front
    const { tex, illustrated } = texturesFor(this, this.data_, sp, side === "A" ? "back" : "front");
    const anim = new VieAniView(this, 0, 0, tex, side === "A" ? 1 : -1, typeColour(sp.attackType), !illustrated && side === "B");
    anim.setStar(u.star);
    const hpBar = this.add.graphics().setVisible(false);
    anim.c.add(hpBar);
    const maxHp = battleMaxHp(sp, u.star);
    const v: View = { uid: u.uid, speciesId: u.speciesId, side, c: anim.c, sprite: anim.body, anim, illustrated, hpBar, maxHp, hp: maxHp, row: 0, col: 0 };
    this.views.set(u.uid, v);
    if (side === "A") anim.body.setInteractive({ draggable: true, useHandCursor: true, pixelPerfect: false });
    anim.body.setData("uid", u.uid);
    anim.idle();
    return v;
  }

  /** screen position + size for a spot */
  protected spotPos(s: Spot): { x: number; y: number; w: number } {
    if (s.where === "bench") {
      const [x, y] = this.bench.foot(0, s.slot);
      return { x, y, w: this.bench.cellWidth(0, s.slot) * 1.1 };
    }
    const [x, y] = this.board.foot(s.row, s.col);
    return { x, y, w: this.board.cellWidth(s.row, s.col) };
  }

  protected place(v: View, s: Spot, animate: boolean, ms = 160) {
    const { x, y, w: cell } = this.spotPos(s);
    const w = s.where === "bench" ? cell * (v.illustrated ? ILLU_BENCH_SCALE : 1) : cell * (v.illustrated ? ILLU_SCALE : SPRITE_SCALE);
    if (s.where === "board") { v.row = s.row; v.col = s.col; }
    v.anim.setSize(w);
    v.c.setDepth(y);
    if (animate) this.tweens.add({ targets: v.c, x, y, duration: ms, ease: "Quad.easeOut" });
    else v.c.setPosition(x, y);
    this.drawHp(v, w);
  }

  protected layout(animate = true) {
    for (const u of this.team.units()) {
      const v = this.views.get(u.uid);
      const s = this.team.locate(u.uid);
      if (v && s) this.place(v, s, animate);
    }
  }

  protected drawHp(v: View, w = v.sprite.displayWidth) {
    const bw = Math.min(w * (v.illustrated ? 0.5 : 0.7), 70), bh = 6, y = -v.sprite.displayHeight * (v.illustrated ? 0.88 : 0.98);
    v.hpBar.clear();
    v.hpBar.fillStyle(0x000000, 0.6).fillRect(-bw / 2 - 1, y - 1, bw + 2, bh + 2);
    v.hpBar.fillStyle(v.side === "A" ? 0x5bd36b : 0xe0533d, 1).fillRect(-bw / 2, y, bw * Math.max(0, v.hp / v.maxHp), bh);
  }

  protected updateCounter() {
    this.counter.setText(t("onBoard")(this.team.boardCount, this.team.maxOnBoard));
  }

  // ------------------------------------------------------------------ drag & drop (mouse + touch)
  protected spotUnder(x: number, y: number): Spot | null {
    const b = this.board.cellAt(x, y);
    if (b) return { where: "board", row: b[0], col: b[1] };
    const s = this.bench.cellAt(x, y);
    if (s) return { where: "bench", slot: s[1] };
    return null;
  }

  protected setupDrag() {
    this.input.on("dragstart", (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (this.fighting) return;
      const v = this.views.get(obj.getData("uid"));
      if (!v) return;
      v.c.setDepth(4000);
      this.tweens.add({ targets: v.c, scale: 1.12, duration: 100 });
    });
    this.input.on("drag", (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      if (this.fighting) return;
      const v = this.views.get(obj.getData("uid"));
      if (!v) return;
      v.c.setPosition(p.x, p.y + v.sprite.displayHeight * 0.35);
      const s = this.spotUnder(p.x, p.y);
      this.highlight.clear();
      this.onDragMove(p, v);
      if (s && Team.valid(s)) {
        const quad = s.where === "board" ? this.board.cellQuad(s.row, s.col) : this.bench.cellQuad(0, s.slot, 0.04);
        const pts = quad.map(([x, y]) => new Phaser.Math.Vector2(x, y));
        this.highlight.fillStyle(0xffffff, 0.28).fillPoints(pts, true).lineStyle(3, 0xffffff, 0.95).strokePoints(pts, true);
      }
    });
    this.input.on("dragend", (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.highlight.clear();
      const v = this.views.get(obj.getData("uid"));
      if (!v || this.fighting) return;
      this.tweens.add({ targets: v.c, scale: 1, duration: 100 });
      if (this.onDrop(p, v)) return;
      const s = this.spotUnder(p.x, p.y);
      if (s && Team.valid(s)) {
        const wasFull = this.team.boardCount >= this.team.maxOnBoard;
        const from = this.team.locate(v.uid);
        if (!this.team.move(v.uid, s) && wasFull && from?.where === "bench") toast(this, t("boardFull"));
        this.saveTeam();
      }
      this.layout();
      this.updateCounter();
    });
  }

  /** hooks for the match scene (sell zone) */
  protected onDragMove(_p: Phaser.Input.Pointer, _v: View) {}
  /** return true if the drop was handled (the unit is not put back on a spot) */
  protected onDrop(_p: Phaser.Input.Pointer, _v: View): boolean { return false; }

  // ------------------------------------------------------------------ battle
  protected fight() {
    if (this.fighting) return;
    const mine = this.team.toPlaced("A");
    if (!mine.length) return toast(this, t("needUnits"));
    const seed = Math.floor(Math.random() * 1e9);
    const enemy = this.makeEnemy(mine, new Rng(seed));
    this.startBattle(mine, enemy, seed);
  }

  /** practice opponent: random VieAni (tier ≤ 3), same count, random spots on their half */
  protected makeEnemy(mine: Placed[], rng: Rng): Placed[] {
    const pool = this.data_.roster.filter((s) => s.tier <= 3);
    const used = new Set<string>();
    return mine.map((_, i) => {
      let r: number, c: number;
      do { r = rng.int(4, 7); c = rng.int(0, 7); } while (used.has(`${r},${c}`));
      used.add(`${r},${c}`);
      const [row, col] = mirror(r, c);
      return { uid: 1000 + i, speciesId: rng.pick(pool).id, star: 1, row, col, side: "B" as const };
    });
  }

  /** show the enemy, then replay the fight (simulated here unless a result is given) */
  protected startBattle(mine: Placed[], enemy: Placed[], seed: number, res?: BattleResult) {
    this.fighting = true;
    for (const v of this.views.values()) v.sprite.disableInteractive();
    for (const u of this.team.bench) if (u) this.views.get(u.uid)?.c.setVisible(false); // bench hidden during the fight
    for (const e of enemy) this.place(this.spawn(e, "B"), { where: "board", row: e.row, col: e.col }, false);
    for (const v of this.views.values()) if (v.c.visible) { v.hpBar.setVisible(true); this.drawHp(v); }

    this.replay(res ?? simulate(this.data_, [...mine, ...enemy], seed));
  }

  protected replay(res: BattleResult) {
    const speed = settings.speed;
    const msPerTick = 100 / speed;
    for (const e of res.events) this.time.delayedCall(e.t * msPerTick + 400, () => this.apply(e, msPerTick));
    this.time.delayedCall(res.ticks * msPerTick + 1200, () => this.showResult(res));
  }

  protected apply(e: BattleEvent, msPerTick: number) {
    const v = this.views.get(e.uid);
    if (!v) return;
    if (e.type === "move") {
      this.place(v, { where: "board", row: e.row, col: e.col }, true, MOVE_SECONDS_PER_CELL * 10 * msPerTick);
    } else if (e.type === "attack" || e.type === "cast") {
      const tv = this.views.get(e.target);
      if (!tv) return;
      const speed = settings.speed;
      const sp = this.data_.byId.get(v.speciesId)!;
      const cast = e.type === "cast";
      const land = () => {
        tv.hp -= e.dmg;
        this.drawHp(tv);
        if (tv.hp > 0) void tv.anim.hit(v.c.x, v.c.y, speed);
        const strong = e.type === "attack" && e.mult > 1, weak = e.type === "attack" && e.mult < 1;
        const txt = this.add.text(tv.c.x + Phaser.Math.Between(-10, 10), tv.c.y - tv.sprite.displayHeight * 0.8, cast ? `${e.dmg}!` : `${e.dmg}`, {
          fontFamily: FONT_LOGO, fontSize: cast ? "30px" : strong ? "24px" : "20px", fontStyle: "800",
          color: cast ? "#ffd84a" : strong ? "#ff9a3c" : weak ? "#c9c2b8" : "#ffffff",
        }).setOrigin(0.5).setStroke("#000", 5).setDepth(9500);
        this.tweens.add({ targets: txt, y: txt.y - 34, alpha: 0, duration: 700, onComplete: () => txt.destroy() });
      };
      if (cast) void v.anim.cast(undefined, speed).then(land);
      else { void v.anim.attack(tv.c.x, tv.c.y, sp.attackClass === "special", speed); this.time.delayedCall(220 / speed, land); }
    } else if (e.type === "death") {
      this.time.delayedCall(250 / settings.speed, () => void v.anim.die(settings.speed));
    }
  }

  protected showResult(res: BattleResult) {
    // survivors react first: winners celebrate, a draw leaves everyone dejected
    for (const v of this.views.values()) {
      if (!v.c.visible || v.anim.dead) continue;
      if (res.winner === "draw") void v.anim.lose();
      else if (v.side === res.winner) void v.anim.win();
    }
    this.time.delayedCall(1100, () => this.afterBattle(res));
  }

  protected afterBattle(res: BattleResult) {
    this.showResultPanel(res);
  }

  protected showResultPanel(res: BattleResult) {
    const dmg = playerDamage(res, 1);
    const title = res.winner === "A" ? t("win") : res.winner === "B" ? t("lose") : t("draw");
    const color = res.winner === "A" ? "#ffe6a3" : res.winner === "B" ? "#ff8a7a" : "#e6e0d4";
    const layer = this.add.container(0, 0).setDepth(6000);
    const dim = this.add.rectangle(SCREEN_W / 2, SCREEN_H / 2, SCREEN_W, SCREEN_H, 0x000000, 0.45);
    const big = this.add.text(SCREEN_W / 2, SCREEN_H / 2 - 50, title, { fontFamily: FONT_LOGO, fontSize: "96px", color, fontStyle: "800" })
      .setOrigin(0.5).setStroke("#2b1d14", 14).setShadow(0, 6, "#000", 10, true, true);
    const lines = [dmg.A ? t("hpLost")(dmg.A) : "", dmg.B ? t("enemyHpLost")(dmg.B) : ""].filter(Boolean).join("   ·   ");
    const sub = this.add.text(SCREEN_W / 2, SCREEN_H / 2 + 30, lines, { fontFamily: FONT_UI, fontSize: "22px", color: CREAM, fontStyle: "bold" }).setOrigin(0.5).setShadow(1, 1, "#000", 3);
    const back = button(this, SCREEN_W / 2, SCREEN_H / 2 + 100, 220, 56, t("backToBoard"), () => this.scene.restart());
    layer.add([dim, big, sub, back]);
    big.setScale(0.6);
    this.tweens.add({ targets: big, scale: 1, duration: 300, ease: "Back.easeOut" });
  }

  protected cell(g: Phaser.GameObjects.Graphics, quad: Pt[], tint: number, alpha: number) {
    const pts = quad.map(([x, y]) => new Phaser.Math.Vector2(x, y));
    g.fillStyle(tint, alpha).fillPoints(pts, true);
    g.lineStyle(2, tint, 0.8).strokePoints(pts, true);
  }
}
