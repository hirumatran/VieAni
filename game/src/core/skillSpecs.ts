// Skill specs v3 (task T11, proposal 19 Nov 2026 – not yet approved by the PO).
// Machine version of the Sheet tab "Kỹ năng v3 – duyệt" (texts: scripts/skills_v3.py → data/skills_v3.json).
// Damage % of Tấn Công per target comes from data/skills_v3.json (atkPct); everything else is here.
// Numbers given as [★1, ★2, ★3] or one number for all stars. Durations in seconds.
import skillsFile from "../../../data/skills_v3.json";

export type V = number | [number, number, number];
export type Stat = "atk" | "aspd" | "armor" | "dodge" | "dmg" | "acc" | "miss" | "crit";
/** who the skill hits */
export type Sel = "cur" | "lowHp" | "far" | "far3" | "back" | "backLow" | "highTier3" | "insect" | "nearest" | "stealthLow"
  | "highAtk" | "random" | "highHp" | "itemHolder" | "self" | "preyHawk";
export interface Area { shape: "around" | "self" | "row" | "line" | "cone" | "all" | "behind" | "front3"; r?: V }
/** effects on the enemies hit */
export type Eff =
  | { k: "stun" | "root" | "blind" | "silence" | "charm" | "lift"; d: V; onlySyn?: string }
  | { k: "knock"; cells: V }
  | { k: "slow"; v: V; d: V }
  | { k: "dot"; v: V; d: V; antiHeal?: number; spread?: number }
  | { k: "debuff"; stat: Stat; v: V; d: V }
  | { k: "taunt"; d: V }
  | { k: "execute"; below: number };
export interface Hit {
  sel: Sel; n?: V; area?: Area;
  /** override of the % Tấn Công from skills_v3.json (per target) */
  pct?: number;
  pen?: V; vsRole?: [string, number]; vsSyn?: [string, number]; vsIds?: [string[], number];
  firstBonus?: number; lowHpScale?: boolean; cost?: number; drain?: number; noDodge?: boolean; jump?: boolean;
  eff?: Eff[];
}
/** who an ally effect goes to */
export type ASel = "self" | "team" | "adj" | "lowest" | "lowestIn2" | "low2" | "low3" | "near1" | "row" | `syn:${string}`;
export type AEff =
  | { k: "heal"; v: V }
  | { k: "shield"; v: V; d: V }
  | { k: "buff"; stat: Stat; v: V; d: V }
  | { k: "cleanse" }
  | { k: "immune"; what: "cc" | "basic" | "skill" | "knock" | "slow"; d: V }
  | { k: "dr"; v: V; d: V; melee?: boolean }
  | { k: "stealth"; d: V }
  | { k: "taunt"; r: V; d: V; who?: "highAtk" }
  | { k: "summon"; n: V; pct: V }
  | { k: "reviveTemp"; v: V; d: number }
  | { k: "guard"; v: V; d: V }
  | { k: "wall"; v: V; d: V }
  | { k: "carry" }
  | { k: "copy" }
  | { k: "mimic"; v: V }
  | { k: "steal" }
  | { k: "flee"; d: number }
  | { k: "stackAtk"; v: number };
export interface Skill { hit?: Hit; ally?: { to: ASel; eff: AEff[]; replace?: boolean }[] }
export interface Passive {
  hpPct?: V; atkPct?: V; aspdPct?: V; armor?: V; crit?: V; dmgPct?: V;
  dodge?: V; dodgeMelee?: V; dodgeRanged?: V;
  drBasic?: V; drSkill?: V; drMelee?: V; drFront?: V;
  /** × damage taken from Biển Đông / Sông Nước attackers · Giáp gained per such hit · team-wide × (Cá Ông) */
  drWater?: number; waterArmor?: number; waterAura?: number;
  /** chance to bounce a control effect back to its source (Mắt Công) */
  reflectCC?: V;
  penBasic?: V; noDodge?: boolean; immuneSlow?: boolean; immuneKnock?: boolean; dodgeFirstSkill?: boolean;
  /** the stat bonuses above only count when this holds */
  cond?: "front" | "adjAlly" | "adjBird" | "nearBuffalo" | "nearDragon";
  onHit?: { p: V; eff: Eff; armorShred?: never } | { p: V; shred: number; max: V };
  onHurt?: { p?: V; melee?: boolean; eff?: Eff; reflect?: V; zapPct?: number; cd?: V };
  stack?: { on: "hitSame" | "tick3" | "hurt" | "allyDieAdj"; stat: "aspd" | "dmg" | "atk" | "hpPct" | "armor"; v: V; max?: V };
  low?: { below: number; atkPct?: V; dmgPct?: V; sweep?: boolean; flee?: number; heal?: V; skillX2?: boolean };
  aura?: { who: "ally" | "enemy"; r: number; stat: Stat; v: V; filter?: string };
  death?: { p?: V; revive?: V; spawn?: [V, V]; egg?: boolean; ghost?: number };
  cheatDeath?: V;
  regenIdle?: V;
  vs?: { ids?: string[]; syn?: string; m: V; healPct?: V };
  firstMult?: V; firstCritPerTarget?: boolean; firstLowHp?: boolean;
  start?: { untarget?: number; dodge?: [V, V]; teamDodge?: [number, number]; noCat?: V; ambush?: boolean; waterAspd?: [number, number] };
  every?: { s: number; k: "cleanseAdj" | "hop" | "spawn"; pct?: V };
  transform?: { s: V; mult: V };
  perSyn?: { hpPct: number; atkPct: number; aspdPct: number };
  perBird?: V; perHunter?: V;
  lightning?: { pct: number; cd: V };
  gold?: boolean;
}
export interface Spec { skill: Skill; passive: Passive; s3?: { skill?: Skill; hit?: Partial<Hit>; passive?: Passive; energy?: number } }

