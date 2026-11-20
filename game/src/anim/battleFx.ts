// Battle effects for skills and items (visuals pass, 20 Nov 2026). Procedural, using the fx:* textures from VieAniView.
import Phaser from "phaser";
import { ensureFxTextures } from "./VieAniView";

const DEPTH = 9200;
type P = { x: number; y: number };

/** an expanding ring (area skills, shields) */
export function ring(s: Phaser.Scene, at: P, radius: number, tint: number, ms = 480, speed = 1) {
  ensureFxTextures(s);
  const im = s.add.image(at.x, at.y, "fx:ring").setTint(tint).setDepth(DEPTH).setScale(0.15).setAlpha(0.95);
  s.tweens.add({ targets: im, scale: radius / 56, alpha: 0, duration: ms / speed, ease: "Cubic.easeOut", onComplete: () => im.destroy() });
}

/** a star flash where a strong hit lands */
export function flash(s: Phaser.Scene, at: P, tint: number, size = 1, speed = 1) {
  ensureFxTextures(s);
  const im = s.add.image(at.x, at.y, "fx:star").setTint(tint).setDepth(DEPTH).setScale(0.1 * size).setAngle(Phaser.Math.Between(0, 45));
  s.tweens.add({ targets: im, scale: 0.75 * size, alpha: 0, angle: im.angle + 40, duration: 380 / speed, ease: "Quad.easeOut", onComplete: () => im.destroy() });
}

/** a claw / blade slash across the target */
export function slash(s: Phaser.Scene, at: P, tint: number, speed = 1) {
  ensureFxTextures(s);
  const im = s.add.image(at.x, at.y, "fx:slash").setTint(tint).setDepth(DEPTH).setScale(0.55).setAngle(Phaser.Math.Between(-60, 60)).setAlpha(0);
  s.tweens.add({ targets: im, alpha: 1, scale: 0.85, duration: 90 / speed, yoyo: true, hold: 60 / speed, onComplete: () => im.destroy() });
}

/** a jagged bolt through several points (chains, lightning items) */
export function bolt(s: Phaser.Scene, pts: P[], tint: number, speed = 1) {
  if (pts.length < 2) return;
  const g = s.add.graphics().setDepth(DEPTH);
  const path: P[] = [pts[0]];
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    for (let k = 1; k <= 5; k++) {
      const f = k / 6, j = k === 6 ? 0 : 9;
      path.push({ x: a.x + (b.x - a.x) * f + Phaser.Math.Between(-j, j), y: a.y + (b.y - a.y) * f + Phaser.Math.Between(-j, j) });
    }
    path.push(b);
  }
  for (const [w, al, c] of [[9, 0.25, tint], [4, 0.9, tint], [1.5, 1, 0xffffff]] as [number, number, number][]) {
    g.lineStyle(w, c, al).beginPath().moveTo(path[0].x, path[0].y);
    for (const p of path.slice(1)) g.lineTo(p.x, p.y);
    g.strokePath();
  }
  s.tweens.add({ targets: g, alpha: 0, duration: 320 / speed, delay: 80 / speed, onComplete: () => g.destroy() });
}

/** a small fast streak from a to b (extra shots, thrown items) */
export function streak(s: Phaser.Scene, a: P, b: P, tint: number, speed = 1) {
  ensureFxTextures(s);
  const o = s.add.image(a.x, a.y, "fx:orb").setTint(tint).setDepth(DEPTH).setScale(0.22);
  s.tweens.add({ targets: o, x: b.x, y: b.y, duration: 200 / speed, onComplete: () => { flash(s, b, tint, 0.5, speed); o.destroy(); } });
}

/** soft particles rising from a unit (heals, buffs) */
export function rise(s: Phaser.Scene, at: P, tint: number, n = 8, speed = 1) {
  ensureFxTextures(s);
  for (let i = 0; i < n; i++) {
    const p = s.add.image(at.x + Phaser.Math.Between(-22, 22), at.y + Phaser.Math.Between(-6, 18), "fx:spark").setTint(tint).setDepth(DEPTH)
      .setScale(Phaser.Math.FloatBetween(0.35, 0.7)).setAlpha(0.95);
    s.tweens.add({ targets: p, y: p.y - Phaser.Math.Between(28, 52), alpha: 0, duration: Phaser.Math.Between(500, 800) / speed,
      delay: (i * 35) / speed, onComplete: () => p.destroy() });
  }
}

/** the skill's name above the caster */
export function skillName(s: Phaser.Scene, at: P, name: string, font: string, speed = 1) {
  if (!name) return;
  const tx = s.add.text(at.x, at.y, name, { fontFamily: font, fontSize: "16px", color: "#ffe9a8", fontStyle: "800",
    backgroundColor: "rgba(43,29,20,0.72)", padding: { x: 6, y: 2 } })
    .setOrigin(0.5).setStroke("#2b1d14", 3).setDepth(DEPTH + 300).setScale(0.6);
  s.tweens.add({ targets: tx, scale: 1, duration: 140 / speed, ease: "Back.easeOut" });
  s.tweens.add({ targets: tx, y: at.y - 16, alpha: 0, delay: 750 / speed, duration: 400 / speed, onComplete: () => tx.destroy() });
}

/** an item icon pops out of its carrier when the item does something */
export function itemPop(s: Phaser.Scene, at: P, key: string, speed = 1) {
  if (!s.textures.exists(key)) return;
  const im = s.add.image(at.x, at.y, key).setDisplaySize(30, 30).setDepth(DEPTH + 250);
  const sc = im.scale;
  im.setScale(sc * 0.3);
  s.tweens.add({ targets: im, scale: sc * 1.25, duration: 160 / speed, ease: "Back.easeOut" });
  s.tweens.add({ targets: im, y: at.y - 34, alpha: 0, delay: 520 / speed, duration: 420 / speed, onComplete: () => im.destroy() });
}
