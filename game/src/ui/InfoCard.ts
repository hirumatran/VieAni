import Phaser from "phaser";
import * as C from "../core/config";
import type { Species } from "../core/data";
import { SCREEN_H, SCREEN_W } from "../core/layout";
import { itemStatBonus } from "../core/items";
import { FONT_UI } from "./widgets";
import VN from "../../../data/vn_info.json";

// Same look as the VieIndex card (src/vieindex.template.html, dark theme): tier-coloured art band (v3: no types),
// status + tier, #dex, names, role, the 5 stats – plus live battle values.
/** tier colours (grey, green, blue, purple, gold) – same as shop cards and items */
export const TIER_HEX: Record<number, number> = { 1: 0x7d8590, 2: 0x3f9a5c, 3: 0x2f74c0, 4: 0x8e47c4, 5: 0xc99216 };
const ROLE_VI_HINT: Record<string, string> = {
  "Đỡ Đòn": "đứng trước, chịu đòn", "Chiến Đấu": "vừa đánh vừa chịu đòn", "Săn Mồi": "lao vào kẻ yếu, chạy nhanh",
  "Phép Thuật": "đứng sau, kỹ năng mạnh", "Hỗ Trợ": "đứng sau, giúp đồng đội",
};
const CARD = 0x241b14, LINE = 0x3a2c21, INK = "#f3e9db", MUTED = "#b39f8b", GOLD_TXT = "#e7c05f";
const W = 320, PAD = 14;

const statusLabel = (s: Species) => {
  const iucn = (s as Species & { iucn?: string }).iucn ?? "";
  return s.tier === 5 ? "Huyền thoại" : s.tier === 4 ? "Đã mất" : s.tier === 1 ? "Thân thuộc" : s.tier === 2 ? "Hoang dã"
    : /^(CR|EN|VU|DD)\b/.test(iucn) ? iucn.split(" ")[0] : "Nguy cấp";
};
const IUCN_VI: Record<string, string> = {
  CR: "Cực kỳ nguy cấp", EN: "Nguy cấp", VU: "Sắp nguy cấp", NT: "Sắp bị đe dọa", LC: "Ít quan tâm", DD: "Thiếu dữ liệu",
  EW: "Tuyệt chủng ngoài tự nhiên", EX: "Tuyệt chủng",
};
const IUCN_COL: Record<string, number> = { CR: 0xc0392b, EN: 0xe0702a, VU: 0xc9a227, NT: 0x7a9a3a, LC: 0x3a9a4f, DD: 0x7b6f5e, EW: 0x4a3a5e, EX: 0x3a3a3a };
/** conservation pills for the card: IUCN status (Vietnamese) + "lost in Vietnam" for tier-4 VieAni */
function conservation(s: Species): [string, number][] {
  const iucn = (s as Species & { iucn?: string }).iucn ?? "";
  if (s.tier === 5) return [["Linh vật huyền thoại", 0xc9972b]];
  if (/fossil/i.test(iucn)) return [["Đã tuyệt chủng (hóa thạch)", 0x3a3a3a]];
  const out: [string, number][] = [];
  const code = iucn.match(/\b(CR|EN|VU|NT|LC|DD|EW|EX)\b/)?.[1];
  if (code) {
    let label = `IUCN: ${IUCN_VI[code]} (${code})`;
    if (/\(species\)/.test(iucn)) label += " – cả loài";
    out.push([label, IUCN_COL[code]]);
    if (/Possibly Extinct in the Wild/.test(iucn)) out.push(["Có thể đã tuyệt chủng ngoài tự nhiên", 0x3a3a3a]);
    else if (/Possibly Extinct/.test(iucn)) out.push(["Có thể đã tuyệt chủng", 0x3a3a3a]);
  } else if (iucn) out.push([iucn, 0x7b6f5e]);
  else out.push([s.tier === 1 ? "Loài thân thuộc" : "Loài hoang dã", s.tier === 1 ? 0x5a7a4a : 0x4a6a5a]);
  if (s.tier === 4) out.push(["Đã mất ở Việt Nam", 0x5a4a6e]);
  return out;
}
const firstSentence = (t: string) => { const m = t.match(/^.*?[.;](\s|$)/); return (m ? m[0] : t).trim(); };
const num = (x: number) => (+x.toFixed(2)).toString().replace(".", ",");

