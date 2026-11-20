import Phaser from "phaser";
import { maxHp as battleMaxHp, mirror, playerDamage, simulate, type BattleEvent, type BattleResult, type Placed } from "../core/battle";
import { AURA_CHOICE, auraKindForTier, BENCH_SLOTS, BOARD_COLS, BOARD_ROWS, HALF_ROWS, MOVE_SECONDS_PER_CELL, SKILLS_ON, TICKS_PER_SECOND, TRANSFORMS, VERSION } from "../core/config";
import type { GameData, Species } from "../core/data";
import { settings, t } from "../core/i18n";
import { BACKGROUNDS, BENCH_CORNERS, BOARD_CORNERS, Grid, SCREEN_H, SCREEN_W, type Pt } from "../core/layout";
import { Rng } from "../core/rng";
import { Team, type OwnedUnit, type Spot } from "../core/team";
import { button, coverImage, CREAM, FONT_LOGO, FONT_UI, toast } from "../ui/widgets";
import { tierColour, VieAniView } from "../anim/VieAniView";
import { hasIllustration, preloadIllustrations, sizeScale, texturesFor, vcode } from "../anim/illustrations";
import type { ViewTextures } from "../anim/VieAniView";
import { attachAura } from "../anim/aura";
import * as FX from "../anim/battleFx";
import { DROPPABLE } from "../core/items";
import { CHARM_ITEM_IDS } from "../core/config";
import { InfoCard, type CardSubject } from "../ui/InfoCard";

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
  /** ★ marks above the head – the ★2 / ★3 outline alone is too thin to read on the board */
  stars: Phaser.GameObjects.Text;
  /** carried item id + its small badge next to the ★ marks */
  item?: number;
  itemBadge?: Phaser.GameObjects.Image;
  maxHp: number;
  hp: number;
  row: number;
  col: number;
  /** live battle values for the info card */
  energy: number;
  target?: number;
  lastMult?: number;
  /** alternate form textures (seen from this side) and whether it has transformed in this battle */
  alt?: ViewTextures;
  transformed?: string;
  /** status icons above the head (visuals pass): kind → icon + scene time (ms) when it ends */
  statuses?: Map<string, { img: Phaser.GameObjects.Image; until: number }>;
}

/** Battle screen: drag VieAni between bench and board (task T09), then replay a simulated fight (T10). */
export class BoardScene extends Phaser.Scene {
  protected board: Grid;
  protected bench: Grid;
  protected bgKey = "";
  protected team!: Team;
  protected views = new Map<number, View>();
  protected highlight!: Phaser.GameObjects.Graphics;
  protected counter!: Phaser.GameObjects.Text;
  protected fighting = false;
  protected dragging = false;
  protected card!: InfoCard;
  private hoverUid: number | null = null;

  constructor(protected data_: GameData, key = "board", boardCorners: Pt[] = BOARD_CORNERS, benchCorners: Pt[] = BENCH_CORNERS) {
    super(key);
    this.board = new Grid(boardCorners, BOARD_COLS, BOARD_ROWS);
    this.bench = new Grid(benchCorners, BENCH_SLOTS, 1);
  }

  preload() {
    const bg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
    this.bgKey = "bg:" + bg;
    this.load.image(this.bgKey, bg);
    // old pixel sprites only as a fallback for VieAni that have no illustration yet
    for (const s of this.data_.species)
      if (!hasIllustration(this.data_, s, "front")) this.load.image(`sp${s.id}`, `sprites/${String(s.id).padStart(2, "0")}.png`);
    preloadIllustrations(this, this.data_, this.data_.roster);
    for (const k of STATUS_ICONS) if (!this.textures.exists(`status:${k}`)) this.load.svg(`status:${k}`, `icons/status/${k}.svg`, { width: 48, height: 48 });
    for (const id of [...DROPPABLE, ...CHARM_ITEM_IDS]) if (!this.textures.exists(`item:${id}`)) this.load.svg(`item:${id}`, `icons/items/${id}.svg`, { width: 72, height: 72 });
  }

