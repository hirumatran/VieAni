import Phaser from "phaser";

/**
 * One VieAni on screen with all its animations, driven by tweens (works for the smooth illustrations
 * and for the old pixel sprites alike):
 *   idle · attack · cast (skill) · hit · die · win · lose · ★1/★2/★3 (silver outline / golden glow)
 *
 * Structure:  c (position on the board, depth)
 *               ├ shadow (ellipse on the ground)
 *               └ rig (everything that bobs, lunges, squashes)
 *                   ├ star3 glow (behind)   ├ star2 outline   ├ body   └ flash (white additive copy for hits)
 *             HP bars etc. can be added to `c` by the owner.
 * The body's origin is at the feet (0.5, 1): the creature stands on the container's position.
 */
export interface ViewTextures { body: string; star2?: string; star3?: string }

const TYPE_COL: Record<string, number> = {
  Fire: 0xff7a2a, Water: 0x4aa8ff, Electric: 0xffe14a, Grass: 0x5ccf5a, Ground: 0xc8964a, Rock: 0xa89a80,
  Sky: 0x9ad8ff, Insect: 0xa8d040, Poison: 0xb05ad0, Legendary: 0xffd84a,
};
export const typeColour = (t: string) => TYPE_COL[t] ?? 0xffffff;

export class VieAniView {
  readonly c: Phaser.GameObjects.Container;
  readonly rig: Phaser.GameObjects.Container;
  readonly body: Phaser.GameObjects.Image;
  private shadow: Phaser.GameObjects.Ellipse;
  private flash: Phaser.GameObjects.Image;
  private star2?: Phaser.GameObjects.Image;
  private star3?: Phaser.GameObjects.Image;
  private idleTween?: Phaser.Tweens.Tween;
  private starTweens: Phaser.Tweens.Tween[] = [];
  private sparkleTimer?: Phaser.Time.TimerEvent;
  private size = 64;
  star = 1;
  dead = false;

  /**
   * @param facing  -1 = faces down-left (front view, opponent side), +1 = faces up-right (back view, our side)
   * @param flip    mirror the image (pixel sprites have one pose for both sides)
   */
  constructor(private scene: Phaser.Scene, x: number, y: number, tex: ViewTextures, readonly facing: 1 | -1,
              private colour = 0xffffff, flip = false) {
    ensureFxTextures(scene);
    this.c = scene.add.container(x, y);
    this.shadow = scene.add.ellipse(0, 0, 40, 10, 0x1a120c, 0.4);
    this.rig = scene.add.container(0, 0);
    if (tex.star3) this.star3 = scene.add.image(0, 0, tex.star3).setOrigin(0.5, 1).setVisible(false);
    if (tex.star2) this.star2 = scene.add.image(0, 0, tex.star2).setOrigin(0.5, 1).setVisible(false);
    this.body = scene.add.image(0, 0, tex.body).setOrigin(0.5, 1).setFlipX(flip);
    this.flash = scene.add.image(0, 0, tex.body).setOrigin(0.5, 1).setFlipX(flip)
      .setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    const layers = [this.star3, this.star2, this.body, this.flash].filter(Boolean) as Phaser.GameObjects.Image[];
    this.rig.add(layers);
    this.c.add([this.shadow, this.rig]);
  }

  /** display size in screen px (the square texture is scaled to w×w) */
  setSize(w: number) {
    this.size = w;
    for (const im of [this.body, this.flash, this.star2, this.star3]) im?.setDisplaySize(w, w);
    this.shadow.setSize(w * 0.55, w * 0.13);
    return this;
  }

  // ------------------------------------------------------------------ loops
  idle(on = true) {
    this.idleTween?.remove(); this.idleTween = undefined;
    this.rig.setScale(1, 1);
    if (!on || this.dead) return;
    this.idleTween = this.scene.tweens.add({
      targets: this.rig, scaleY: 1.035, scaleX: 0.985, duration: 900 + Math.random() * 250,
      yoyo: true, repeat: -1, ease: "Sine.easeInOut",
    });
  }

