import Phaser from "phaser";
import { loadData, validate } from "./core/data";
import { settings } from "./core/i18n";
import { GAME_H, GAME_W } from "./core/layout";
import { BoardScene } from "./scenes/BoardScene";
import { TitleScene } from "./scenes/TitleScene";
import { AnimLabScene } from "./scenes/AnimLabScene";
import { MatchScene } from "./scenes/MatchScene";
import { AuraLabScene } from "./scenes/AuraLabScene";
import { ScoutScene } from "./scenes/ScoutScene";

const data = loadData();
const problems = validate(data);
if (problems.length) console.warn("Data problems:", problems);
document.documentElement.lang = settings.lang;

// all text is rendered at 2× so it stays sharp on the 1.5× cameras
const textFactory = Phaser.GameObjects.GameObjectFactory.prototype as unknown as { text: (...a: unknown[]) => Phaser.GameObjects.Text };
const makeText = textFactory.text;
textFactory.text = function (this: unknown, ...a: unknown[]) { return makeText.apply(this, a).setResolution(2); };

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
    // Full HD canvas (PO 27 Nov 2026); smooth filtering – the art is clean illustrations, not pixel sprites
    pixelArt: false,
    antialias: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: GAME_W, height: GAME_H },
    scene: [new TitleScene(), new BoardScene(data), new AnimLabScene(data), new MatchScene(data), new AuraLabScene(data), new ScoutScene(data)],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
void boot();
