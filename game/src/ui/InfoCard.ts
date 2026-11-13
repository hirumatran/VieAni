import Phaser from "phaser";
import * as C from "../core/config";
import type { Species } from "../core/data";
import { SCREEN_H, SCREEN_W } from "../core/layout";
import { FONT_UI } from "./widgets";
import VN from "../../../data/vn_info.json";

// Same look as the VieIndex card (src/vieindex.template.html, dark theme): type-coloured art band,
// status + tier, #dex, names, type badges, stat bars – plus live battle values.
const TYPE_HEX: Record<string, number> = {
  Legendary: 0xc9972b, Water: 0x2f74c8, Ground: 0xa0582c, Rock: 0x7b6f5e, Grass: 0x3a9a4f,
  Sky: 0x2aa7b8, Insect: 0x8fa81a, Poison: 0x8a3ca6, Fire: 0xe0552a, Electric: 0xf0c808,
};
const TYPE_VI: Record<string, string> = {
  Legendary: "Huyền thoại", Fire: "Lửa", Water: "Nước", Electric: "Điện", Grass: "Cỏ",
  Ground: "Đất", Rock: "Đá", Sky: "Trời", Insect: "Côn trùng", Poison: "Độc",
};
const STAT_LABEL: [keyof Species["stats"], string][] = [
  ["hp", "Máu (HP)"], ["atk", "Tấn công"], ["def", "Phòng thủ"], ["spa", "Tấn công ĐB"], ["spd", "Phòng thủ ĐB"], ["spe", "Tốc độ"],
];
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
  /** synergy name → [distinct members on this side's board, thresholds] */
  synergies: [string, number, number[]][];
}

export class InfoCard {
  private c: Phaser.GameObjects.Container;

  constructor(private scene: Phaser.Scene) {
    this.c = scene.add.container(0, 0).setDepth(9800).setVisible(false);
  }

  /** height of the card as last drawn */
  h = 0;

  /** move the card so its bottom-right corner is at (right, bottom) */
  placeBottomRight(right: number, bottom: number) {
    this.c.setPosition(right - W, Math.max(6, bottom - this.h));
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
    const main = TYPE_HEX[sp.types.find((t) => t !== "Legendary") ?? sp.types[0]] ?? 0x888888;

    // art band (two types: second colour in the lower-right corner, like the VieIndex gradient) + name on a dark strip
    const ART = 118;
    g.fillStyle(TYPE_HEX[sp.types[0]] ?? 0x888888, 1).fillRoundedRect(0, 0, W, ART, { tl: 14, tr: 14, bl: 0, br: 0 });
    if (sp.types[1]) g.fillStyle(TYPE_HEX[sp.types[1]], 1).fillTriangle(W, ART * 0.15, W, ART, W * 0.45, ART);
    if (s.tex) {
      const img = add(sc.add.image(W / 2, ART + 4, s.tex).setOrigin(0.5, 1));
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

    // role, types and attack
    bx = PAD;
    for (const tp of sp.types) {
      const tx = text(bx + 8, y + 4, TYPE_VI[tp] ?? tp, 11, tp === "Electric" ? "#2b1d14" : "#ffffff", true);
      g.fillStyle(TYPE_HEX[tp] ?? 0x888888, 1).fillRoundedRect(bx, y, tx.width + 16, 20, 6);
      bx += tx.width + 22;
    }
    text(bx + 2, y + 3, `${sp.role ?? ""} · ${sp.attackClass === "physical" ? "vật lý" : "đặc biệt"} · tầm ${sp.range}`, 12, MUTED, false, W - bx - PAD);
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
      bar("Năng lượng", `${Math.round(s.energy)} / ${C.ENERGY_MAX}`, s.energy / C.ENERGY_MAX, 0x5aa9ff);
    } else {
      text(PAD, y, `Máu ★1: ${s.maxHp}   ·   giá ${sp.tier} vàng`, 12, MUTED, true);
      y += 20;
    }

    // base stats in two columns (VieIndex bars, 150 = full)
    y += 3;
    const colW = (W - 2 * PAD - 12) / 2;
    STAT_LABEL.forEach(([k, label], i) => {
      const v = sp.stats[k];
      const x0 = PAD + (i % 2) * (colW + 12), yy = y + Math.floor(i / 2) * 16;
      text(x0, yy, label.replace(" (HP)", ""), 11, MUTED, true);
      text(x0 + 108, yy, String(v), 11.5, INK, true).setOrigin(1, 0);
      g.fillStyle(LINE, 1).fillRoundedRect(x0 + 113, yy + 4, colW - 113, 6, 3);
      g.fillStyle(main, 1).fillRoundedRect(x0 + 113, yy + 4, Math.max(4, (colW - 113) * Math.min(1, v / 150)), 6, 3);
    });
    y += 48;

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
    if (s.star > 1) st.push([`★${s.star}: máu & sát thương ×${num(C.STAR_MULT[s.star - 1])}`, 0x6c7a8c]);
    if (s.where === "bench") st.push(["Hàng chờ – không vào trận", 0x6b5a4c]);
    if (s.where === "shop") st.push(["Trong cửa hàng", 0x6b5a4c]);
    if (!s.dead && s.fighting && s.targetName) st.push([`Mục tiêu: ${s.targetName}`, 0x8c1c13]);
    if (!s.dead && s.lastMult != null && s.lastMult !== 1)
      st.push([s.lastMult > 1 ? `Đòn khắc ×${num(s.lastMult)} (hệ / thiên địch)` : `Đòn bị kháng ×${num(s.lastMult)}`, s.lastMult > 1 ? 0x3a9a4f : 0x7b6f5e]);
    if (!s.dead && s.energy >= C.ENERGY_MAX) st.push(["Năng lượng đầy – tung kỹ năng", 0x2f74c8]);
    if (s.where === "board" && !s.fighting) st.push(["Sẵn sàng vào trận", 0x3a9a4f]);
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
    const foot = text(PAD, y, "Bản thử: khi đầy năng lượng tung đòn ×2 (kỹ năng riêng & tộc hệ chưa áp dụng trong trận).", 10.5, MUTED, false, W - 2 * PAD);
    y += foot.height + PAD - 4;
    } else y += PAD - 6;
    this.h = y;

    bg.fillStyle(0x000000, 0.45).fillRoundedRect(4, 6, W, y, 14);
    bg.fillStyle(CARD, 0.97).fillRoundedRect(0, 0, W, y, 14);
    g.lineStyle(2, 0xc9972b, 0.9).strokeRoundedRect(0, 0, W, y, 14);

    // place beside the unit, inside the screen
    const x = ax < SCREEN_W / 2 ? ax + gap : ax - gap - W;
    this.c.setPosition(Phaser.Math.Clamp(x, 6, SCREEN_W - W - 6), Phaser.Math.Clamp(ay - y / 2, 6, Math.max(6, SCREEN_H - y - 6)));
    this.c.setVisible(true);
  }
}
