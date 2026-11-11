import Phaser from "phaser";

export const FONT_LOGO = '"Baloo 2", "Be Vietnam Pro", sans-serif';
export const FONT_UI = '"Be Vietnam Pro", sans-serif';
export const GOLD = 0xe7c05f;
export const WOOD = 0x2b1d14;
export const CREAM = "#fbe9c4";

/** rounded wooden button with gold rim; hover = lift + glow */
export function button(scene: Phaser.Scene, x: number, y: number, w: number, h: number, label: string, onClick: () => void, primary = false) {
  const c = scene.add.container(x, y);
  const g = scene.add.graphics();
  const draw = (hover: boolean) => {
    g.clear();
    g.fillStyle(0x000000, 0.35).fillRoundedRect(-w / 2 + 3, -h / 2 + 5, w, h, 14);
    g.fillStyle(primary ? (hover ? 0xc0392b : 0xa8321f) : hover ? 0x45301f : WOOD, 0.92).fillRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(3, GOLD, hover ? 1 : 0.8).strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
    g.lineStyle(1, 0xffffff, 0.15).strokeRoundedRect(-w / 2 + 5, -h / 2 + 5, w - 10, h - 10, 10);
  };
  draw(false);
  const txt = scene.add
    .text(0, 0, label, { fontFamily: FONT_UI, fontSize: primary ? "26px" : "22px", color: CREAM, fontStyle: "bold" })
    .setOrigin(0.5)
    .setShadow(1, 2, "#000", 3);
  const hit = scene.add.zone(0, 0, w, h).setInteractive({ useHandCursor: true });
  hit.on("pointerover", () => { draw(true); c.setScale(1.04); });
  hit.on("pointerout", () => { draw(false); c.setScale(1); });
  hit.on("pointerdown", () => c.setScale(0.97));
  hit.on("pointerup", () => { c.setScale(1.04); onClick(); });
  c.add([g, txt, hit]);
  return c;
}

/** short message that fades out */
export function toast(scene: Phaser.Scene, msg: string) {
  const { width, height } = scene.scale;
  const txt = scene.add.text(width / 2, height - 70, msg, { fontFamily: FONT_UI, fontSize: "20px", color: CREAM, backgroundColor: "#2b1d14e6", padding: { x: 18, y: 10 } })
    .setOrigin(0.5).setDepth(100).setAlpha(0);
  scene.tweens.add({ targets: txt, alpha: 1, y: height - 84, duration: 200, yoyo: true, hold: 1600, onComplete: () => txt.destroy() });
}

/** cover-fit an image to the screen */
export function coverImage(scene: Phaser.Scene, key: string) {
  const { width, height } = scene.scale;
  const bg = scene.add.image(width / 2, height / 2, key);
  bg.setScale(Math.max(width / bg.width, height / bg.height));
  bg.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return bg;
}
