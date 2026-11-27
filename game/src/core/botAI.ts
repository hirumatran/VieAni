// Smarter computer player (PO 20 Nov 2026: "the win is very easy against the bot").
// Same rules and the same shop as the human – no extra gold, HP or stats. It plays better instead:
//  • builds toward tộc hệ (synergies) and ★2/★3 copies instead of buying whatever it can afford,
//  • levels on a curve and keeps gold for interest, then spends it all when its HP gets low,
//  • fields the strongest 'level' VieAni counting active synergies and a front line,
//  • gives attack items to its damage dealers, defence items to its tanks and moves items off the bench.
// Measured with tools/botStrength.ts (docs/balance/bot_strength.json).
import * as C from "./config";
import type { Match, PlayerState } from "./match";
import { Team, type OwnedUnit } from "./team";
import { ITEM_RULES } from "./items";
import { synergyStates } from "./synergy";

export interface BotStyle {
  /** level to reach by round: [round, level] pairs, buys XP to keep up */
  levelCurve: [number, number][];
  /** gold kept for interest once the round is ≥ econFrom (0 when HP ≤ panicHp) */
  econ: number;
  econFrom: number;
  panicHp: number;
  /** most rerolls per turn */
  maxRolls: number;
  /** tộc hệ this bot likes to build (personality); their members are bought and fielded more readily */
  favor?: string[];
}

export const SMART: BotStyle = {
  levelCurve: [[2, 3], [4, 4], [6, 5], [9, 6], [12, 7], [16, 8], [21, 9], [27, 10]],
  econ: 50,
  econFrom: 5,
  panicHp: 40,
  maxRolls: 5,
};

const FAST: [number, number][] = [[2, 3], [3, 4], [5, 5], [7, 6], [10, 7], [13, 8], [17, 9], [22, 10]];
const SLOW: [number, number][] = [[3, 3], [5, 4], [8, 5], [11, 6], [15, 7], [20, 8], [26, 9], [32, 10]];

/** the 7 computer players of an 8-player match (PO 27 Nov 2026): each leans to its own tộc hệ and economy style.
 *  Names are roles from Vietnamese country life (no real people). */
export const PERSONAS: { name: string; short: string; style: BotStyle; note: string }[] = [
  { name: "Thợ Săn Trường Sơn", short: "Thợ Săn", note: "Săn Mồi + Trường Sơn, lên cấp nhanh", style: { ...SMART, levelCurve: FAST, favor: ["Săn Mồi", "Trường Sơn"] } },
  { name: "Ngư Dân Biển Đông", short: "Ngư Dân", note: "Biển Đông + Sông Nước", style: { ...SMART, favor: ["Biển Đông", "Sông Nước"] } },
  { name: "Già Làng Tây Nguyên", short: "Già Làng", note: "Tây Nguyên", style: { ...SMART, favor: ["Tây Nguyên"] } },
  { name: "Thầy Đồ Xứ Bắc", short: "Thầy Đồ", note: "Tứ Linh + Sơn Tinh + Hộ Quốc, chờ cuối trận", style: { ...SMART, levelCurve: SLOW, favor: ["Tứ Linh", "Sơn Tinh", "Hộ Quốc"] } },
  { name: "Nhà Nông", short: "Nhà Nông", note: "Gia Súc + Gặm Nhấm + Mèo", style: { ...SMART, favor: ["Gia Súc", "Bầy Gặm Nhấm", "Hội Nhà Mèo"] } },
  { name: "Người Nuôi Ong", short: "Nuôi Ong", note: "Côn Trùng + Săn Côn Trùng", style: { ...SMART, favor: ["Côn Trùng", "Săn Côn Trùng"] } },
  { name: "Kiểm Lâm Cao Nguyên", short: "Kiểm Lâm", note: "Cao Nguyên Bắc Bộ + Bầy Chó Dữ", style: { ...SMART, favor: ["Cao Nguyên Bắc Bộ", "Bầy Chó Dữ"] } },
];