/** what the card shows about one VieAni (built by the scene) */
export interface CardSubject {
  sp: Species;
  code: string | null;
  tex: string | null;
  texFrame?: number;
  star: 1 | 2 | 3;
  side: "A" | "B";
  /** null = not a unit (e.g. a shop card) */
  hp: number | null;
  maxHp: number;
  energy: number;
  where: "board" | "bench" | "shop";
  fighting: boolean;
  dead: boolean;
  targetName?: string;
  lastMult?: number;
  /** name of the form it changed into during this battle (e.g. "Rồng Con") */
  transformed?: string;
  /** carried item */
  item?: { id: number; name: string; effect: string };
  /** enemies defeated over the match (live during a fight) */
  kills?: number;
  /** permanent max-HP bonus in % (Hạt Dưa) */
  hpBonus?: number;
  /** synergy name → [distinct members on this side's board, thresholds] */
  synergies: [string, number, number[]][];
}

export class InfoCard {
  private c: Phaser.GameObjects.Container;

  /** drawn at this scale (PO 27 Nov 2026: HUD 75 %) */
  constructor(private scene: Phaser.Scene, private s = 1) {
    this.c = scene.add.container(0, 0).setDepth(9800).setVisible(false).setScale(s);
  }

  /** height of the card as last drawn */
  h = 0;

  /** move the card so its bottom-right corner is at (right, bottom) */
  placeBottomRight(right: number, bottom: number) {
    this.c.setPosition(right - W * this.s, Math.max(6, bottom - this.h * this.s));
  }

  get visible() {
    return this.c.visible;
  }

  hide() {
    this.c.setVisible(false);
  }

