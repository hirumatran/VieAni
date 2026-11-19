// Typed access to the shared game data in /data (the same files the VieIndex page and Google Sheet use).
import vieindex from "../../../data/vieindex.json";
import synergiesFile from "../../../data/synergies.json";
import itemsFile from "../../../data/items.json";
import relationsFile from "../../../data/relations.json";
import mechanicsFile from "../../../data/mechanics.json";

export type TypeName = "Legendary" | "Fire" | "Water" | "Electric" | "Grass" | "Ground" | "Rock" | "Sky" | "Insect" | "Poison";

/** v3 stats (PO 19 Nov 2026): Máu, Tấn Công, Tốc Độ Đánh (attacks/s), Giáp (% less damage), Năng lượng (energy for the skill) */
export interface Stats { hp: number; atk: number; aspd: number; armor: number; energy: number }

export interface Species {
  id: number;
  dex: number;
  vi: string;
  en: string;
  sci?: string;
  group: string;
  tier: number;
  types: TypeName[];
  stats: Stats;
  attackType: TypeName;
  attackClass: "physical" | "special";
  range: number;
  skill: string;
  zodiac?: string | null;
  /** keep = in the current roster; later = saved for an update; removed = cut */
  status?: "keep" | "later" | "removed";
  role?: string;
  skills?: {
    active: { name: string; effect: string; time: string; damage: string; energy: number; estSeconds: number };
    passive: string;
    star3: string;
  };
}

export interface Synergy {
  name: string;
  members: number[];
  byZodiac?: boolean;
  tiers: Record<string, string>;
  basis?: string;
}

export interface Item { id: number; name: string; tier: number; cat: "TC" | "PT" | "HT" | "TD" | "NEM" | "SAN" | "LV"; effect: string }

export interface Relation { kind: "Thiên địch" | "Cộng sinh"; a: number[]; b: number[]; bType?: TypeName; mult?: number; effect: string }

export interface GameData {
  /** all species in the data file (incl. 'later' / 'removed') */
  species: Species[];
  /** the playable roster (status keep) */
  roster: Species[];
  byId: Map<number, Species>;
  typeChart: Record<string, Record<string, number>>;
  legendary: { dealt: number; taken: number };
  synergies: Synergy[];
  items: Item[];
  relations: Relation[];
  mechanics: typeof mechanicsFile;
}

export function loadData(): GameData {
  const species = (vieindex.species as unknown as Species[]).slice().sort((a, b) => a.dex - b.dex);
  return {
    species,
    roster: species.filter((s) => (s.status ?? "keep") === "keep"),
    byId: new Map(species.map((s) => [s.id, s])),
    typeChart: vieindex.typeChart as Record<string, Record<string, number>>,
    legendary: vieindex.legendaryRule,
    synergies: synergiesFile.synergies as unknown as Synergy[],
    items: itemsFile.items as unknown as Item[],
    relations: relationsFile.relations as unknown as Relation[],
    mechanics: mechanicsFile,
  };
}

/** Sanity checks on the data; returns a list of problems (empty = OK). */
export function validate(d: GameData): string[] {
  const errs: string[] = [];
  const ids = new Set<number>();
  for (const s of d.species) {
    if (ids.has(s.id)) errs.push(`duplicate id ${s.id}`);
    ids.add(s.id);
    if (!(s.tier >= 1 && s.tier <= 5)) errs.push(`${s.vi}: tier ${s.tier}`);
    if (![1, 2, 3].includes(s.range)) errs.push(`${s.vi}: range ${s.range}`);
    if (s.status !== "keep") continue;
    for (const k of ["hp", "atk", "aspd", "energy"] as const) if (!(s.stats[k] > 0)) errs.push(`${s.vi}: stat ${k}`);
    if (!(s.stats.armor >= 0 && s.stats.armor <= 60)) errs.push(`${s.vi}: Giáp ${s.stats.armor}`);
  }
  for (const sy of d.synergies) for (const m of sy.members) if (!ids.has(m)) errs.push(`synergy ${sy.name}: unknown member ${m}`);
  const keep = new Set(d.roster.map((s) => s.id));
  for (const sy of d.synergies) for (const m of sy.members) if (!keep.has(m)) errs.push(`synergy ${sy.name}: member ${m} is not in the roster`);
  for (const s of d.roster) {
    if (!s.role) errs.push(`${s.vi}: no role`);
    if (!s.skills?.active?.name || !s.skills.passive || !s.skills.star3) errs.push(`${s.vi}: missing skills`);
    const n = d.synergies.filter((g) => g.members.includes(s.id)).length;
    if (n > 2) errs.push(`${s.vi}: ${n} synergies (max 2)`);
  }
  for (const r of d.relations) for (const m of [...r.a, ...r.b]) if (!ids.has(m)) errs.push(`relation: unknown id ${m}`);
  return errs;
}
