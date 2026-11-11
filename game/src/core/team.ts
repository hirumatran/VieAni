// The player's units: who stands where on their half of the board (rows 4..7) and on the bench.
import { BENCH_SLOTS, BOARD_COLS, BOARD_ROWS, HALF_ROWS } from "./config";
import type { Placed, Side } from "./battle";

export interface OwnedUnit { uid: number; speciesId: number; star: 1 | 2 | 3 }
export type Spot = { where: "board"; row: number; col: number } | { where: "bench"; slot: number };

const OWN_FIRST_ROW = BOARD_ROWS - HALF_ROWS; // 4
const k = (r: number, c: number) => `${r},${c}`;

export class Team {
  board = new Map<string, OwnedUnit>();
  bench: (OwnedUnit | null)[] = Array(BENCH_SLOTS).fill(null);

  constructor(public maxOnBoard: number) {}

  get boardCount() {
    return this.board.size;
  }

  units(): OwnedUnit[] {
    return [...this.board.values(), ...this.bench.filter((u): u is OwnedUnit => !!u)];
  }

  locate(uid: number): Spot | null {
    for (const [key, u] of this.board) if (u.uid === uid) { const [row, col] = key.split(",").map(Number); return { where: "board", row, col }; }
    const slot = this.bench.findIndex((u) => u?.uid === uid);
    return slot >= 0 ? { where: "bench", slot } : null;
  }

  at(s: Spot): OwnedUnit | null {
    return s.where === "board" ? this.board.get(k(s.row, s.col)) ?? null : this.bench[s.slot];
  }

  private put(s: Spot, u: OwnedUnit | null) {
    if (s.where === "board") { if (u) this.board.set(k(s.row, s.col), u); else this.board.delete(k(s.row, s.col)); }
    else this.bench[s.slot] = u;
  }

  /** is `s` a spot the player may use (own half or a bench slot)? */
  static valid(s: Spot): boolean {
    if (s.where === "bench") return s.slot >= 0 && s.slot < BENCH_SLOTS;
    return s.row >= OWN_FIRST_ROW && s.row < BOARD_ROWS && s.col >= 0 && s.col < BOARD_COLS;
  }

  /** add a new unit to the first free bench slot; false if the bench is full */
  addToBench(u: OwnedUnit): boolean {
    const i = this.bench.indexOf(null);
    if (i < 0) return false;
    this.bench[i] = u;
    return true;
  }

  /** move a unit; swaps with whoever is there. Refuses to exceed the board limit. */
  move(uid: number, to: Spot): boolean {
    const from = this.locate(uid);
    if (!from || !Team.valid(to)) return false;
    const mover = this.at(from)!;
    const other = this.at(to);
    if (from.where === "bench" && to.where === "board" && !other && this.boardCount >= this.maxOnBoard) return false;
    this.put(from, other);
    this.put(to, mover);
    return true;
  }

  /** units on the board as battle input */
  toPlaced(side: Side = "A"): Placed[] {
    return [...this.board].map(([key, u]) => {
      const [row, col] = key.split(",").map(Number);
      return { uid: u.uid, speciesId: u.speciesId, star: u.star, row, col, side };
    });
  }

  serialize(): string {
    return JSON.stringify({ max: this.maxOnBoard, board: [...this.board], bench: this.bench });
  }

  static load(json: string): Team {
    const o = JSON.parse(json) as { max: number; board: [string, OwnedUnit][]; bench: (OwnedUnit | null)[] };
    const t = new Team(o.max);
    t.board = new Map(o.board);
    t.bench = o.bench.slice(0, BENCH_SLOTS);
    while (t.bench.length < BENCH_SLOTS) t.bench.push(null);
    return t;
  }
}
