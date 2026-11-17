// Which tộc hệ (synergies) a set of VieAni on the board forms (GDD §7). Pure logic – MatchScene draws the icons.
import type { GameData, Species, Synergy } from "./data";

export interface SynergyState {
  syn: Synergy;
  /** different members on the board (Mười Hai Con Giáp: different zodiac signs) */
  count: number;
  thresholds: number[];
  /** index of the highest threshold reached, -1 = none yet */
  level: number;
  /** the distinct species on the board that count */
  present: Species[];
  /** zodiac signs added by Ấn Thống Nhất (Mười Hai Con Giáp only) */
  bonus: number;
}

/** zodiacBonus: missing zodiac signs that count as present (Ấn Thống Nhất = CHARM_BONUS_ZODIAC) */
export function synergyStates(d: GameData, speciesIds: number[], zodiacBonus = 0): SynergyState[] {
  const species = [...new Set(speciesIds)].map((id) => d.byId.get(id)!).filter(Boolean);
  return d.synergies.map((syn) => {
    const thresholds = Object.keys(syn.tiers).map(Number).sort((a, b) => a - b);
    let present: Species[];
    let count: number;
    let bonus = 0;
    if (syn.byZodiac) {
      present = species.filter((s) => s.zodiac);
      const signs = new Set(present.map((s) => s.zodiac)).size;
      count = Math.min(12, signs + zodiacBonus);
      bonus = count - signs;
    } else {
      present = species.filter((s) => syn.members.includes(s.id));
      count = present.length;
    }
    const level = thresholds.reduce((lv, t, i) => (count >= t ? i : lv), -1);
    return { syn, count, thresholds, level, present, bonus };
  });
}

/** formed synergies (first threshold reached), strongest first */
export function activeSynergies(d: GameData, speciesIds: number[], zodiacBonus = 0): SynergyState[] {
  return synergyStates(d, speciesIds, zodiacBonus)
    .filter((s) => s.level >= 0)
    .sort((a, b) => b.level - a.level || b.count - a.count || a.syn.name.localeCompare(b.syn.name));
}
