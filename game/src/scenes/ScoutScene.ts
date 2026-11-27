// Scouting (PO 27 Nov 2026): click a player on the scoreboard to see their side – between rounds their board, bench, tộc hệ
// and items; during a fight their own fight, joined at the moment the human's fight has reached. Read-only, drawn over the
// match scene (which keeps running underneath); "← Bàn của bạn" or Esc returns.
import Phaser from "phaser";
import type { BattleResult, Placed } from "../core/battle";
import type { GameData } from "../core/data";
import { MATCH_BENCH_CORNERS, MATCH_BOARD_CORNERS, SCREEN_W } from "../core/layout";
import { flipFight, type Match } from "../core/match";
import { Team } from "../core/team";
import { activeSynergies } from "../core/synergy";
import { button, CREAM, FONT_LOGO, FONT_UI, GOLD, WOOD } from "../ui/widgets";
import { BoardScene } from "./BoardScene";

export interface ScoutData {
  match: Match;
  /** the player to look at (index in match.players) */
  player: number;
  /** the match scene's background, so both look the same */
  bgKey: string;
  /** set while fights are running: how long the human's fight has been going (ms) */
  elapsedMs?: number;
}

const short = (vi: string) => vi.replace(/\s*\(.*\)\s*/, "");

export class ScoutScene extends BoardScene {
  private sd!: ScoutData;
  private fightView?: { units: Placed[]; res: BattleResult; opponent: number; ghost: boolean };

  constructor(d: GameData) {
    super(d, "scout", MATCH_BOARD_CORNERS, MATCH_BENCH_CORNERS);
  }

  init(data: ScoutData) {
    this.sd = data;
    this.fightView = undefined;
    const m = data.match, i = data.player;
    if (data.elapsedMs != null) {
      const pr = m.pairingOf(i);
      if (pr) {
        let f = m.roundFight(pr);
        // seen from the scouted player's side: they are the bottom side (A)
        if (pr.b === i) f = flipFight(f.units, f.res);
        this.fightView = { ...f, opponent: pr.a === i ? pr.b : pr.a, ghost: pr.ghost && pr.a === i };
      }
    }
  }

  preload() {
    super.preload();
    if (this.textures.exists(this.sd.bgKey)) this.bgKey = this.sd.bgKey;
  }

  /** a copy of their team: nothing here may change the real one */
  protected loadTeam(): Team {
    return Team.load(this.sd.match.players[this.sd.player].team.serialize());
  }
  protected saveTeam() {}
  protected setupDrag() {}
  protected fight() {}

  create() {
    super.create();
    // block clicks to the match underneath (units above stay hoverable)
    this.add.zone(SCREEN_W / 2, 360, SCREEN_W, 720).setInteractive().setDepth(-1);
    this.input.keyboard?.on("keydown-ESC", () => this.close());
    const f = this.fightView;
    if (f) this.startBattle(f.units.filter((u) => u.side === "A"), f.units.filter((u) => u.side === "B"), 0, f.res, this.sd.elapsedMs ?? 0);
  }

  close() { this.scene.stop(); }

  /** their fight is over (it may end before the human's): say who won, stay on the board */
  protected afterBattle(res: BattleResult) {
    const m = this.sd.match, me = m.players[this.sd.player];
    const opp = this.fightView ? m.players[this.fightView.opponent] : undefined;
    const who = res.winner === "A" ? me.name : res.winner === "B" ? opp?.name ?? "" : "";
    const txt = res.winner === "draw" ? "Hòa" : `${who} thắng`;
    this.add.text(SCREEN_W / 2, 300, txt, { fontFamily: FONT_LOGO, fontSize: "44px", color: "#ffe6a3", fontStyle: "800" })
      .setOrigin(0.5).setStroke("#2b1d14", 10).setDepth(6000);
  }

  protected buildHud() {
    const m = this.sd.match, p = m.players[this.sd.player], top = 5000;
    // banner: who, HP, level, opponent
    const g = this.add.graphics().setDepth(top - 1);
    g.fillStyle(WOOD, 0.95).fillRoundedRect(250, 6, 780, 40, 12).lineStyle(2, GOLD, 0.9).strokeRoundedRect(250, 6, 780, 40, 12);
    const fv = this.fightView;
    const vs = fv ? `   ·   đấu với ${m.players[fv.opponent].name}${fv.ghost ? " (bản sao)" : ""}` : "";
    this.add.text(640, 26, `👁 Đang xem: ${p.name}   ·   ❤ ${p.hp}   ·   Cấp ${p.level}${vs}`, { fontFamily: FONT_UI, fontSize: "15px", color: "#ffe6a3", fontStyle: "bold" })
      .setOrigin(0.5).setDepth(top);
    button(this, 128, 26, 228, 38, "← Bàn của bạn", () => this.close(), true).setDepth(top);

    // right column: their tộc hệ and items
    const x0 = 1056, w = 214;
    let y = 60;
    const col = this.add.graphics().setDepth(top - 1);
    const rows: Phaser.GameObjects.Text[] = [];
    const line = (s: string, color = CREAM, size = 12.5, bold = false) => {
      const tx = this.add.text(x0 + 10, y, s, { fontFamily: FONT_UI, fontSize: `${size}px`, color, fontStyle: bold ? "bold" : "normal", wordWrap: { width: w - 20 } }).setDepth(top);
      rows.push(tx); y += tx.height + 4;
    };
    y += 8;
    line("TỘC HỆ", "#ffe6a3", 13, true);
    const ids = p.team.toPlaced().map((u) => u.speciesId);
    const syn = activeSynergies(this.data_, ids, m.zodiacBonus(p));
    if (!syn.length) line("chưa có", "#a89a8a");
    for (const s of syn) line(`${s.syn.name}  ${s.count}/${s.thresholds[s.level]}`, s.level >= 1 ? "#ffd84a" : CREAM, 12.5, true);
    y += 8;
    line("VẬT PHẨM", "#ffe6a3", 13, true);
    const carried = p.team.units().filter((u) => u.item != null);
    if (!carried.length && !p.teamItems.length) line("chưa có", "#a89a8a");
    for (const u of carried) {
      const name = short(this.data_.byId.get(u.speciesId)!.vi);
      const it = this.data_.items.find((x) => x.id === u.item)!;
      if (this.textures.exists(`item:${u.item}`)) this.add.image(x0 + 18, y + 9, `item:${u.item}`).setDisplaySize(18, 18).setDepth(top);
      const tx = this.add.text(x0 + 32, y, `${it.name} · ${name}`, { fontFamily: FONT_UI, fontSize: "12px", color: CREAM, wordWrap: { width: w - 40 } }).setDepth(top);
      y += Math.max(20, tx.height + 4);
    }
    for (const id of p.teamItems) line(`Toàn đội: ${this.data_.items.find((x) => x.id === id)!.name}`, "#9fd4ff");
    col.fillStyle(WOOD, 0.9).fillRoundedRect(x0, 60, w, y - 60 + 8, 12).lineStyle(2, GOLD, 0.8).strokeRoundedRect(x0, 60, w, y - 60 + 8, 12);
  }
}
