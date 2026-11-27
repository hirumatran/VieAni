// How often the zodiac strategy (human seat) reaches Ấn Thống Nhất in an 8-player match against the smart bots. N = matches.
import { it } from "vitest";
import { loadData } from "../src/core/data";
import { testMatch } from "../src/core/match";
const d = loadData();
import * as C from "../src/core/config";
// experiment: WIN='{"52":[11,16],"53":[17,24]}' moves the Linh Vật round windows
if (process.env.WIN) Object.assign(C.CHARM_ROUND_WINDOWS, JSON.parse(process.env.WIN));
if (process.env.ULV) C.UNITY.level = Number(process.env.ULV); // experiment: level needed for Ấn Thống Nhất
it("unity rate 8p", () => {
  let ok = 0, lv10 = 0; const rounds: number[] = [], places: number[] = [];
  const N = Number(process.env.N ?? 60);
  for (let seed = 1; seed <= N; seed++) {
    const m = testMatch(d, seed, 8);
    while (m.human.hp > 0 && m.aliveIdx().length > 1 && m.round <= 45) {
      m.zodiacTurn(m.human); m.botTurns();
      m.finishRound(m.battle(seed * 1000 + m.round).res);
      if (m.human.unityRound != null && !rounds.includes(-seed)) { ok++; rounds.push(m.human.unityRound); rounds.push(-seed); }
    }
    if (m.human.level >= C.UNITY.level) lv10++;
    places.push(m.human.place ?? 1);
  }
  const r = rounds.filter((x) => x > 0).sort((a, b) => a - b);
  console.log(`UNITY8 success ${ok}/${N} (rounds ${r.join(",")}), level 10 ${lv10}/${N}, avg place ${(places.reduce((a, b) => a + b, 0) / N).toFixed(2)}`);
});