  /** ★1 nothing, ★2 silver outline shimmer, ★3 golden glow pulse + sparkles */
  setStar(n: number) {
    this.star = n;
    this.starTweens.forEach((t) => t.remove()); this.starTweens = [];
    this.sparkleTimer?.remove(); this.sparkleTimer = undefined;
    this.star2?.setVisible(n === 2).setAlpha(1);
    this.star3?.setVisible(n === 3).setAlpha(1);
    if (n === 2 && this.star2)
      this.starTweens.push(this.scene.tweens.add({ targets: this.star2, alpha: 0.55, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
    if (n === 3 && this.star3) {
      this.starTweens.push(this.scene.tweens.add({ targets: this.star3, alpha: 0.6, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      this.sparkleTimer = this.scene.time.addEvent({
        delay: 380, loop: true, callback: () => {
          if (this.dead) return;
          const x = this.c.x + Phaser.Math.Between(-this.size * 0.4, this.size * 0.4);
          const y = this.c.y - Phaser.Math.Between(this.size * 0.1, this.size * 0.85);
          this.spark(x, y, 0xffe08a, 0.5 + Math.random() * 0.4, -18);
        },
      });
    }
    if (n >= 2) this.burst(this.c.x, this.c.y - this.size * 0.45, n === 3 ? 0xffd75a : 0xe6eef8, 10);
  }

  // ------------------------------------------------------------------ one-shots (return when finished)
  /** basic attack towards (tx,ty): wind-up, lunge, impact effect, recover */
  attack(tx: number, ty: number, special = false, speed = 1): Promise<void> {
    const dx = (tx - this.c.x), dy = (ty - this.c.y);
    const d = Math.max(1, Math.hypot(dx, dy)), ux = dx / d, uy = dy / d;
    const lunge = special ? this.size * 0.08 : Math.min(d * 0.35, this.size * 0.35);
    const ms = (n: number) => n / speed;
    return this.seq([
      { targets: this.rig, x: -ux * this.size * 0.06, y: -uy * this.size * 0.04, scaleX: 0.95, scaleY: 1.05, duration: ms(120), ease: "Quad.easeOut" },
      { targets: this.rig, x: ux * lunge, y: uy * lunge * 0.7, scaleX: 1.06, scaleY: 0.95, duration: ms(90), ease: "Quad.easeIn",
        onComplete: () => special ? this.projectile(tx, ty, speed) : this.slash(tx, ty) },
      { targets: this.rig, x: 0, y: 0, scaleX: 1, scaleY: 1, duration: ms(200), ease: "Back.easeOut" },
    ]);
  }

  /** skill cast: gather (aura ring + rising sparks + glow), release burst */
  cast(colour = this.colour, speed = 1): Promise<void> {
    const ms = (n: number) => n / speed;
    const x = this.c.x, y = this.c.y;
    const ring = this.scene.add.image(x, y, "fx:ring").setTint(colour).setDepth(this.c.depth - 1).setScale(0.2, 0.06).setAlpha(0.9);
    this.scene.tweens.add({ targets: ring, scaleX: this.size / 64, scaleY: this.size / 230, alpha: 0, duration: ms(700), onComplete: () => ring.destroy() });
    for (let i = 0; i < 10; i++)
      this.scene.time.delayedCall(ms(i * 40), () => this.spark(x + Phaser.Math.Between(-this.size * 0.4, this.size * 0.4), y - 4, colour, 0.7, -this.size * 0.9, ms(600)));
    this.flash.setTint(colour);
    return this.seq([
      { targets: this.rig, y: -this.size * 0.08, scaleX: 0.96, scaleY: 1.06, duration: ms(320), ease: "Sine.easeOut" },
      { targets: this.flash, alpha: 0.35, duration: ms(160), yoyo: true },
      { targets: this.rig, y: 0, scaleX: 1.05, scaleY: 0.96, duration: ms(110), ease: "Quad.easeIn",
        onComplete: () => this.burst(x, y - this.size * 0.45, colour, 14) },
      { targets: this.rig, scaleX: 1, scaleY: 1, duration: ms(160), ease: "Back.easeOut" },
    ]).then(() => { this.flash.clearTint(); });
  }

  /** took damage: white flash + knock-back + shake */
  hit(fromX?: number, fromY?: number, speed = 1): Promise<void> {
    const ms = (n: number) => n / speed;
    let kx = -this.facing * 4, ky = this.facing * 2;
    if (fromX !== undefined && fromY !== undefined) {
      const dx = this.c.x - fromX, dy = this.c.y - fromY, d = Math.max(1, Math.hypot(dx, dy));
      kx = (dx / d) * this.size * 0.08; ky = (dy / d) * this.size * 0.05;
    }
    this.flash.clearTint();
    this.scene.tweens.add({ targets: this.flash, alpha: 0.55, duration: ms(60), yoyo: true });
    return this.seq([
      { targets: this.rig, x: kx, y: ky, angle: -this.facing * 4, duration: ms(70), ease: "Quad.easeOut" },
      { targets: this.rig, x: -kx * 0.3, angle: this.facing * 2, duration: ms(70) },
      { targets: this.rig, x: 0, y: 0, angle: 0, duration: ms(120), ease: "Sine.easeOut" },
    ]);
  }

  /** knocked out: stagger, topple, fade into the ground with dust and a rising spirit wisp */
  die(speed = 1): Promise<void> {
    const ms = (n: number) => n / speed;
    this.dead = true; this.idle(false); this.setStar(1);
    const tilt = this.facing * -70;
    this.flash.setTint(0xffffff);
    return this.seq([
      { targets: this.rig, angle: -tilt * 0.08, scaleY: 1.04, duration: ms(140) },
      { targets: this.rig, angle: tilt, y: this.size * 0.05, scaleY: 0.9, duration: ms(360), ease: "Quad.easeIn",
        onComplete: () => {
          for (let i = 0; i < 6; i++) this.dust(this.c.x + Phaser.Math.Between(-this.size * 0.3, this.size * 0.3), this.c.y);
          this.wisp();
        } },
      { targets: [this.rig, this.shadow], alpha: 0, duration: ms(420), delay: ms(120) },
    ]).then(() => { this.c.setVisible(false); });
  }

  /** round won: two happy hops with sparkles */
  win(): Promise<void> {
    this.idle(false);
    const hop = (h: number) => [
      { targets: this.rig, scaleX: 1.08, scaleY: 0.9, duration: 90 },
      { targets: this.rig, y: -h, scaleX: 0.94, scaleY: 1.08, duration: 200, ease: "Quad.easeOut" },
      { targets: this.rig, y: 0, scaleX: 1, scaleY: 1, duration: 180, ease: "Quad.easeIn" },
    ];
    this.time(280, () => this.burst(this.c.x, this.c.y - this.size * 0.7, 0xfff1a8, 8));
    this.time(760, () => this.burst(this.c.x, this.c.y - this.size * 0.7, 0xfff1a8, 8));
    return this.seq([...hop(this.size * 0.22), ...hop(this.size * 0.16),
      { targets: this.rig, scaleX: 1.04, scaleY: 0.96, duration: 120, yoyo: true }]).then(() => this.idle());
  }

  /** round lost: droop, sigh, dim colours (stays dimmed until reset()) */
  lose(): Promise<void> {
    this.idle(false);
    this.body.setTint(0x9a9aae);
    return this.seq([
      { targets: this.rig, scaleY: 0.9, scaleX: 1.04, angle: this.facing * 5, duration: 420, ease: "Sine.easeOut" },
      { targets: this.rig, angle: -this.facing * 3, duration: 260, yoyo: true, repeat: 1, ease: "Sine.easeInOut" },
    ]);
  }

  /** back to normal (after lose/win) */
  reset() {
    this.dead = false; this.c.setVisible(true);
    this.rig.setPosition(0, 0).setAngle(0).setScale(1).setAlpha(1); this.shadow.setAlpha(0.4);
    this.body.clearTint(); this.flash.setAlpha(0);
    this.setStar(this.star); this.idle();
  }

  destroy() { this.idle(false); this.setStar(1); this.c.destroy(); }

  // ------------------------------------------------------------------ effects
  private slash(x: number, y: number) {
    const s = this.scene.add.image(x, y - this.size * 0.35, "fx:slash").setDepth(9000).setScale(this.size / 110)
      .setAngle(this.facing < 0 ? 200 : -20).setTint(0xffffff).setAlpha(0.95);
    this.scene.tweens.add({ targets: s, angle: s.angle + (this.facing < 0 ? -70 : 70), alpha: 0, scale: s.scale * 1.25, duration: 220, onComplete: () => s.destroy() });
    this.burst(x, y - this.size * 0.35, this.colour, 6);
  }

  private projectile(tx: number, ty: number, speed: number) {
    const o = this.scene.add.image(this.c.x, this.c.y - this.size * 0.5, "fx:orb").setTint(this.colour).setDepth(9000).setScale(this.size / 150);
    this.scene.tweens.add({ targets: o, x: tx, y: ty - this.size * 0.35, duration: 220 / speed, ease: "Quad.easeIn",
      onComplete: () => { o.destroy(); this.burst(tx, ty - this.size * 0.35, this.colour, 10); } });
  }

  burst(x: number, y: number, colour: number, n: number) {
    const star = this.scene.add.image(x, y, "fx:star").setTint(colour).setDepth(9001).setScale(this.size / 260).setAlpha(0.8)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: star, scale: star.scale * 2.2, angle: 45, alpha: 0, duration: 300, onComplete: () => star.destroy() });
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.4, r = this.size * (0.35 + Math.random() * 0.25);
      this.spark(x, y, colour, 0.6 + Math.random() * 0.5, 0, 420, Math.cos(a) * r, Math.sin(a) * r);
    }
  }

  private spark(x: number, y: number, colour: number, scale: number, rise: number, ms = 600, vx = 0, vy = 0) {
    const p = this.scene.add.image(x, y, "fx:spark").setTint(colour).setDepth(9001).setScale(scale * this.size / 90);
    this.scene.tweens.add({ targets: p, x: x + vx, y: y + vy + rise, alpha: 0, scale: p.scale * 0.4, duration: ms, ease: "Quad.easeOut", onComplete: () => p.destroy() });
  }

  private dust(x: number, y: number) {
    const p = this.scene.add.image(x, y, "fx:puff").setTint(0xd8c8b0).setDepth(this.c.depth + 1).setScale(this.size / 160).setAlpha(0.8);
    this.scene.tweens.add({ targets: p, x: x + Phaser.Math.Between(-12, 12), y: y - 10, scale: p.scale * 2.2, alpha: 0, duration: 650, onComplete: () => p.destroy() });
  }

  private wisp() {
    const w = this.scene.add.image(this.c.x, this.c.y - this.size * 0.4, "fx:orb").setTint(0xdff4ff).setDepth(9001).setScale(this.size / 200).setAlpha(0.7);
    this.scene.tweens.add({ targets: w, y: w.y - this.size * 0.9, x: w.x + this.facing * 10, alpha: 0, duration: 1100, ease: "Sine.easeOut", onComplete: () => w.destroy() });
  }

  // ------------------------------------------------------------------ helpers
  private seq(steps: Phaser.Types.Tweens.TweenBuilderConfig[]): Promise<void> {
    return new Promise((resolve) => {
      if (!steps.length) return resolve();
      this.scene.tweens.chain({ targets: this.rig, tweens: steps as Phaser.Types.Tweens.TweenBuilderConfig[], onComplete: () => resolve() });
    });
  }

  private time(ms: number, fn: () => void) { this.scene.time.delayedCall(ms, fn); }
}

/** small effect textures drawn once with canvas (original, procedural) */
export function ensureFxTextures(scene: Phaser.Scene) {
  const T = scene.textures;
  const make = (key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
    if (T.exists(key)) return;
    const tex = T.createCanvas(key, w, h)!; const g = tex.getContext(); draw(g); tex.refresh();
  };
  make("fx:spark", 32, 32, (g) => {
    const gr = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.35, "rgba(255,255,255,0.8)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 32, 32);
  });
  make("fx:orb", 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 2, 32, 32, 30);
    gr.addColorStop(0, "rgba(255,255,255,1)"); gr.addColorStop(0.4, "rgba(255,255,255,0.85)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  });
  make("fx:ring", 128, 128, (g) => {
    g.strokeStyle = "rgba(255,255,255,0.95)"; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 56, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = "rgba(255,255,255,0.4)"; g.lineWidth = 14; g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  });
  make("fx:slash", 128, 128, (g) => {
    g.lineCap = "round";
    for (const [w, a] of [[18, 0.25], [10, 0.6], [4, 1]] as [number, number][]) {
      g.strokeStyle = `rgba(255,255,255,${a})`; g.lineWidth = w; g.beginPath(); g.arc(64, 64, 46, -Math.PI * 0.85, -Math.PI * 0.15); g.stroke();
    }
  });
  make("fx:star", 128, 128, (g) => {
    g.fillStyle = "rgba(255,255,255,0.95)"; g.beginPath();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 14 : 60, a = (Math.PI * 2 * i) / 16;
      g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    g.closePath(); g.fill();
  });
  make("fx:puff", 64, 64, (g) => {
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
    gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr; g.beginPath(); g.arc(32, 32, 30, 0, Math.PI * 2); g.fill();
  });
}
