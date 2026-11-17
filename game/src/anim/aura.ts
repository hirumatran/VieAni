import Phaser from "phaser";
import type { VieAniView } from "./VieAniView";

/**
 * Status auras (PO, 17 Nov 2026) – a permanent effect that tells the player at a glance what kind of animal this is:
 *   legend      = Huyền thoại (tier 5)   – glow
 *   extinct     = Đã mất (tier 4)        – smoke
 *   endangered  = Nguy cấp (tier 3)      – red alert
 * Three options each (0 = A, 1 = B, 2 = C) for the PO to choose from in the "Hiệu ứng trạng thái" preview.
 * attachAura() returns a stop function; everything also stops by itself when the VieAni's container is destroyed.
 */
export type AuraKind = "legend" | "extinct" | "endangered";

export const AURA_OPTIONS: Record<AuraKind, [string, string, string]> = {
  legend: ["A · Hào quang vàng", "B · Vòng sáng + đốm sáng bay lên", "C · Ba ngôi sao bay quanh"],
  extinct: ["A · Khói xám dưới chân", "B · Hồn ma mờ ảo", "C · Tro tàn bay lên"],
  endangered: ["A · Vòng cảnh báo đỏ dưới đất", "B · Biển báo ! nhấp nháy", "C · Ánh đỏ đập như nhịp tim"],
};

export const AURA_TITLES: Record<AuraKind, string> = {
  legend: "Huyền thoại – phát sáng",
  extinct: "Đã mất – khói",
  endangered: "Nguy cấp – cảnh báo đỏ",
};

