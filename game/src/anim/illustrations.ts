import Phaser from "phaser";
import manifest from "../../../assets/illustrations/manifest.json";
import sizes from "../../../data/sizes.json";
import type { GameData, Species } from "../core/data";
import type { ViewTextures } from "./VieAniView";

/** Sheet code (V001…) of a playable VieAni = its position in the roster (sorted like the sheet). */
export function vcode(d: GameData, s: Species): string | null {
  const i = d.roster.findIndex((r) => r.id === s.id);
  return i < 0 ? null : `V${String(i + 1).padStart(3, "0")}`;
}

type View = "front" | "back";
const M = manifest as Record<string, Partial<Record<string, { size: number; foot: number[] }>>>;

export function hasIllustration(d: GameData, s: Species, view: View): boolean {
  const c = vcode(d, s);
  return !!(c && M[c]?.[view]);
}

/** size of one frame in the game sheets (assets/illustrations/web, made by scripts/web_textures.py) */
const FRAME = 256;

/** queue the illustration sheets of the given species (both views + an alternate form if it has one) */
export function preloadIllustrations(scene: Phaser.Scene, d: GameData, list: Species[]) {
  for (const s of list) {
    const c = vcode(d, s);
    if (!c || !M[c]) continue;
    for (const v of ["front", "back"] as View[]) {
      const keys = M[c][v] ? [`${c}_${v}`] : [];
      if (M[c][`alt_${v}`]) keys.push(`${c}_${v}_alt`); // alternate form shown when it transforms in battle (Cá Chép → Rồng Con)
      for (const k of keys)
        if (!scene.textures.exists(`il:${k}`)) scene.load.spritesheet(`il:${k}`, `illustrations/web/${k}.webp`, { frameWidth: FRAME, frameHeight: FRAME });
    }
  }
}

/** smooth scaling for illustrations (the game runs in pixelArt mode for the pixel sprites) */
export function smooth(scene: Phaser.Scene, keys: string[]) {
  for (const k of keys) if (scene.textures.exists(k)) scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
}

const sheet = (k: string): ViewTextures => ({ body: k, star2: k, star3: k, bodyFrame: 0, star2Frame: 1, star3Frame: 2 });

/** textures for a VieAni seen from `view`; falls back to the pixel sprite */
export function texturesFor(scene: Phaser.Scene, d: GameData, s: Species, view: View): { tex: ViewTextures; illustrated: boolean; alt?: ViewTextures } {
  const c = vcode(d, s);
  const k = `il:${c}_${view}`;
  if (c && scene.textures.exists(k)) {
    const a = `${k}_alt`;
    smooth(scene, [k, a]);
    return { tex: sheet(k), illustrated: true, alt: scene.textures.exists(a) ? sheet(a) : undefined };
  }
  return { tex: { body: `sp${s.id}` }, illustrated: false };
}

/** size on the board by real body size (data/sizes.json, scripts/sizes.py): 1.0 = legendary / giant, 0.5 = tiniest */
export function sizeScale(d: GameData, s: Species): number {
  const c = vcode(d, s);
  return (c && (sizes as Record<string, { scale: number }>)[c]?.scale) || 1;
}
