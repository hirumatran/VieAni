import Phaser from "phaser";
import { loadData, validate } from "./core/data";
import { BoardScene } from "./scenes/BoardScene";

const data = loadData();
const problems = validate(data);
if (problems.length) console.warn("Data problems:", problems);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#1b120c",
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 720, height: 800 },
  scene: [new BoardScene(data)],
});
(window as unknown as { __game: Phaser.Game }).__game = game;
