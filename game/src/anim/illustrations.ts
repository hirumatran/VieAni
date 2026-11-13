import Phaser from "phaser";
import manifest from "../../../assets/illustrations/manifest.json";
import type { GameData, Species } from "../core/data";
import type { ViewTextures } from "./VieAniView";

/** Sheet code (V001…) of a playable VieAni = its position in the roster (sorted like the sheet). */
export function vcode(d: GameData, s: Species): string | null {
  const i = d.roster.findIndex((r) => r.id === s.id);
  return i < 0 ? null : `V${String(i + 1).padStart(3, "0")}`;
}

type View = "front" | "back";
const M = manifest as Record<string, Partial<Record<View, { size: number; foot: number[] }>>>;

export function hasIllustration(d: GameData, s: Species, view: View): boolean {
  const c = vcode(d, s);
  return !!(c && M[c]?.[view]);
}

/** queue the illustration textures of the given species (both views) */
export function preloadIllustrations(scene: Phaser.Scene, d: GameData, list: Species[]) {
  for (const s of list) {
    const c = vcode(d, s);
    if (!c || !M[c]) continue;
    for (const v of ["front", "back"] as View[]) {
      if (!M[c][v]) continue;
      for (const suf of ["", "_star2", "_star3"]) scene.load.image(`il:${c}_${v}${suf}`, `illustrations/cut/${c}_${v}${suf}.png`);
    }
  }
}

/** smooth scaling for illustrations (the game runs in pixelArt mode for the pixel sprites) */
export function smooth(scene: Phaser.Scene, keys: string[]) {
  for (const k of keys) if (scene.textures.exists(k)) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

/** textures for a VieAni seen from `view`; falls back to the pixel sprite */
export function texturesFor(scene: Phaser.Scene, d: GameData, s: Species, view: View): { tex: ViewTextures; illustrated: boolean } {
  const c = vcode(d, s);
  const k = `il:${c}_${view}`;
  if (c && scene.textures.exists(k)) {
    smooth(scene, [k, k + "_star2", k + "_star3"]);
    return { tex: { body: k, star2: k + "_star2", star3: k + "_star3" }, illustrated: true };
  }
  return { tex: { body: `sp${s.id}` }, illustrated: false };
}