export function attachAura(scene: Phaser.Scene, v: VieAniView, kind: AuraKind, option: number): () => void {
  const tweens: Phaser.Tweens.Tween[] = [];
  const timers: Phaser.Time.TimerEvent[] = [];
  const objs: Phaser.GameObjects.GameObject[] = [];
  const alive = () => v.c.active && !v.dead && v.c.visible;
  const every = (ms: number, fn: () => void) => timers.push(scene.time.addEvent({ delay: ms, loop: true, callback: () => { if (alive()) fn(); } }));
  const s = () => v.px;
  /** a short-lived particle in world space (drifts on its own, not with the VieAni) */
  const particle = (tex: string, x: number, y: number, tint: number, scale: number, to: Omit<Phaser.Types.Tweens.TweenBuilderConfig, "targets">, blend = Phaser.BlendModes.NORMAL) => {
    const p = scene.add.image(x, y, tex).setTint(tint).setScale(scale).setBlendMode(blend).setDepth(v.c.depth + 1);
    scene.tweens.add({ ...to, targets: p, onComplete: () => p.destroy() });
  };
  /** glow image behind the creature inside its rig (moves, squashes and lunges with it) */
  const behind = (tex: string, tint: number, alpha: number) => {
    const im = scene.add.image(0, -s() * 0.42, tex).setTint(tint).setBlendMode(Phaser.BlendModes.ADD).setAlpha(alpha);
    im.setDisplaySize(s() * 1.05, s() * 1.05);
    v.rig.addAt(im, 0); objs.push(im);
    return im;
  };

  if (kind === "legend") {
    if (option === 0) {
      const g = behind("fx:orb", 0xffd84a, 0.55);
      const base = g.scale;
      tweens.push(scene.tweens.add({ targets: g, scale: base * 1.18, alpha: 0.85, duration: 1100, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
    } else if (option === 1) {
      const ring = scene.add.image(0, 0, "fx:ring").setTint(0xffd84a).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0.8);
      ring.setDisplaySize(s() * 0.95, s() * 0.26); v.c.addAt(ring, 0); objs.push(ring);
      tweens.push(scene.tweens.add({ targets: ring, alpha: 0.35, duration: 900, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      every(160, () => particle("fx:spark", v.c.x + Phaser.Math.Between(-s() * 0.4, s() * 0.4), v.c.y - Phaser.Math.Between(0, s() * 0.3), 0xffe48a,
        0.35 + Math.random() * 0.3, { y: `-=${s() * (0.7 + Math.random() * 0.4)}`, alpha: 0, duration: 1300, ease: "Sine.easeOut" }, Phaser.BlendModes.ADD));
    } else {
      const stars = [0, 1, 2].map(() => { const st = scene.add.image(0, 0, "fx:star").setTint(0xffe07a).setBlendMode(Phaser.BlendModes.ADD); st.setDisplaySize(s() * 0.22, s() * 0.22); v.c.add(st); objs.push(st); return st; });
      const t0 = scene.time.now;
      timers.push(scene.time.addEvent({ delay: 16, loop: true, callback: () => {
        const t = (scene.time.now - t0) / 1000;
        stars.forEach((st, i) => {
          const a = t * 1.6 + (i * Math.PI * 2) / 3;
          st.setPosition(Math.cos(a) * s() * 0.48, -s() * 0.45 + Math.sin(a) * s() * 0.14).setAngle(t * 120);
          // behind the body on the far half of the orbit
          if (Math.sin(a) < 0) v.c.sendToBack(st); else v.c.bringToTop(st);
        });
      } }));
    }
  } else if (kind === "extinct") {
    if (option === 0) {
      every(130, () => particle("fx:puff", v.c.x + Phaser.Math.Between(-s() * 0.4, s() * 0.4), v.c.y - Phaser.Math.Between(0, s() * 0.15), 0xc4c4cc,
        (0.8 + Math.random() * 0.5) * s() / 150, { y: `-=${s() * 0.55}`, x: `+=${Phaser.Math.Between(-14, 14)}`, scale: 2.2 * s() / 150, alpha: 0, duration: 2000, ease: "Sine.easeOut" }));
    } else if (option === 1) {
      v.body.setTint(0xc8d6ff);
      tweens.push(scene.tweens.add({ targets: v.body, alpha: 0.55, duration: 700, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      every(420, () => particle("fx:puff", v.c.x + Phaser.Math.Between(-s() * 0.25, s() * 0.25), v.c.y - s() * 0.7, 0xdfe8ff, 0.35,
        { y: `-=${s() * 0.6}`, scale: 1.1, alpha: 0, duration: 1600, ease: "Sine.easeOut" }, Phaser.BlendModes.ADD));
    } else {
      v.body.setTint(0xb0a8a4);
      every(70, () => {
        const ember = Math.random() < 0.2;
        particle("fx:spark", v.c.x + Phaser.Math.Between(-s() * 0.4, s() * 0.4), v.c.y - Phaser.Math.Between(0, s() * 0.7), ember ? 0xff8a3c : 0x2a2624,
          (ember ? 0.45 : 0.35 + Math.random() * 0.2) * s() / 150, { y: `-=${s() * 0.6}`, x: `+=${Phaser.Math.Between(-20, 20)}`, alpha: 0, angle: 180, duration: 1500, ease: "Sine.easeOut" },
          ember ? Phaser.BlendModes.ADD : Phaser.BlendModes.NORMAL);
      });
    }
  } else {
    if (option === 0) {
      // steady red ring on the ground + a wave that pulses out of it every second
      const base = scene.add.ellipse(0, 0, s() * 0.85, s() * 0.24).setStrokeStyle(4, 0xff2a2a, 0.95).setFillStyle(0xff2a2a, 0.12);
      v.c.addAt(base, 0); objs.push(base);
      tweens.push(scene.tweens.add({ targets: base, alpha: 0.45, duration: 500, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      every(1000, () => {
        const r = scene.add.ellipse(v.c.x, v.c.y, s() * 0.85, s() * 0.24).setStrokeStyle(4, 0xff4a4a, 0.9).setDepth(v.c.depth - 1);
        scene.tweens.add({ targets: r, scaleX: 1.5, scaleY: 1.5, alpha: 0, duration: 800, ease: "Quad.easeOut", onComplete: () => r.destroy() });
      });
    } else if (option === 1) {
      const sign = scene.add.container(s() * 0.32, -s() * 0.95);
      const g = scene.add.graphics();
      const r = Math.max(9, s() * 0.1);
      g.fillStyle(0xd61f1f, 1).fillTriangle(0, -r, r * 1.05, r * 0.75, -r * 1.05, r * 0.75).lineStyle(2, 0xffffff, 1).strokeTriangle(0, -r, r * 1.05, r * 0.75, -r * 1.05, r * 0.75);
      const t = scene.add.text(0, r * 0.15, "!", { fontFamily: "Arial", fontSize: `${Math.round(r * 1.25)}px`, color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      sign.add([g, t]); v.c.add(sign); objs.push(sign);
      tweens.push(scene.tweens.add({ targets: sign, y: sign.y - 5, duration: 600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" }));
      tweens.push(scene.tweens.add({ targets: sign, alpha: 0.35, duration: 450, yoyo: true, repeat: -1, ease: "Stepped", easeParams: [1] }));
    } else {
      const g = behind("fx:orb", 0xff2020, 0);
      const base = g.scale;
      // double beat: lub-dub, pause
      tweens.push(scene.tweens.chain({ targets: g, loop: -1, tweens: [
        { alpha: 0.95, scale: base * 1.15, duration: 110 }, { alpha: 0.35, scale: base, duration: 140 },
        { alpha: 0.85, scale: base * 1.12, duration: 110 }, { alpha: 0.15, scale: base, duration: 260 },
        { alpha: 0.15, duration: 450 },
      ] }) as unknown as Phaser.Tweens.Tween);
    }
  }

  const stop = () => {
    tweens.forEach((t) => t.remove()); timers.forEach((t) => t.remove()); objs.forEach((o) => o.destroy());
    if (v.body.active) v.body.clearTint().setAlpha(1);
  };
  v.c.once(Phaser.GameObjects.Events.DESTROY, () => { tweens.forEach((t) => t.remove()); timers.forEach((t) => t.remove()); });
  return stop;
}
