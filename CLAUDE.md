# VieAni – working rules for Claude

Read `docs/SESSION_NOTES.md` first: it holds the project state, the PO's ground rules, measured numbers, open points and next tasks.

## How to work with the PO
- **Every question to the PO comes with several selectable answers** (use the multiple-choice question tool with 2–4
  options, the recommended one first and marked "(Recommended)"; the PO can still type their own answer). No open-ended
  questions in plain text.
- Facts must be correct and sourced; give measured numbers, and mark estimates as estimates.
- Names: always **VieAni** and **VieIndex** (never Vinmon / Vindex).

## Repo and release
- Branch **main only**; every push that touches `game/`, `data/` or `assets/` publishes to https://hirumatran.itch.io/vieani.
  Keep the git remote `https://github.com/hirumatran/vinmon` (the proxy rejects the new name).
- Every change: `cd game && npm test` (all pass) + `npm run build` + a browser check, then update `docs/SESSION_NOTES.md`,
  commit and push.
- Design master is the Google Sheet "VieIndex – Dữ liệu VieAni"; keep it in step with `data/*.json` and `game/src/core/config.ts`.
