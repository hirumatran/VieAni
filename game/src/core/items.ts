// Item rules for the battle (17 Nov 2026). Texts are in data/items.json; here each item that the simulation can already
// handle gets numbers. Only these drop in the match – items that need systems we do not have yet (throwing, traps placed on
// the board, illusions, summons, row sweeps, crowd-control) and the Linh Vật charms are listed in NOT_YET.

export interface ItemRule {
  /** "Tấn công" goes to the stat the VieAni attacks with (Tấn công for physical, Tấn công ĐB for special attackers) */
  /** + Tấn Công */
  flatAtk?: number;
  /** + Giáp (% less damage taken) */
  armor?: number;
  hpPct?: number;
  /** + Tốc Độ Đánh in % */
  aspdPct?: number;
  atkSpeedPct?: number;
  dmgPct?: number;
  crit?: number;
  critMult?: number;
  /** damage multiplier against members of these tộc hệ (v3: replaces the type rules) */
  vsSyn?: Record<string, number>;
  /** damage taken from Biển Đông / Sông Nước members (v3: replaces "from Water / Fire") */
  fromWater?: Record<string, number>;
  /** ignores this many Giáp points */
  armorPen?: number;
  vsHigherTier?: number;
  rangedOnly?: boolean;
  /** heal this share of max HP the first time HP drops under 30 % */
  lowHpHeal?: number;
  /** heal this share of max HP every 5 s */
  regen5s?: number;
  /** heal this share of max HP per second while not hit for 2 s */
  idleRegen?: number;
  /** revive once, 4 s after being knocked out, with this share of max HP */
  selfRevive?: number;
  /** chance per attack to make the target bleed 3 % max HP per second for 3 s */
  bleed?: number;
  /** chance per attack to call lightning (Electric damage on the target and one enemy next to it) */
  zap?: number;
  /** each attack also hits this many other enemies (nearest to the target) */
  multiShot?: number;
  infiniteRange?: boolean;
  /** the first skill aimed at the carrier misses */
  dodgeFirstCast?: boolean;
  /** +atk % when an elephant ally stands next to it at the start */
  nearElephantAtkPct?: number;
  // ----- team items (category TD) – active without a carrier, in the team slots
  teamAtkPct?: number;
  teamAspdPct?: number;
  teamArmor?: number;
  teamAllPct?: number;
  teamTier1AllPct?: number;
  teamRangedMultiShot?: number;
  teamRegen10s?: number;
  /** when the first ally is knocked out, the team gets +atk % until the end */
  rallyAtkPct?: number;
  /** revive the first knocked-out ally with this share of max HP (once) */
  reviveAlly?: number;
  /** doubled when this species (id) is on the board (Trống Đồng + Chim Lạc) */
  doubledBy?: number;
  // ----- between rounds
  goldOnWin?: number;
  /** permanent max-HP % per enemy the carrier defeats (credited after the battle) */
  hpPctPerKill?: number;
}

export const ITEM_RULES: Record<number, ItemRule> = {
  1: { flatAtk: 10 },                                             // Gậy Tre
  2: { vsSyn: { "Côn Trùng": 1.25, "Bầy Gặm Nhấm": 1.25 } }, // v3: harvest pests instead of "vs Cỏ"                                 // Liềm Gặt
  3: { rangedOnly: true, dmgPct: 0.15, atkSpeedPct: 0.1 },        // Ná Cao Su
  4: { armor: 10 },                                             // Khiên Mây
  5: { armor: 5, fromWater: { rain: 0.85 } },      // Nón Lá
  6: { fromWater: { rain: 0.7 } },                                // Áo Tơi Lá
  7: { hpPct: 0.15 },                                             // Bánh Chưng (+5 % team stats with Bánh Giầy: see PAIR)
  8: { armor: 8 },                                             // Bánh Giầy
  9: { lowHpHeal: 0.25 },                                         // Nắm Xôi
  12: { regen5s: 0.03 },                                          // Lá Xông
  13: { aspdPct: 0.15 },                                           // Quạt Mo
  14: { flatAtk: 20, armorPen: 10 },                             // Giáo Đồng Đông Sơn
  15: { flatAtk: 15, bleed: 0.2 },                                // Dao Quắm
  24: { goldOnWin: 1 },                                           // Lì Xì
  25: { teamAtkPct: 0.15, teamAspdPct: 0.15, doubledBy: 2 },       // Trống Đồng Đông Sơn (×2 with Chim Lạc)
  26: { rangedOnly: true, multiShot: 2 },                         // Nỏ Thần An Dương Vương
  27: { rangedOnly: true, infiniteRange: true },                  // Cây Tre Trăm Đốt
  30: { rallyAtkPct: 0.2 },                                       // Hịch Tướng Sĩ
  31: { idleRegen: 0.03 },                                        // Niêu Cơm Thạch Sanh
  34: { selfRevive: 0.3 },                                        // Quả Thị
  35: { hpPctPerKill: 1 },                                        // Hạt Dưa Mai An Tiêm: +1 % per kill (max +30 %)
  36: { dodgeFirstCast: true },                                   // Ngọc Dã Tràng
  37: { teamAspdPct: 0.1, teamRegen10s: 0.05 },                    // Cồng Chiêng Tây Nguyên
  38: { flatAtk: 40, crit: 0.25, critMult: 2 },                   // Gươm Thuận Thiên
  39: { flatAtk: 30, hpPct: 0.2 },                                // Gậy Sắt Thánh Gióng
  40: { reviveAlly: 0.5 },                                        // Lá Đa Thần
  41: { rangedOnly: true, crit: 0.3 },                            // Cung Tên Vàng
  42: { armor: 20, nearElephantAtkPct: 0.2 },                   // Áo Giáp Vàng Bà Triệu
  43: { aspdPct: 0.25 },                                           // Guốc Ngà
  45: { zap: 0.2 },                                               // Búa Tầm Sét
  47: { teamArmor: 10, teamRangedMultiShot: 1 },                // Móng Rùa Kim Quy
  48: { teamAllPct: 0.1, teamTier1AllPct: 0.1 },                  // Cờ Lau Tập Trận (tier-1 VieAni +20 % in total)
  49: { vsHigherTier: 0.3 },                                      // Cờ Sáu Chữ Vàng
};
/** Bánh Chưng + Bánh Giầy in the same team: every ally +5 % stats */
export const PAIR: [number, number, number] = [7, 8, 0.05];
/** not dropping yet: need throwing / board objects / illusions / summons / sweeps / crowd control, or are Linh Vật */
export const NOT_YET = [10, 11, 16, 17, 18, 19, 20, 21, 22, 23, 28, 29, 32, 33, 44, 46, 50, 51, 52, 53];
export const DROPPABLE = Object.keys(ITEM_RULES).map(Number);
/** species ids for item conditions */
export const ELEPHANT_IDS = [38, 7]; // Voi châu Á, Voi chín ngà