const p = (v: V) => v;
const S: Record<string, Spec> = {
  "Thỏ vằn Trường Sơn": { skill: { hit: { sel: "far", jump: true } }, passive: { dodge: [0.15, 0.2, 0.25] },
    s3: { skill: { ally: [{ to: "self", eff: [{ k: "stealth", d: 2 }] }] } } },
  "Voi châu Á": { skill: { hit: { sel: "self", area: { shape: "self", r: 1 }, eff: [{ k: "stun", d: [1, 1.25, 1.5] }] } },
    passive: { aura: { who: "ally", r: 99, stat: "atk", v: [0.05, 0.08, 0.1] } }, s3: { hit: { area: { shape: "self", r: 2 } } } },
  "Cò thìa": { skill: { hit: { sel: "cur", area: { shape: "around", r: 1 }, eff: [{ k: "debuff", stat: "aspd", v: 0.15, d: 5 }] },
    ally: [{ to: "syn:Sông Nước", eff: [{ k: "buff", stat: "atk", v: [0.15, 0.2, 0.25], d: 5 }] }] },
    passive: { aspdPct: [0.1, 0.15, 0.2], cond: "adjBird" }, s3: { skill: { ally: [{ to: "near1", eff: [{ k: "heal", v: 0.1 }] }] } } },
  "Báo Gấm": { skill: { hit: { sel: "lowHp", jump: true } }, passive: { crit: [0.15, 0.2, 0.25], firstLowHp: true },
    s3: { passive: { start: { untarget: 4 } } } },
  "Bò Biển (Cá Nàng Tiên)": { skill: { hit: { sel: "cur", area: { shape: "around", r: 2 }, eff: [{ k: "charm", d: [3, 4, 5] }] } },
    passive: { regenIdle: [0.02, 0.025, 0.03] }, s3: { skill: { ally: [{ to: "near1", eff: [{ k: "heal", v: 0.15 }] }] } } },
  "Gà lôi lam mào trắng": { skill: { hit: { sel: "cur", area: { shape: "cone", r: 2 }, eff: [{ k: "blind", d: [2, 2.5, 3] }] } },
    passive: { dodge: [0.15, 0.2, 0.25] }, s3: { passive: { death: { ghost: 4 } } } },
  "Cò quắm lớn": { skill: { hit: { sel: "cur", pen: [0.3, 0.4, 0.5] } }, passive: { penBasic: 0.2 },
    s3: { hit: { n: 3 } } },
  "Vượn khổng lồ": { skill: { hit: { sel: "cur", area: { shape: "around", r: 1 }, eff: [{ k: "stun", d: 0.5 }] } },
    passive: { hpPct: [0.1, 0.15, 0.2] }, s3: { skill: { ally: [{ to: "self", eff: [{ k: "buff", stat: "atk", v: 1, d: 4 }] }] } } },
  "Kim Quy": { skill: { hit: { sel: "itemHolder" }, ally: [{ to: "lowest", eff: [{ k: "steal" }] }] },
    passive: { aura: { who: "ally", r: 99, stat: "dmg", v: [0.12, 0.16, 0.2], filter: "ranged" } } },
  "Hồng hoàng": { skill: { hit: { sel: "cur", eff: [{ k: "stun", d: [0.5, 0.75, 1] }] } },
    passive: { onHit: { p: [0.15, 0.2, 0.25], eff: { k: "stun", d: 0.5 } } } },
  "Công": { skill: { hit: { sel: "self", area: { shape: "self", r: 1 }, eff: [{ k: "slow", v: [0.2, 0.3, 0.4], d: [2, 3, 4] }] } },
    passive: { reflectCC: [0.15, 0.2, 0.25] }, s3: { hit: { area: { shape: "self", r: 2 } } } },
  "Chà vá chân xám": { skill: { hit: { sel: "self", area: { shape: "self", r: 2 }, eff: [{ k: "debuff", stat: "atk", v: [0.1, 0.15, 0.2], d: 4 }] } },
    passive: { dodgeMelee: [0.15, 0.2, 0.25] }, s3: { skill: { ally: [{ to: "near1", eff: [{ k: "buff", stat: "aspd", v: 0.15, d: 4 }] }] } } },
  "Đồi mồi": { skill: { ally: [{ to: "self", eff: [{ k: "dr", v: [0.5, 0.6, 0.7], d: 3 }, { k: "taunt", r: 1, d: 3 }] }] },
    passive: { immuneSlow: true, aspdPct: [0.1, 0.15, 0.2] } },
  "Hổ Đông Dương": { skill: { hit: { sel: "far3", jump: true } }, passive: { aura: { who: "enemy", r: 2, stat: "atk", v: [0.15, 0.2, 0.25] } },
    s3: { passive: { aura: { who: "enemy", r: 99, stat: "atk", v: 0.25 } } } },
  "Ngựa sắt Thánh Gióng": { skill: { hit: { sel: "cur", area: { shape: "row" }, eff: [{ k: "dot", v: 0.03, d: 4 }] } },
    passive: { low: { below: 0.5, sweep: true } }, s3: { hit: { area: { shape: "all" } } } },
  "Cá Nược (Cá Heo Sông)": { skill: { hit: { sel: "cur", area: { shape: "line" }, eff: [{ k: "debuff", stat: "armor", v: [8, 10, 12], d: [4, 5, 6] }] },
    ally: [{ to: "row", eff: [{ k: "buff", stat: "atk", v: 0.15, d: [4, 5, 6] }] }] },
    passive: { onHit: { p: 1, eff: { k: "debuff", stat: "armor", v: 5, d: 3 } } }, s3: { passive: { start: { waterAspd: [0.2, 6] } } } },
  "Bò Xám": { skill: { hit: { sel: "cur", eff: [{ k: "knock", cells: 1 }, { k: "stun", d: [1, 1.5, 2] }] } },
    passive: { onHurt: { melee: true, reflect: [0.15, 0.2, 0.25] } }, s3: { passive: { stack: { on: "allyDieAdj", stat: "hpPct", v: 0.1 } } } },
  "Mang lớn": { skill: { hit: { sel: "cur", vsRole: ["Đỡ Đòn", 1.25] } }, passive: { armor: [5, 7, 10], cond: "front" },
    s3: { hit: { area: { shape: "behind" } } } },
  "Lân": { skill: { hit: { sel: "self", area: { shape: "self", r: 1 } }, ally: [{ to: "near1", eff: [{ k: "cleanse" }, { k: "immune", what: "cc", d: [2, 3, 4] }] }] },
    passive: { every: { s: 8, k: "cleanseAdj" } }, s3: { skill: { ally: [{ to: "team", eff: [{ k: "heal", v: 0.15 }] }] } } },
  "Chim Lạc": { skill: { hit: { sel: "cur", area: { shape: "all" }, eff: [{ k: "knock", cells: [1, 2, 3] }] } },
    passive: { perSyn: { hpPct: 0.1, atkPct: 0.03, aspdPct: 0.03 } }, s3: { hit: { eff: [{ k: "knock", cells: 3 }, { k: "stun", d: 1 }] } } },
  "Cá Tra Dầu": { skill: { hit: { sel: "cur", eff: [{ k: "debuff", stat: "miss", v: [0.2, 0.3, 0.4], d: 5 }] } },
    passive: { hpPct: [0.1, 0.15, 0.2] }, s3: { hit: { sel: "self", area: { shape: "self", r: 2 } } } },
  "Nghê": { skill: { ally: [{ to: "self", eff: [{ k: "guard", v: [0.3, 0.4, 0.5], d: 5 }] }] }, passive: { armor: [5, 7, 10] } },
  "Ngựa chín hồng mao": { skill: { hit: { sel: "far", area: { shape: "line" }, jump: true } },
    passive: { stack: { on: "hitSame", stat: "aspd", v: [0.05, 0.08, 0.1] } },
    s3: { hit: { eff: [{ k: "stun", d: 0.5 }] }, passive: { stack: { on: "hitSame", stat: "aspd", v: 0.2 } } } },
  "Gà chín cựa": { skill: { hit: { sel: "cur" } }, passive: { stack: { on: "hitSame", stat: "dmg", v: [0.05, 0.08, 0.1] } },
    s3: { hit: { pct: 960 }, passive: { stack: { on: "hitSame", stat: "dmg", v: 0.2 } } } },
  "Hồ Tinh": { skill: { ally: [{ to: "self", eff: [{ k: "copy" }] }] }, passive: { onHit: { p: [0.1, 0.15, 0.2], eff: { k: "charm", d: 2 } } } },
  "Voi chín ngà": { skill: { hit: { sel: "cur", area: { shape: "front3" }, eff: [{ k: "knock", cells: 1 }] } },
    passive: { hpPct: [0.05, 0.1, 0.15], waterArmor: 2 },
    s3: { hit: { eff: [{ k: "knock", cells: 1 }, { k: "stun", d: 1 }] }, skill: { ally: [{ to: "syn:Sơn Tinh", eff: [{ k: "buff", stat: "atk", v: 0.15, d: 4 }] }] } } },
  "Vượn đen má trắng": { skill: { hit: { sel: "cur", area: { shape: "around", r: 2 }, eff: [{ k: "slow", v: 0.15, d: 3 }] } },
    passive: { every: { s: 5, k: "hop" } } },
  "Cầy vằn bắc": { skill: { ally: [{ to: "low2", eff: [{ k: "heal", v: [0.15, 0.2, 0.25] }, { k: "cleanse" }] }] },
    passive: { onHurt: { p: [0.15, 0.2, 0.25], eff: { k: "blind", d: 1 } } },
    s3: { skill: { ally: [{ to: "low3", replace: true, eff: [{ k: "heal", v: 0.25 }, { k: "buff", stat: "dodge", v: 0.15, d: 3 }] }] } } },
  "Cu li nhỏ": { skill: { hit: { sel: "cur", eff: [{ k: "dot", v: [0.03, 0.04, 0.05], d: 4, antiHeal: 0.3 }] } },
    passive: { armor: [5, 7, 10], immuneKnock: true }, s3: { hit: { eff: [{ k: "dot", v: 0.05, d: 4, antiHeal: 0.3, spread: 1 }] } } },
  "Sao la": { skill: { hit: { sel: "self", area: { shape: "self", r: 1 }, eff: [{ k: "taunt", d: [3, 4, 5] }] },
    ally: [{ to: "self", eff: [{ k: "dr", v: [0.3, 0.4, 0.5], d: [3, 4, 5], melee: true }] }] },
    passive: { start: { untarget: 3 } }, s3: { passive: { aura: { who: "ally", r: 99, stat: "dmg", v: 0.1, filter: "Trường Sơn" } } } },
  "Sếu đầu đỏ": { skill: { ally: [{ to: "team", eff: [{ k: "buff", stat: "aspd", v: [0.1, 0.15, 0.2], d: 5 }, { k: "heal", v: 0.1 }] }] },
    passive: { dodgeMelee: 0.3 }, s3: { skill: { ally: [{ to: "team", eff: [{ k: "buff", stat: "atk", v: 0.15, d: 5 }, { k: "cleanse" }] }] } } },
  "Cá Sấu Nước Ngọt": { skill: { hit: { sel: "cur", eff: [{ k: "root", d: [2, 2.5, 3] }] } }, passive: { drBasic: [0.1, 0.15, 0.2] },
    s3: { passive: { start: { ambush: true } } } },
  "Cheo cheo lưng bạc": { skill: { ally: [{ to: "self", eff: [{ k: "taunt", r: 99, d: [4, 5, 6], who: "highAtk" }, { k: "buff", stat: "dodge", v: 0.5, d: [4, 5, 6] }] }] },
    passive: { dodge: [0.1, 0.15, 0.2], dodgeFirstSkill: false } },
  "Rẽ mỏ thìa": { skill: { hit: { sel: "random", n: 3, eff: [{ k: "blind", d: 1 }] } }, passive: { dodgeRanged: [0.2, 0.25, 0.3] },
    s3: { passive: { death: { revive: 0.3 } } } },
  "Gấu chó": { skill: { hit: { sel: "cur", drain: 0.3 } }, passive: { vs: { syn: "Côn Trùng", m: 1, healPct: [0.1, 0.12, 0.15] } },
    s3: { hit: { eff: [{ k: "root", d: 2 }] } } },
  "Tê tê Java": { skill: { hit: { sel: "self", area: { shape: "self", r: [1, 2, 3] } }, ally: [{ to: "self", eff: [{ k: "buff", stat: "armor", v: 2, d: 99 }] }] },
    passive: { drBasic: [0.1, 0.15, 0.2] }, s3: { skill: { ally: [{ to: "self", eff: [{ k: "immune", what: "skill", d: 2 }] }] } } },
  "Rồng Lạc Việt": { skill: { hit: { sel: "highHp", n: 3 } }, passive: { low: { below: 0.3, skillX2: true } },
    s3: { hit: { n: 5, eff: [{ k: "stun", d: 0.5 }] } } },
  "Tê giác Java (Việt Nam)": { skill: { hit: { sel: "cur", eff: [{ k: "stun", d: 1.5 }, { k: "execute", below: 0.25 }] } },
    passive: { drFront: [0.1, 0.15, 0.2] }, s3: { energy: 40 } },
  "Phượng Hoàng": { skill: { hit: { sel: "cur", area: { shape: "around", r: 1 }, eff: [{ k: "dot", v: 0.03, d: 3 }] } },
    passive: { death: { egg: true } } },
  "Cá Ông": { skill: { ally: [{ to: "lowestIn2", eff: [{ k: "shield", v: 0.3, d: 4 }, { k: "heal", v: [0.2, 0.25, 0.3] }] }] },
    passive: { aura: { who: "ally", r: 99, stat: "armor", v: 6, filter: "water" }, waterAura: 0.88 },
    s3: { skill: { ally: [{ to: "low2", replace: true, eff: [{ k: "shield", v: 0.3, d: 4 }, { k: "heal", v: 0.3 }] }] } } },
  "Chó Cỏ": { skill: { ally: [{ to: "self", eff: [{ k: "taunt", r: 1, d: [3, 3.5, 4] }] }, { to: "adj", eff: [{ k: "buff", stat: "armor", v: 8, d: 4 }] }] },
    passive: { stack: { on: "allyDieAdj", stat: "atk", v: [0.2, 0.25, 0.3], max: 1 } },
    s3: { skill: { ally: [{ to: "self", replace: true, eff: [{ k: "taunt", r: 2, d: 4 }] }] } } },
  "Chó H'Mông Cộc Đuôi": { skill: { hit: { sel: "back", jump: true } }, passive: { immuneSlow: true, start: { dodge: [0.2, [5, 6, 7]] } },
    s3: { hit: { eff: [{ k: "stun", d: 1 }] } } },
  "Chó Phú Quốc": { skill: { hit: { sel: "cur", noDodge: true } }, passive: { crit: [0.05, 0.1, 0.15], firstCritPerTarget: true } },
  "Chó Lài": { skill: { hit: { sel: "cur", lowHpScale: true } }, passive: { low: { below: 0.5, atkPct: [0.2, 0.25, 0.3] } },
    s3: { hit: { eff: [{ k: "dot", v: 0.03, d: 3 }] } } },
  "Mèo Mướp": { skill: { hit: { sel: "cur", firstBonus: 0.3 } }, passive: { vs: { ids: ["Chuột Nhắt", "Chuột Cống"], m: [1.2, 1.3, 1.4] } },
    s3: { hit: { n: 2 } } },
  "Mèo Mun": { skill: { ally: [{ to: "self", eff: [{ k: "reviveTemp", v: [0.3, 0.4, 0.5], d: 5 }] }] }, passive: { dodge: [0.1, 0.15, 0.2] },
    s3: { skill: { ally: [{ to: "self", replace: true, eff: [{ k: "reviveTemp", v: 0.5, d: 0 }] }] } } },
  "Mèo Tam Thể": { skill: { hit: { sel: "cur", eff: [{ k: "debuff", stat: "atk", v: 0.1, d: 4 }, { k: "debuff", stat: "armor", v: 5, d: 4 }, { k: "debuff", stat: "aspd", v: 0.1, d: 4 }] } },
    passive: { death: { p: [0.15, 0.2, 0.25], revive: 0.25 } }, s3: { passive: { gold: true } } },
  "Gà Đông Tảo": { skill: { ally: [{ to: "self", eff: [{ k: "immune", what: "knock", d: 3 }, { k: "buff", stat: "armor", v: [10, 15, 20], d: 3 }, { k: "taunt", r: 1, d: 3 }] }] },
    passive: { onHit: { p: [0.15, 0.2, 0.25], eff: { k: "dot", v: 0.03, d: 3 } } },
    s3: { skill: { ally: [{ to: "self", eff: [{ k: "heal", v: 0.2 }] }] } } },
  "Heo Ỉ": { skill: { ally: [{ to: "self", eff: [{ k: "shield", v: 0.2, d: 4 }, { k: "heal", v: 0.1 }] }] },
    passive: { stack: { on: "hurt", stat: "hpPct", v: 0.02, max: [0.2, 0.25, 0.3] } },
    s3: { skill: { ally: [{ to: "self", eff: [{ k: "taunt", r: 1, d: 3 }] }] } } },
  "Heo Móng Cái": { skill: { ally: [{ to: "self", eff: [{ k: "summon", n: 1, pct: [0.2, 0.25, 0.3] }] }] }, passive: { death: { spawn: [1, 0.2] } },
    s3: { passive: { death: { spawn: [2, 0.4] } } } },
  "Chuột Nhắt": { skill: { hit: { sel: "backLow", jump: true } }, passive: { dodge: 0.25, start: { noCat: [3, 4, 5] } },
    s3: { passive: { death: { spawn: [2, 0.2] } } } },
  "Chuột Cống": { skill: { hit: { sel: "cur", eff: [{ k: "dot", v: [0.03, 0.04, 0.05], d: 3, spread: 1 }] } },
    passive: { onHit: { p: 1, shred: 2, max: [5, 7, 10] } } },
  "Trâu": { skill: { hit: { sel: "cur", area: { shape: "line" }, eff: [{ k: "slow", v: 0.3, d: 3 }] } }, passive: { hpPct: [0.1, 0.15, 0.2] },
    s3: { passive: { gold: true } } },
  "Dê": { skill: { hit: { sel: "cur", eff: [{ k: "knock", cells: 1 }, { k: "stun", d: [0.5, 0.75, 1] }] } }, passive: { dodge: [0.15, 0.2, 0.25] },
    s3: { hit: { eff: [{ k: "knock", cells: 2 }, { k: "stun", d: 1 }] } } },
  "Ngựa Ta": { skill: { ally: [{ to: "low2", eff: [{ k: "carry" }, { k: "buff", stat: "aspd", v: 0.2, d: 4 }] }] },
    passive: { aura: { who: "ally", r: 1, stat: "aspd", v: [0.06, 0.08, 0.1] } },
    s3: { skill: { ally: [{ to: "low2", replace: true, eff: [{ k: "carry" }, { k: "buff", stat: "aspd", v: 0.2, d: 4 }, { k: "heal", v: 0.15 }] }] } } },
  "Vịt Cỏ": { skill: { ally: [{ to: "self", eff: [{ k: "heal", v: [0.12, 0.16, 0.2] }] }, { to: "adj", eff: [{ k: "heal", v: [0.12, 0.16, 0.2] }] }] },
    passive: { vs: { ids: ["Ốc Bươu Vàng"], m: 1.5 }, drWater: 0.85 },
    s3: { skill: { ally: [{ to: "team", eff: [{ k: "heal", v: 0.08 }] }] } } },
  "Cò Trắng": { skill: { hit: { sel: "cur", vsSyn: ["Sông Nước", 1.3] } }, passive: { aspdPct: [0.1, 0.15, 0.2], cond: "nearBuffalo" },
    s3: { hit: { n: 2 } } },
  "Chim Sẻ": { skill: { ally: [{ to: "low2", eff: [{ k: "cleanse" }, { k: "heal", v: [0.12, 0.16, 0.2] }] }] }, passive: { perBird: [0.05, 0.07, 0.1] },
    s3: { passive: { start: { teamDodge: [0.1, 4] } } } },
  "Sáo Sậu": { skill: { ally: [{ to: "self", eff: [{ k: "mimic", v: 0.7 }] }] }, passive: { onHit: { p: [0.1, 0.15, 0.2], eff: { k: "silence", d: 1 } } },
    s3: { skill: { ally: [{ to: "self", replace: true, eff: [{ k: "mimic", v: 1 }] }] } } },
  "Cá Chép": { skill: { hit: { sel: "cur", area: { shape: "behind" } }, ally: [{ to: "self", eff: [{ k: "stackAtk", v: 0.05 }] }] },
    passive: { transform: { s: 20, mult: [1.3, 1.4, 1.5] } }, s3: { passive: { transform: { s: 12, mult: 1.5 } } } },
  "Cua Đồng": { skill: { ally: [{ to: "self", eff: [{ k: "wall", v: 0.3, d: [4, 5, 6] }] }] },
    passive: { onHit: { p: [0.1, 0.15, 0.2], eff: { k: "root", d: 1 } } } },
  "Ốc Bươu Vàng": { skill: { ally: [{ to: "self", eff: [{ k: "immune", what: "basic", d: [1.5, 2, 2.5] }] }] },
    passive: { every: { s: 8, k: "spawn", pct: [0.1, 0.12, 0.15] } } },
  "Thạch Sùng": { skill: { hit: { sel: "insect", vsSyn: ["Côn Trùng", 1.5] } }, passive: { dodge: [0.1, 0.15, 0.2] },
    s3: { hit: { n: 2 } } },
  "Thằn Lằn Bóng": { skill: { hit: { sel: "insect" } }, passive: { cheatDeath: [0.01, 0.1, 0.2] },
    s3: { passive: { cheatDeath: 0.2, regenIdle: 0.1 } } },
  "Cóc Nhà": { skill: { ally: [{ to: "syn:water", eff: [{ k: "buff", stat: "dmg", v: [0.15, 0.2, 0.25], d: 5 }] }] },
    passive: { lightning: { pct: 0.15, cd: [12, 10, 8] } } },
  "Gián": { skill: { hit: { sel: "lowHp", jump: true }, ally: [{ to: "self", eff: [{ k: "flee", d: 2 }] }] },
    passive: { dodge: [0.25, 0.3, 0.35], low: { below: 0.2, flee: 2 } } },
  "Muỗi Vằn": { skill: { hit: { sel: "cur", drain: 0.5, eff: [{ k: "debuff", stat: "aspd", v: 0.2, d: 3 }] } },
    passive: { onHit: { p: [0.15, 0.2, 0.25], eff: { k: "debuff", stat: "aspd", v: 0.2, d: 3 } } },
    s3: { passive: { onHit: { p: 0.25, eff: { k: "dot", v: 0.02, d: 3 } } } } },
  "Đom Đóm": { skill: { hit: { sel: "cur", area: { shape: "around", r: 1 }, eff: [{ k: "blind", d: [2, 2.5, 3] }] } },
    passive: { aura: { who: "ally", r: 1, stat: "acc", v: [0.1, 0.15, 0.2] } } },
  "Kiến Lửa": { skill: { hit: { sel: "cur", eff: [{ k: "dot", v: [0.03, 0.04, 0.05], d: 3 }] } },
    passive: { stack: { on: "tick3", stat: "atk", v: 0.05, max: [0.2, 0.25, 0.3] } } },
  "Kiến Vàng": { skill: { hit: { sel: "cur" }, ally: [{ to: "adj", eff: [{ k: "buff", stat: "armor", v: 5, d: 5 }] }] },
    passive: { armor: [5, 7, 10], cond: "adjAlly", vs: { syn: "Côn Trùng", m: 1.3 } } },
  "Ong Mật": { skill: { hit: { sel: "cur", cost: 0.5 } }, passive: { aura: { who: "ally", r: 99, stat: "atk", v: [0.05, 0.07, 0.1], filter: "Côn Trùng" } },
    s3: { hit: { cost: 0.2 } } },
  "Ve Sầu": { skill: { hit: { sel: "nearest", eff: [{ k: "stun", d: [0.5, 0.75, 1] }] } }, passive: { armor: [5, 7, 10] },
    s3: { passive: { low: { below: 0.3, heal: 0.3 } } } },
  "Châu Chấu": { skill: { hit: { sel: "highTier3", jump: true } }, passive: { dmgPct: 0, vs: { syn: "higherTier", m: [1.3, 1.4, 1.5] } } },
  "Chuồn Chuồn": { skill: { hit: { sel: "cur" } }, passive: { aura: { who: "ally", r: 99, stat: "dmg", v: [0.06, 0.08, 0.1], filter: "water" } } },
  "Bọ Ngựa": { skill: { hit: { sel: "cur", eff: [{ k: "root", d: 1, onlySyn: "Côn Trùng" }] } }, passive: { firstMult: [1.5, 2, 2.5] } },
  "Heo Rừng": { skill: { hit: { sel: "cur", eff: [{ k: "stun", d: [1, 1.25, 1.5] }] } }, passive: { low: { below: 0.5, dmgPct: [0.1, 0.15, 0.2] } },
    s3: { hit: { area: { shape: "behind" } } } },
  "Sóc Bụng Đỏ": { skill: { ally: [{ to: "lowest", eff: [{ k: "heal", v: [0.15, 0.2, 0.25] }, { k: "buff", stat: "atk", v: 0.1, d: 4 }] }] },
    passive: { dodge: [0.15, 0.2, 0.25] }, s3: { skill: { ally: [{ to: "low2", replace: true, eff: [{ k: "heal", v: 0.25 }, { k: "buff", stat: "atk", v: 0.1, d: 4 }] }] } } },
  "Hoẵng": { skill: { ally: [{ to: "team", eff: [{ k: "buff", stat: "dodge", v: [0.15, 0.2, 0.25], d: 3 }] }] }, passive: { dodge: [0.1, 0.15, 0.2] } },
  "Tắc Kè": { skill: { hit: { sel: "cur" }, ally: [{ to: "self", eff: [{ k: "stealth", d: [3, 4, 5] }] }] },
    passive: { onHit: { p: [0.1, 0.15, 0.2], eff: { k: "root", d: 2 } } } },
  "Rắn Hổ Mang": { skill: { hit: { sel: "cur", eff: [{ k: "dot", v: [0.04, 0.05, 0.06], d: 3 }, { k: "slow", v: 0.2, d: 3 }] } },
    passive: { dodgeFirstSkill: true }, s3: { passive: { atkPct: 0.2, cond: "nearDragon" } } },
  "Trăn Gấm": { skill: { hit: { sel: "cur", eff: [{ k: "root", d: [2, 2.5, 3] }, { k: "dot", v: 0.05, d: [2, 2.5, 3] }] } },
    passive: { drSkill: [0.1, 0.15, 0.2] } },
  "Cá Đuối Điện": { skill: { hit: { sel: "cur", n: 3, eff: [{ k: "stun", d: 1 }] } },
    passive: { onHurt: { p: [0.15, 0.2, 0.25], melee: true, eff: { k: "stun", d: 1 } } }, s3: { hit: { n: 5 } } },
  "Sứa": { skill: { hit: { sel: "self", area: { shape: "self", r: 1 }, eff: [{ k: "root", d: 1 }, { k: "dot", v: 0.03, d: 3 }] } },
    passive: { onHurt: { melee: true, reflect: [0.1, 0.15, 0.2] } }, s3: { passive: { death: { revive: 0.3 } } } },
  "Mực": { skill: { hit: { sel: "cur", area: { shape: "around", r: 1 }, eff: [{ k: "blind", d: [2, 3, 4] }] } }, passive: { dodgeRanged: [0.15, 0.2, 0.25] },
    s3: { hit: { area: { shape: "around", r: 2 } } } },
  "Cú Mèo": { skill: { hit: { sel: "stealthLow", noDodge: true } }, passive: { noDodge: true, crit: [0.05, 0.1, 0.15] },
    s3: { hit: { eff: [{ k: "silence", d: 2 }] } } },
  "Diều Hâu": { skill: { hit: { sel: "preyHawk" } }, passive: { crit: [0.1, 0.15, 0.2] }, s3: { hit: { eff: [{ k: "lift", d: 1 }] } } },
  "Sói Đỏ": { skill: { ally: [{ to: "syn:Bầy Chó Dữ", eff: [{ k: "buff", stat: "atk", v: [0.15, 0.2, 0.25], d: 5 }, { k: "buff", stat: "aspd", v: [0.15, 0.2, 0.25], d: 5 }] },
    { to: "self", eff: [{ k: "buff", stat: "atk", v: [0.15, 0.2, 0.25], d: 5 }, { k: "buff", stat: "aspd", v: [0.15, 0.2, 0.25], d: 5 }] }] },
    passive: { perHunter: [0.05, 0.08, 0.1] }, s3: { skill: { ally: [{ to: "self", eff: [{ k: "summon", n: 2, pct: 0.4 }] }] } } },
};
void p;

interface SkillRow { id: number; vi: string; active: { atkPct: number | null; name: string; templates: string[] } }
const rows = (skillsFile as { skills: SkillRow[] }).skills;
/** species id → spec, with the damage % from the table */
export const SKILL_SPECS = new Map<number, Spec & { pct: number; name: string; templates: string[] }>(
  rows.map((r) => {
    const spec = S[r.vi];
    if (!spec) throw new Error(`no skill spec for ${r.vi}`);
    return [r.id, { ...spec, pct: r.active.atkPct ?? 0, name: r.active.name, templates: r.active.templates }];
  }),
);
export const SPEC_NAMES = Object.keys(S);
/** "loài chim" (replaces hệ Trời in v3 texts) */
export const BIRDS: string[] = (skillsFile as { birds: string[] }).birds;
export const val = (v: V | undefined, star: 1 | 2 | 3): number => (v == null ? 0 : Array.isArray(v) ? v[star - 1] : v);
