# VieAni – game client

TypeScript + Phaser 4 + Vite. Reads the shared data in `../data/*.json` and sprites in `../assets/`.

```bash
cd game
npm install
npm run dev      # local dev server
npm test         # unit tests (data checks, rules config, RNG)
npm run build    # type-check + production build into game/dist (upload this folder to itch.io)
```

- `src/core/config.ts` – every game-rule number from `docs/GDD.md` (balance here).
- `src/core/data.ts` – typed data loader, type-chart helper, data validation.
- `src/core/rng.ts` – seeded random numbers (deterministic battles).
- `src/scenes/` – Phaser scenes (currently the empty board, milestone M0).