/** strength of one VieAni: stats grow with tier (TIER_MUL in scripts/stats_v3.py) and ★ (HP and damage both) */
const TIER_MUL = [1, 1, 1.2, 1.4, 1.6, 1.9];
const FRONT = new Set(["Đỡ Đòn", "Chiến Đấu"]);
const DAMAGE = new Set(["Săn Mồi", "Phép Thuật", "Chiến Đấu"]);

export function smartTurn(m: Match, p: PlayerState, style: BotStyle = SMART) {
  const sp = (id: number) => m.sp(id);
  const power = (u: { speciesId: number; star: number }) => (TIER_MUL[sp(u.speciesId).tier] * C.STAR_MULT[u.star - 1]) ** 2;
  const units = () => p.team.units();

  // ---- item reward: team items first, then the highest tier; skip Linh Vật (only the zodiac plan uses them)
  if (p.itemOffer) {
    const score = (id: number) => (m.isCharm(id) ? -1 : (m.isTeamItem(id) ? 3 : 0) + m.item(id).tier);
    const best = p.itemOffer.map((id, i) => [score(id), i]).sort((a, b) => b[0] - a[0])[0][1];
    m.chooseItem(p, best);
  }

  const panic = p.hp <= style.panicHp;
  const reserve = () => (m.round < style.econFrom || panic ? 0 : style.econ);

  // ---- level on the curve
  const want = style.levelCurve.reduce((lv, [r, l]) => (m.round >= r ? l : lv), 1);
  while (p.level < Math.max(want, panic && p.level < 8 ? p.level + 1 : 0) && p.level < C.MAX_LEVEL
    && p.gold - C.XP_BUY_COST >= Math.min(reserve(), 10)) {
    if (!m.buyXp(p)) break;
    if (panic) break; // one level per turn when in trouble, the rest of the gold goes to rolls
  }

  // ---- what is worth buying
  const plan = () => {
    // synergies the team is building: distinct owned members per synergy
    const ids = [...new Set(units().map((u) => u.speciesId))];
    return synergyStates(m.d, ids).filter((s) => !s.syn.byZodiac);
  };
  const wantScore = (id: number) => {
    if (id < 0 || !m.d.byId.has(id)) return -Infinity; // empty shop slot (bought, or the pool ran out)
    const same = units().filter((u) => u.speciesId === id);
    const ones = same.filter((u) => u.star === 1).length, twos = same.filter((u) => u.star === 2).length;
    let s = 0;
    if (ones >= 2) s += 100;            // completes a ★2 right away
    else if (ones === 1) s += 45;
    if (twos >= 1) s += 30;             // toward ★3
    if (!same.length) {
      for (const st of plan()) {
        if (!st.syn.members.includes(id)) continue;
        const next = st.thresholds.find((t) => t > st.count);
        if (next != null && st.count + 1 === next) s += 30 + 10 * st.thresholds.indexOf(next);
        else if (st.count > 0) s += 6 * st.count;
      }
    }
    // personality: members of a favourite tộc hệ are wanted more
    // (strong early, half from round 18 – late in the match every bot plays for the strongest board)
    if (style.favor?.length && m.d.synergies.some((g) => style.favor!.includes(g.name) && g.members.includes(id))) s += m.round < 18 ? 18 : 9;
    s += 6 * TIER_MUL[sp(id).tier] ** 2 * (sp(id).tier <= Math.ceil(p.level / 2) + 1 ? 1 : 0.5);
    return s;
  };
  const keepScore = (u: OwnedUnit) => wantScore(u.speciesId) * 0.5 + 12 * power(u);

  const benchFree = () => p.team.bench.filter((b) => b == null).length;
  for (let rolls = 0; ; rolls++) {
    for (const slot of [0, 1, 2, 3, 4].sort((a, b) => wantScore(p.shop[b] ?? -1) - wantScore(p.shop[a] ?? -1))) {
      const id = p.shop[slot];
      if (id == null) continue;
      const w = wantScore(id);
      const mergesNow = units().filter((u) => u.speciesId === id && u.star === 1).length >= 2;
      const roomy = units().length < p.level + 3;
      const afford = p.gold - m.cost(id) >= (w >= 45 ? 0 : reserve());
      if (!afford || !(w >= 30 || roomy)) continue;
      if (!benchFree() && !mergesNow) {
        // bench full: swap out the weakest bench VieAni if the offer is clearly better
        const worst = p.team.bench.filter((b): b is OwnedUnit => !!b).sort((a, b) => keepScore(a) - keepScore(b))[0];
        if (!worst || keepScore(worst) + 15 >= w + 12 * power({ speciesId: id, star: 1 })) continue;
        m.sell(p, worst.uid);
      }
      if (m.canBuy(p, slot)) m.buy(p, slot);
    }
    const spare = p.gold - reserve();
    if (rolls >= style.maxRolls || spare < C.REROLL_COST + (panic ? 0 : 4)) break;
    if (!m.reroll(p)) break;
  }

  // ---- field the best board: greedy pick, then swaps while the score improves
  const all = units();
  const score = (board: OwnedUnit[]) => {
    const states = synergyStates(m.d, board.map((u) => u.speciesId));
    const syn = states.filter((s) => !s.syn.byZodiac).reduce((n, s) => n + (s.level + 1) * (style.favor?.includes(s.syn.name) && m.round < 18 ? 1.25 : 1), 0);
    const front = board.filter((u) => FRONT.has(sp(u.speciesId).role ?? "")).length;
    const frontMul = board.length >= 4 && front < 2 ? 0.85 : 1;
    return board.reduce((n, u) => n + power(u), 0) * (1 + 0.08 * syn) * frontMul;
  };
  let board = [...all].sort((a, b) => power(b) - power(a)).slice(0, p.level);
  for (let pass = 0, better = true; better && pass < 4; pass++) {
    better = false;
    for (let i = 0; i < board.length; i++)
      for (const c of all) {
        if (board.includes(c)) continue;
        const next = board.slice(); next[i] = c;
        if (score(next) > score(board) + 1e-9) { board = next; better = true; }
      }
  }
  // too many for the bench: sell the least useful first (while they are still on the team)
  const rest = all.filter((u) => !board.includes(u)).sort((a, b) => keepScore(b) - keepScore(a));
  for (const u of rest.splice(C.BENCH_SLOTS)) m.sell(p, u.uid);
  const team = new Team(p.level);
  // tanks first so they get the front spots
  for (const u of [...board].sort((a, b) => Number(FRONT.has(sp(b.speciesId).role ?? "")) - Number(FRONT.has(sp(a.speciesId).role ?? ""))))
    { const s = m.spotFor(team, u); if (s) team.place(u, s); }
  for (const u of rest) team.addToBench(u);
  p.team = team;

  // ---- items: off the bench, onto the right carriers
  for (const u of p.team.bench) if (u && u.item != null) m.takeItem(p, u.uid);
  for (let i = p.items.length - 1; i >= 0; i--) {
    const id = p.items[i];
    if (m.isTeamItem(id)) { m.equipTeam(p, i); continue; }
    const r = ITEM_RULES[id] ?? {};
    const cat = m.item(id).cat;
    const free = p.team.toPlaced().map((x) => p.team.units().find((u) => u.uid === x.uid)!)
      .filter((u) => u.item == null && (!r.rangedOnly || sp(u.speciesId).range >= 2));
    const prefer = (u: OwnedUnit) => {
      const role = sp(u.speciesId).role ?? "";
      const fit = cat === "PT" ? FRONT.has(role) : cat === "TC" || cat === "SAN" || r.hpPctPerKill || r.goldOnWin ? DAMAGE.has(role) : true;
      return (fit ? 1000 : 0) + power(u);
    };
    const target = free.sort((a, b) => prefer(b) - prefer(a))[0];
    if (target) m.equip(p, i, target.uid);
  }
}