  // ------------------------------------------------------------------ status icons (visuals pass)
  /** the middle of the body in scene coordinates */
  protected bodyAt(v: View) {
    return { x: v.c.x, y: v.c.y - v.sprite.displayHeight * 0.45 * v.c.scaleY };
  }

  protected addStatus(v: View, kind: string, ms: number) {
    if (!this.textures.exists(`status:${kind}`) || v.anim.dead) return;
    const map = (v.statuses ??= new Map());
    const until = this.time.now + Math.max(ms, 300);
    const cur = map.get(kind);
    if (cur && cur.img.active) cur.until = Math.max(cur.until, until);
    else {
      const img = this.add.image(0, 0, `status:${kind}`).setDisplaySize(19, 19);
      v.c.add(img);
      map.set(kind, { img, until });
      img.setScale(img.scale * 0.2);
      this.tweens.add({ targets: img, scale: img.scale * 5, duration: 160, ease: "Back.easeOut" });
      this.layoutStatus(v);
    }
    this.time.delayedCall(Math.max(ms, 300) + 30, () => { const s = v.statuses?.get(kind); if (s && this.time.now >= s.until) this.removeStatus(v, kind); });
  }

  protected removeStatus(v: View, kind?: string) {
    if (!v.statuses) return;
    for (const k of kind ? [kind] : [...v.statuses.keys()]) {
      const s = v.statuses.get(k);
      if (!s) continue;
      s.img.destroy();
      v.statuses.delete(k);
    }
    this.layoutStatus(v);
  }

