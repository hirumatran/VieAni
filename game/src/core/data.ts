// Typed access to the shared game data in /data (the same files the VieIndex page and Google Sheet use).
import vieindex from "../../../data/vieindex.json";
import synergiesFile from "../../../data/synergies.json";
import itemsFile from "../../../data/items.json";
import relationsFile from "../../../data/relations.json";
import mechanicsFile from "../../../data/mechanics.json";

export type TypeName = "Legendary" | "Fire" | "Water" | "Electric" | "Grass" | "Ground" | "Rock" | "Sky" | "Insect" | "Poison";

export interface Stats { hp: number; atk: number; def: number; spa: number; spd: number; spe: number }

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
}

export interface Synergy {
  name: string;
  members: number[];
  byZodiac?: boolean;
  tiers: Record<string, string>;
  basis?: string;
}

export interface Item { id: number; name: string; tier: number; cat: "TC" | "PT" | "HT" | "TD" | "NEM" | "SAN"; effect: string }

export interface Relation { kind: "Thiên địch" | "Cộng sinh"; a: number[]; b: number[]; bType?: TypeName; mult?: number; effect: string }

export interface GameData {
  species: Species[];
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
    byId: new Map(species.map((s) => [s.id, s])),
    typeChart: vieindex.typeChart as Record<string, Record<string, number>>,
    legendary: vieindex.legendaryRule,
    synergies: synergiesFile.synergies as unknown as Synergy[],
    items: itemsFile.items as unknown as Item[],
    relations: relationsFile.relations as unknown as Relation[],
    mechanics: mechanicsFile,
  };
}

/** Type multiplier for an attack of `atk` type against a defender with `def` types. */
export function typeMultiplier(d: GameData, atk: TypeName, attackerTypes: TypeName[], def: TypeName[]): number {
  let m = 1;
  for (const t of def) m *= d.typeChart[atk]?.[t] ?? 1;
  if (attackerTypes.includes("Legendary")) m *= d.legendary.dealt;
  if (def.includes("Legendary")) m *= d.legendary.taken;
  return m;
}

/** Sanity checks on the data; returns a list of problems (empty = OK). */
export function validate(d: GameData): string[] {
  const errs: string[] = [];
  const ids = new Set<number>();
  for (const s of d.species) {
    if (ids.has(s.id)) errs.push(`duplicate id ${s.id}`);
    ids.add(s.id);
    if (!(s.tier >= 1 && s.tier <= 5)) errs.push(`${s.vi}: tier ${s.tier}`);
    if (!s.types.length || s.types.length > 2) errs.push(`${s.vi}: ${s.types.length} types`);
    for (const t of [...s.types, s.attackType]) if (!(t in d.typeChart) && t !== "Legendary") errs.push(`${s.vi}: unknown type ${t}`);
    if (![1, 2, 3].includes(s.range)) errs.push(`${s.vi}: range ${s.range}`);
    for (const k of ["hp", "atk", "def", "spa", "spd", "spe"] as const)
      if (!(s.stats[k] > 0)) errs.push(`${s.vi}: stat ${k}`);
  }
  for (const sy of d.synergies) for (const m of sy.members) if (!ids.has(m)) errs.push(`synergy ${sy.name}: unknown member ${m}`);
  for (const r of d.relations) for (const m of [...r.a, ...r.b]) if (!ids.has(m)) errs.push(`relation: unknown id ${m}`);
  return errs;
}
