import Phaser from "phaser";
import { loadData, validate } from "./core/data";
import { settings } from "./core/i18n";
import { SCREEN_H, SCREEN_W } from "./core/layout";
import { BoardScene } from "./scenes/BoardScene";
import { TitleScene } from "./scenes/TitleScene";

const data = loadData();
const problems = validate(data);
if (problems.length) console.warn("Data problems:", problems);
document.documentElement.lang = settings.lang;

async function boot() {
  // wait for the web fonts (Vietnamese glyphs) so Phaser text renders with them; never block > 2 s
  try {
    await Promise.race([
      Promise.all([document.fonts.load('800 64px "Baloo 2"'), document.fonts.load('600 20px "Be Vietnam Pro"')]),
      new Promise((r) => setTimeout(r, 2000)),
    ]);
  } catch {
    /* fall back to system fonts */
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    backgroundColor: "#1b120c",
    pixelArt: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: SCREEN_W, height: SCREEN_H },
    scene: [new TitleScene(), new BoardScene(data)],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
void boot();