  protected layoutStatus(v: View) {
    if (!v.statuses) return;
    const y = -v.sprite.displayHeight * (v.illustrated ? 0.88 : 0.98) - 30;
    const list = [...v.statuses.values()], n = list.length;
    list.forEach((s, i) => s.img.setPosition((i - (n - 1) / 2) * 20, y));
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
    this.setupHover();
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
    const { tex, illustrated, alt } = texturesFor(this, this.data_, sp, side === "A" ? "back" : "front");
    const anim = new VieAniView(this, 0, 0, tex, side === "A" ? 1 : -1, tierColour(sp.tier), !illustrated && side === "B");
    anim.setStar(u.star);
    // status aura by tier (PO choice): legendary golden aura, extinct grey smoke, endangered red heartbeat
    const aura = auraKindForTier(sp.tier);
    if (aura) attachAura(this, anim, aura, AURA_CHOICE[aura]);
    const hpBar = this.add.graphics().setVisible(false);
    const stars = this.add.text(0, 0, "", { fontFamily: FONT_UI, fontSize: "15px", fontStyle: "bold" }).setOrigin(0.5, 1).setStroke("#1b120c", 4);
    anim.c.add([hpBar, stars]);
    const maxHp = battleMaxHp(sp, u.star);
    const v: View = { uid: u.uid, speciesId: u.speciesId, side, c: anim.c, sprite: anim.body, anim, illustrated, hpBar, stars, item: u.item, maxHp, hp: maxHp, row: 0, col: 0, energy: 0, alt };
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
    // real-size scaling (PO 17 Nov 2026): legendary / giants 1.0 … tiniest 0.5
    const real = sizeScale(this.data_, this.data_.byId.get(v.speciesId)!);
    const w = (s.where === "bench" ? cell * (v.illustrated ? ILLU_BENCH_SCALE : 1) : cell * (v.illustrated ? ILLU_SCALE : SPRITE_SCALE)) * real;
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
    // ★ level: ★1 bronze, ★2 silver, ★3 gold (always shown, on board and bench)
    const n = v.anim.star;
    v.stars.setText("★".repeat(n)).setColor(n === 3 ? "#ffcc3c" : n === 2 ? "#e4ecf6" : "#d9a066")
      .setFontSize(n === 1 ? 13 : 16).setPosition(0, y - 1);
    // carried item: small round icon left of the ★ marks
    const key = v.item != null ? `item:${v.item}` : "";
    if (key && this.textures.exists(key)) {
      if (!v.itemBadge || !v.itemBadge.active) { v.itemBadge = this.add.image(0, 0, key); v.c.add(v.itemBadge); }
      v.itemBadge.setTexture(key).setDisplaySize(20, 20).setPosition(-v.stars.width / 2 - 13, y - 9).setVisible(true);
    } else v.itemBadge?.setVisible(false);
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
      this.dragging = true;
      this.hideCard();
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
      this.dragging = false;
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

  // ------------------------------------------------------------------ hover info card
  protected setupHover() {
    this.card = new InfoCard(this);
    this.hoverUid = null;
    this.input.on("pointermove", (p: Phaser.Input.Pointer) => this.hoverAt(p.x, p.y));
    this.input.on("gameout", () => this.hideCard());
    // keep HP / energy / status live while the card is open
    this.time.addEvent({ delay: 150, loop: true, callback: () => this.refreshCard() });
  }

  /** the VieAni drawn under (x, y), front-most first; uses the creature's body, not the empty art margins */
  protected viewAt(x: number, y: number): View | null {
    let best: View | null = null;
    for (const v of this.views.values()) {
      if (!v.c.visible || !v.c.active) continue;
      const b = v.sprite.getBounds();
      const inner = v.illustrated
        ? new Phaser.Geom.Rectangle(b.x + b.width * 0.12, b.y + b.height * 0.2, b.width * 0.76, b.height * 0.76)
        : new Phaser.Geom.Rectangle(b.x + b.width * 0.15, b.y + b.height * 0.15, b.width * 0.7, b.height * 0.85);
      if (inner.contains(x, y) && (!best || v.c.depth > best.c.depth)) best = v;
    }
    return best;
  }

  protected hoverAt(x: number, y: number) {
    if (this.dragging) return this.hideCard();
    const v = this.viewAt(x, y);
    if (!v) return this.hideCard();
    this.hoverUid = v.uid;
    this.card.show(this.subjectOf(v), v.c.x, v.c.y - v.sprite.displayHeight * 0.5);
  }

  protected hideCard() {
    if (this.hoverUid == null && !this.card?.visible) return;
    this.hoverUid = null;
    this.card?.hide();
  }

  private refreshCard() {
    if (this.hoverUid == null) return;
    const v = this.views.get(this.hoverUid);
    if (!v || !v.c.active || !v.c.visible) return this.hideCard();
    this.card.show(this.subjectOf(v), v.c.x, v.c.y - v.sprite.displayHeight * 0.5);
  }

  /** where a view stands: our units via the team, opponents are always on the board */
  protected whereOf(v: View): "board" | "bench" {
    return v.side === "A" && this.team.locate(v.uid)?.where === "bench" ? "bench" : "board";
  }

  protected subjectOf(v: View): CardSubject {
    const sp = this.data_.byId.get(v.speciesId)!;
    const mates = [...this.views.values()].filter((o) => o.side === v.side && o.c.active && !o.anim.dead && this.whereOf(o) === "board" && (o.c.visible || o.side === "A"));
    const ids = new Set(mates.map((o) => o.speciesId));
    const synergies = this.data_.synergies
      .filter((g) => g.members.includes(sp.id))
      .map((g) => [g.name, g.members.filter((m) => ids.has(m)).length, Object.keys(g.tiers).map(Number).sort((a, b) => a - b)] as [string, number, number[]]);
    const tgt = v.target != null ? this.views.get(v.target) : undefined;
    return {
      sp, code: vcode(this.data_, sp), ...cardTex(this, this.data_, sp, !!v.transformed), transformed: v.transformed,
      item: v.item != null ? (({ id, name, effect }) => ({ id, name, effect }))(this.data_.items.find((i) => i.id === v.item)!) : undefined, star: v.anim.star as 1 | 2 | 3, side: v.side,
      hp: v.hp, maxHp: v.maxHp, energy: v.energy, where: this.whereOf(v), fighting: this.fighting, dead: v.anim.dead,
      targetName: tgt && !tgt.anim.dead ? this.data_.byId.get(tgt.speciesId)!.vi.replace(/\s*\(.*\)\s*/, "") : undefined,
      lastMult: v.lastMult, synergies,
    };
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
    const r = res ?? simulate(this.data_, [...mine, ...enemy], seed, {}, { skills: SKILLS_ON });
    // items can raise max HP: start every bar from the simulation's numbers
    for (const s of r.start ?? []) { const v = this.views.get(s.uid); if (v) { v.maxHp = v.hp = s.maxHp; } }
    for (const v of this.views.values()) if (v.c.visible) { v.hpBar.setVisible(true); this.drawHp(v); }

    this.replay(r);
  }

  protected replay(res: BattleResult) {
    const speed = settings.speed;
    const msPerTick = 100 / speed;
    for (const e of res.events) this.time.delayedCall(e.t * msPerTick + 400, () => this.apply(e, msPerTick));
    // transformations (Cá Chép → Rồng Con): if still standing at the passive's time, it changes form until the end
    for (const v of this.views.values()) {
      const code = vcode(this.data_, this.data_.byId.get(v.speciesId)!);
      const tf = code ? TRANSFORMS[code] : undefined;
      if (!tf || !v.alt || !v.c.visible) continue;
      const at = tf.seconds[v.anim.star - 1] * TICKS_PER_SECOND;
      const died = res.events.find((e) => e.type === "death" && e.uid === v.uid);
      if (res.ticks < at || (died && died.t <= at)) continue;
      this.time.delayedCall(at * msPerTick + 400, () => {
        if (v.anim.dead) return;
        v.transformed = tf.name;
        void v.anim.transform(v.alt!);
        const txt = this.add.text(v.c.x, v.c.y - v.sprite.displayHeight, `Hóa ${tf.name}!`, { fontFamily: FONT_LOGO, fontSize: "24px", color: "#ffd84a", fontStyle: "800" })
          .setOrigin(0.5).setStroke("#000", 5).setDepth(9500);
        this.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 1400, delay: 300, onComplete: () => txt.destroy() });
      });
    }
    this.time.delayedCall(res.ticks * msPerTick + 1200, () => this.showResult(res));
  }

  protected apply(e: BattleEvent, msPerTick: number) {
    if (e.type === "spawn") {
      // skill engine: a summoned VieAni (piglet, snail, wolf cub, rat young, Phượng Hoàng egg) – smaller, cannot be dragged
      const sv = this.spawn({ uid: e.uid, speciesId: e.speciesId, star: 1 }, e.side);
      sv.sprite.disableInteractive();
      this.place(sv, { where: "board", row: e.row, col: e.col }, false);
      sv.c.setScale(sv.c.scale * 0.7);
      sv.maxHp = sv.hp = e.hp;
      sv.hpBar.setVisible(true); this.drawHp(sv);
      sv.anim.burst(sv.c.x, sv.c.y - sv.sprite.displayHeight * 0.4, 0xffe6a3, 10);
      return;
    }
    const v = this.views.get(e.uid);
    if (!v) return;
    if (e.type === "skill") { this.showSkill(v, e); return; }
    if (e.type === "item") {
      FX.itemPop(this, { x: v.c.x, y: this.bodyAt(v).y - 30 }, `item:${e.id}`, settings.speed);
      if (v.itemBadge?.visible) this.tweens.add({ targets: v.itemBadge, scale: v.itemBadge.scale * 1.6, duration: 140 / settings.speed, yoyo: true });
      return;
    }
    if (e.type === "move") {
      this.place(v, { where: "board", row: e.row, col: e.col }, true, MOVE_SECONDS_PER_CELL * 10 * msPerTick);
    } else if (e.type === "attack" || e.type === "cast") {
      const tv = this.views.get(e.target);
      if (!tv) return;
      const speed = settings.speed;
      const sp = this.data_.byId.get(v.speciesId)!;
      const cast = e.type === "cast";
      v.energy = e.en;
      if (e.type === "attack" && e.miss) {
        // dodged (Trường Sơn / Côn Trùng / Cao Nguyên)
        void v.anim.attack(tv.c.x, tv.c.y, this.data_.byId.get(v.speciesId)!.range >= 2, settings.speed);
        this.time.delayedCall(220 / settings.speed, () => this.floatText(tv, "Né!", "#bfe6ff", 17));
        return;
      }
      v.target = e.target;
      if (e.type === "attack") v.lastMult = e.mult;
      const land = () => {
        tv.hp -= e.dmg;
        tv.energy = e.tEn;
        this.drawHp(tv);
        if (tv.hp > 0) void tv.anim.hit(v.c.x, v.c.y, speed);
        const strong = e.type === "attack" && (e.mult > 1 || !!e.crit), weak = e.type === "attack" && e.mult < 1;
        const [lx, ly] = this.lane(tv);
        const txt = this.add.text(tv.c.x + lx, tv.c.y - tv.sprite.displayHeight * 0.8 + ly, cast ? `${e.dmg}!` : `${e.dmg}`, {
          fontFamily: FONT_LOGO, fontSize: cast ? "25px" : strong ? "22px" : "19px", fontStyle: "800",
          color: cast ? "#ffd84a" : strong ? "#ff9a3c" : weak ? "#c9c2b8" : "#ffffff",
        }).setOrigin(0.5).setStroke("#000", 5).setDepth(9500);
        this.tweens.add({ targets: txt, y: txt.y - 34, alpha: 0, duration: 700, onComplete: () => txt.destroy() });
      };
      if (cast) this.time.delayedCall(200 / speed, () => { FX.flash(this, this.bodyAt(tv), 0xffe9a8, 0.6, speed); land(); });
      else { void v.anim.attack(tv.c.x, tv.c.y, sp.range >= 2, speed); this.time.delayedCall(220 / speed, land); }
    } else if (e.type === "death") {
      this.removeStatus(v);
      this.time.delayedCall(250 / settings.speed, () => void v.anim.die(settings.speed));
    } else if (e.type === "hp") {
      // item effects: heal (+), bleeding, lightning, extra shots (−)
      v.hp = Math.min(v.maxHp, v.hp + e.delta);
      this.drawHp(v);
      const sv = e.src != null ? this.views.get(e.src) : undefined;
      if (sv && e.kind === "zap") FX.bolt(this, [this.bodyAt(sv), this.bodyAt(v)], 0xffe14a, settings.speed);
      if (sv && e.kind === "shot") FX.streak(this, this.bodyAt(sv), this.bodyAt(v), 0xfff1c4, settings.speed);
      if (e.kind === "heal") FX.rise(this, this.bodyAt(v), 0x7dff8a, 5, settings.speed);
      if (e.delta < 0 && v.hp > 0) void v.anim.hit(undefined, undefined, settings.speed);
      const look = { heal: ["#7dff8a", `+${e.delta}`], bleed: ["#ff6a6a", `${e.delta}`], zap: ["#ffe14a", `⚡${-e.delta}`], shot: ["#ffffff", `${-e.delta}`] }[e.kind];
      this.floatText(v, look[1], look[0], e.kind === "heal" ? 18 : 17);
    } else if (e.type === "status") {
      const ms = e.ticks * msPerTick;
      if (e.kind === "rabid") {
        // Dại: purple tint, attacks its own allies for a while
        this.floatText(v, "Dại!", "#d58cff", 20);
        v.anim.body.setTint(0xc59bff);
        this.time.delayedCall(ms, () => { if (!v.anim.dead) v.anim.body.clearTint(); });
      } else if (e.kind === "stealth") {
        // Ẩn mình (Trường Sơn): see-through, cannot be targeted
        v.anim.rig.setAlpha(0.35);
        this.time.delayedCall(ms, () => v.anim.rig.setAlpha(1));
      } else if (e.kind === "shield") {
        this.floatText(v, `🛡 ${e.amount ?? ""}`, "#9fd4ff", 18);
      } else if (e.kind === "cleanse") {
        for (const k of NEGATIVE) this.removeStatus(v, k);
        v.anim.body.clearTint();
        FX.rise(this, this.bodyAt(v), 0xffffff, 6, settings.speed);
      } else if (STATUS_LOOK[e.kind]) {
        // skill engine statuses (T12): a label for hard control, a tint while it lasts
        const [label, color, tint] = STATUS_LOOK[e.kind]!;
        if (label) this.floatText(v, label, color, 17);
        if (tint && ms > 0 && !v.anim.dead) {
          v.anim.body.setTint(tint);
          this.time.delayedCall(ms, () => { if (!v.anim.dead && !(v.statuses?.has(e.kind))) v.anim.body.clearTint(); });
        }
      }
      // status icon above the head for as long as it lasts (shield / copy without a duration: a few seconds)
      const icon = e.kind === "shield" ? "shield" : e.kind;
      if (STATUS_ICONS.includes(icon)) this.addStatus(v, icon, ms > 0 ? ms : icon === "copy" ? 60000 : 4000 / settings.speed);
    } else if (e.type === "revive") {
      // Quả Thị / Lá Đa Thần: back on the board
      this.time.delayedCall(10, () => {
        v.anim.reset();
        v.hp = e.hp;
        this.place(v, { where: "board", row: e.row, col: e.col }, false);
        v.c.setVisible(true); v.hpBar.setVisible(true); this.drawHp(v);
        v.anim.burst(v.c.x, v.c.y - v.sprite.displayHeight * 0.4, 0x7dff8a, 16);
        this.floatText(v, "Hồi sinh!", "#9dffb0", 22);
      });
    }
  }

  /** a skill is cast: name over the caster, caster glow, then an effect by kind (visuals pass) */
  protected showSkill(v: View, e: Extract<BattleEvent, { type: "skill" }>) {
    const sp = settings.speed, at = this.bodyAt(v);
    const foes = e.foes.map((u) => this.views.get(u)).filter((x): x is View => !!x);
    const allies = e.allies.map((u) => this.views.get(u)).filter((x): x is View => !!x);
    const tint = e.tint ?? SKILL_TINT[e.fx];
    FX.skillName(this, { x: at.x, y: v.c.y - v.sprite.displayHeight * (v.illustrated ? 0.88 : 0.98) * v.c.scaleY - 54 }, e.name, FONT_LOGO, sp);
    void v.anim.cast(tint, sp);
    const later = (ms: number, fn: () => void) => this.time.delayedCall(ms / sp, fn);
    switch (e.fx) {
      case "strike": later(170, () => foes.forEach((f) => FX.slash(this, this.bodyAt(f), tint, sp))); break;
      case "chain": later(150, () => FX.bolt(this, [at, ...foes.map((f) => this.bodyAt(f))], tint, sp)); break;
      case "area": {
        const pts = foes.length ? foes.map((f) => this.bodyAt(f)) : [at];
        const c = { x: pts.reduce((n, p) => n + p.x, 0) / pts.length, y: pts.reduce((n, p) => n + p.y, 0) / pts.length };
        const r = Math.max(70, ...pts.map((p) => Math.hypot(p.x - c.x, p.y - c.y) + 45));
        later(160, () => { FX.ring(this, c, r, tint, 520, sp); foes.forEach((f) => FX.flash(this, this.bodyAt(f), tint, 0.55, sp)); });
        break;
      }
      case "heal": later(150, () => allies.forEach((a) => FX.rise(this, this.bodyAt(a), tint, 9, sp))); break;
      case "shield": later(150, () => allies.forEach((a) => { FX.ring(this, this.bodyAt(a), 52, tint, 420, sp); FX.rise(this, this.bodyAt(a), tint, 5, sp); })); break;
      case "buff": later(150, () => { allies.forEach((a) => FX.rise(this, this.bodyAt(a), tint, 7, sp)); foes.forEach((f) => FX.flash(this, this.bodyAt(f), tint, 0.45, sp)); }); break;
      default: later(120, () => { FX.flash(this, at, tint, 0.9, sp); FX.rise(this, at, tint, 8, sp); foes.forEach((f) => FX.flash(this, this.bodyAt(f), tint, 0.5, sp)); });
    }
  }

  /** stacking for floating texts on one VieAni: texts started within the last 0.45 s move up / sideways so they do not overlap */
  private lanes = new Map<number, number[]>();
  protected lane(v: View): [number, number] {
    const now = this.time.now, list = (this.lanes.get(v.uid) ?? []).filter((t0) => now - t0 < 450 / settings.speed);
    const n = list.length;
    list.push(now); this.lanes.set(v.uid, list);
    return [((n % 3) - 1) * 22 + Phaser.Math.Between(-4, 4), -n * 17];
  }

  protected floatText(v: View, text: string, color: string, size = 18) {
    const [lx, ly] = this.lane(v);
    const txt = this.add.text(v.c.x + lx, v.c.y - v.sprite.displayHeight * 0.75 + ly, text, {
      fontFamily: FONT_LOGO, fontSize: `${size}px`, fontStyle: "800", color,
    }).setOrigin(0.5).setStroke("#000", 4).setDepth(9500);
    this.tweens.add({ targets: txt, y: txt.y - 30, alpha: 0, duration: 750, onComplete: () => txt.destroy() });
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

/** status label, text colour and body tint (0 = no tint) for the skill-engine statuses */
const STATUS_LOOK: Partial<Record<string, [string, string, number]>> = {
  stun: ["Choáng!", "#fff27a", 0xfff27a], root: ["", "", 0xc9a36b], blind: ["", "", 0x8a8a8a],
  silence: ["", "", 0], charm: ["Mê hoặc!", "#ff9ad5", 0xff9ad5], slow: ["", "", 0x9fd4ff],
  copy: ["Biến hóa!", "#ffd84a", 0],
};
/** status icons (assets/icons/status, scripts/status_icons.py) */
const STATUS_ICONS = ["stun", "root", "blind", "silence", "charm", "slow", "taunt", "dot", "buff", "debuff", "immune", "shield", "stealth", "rabid", "guard", "wall", "copy"];
/** statuses a cleanse removes */
const NEGATIVE = ["stun", "root", "blind", "silence", "charm", "slow", "taunt", "dot", "debuff", "rabid"];
/** default colour of a skill effect by kind (fire / lightning / water / poison skills bring their own) */
const SKILL_TINT: Record<string, number> = {
  strike: 0xfff1c4, area: 0xffd84a, chain: 0xffe14a, heal: 0x7dff8a, shield: 0x6fb8ff, buff: 0xffd84a,
  summon: 0xffe6a3, revive: 0x9dffb0, copy: 0xd58cff, special: 0xffe6a3,
};

/** texture for the info card picture: front view, or the alternate form once it has transformed */
function cardTex(scene: Phaser.Scene, d: GameData, sp: Species, transformed: boolean): { tex: string | null; texFrame?: number } {
  const t = texturesFor(scene, d, sp, "front");
  const v = transformed && t.alt ? t.alt : t.tex;
  return { tex: v.body, texFrame: v.bodyFrame };
}
