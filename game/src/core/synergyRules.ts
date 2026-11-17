// Tộc hệ effects in battle (17 Nov 2026). Texts: data/synergies.json. Numbers below follow those texts; the parts listed in
// NOT_MODELLED need systems the battle does not have yet.
import type { GameData, Species } from "./data";
import type { Side } from "./battle";
import { synergyStates } from "./synergy";

/** what the battle needs to know for one side: reached tier index per tộc hệ (−1 = not active) */
export type SideSynergies = Map<string, number>;

export function sideSynergies(d: GameData, speciesIds: number[], zodiacBonus = 0, only?: string[] | null): SideSynergies {
  const m: SideSynergies = new Map();
  for (const s of synergyStates(d, speciesIds, zodiacBonus)) if (!only || only.includes(s.syn.name)) m.set(s.syn.name, s.level);
  return m;
}

export function isMember(d: GameData, name: string, sp: Species): boolean {
  const g = d.synergies.find((x) => x.name === name)!;
  return g.byZodiac ? !!sp.zodiac : g.members.includes(sp.id);
}

/** tier value by reached level (index), 0 when not active */
export const at = (lv: number, values: number[]) => (lv < 0 ? 0 : values[Math.min(lv, values.length - 1)]);

/** parts of tộc hệ texts that are not simulated yet (shown in the details panel) */
export const NOT_MODELLED: Record<string, string> = {
  "Tứ Linh": "miễn khống chế 4 giây đầu (chỉ có tác dụng với Dại)",
  "Cự Thú": "miễn Choáng/Đẩy lùi và khiêu khích (6) – chưa có hiệu ứng khống chế này",
  "Biển Đông": "sóng biển đẩy lùi (6)",
  "Bầy Gặm Nhấm": "Sinh sôi: con non (3)",
};
export type { Side };