  /** (re)draw the card next to the point (ax, ay) */
  show(s: CardSubject, ax: number, ay: number, gap = 60) {
    const sc = this.scene;
    this.c.removeAll(true);
    const bg = sc.add.graphics();
    this.c.add(bg);
    const add = <T extends Phaser.GameObjects.GameObject>(o: T) => { this.c.add(o); return o; };
    const text = (x: number, y: number, str: string, size: number, color = INK, bold = false, wrap = 0) =>
      add(sc.add.text(x, y, str, { fontFamily: FONT_UI, fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal", wordWrap: wrap ? { width: wrap } : undefined, lineSpacing: 2 }));
    const g = add(sc.add.graphics());
    const sp = s.sp;
    const main = TIER_HEX[sp.tier] ?? 0x888888;

    // art band in the tier colour (lighter at the top) + name on a dark strip
    const ART = 118;
    g.fillStyle(main, 1).fillRoundedRect(0, 0, W, ART, { tl: 14, tr: 14, bl: 0, br: 0 });
    g.fillStyle(0xffffff, 0.12).fillRoundedRect(0, 0, W, ART * 0.45, { tl: 14, tr: 14, bl: 0, br: 0 });
    if (s.tex) {
      const img = add(sc.add.image(W / 2, ART + 4, s.tex, s.texFrame).setOrigin(0.5, 1));
      img.setScale((ART + 6) / img.height);
    }
    const pill = (x: number, str: string, right = false) => {
      const tx = text(x, 9, str, 11, "#ffffff", true);
      if (right) tx.setOrigin(1, 0);
      const bx = right ? x - tx.width - 7 : x - 7;
      g.fillStyle(0x000000, 0.35).fillRoundedRect(bx, 6, tx.width + 14, 20, 10);
    };
    pill(14, statusLabel(sp));
    pill(W - 14, `Bậc ${sp.tier} ${"★".repeat(sp.tier)}`, true);
    const strip = add(sc.add.graphics());
    const name = text(PAD, ART - 4, sp.vi, 18, "#ffffff", true, W - 2 * PAD - 54).setOrigin(0, 1);
    strip.fillStyle(0x000000, 0.5).fillRect(0, ART - name.height - 8, W, name.height + 8);
    this.c.bringToTop(name);
    text(W - PAD, ART - 5, "★".repeat(s.star), 17, s.star === 3 ? "#ffcc3c" : s.star === 2 ? "#e4ecf6" : "#d9a066", true).setOrigin(1, 1);

    // brief species info right under the picture (PO): conservation status first, then the VieIndex note,
    // population and main threats (data/vn_info.json, sourced in VieIndex)
    let y = ART + 8;
    text(PAD, y, `#${String(sp.dex).padStart(3, "0")}${s.code ? " · " + s.code : ""} · ${sp.en}`, 12, MUTED, true, W - 2 * PAD);
    y += 20;
    const blockTop = y;
    const cons = conservation(sp);
    let bx = PAD + 8;
    for (const [label, col] of cons) {
      const tx = text(bx + 7, y + 3, label, 11, "#ffffff", true);
      if (bx + tx.width + 14 > W - PAD && bx > PAD + 8) { bx = PAD + 8; y += 23; tx.setPosition(bx + 7, y + 3); }
      g.fillStyle(col, 1).fillRoundedRect(bx, y, tx.width + 14, 19, 9);
      bx += tx.width + 20;
    }
    y += 24;
    const info = ((VN.species as Record<string, { note?: string; pop?: string; threat?: string }>)[String(sp.id)] ?? {});
    const lines: [string, string][] = [];
    if (info.note) lines.push([info.note, INK]);
    if (info.pop && sp.tier >= 3) lines.push(["Số lượng: " + firstSentence(info.pop), MUTED]);
    if (info.threat) lines.push(["Đe dọa: " + info.threat, MUTED]);
    for (const [str, col] of lines) {
      const tx = text(PAD + 8, y, str, 11.5, col, false, W - 2 * PAD - 8);
      y += tx.height + 3;
    }
    g.fillStyle(cons[0]?.[1] ?? LINE, 1).fillRoundedRect(PAD, blockTop, 3, y - blockTop - 3, 1);
    y += 6;

    // role (what it does) + reach
    bx = PAD;
    const rtx = text(bx + 8, y + 4, sp.role ?? "", 11.5, "#ffffff", true);
    g.fillStyle(main, 1).fillRoundedRect(bx, y, rtx.width + 16, 21, 6);
    bx += rtx.width + 22;
    text(bx, y + 3, `${ROLE_VI_HINT[sp.role ?? ""] ?? ""} · ${sp.range >= 2 ? `đánh xa (${sp.range} ô)` : "cận chiến"}`, 12, MUTED, false, W - bx - PAD);
    y += 28;

    // live HP / energy
    const bar = (label: string, val: string, frac: number, col: number) => {
      text(PAD, y, label, 12, MUTED, true);
      text(W - PAD, y, val, 12, INK, true).setOrigin(1, 0);
      y += 16;
      g.fillStyle(LINE, 1).fillRoundedRect(PAD, y, W - 2 * PAD, 8, 4);
      if (frac > 0) g.fillStyle(col, 1).fillRoundedRect(PAD, y, Math.max(6, (W - 2 * PAD) * Math.min(1, frac)), 8, 4);
      y += 13;
    };
    const full = s.where !== "shop"; // shop offers: no live bars / status (shorter card)
    const hp = s.hp ?? s.maxHp;
    if (full) {
      bar("Máu", `${Math.max(0, Math.round(hp))} / ${s.maxHp}`, hp / s.maxHp, s.side === "A" ? 0x5bd36b : 0xe0533d);
      bar("Năng lượng", `${Math.round(s.energy)} / ${sp.stats.energy}`, s.energy / sp.stats.energy, 0x5aa9ff);
      text(PAD, y, "Đã hạ", 12, MUTED, true);
      text(PAD + 52, y, `${s.kills ?? 0} kẻ địch`, 12, INK, true);
      if (s.hpBonus) text(W - PAD, y, `Máu tối đa +${Math.round(s.hpBonus)}% (Hạt Dưa)`, 12, "#3a9a4f", true).setOrigin(1, 0);
      y += 19;
    } else {
      text(PAD, y, `Máu ★1: ${s.maxHp}   ·   giá ${sp.tier} vàng`, 12, MUTED, true);
      y += 20;
    }

    // the 5 stats (v3) at this ★: Máu, Tấn Công, Tốc Độ Đánh, Giáp, Năng lượng
    y += 3;
    const m = C.STAR_MULT[s.star - 1];
    // with the carried item's own bonuses (and Hạt Dưa) – same formulas as the battle; the gain is shown in green
    const ib = itemStatBonus(sp.range, s.item?.id);
    const hpBase = Math.round(sp.stats.hp * m), hpNow = Math.round(hpBase * (1 + (s.hpBonus ?? 0) / 100 + ib.hpPct));
    const atkBase = Math.round(sp.stats.atk * m), atkNow = Math.round((sp.stats.atk + ib.flatAtk) * m);
    const aspdNow = sp.stats.aspd * (1 + ib.aspdPct), armNow = Math.min(C.ARMOR_CAP, sp.stats.armor + ib.armor);
    const rows: [string, string, number, string][] = [
      ["Máu", String(hpNow), hpNow / 2500, hpNow > hpBase ? `+${hpNow - hpBase}` : ""],
      ["Tấn Công", String(atkNow), atkNow / 200, atkNow > atkBase ? `+${atkNow - atkBase}` : ""],
      ["Tốc Độ Đánh", `${num(Math.round(aspdNow * 100) / 100)} lần/giây`, aspdNow / 1.1, ib.aspdPct ? `+${Math.round(ib.aspdPct * 100)}%` : ""],
      ["Giáp", `−${armNow}% sát thương`, armNow / 60, armNow > sp.stats.armor ? `+${armNow - sp.stats.armor}` : ""],
      ["Năng lượng", `${sp.stats.energy} để tung kỹ năng`, sp.stats.energy / 150, ""],
    ];
    for (const [label, val, frac, plus] of rows) {
      if (plus) text(PAD + 92, y, plus, 11.5, "#3a9a4f", true);
      text(PAD, y, label, 11.5, MUTED, true);
      text(PAD + 210, y, val, 11.5, INK, true).setOrigin(1, 0);
      g.fillStyle(LINE, 1).fillRoundedRect(PAD + 218, y + 4, W - 2 * PAD - 218, 6, 3);
      g.fillStyle(main, 1).fillRoundedRect(PAD + 218, y + 4, Math.max(4, (W - 2 * PAD - 218) * Math.min(1, frac)), 6, 3);
      y += 16;
    }
    y += 6;

    // skills
    const k = sp.skills;
    if (k) {
      y += 6;
      const h = text(PAD, y, `${k.active.name} · ${k.active.energy} NL`, 13, GOLD_TXT, true, W - 2 * PAD);
      y += h.height + 2;
      const e = text(PAD, y, `${k.active.effect} – sát thương ${k.active.damage}`, 11.5, INK, false, W - 2 * PAD);
      y += e.height + 3;
      const p = text(PAD, y, `Bị động – ${k.passive}`, 11.5, MUTED, false, W - 2 * PAD);
      y += p.height + 3;
    }

    // synergies (count of different members on this side's board / first threshold)
    if (s.synergies.length) {
      y += 3;
      let sx = PAD;
      for (const [nm, n, th] of s.synergies) {
        const next = th.find((t) => t > n) ?? th[th.length - 1];
        const on = n >= th[0];
        const tx = text(sx + 7, y + 3, `${nm} ${n}/${next}`, 11, on ? "#2b1d14" : INK, true);
        g.fillStyle(on ? 0xe7c05f : LINE, 1).fillRoundedRect(sx, y, tx.width + 14, 19, 9);
        sx += tx.width + 20;
        if (sx > W - 80) { sx = PAD; y += 23; }
      }
      if (sx !== PAD) y += 23;
    }

    // status
    const st: [string, number][] = [];
    if (s.dead) st.push(["Gục ngã", 0x6b5a4c]);
    if (s.transformed && !s.dead) st.push([`Đã hóa ${s.transformed}`, 0xc9972b]);
    if (s.star > 1) st.push([`★${s.star}: máu & sát thương ×${num(C.STAR_MULT[s.star - 1])}`, 0x6c7a8c]);
    if (s.where === "bench") st.push(["Hàng chờ – không vào trận", 0x6b5a4c]);
    if (s.where === "shop") st.push(["Trong cửa hàng", 0x6b5a4c]);
    if (!s.dead && s.fighting && s.targetName) st.push([`Mục tiêu: ${s.targetName}`, 0x8c1c13]);
    if (!s.dead && s.lastMult != null && s.lastMult !== 1)
      st.push([s.lastMult > 1 ? `Đòn khắc ×${num(s.lastMult)} (hệ / thiên địch)` : `Đòn bị kháng ×${num(s.lastMult)}`, s.lastMult > 1 ? 0x3a9a4f : 0x7b6f5e]);
    if (!s.dead && s.energy >= sp.stats.energy) st.push(["Năng lượng đầy – tung kỹ năng", 0x2f74c8]);
    if (s.where === "board" && !s.fighting) st.push(["Sẵn sàng vào trận", 0x3a9a4f]);
    if (s.item) {
      y += 2;
      const key = `item:${s.item.id}`;
      if (sc.textures.exists(key)) add(sc.add.image(PAD + 13, y + 13, key).setDisplaySize(26, 26));
      const nm = text(PAD + 32, y, `Mang: ${s.item.name}`, 12.5, GOLD_TXT, true, W - 2 * PAD - 32);
      const ef = text(PAD + 32, y + nm.height + 1, s.item.effect, 11, INK, false, W - 2 * PAD - 32);
      y += Math.max(28, nm.height + ef.height + 4) + 4;
    }
    if (full) {
    y += 3;
    text(PAD, y, "Trạng thái", 12, MUTED, true);
    y += 18;
    let sx = PAD;
    for (const [label, col] of st) {
      const tx = text(sx + 7, y + 3, label, 11, "#ffffff", true);
      if (sx + tx.width + 14 > W - PAD && sx > PAD) { sx = PAD; y += 23; tx.setPosition(sx + 7, y + 3); }
      g.fillStyle(col, 1).fillRoundedRect(sx, y, tx.width + 14, 19, 9);
      sx += tx.width + 20;
    }
    y += 26;
    const foot = text(PAD, y, "Chỉ số đã gồm vật phẩm đang mang; thưởng tộc hệ được cộng thêm khi vào trận.", 10.5, MUTED, false, W - 2 * PAD);
    y += foot.height + PAD - 4;
    } else y += PAD - 6;
    this.h = y;

    bg.fillStyle(0x000000, 0.45).fillRoundedRect(4, 6, W, y, 14);
    bg.fillStyle(CARD, 0.97).fillRoundedRect(0, 0, W, y, 14);
    g.lineStyle(2, 0xc9972b, 0.9).strokeRoundedRect(0, 0, W, y, 14);

    // place beside the unit, inside the screen
    const w = W * this.s, h = y * this.s;
    const x = ax < SCREEN_W / 2 ? ax + gap : ax - gap - w;
    this.c.setPosition(Phaser.Math.Clamp(x, 6, SCREEN_W - w - 6), Phaser.Math.Clamp(ay - h / 2, 6, Math.max(6, SCREEN_H - h - 6)));
    this.c.setVisible(true);
  }
}
