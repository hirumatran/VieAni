# Vinmon – project plan (Nov 2026 → Feb 2027)

Owner roles: **You = Product Owner** (vision, scope calls, art sketches, store accounts, testers, legal).
**Claude = developer/tech lead** (code, data, tools, builds, tests, docs). One task per session where possible.

## 1. Goals and milestones
| Milestone | Date | What "done" means |
|---|---|---|
| M0 Foundation | Sun 22 Nov 2026 | Game project set up, auto-deployed to a free public URL |
| M1 Battle core | Sun 13 Dec 2026 | Two teams fight in the browser, with skills, types, status effects |
| M2 Game loop | Sun 03 Jan 2027 | A full match (shop → battle → ranking) playable vs 7 bots |
| **M3 ALPHA (web)** | **Fri 15 Jan 2027** | Public web link + itch.io page; feedback form; hard deadline 31 Jan |
| Buffer – Tết | 04–14 Feb 2027 | Tết Nguyên Đán is Sat 6 Feb 2027; store reviews run, no dev planned |
| **M4 BETA (Android/iOS/PC)** | **Fri 26 Feb 2027** | Play closed test, TestFlight, PC download on itch.io |

## 2. Scope (MoSCoW)
- **Must (alpha):** single player vs 7 AI bots; 8×8 board + bench; shop/gold/interest/levels; star-up;
  all 108 Vinmon (draft sprites where no hand-drawn sprite yet); type chart + Legendary rule;
  31 synergies; 50 items; Thiên địch/Cộng sinh; Vietnamese UI; works in phone and PC browsers.
- **Should (alpha, may slip to beta):** 20 folklore signature skills; tutorial; music/SFX.
- **Could (beta):** English UI; achievements; Vindex collection inside the game.
- **Won't (before March 2027):** real-time online PvP, accounts, payments/ads, leaderboards.
  These need a server, which changes the Vietnamese licensing category (see risks) and adds cost.

## 3. Key decisions (recommended – confirm in T01)
| Decision | Recommendation | Why |
|---|---|---|
| Engine | **TypeScript + Phaser + Vite** (web first) | Claude can build, run and screenshot-test it in the cloud session (headless Chromium); one codebase for web, phone and PC; Vindex is already web |
| Phone apps | **Capacitor** wrapper | Same web build packaged as Android AAB / iOS app |
| PC app | **Tauri or Electron** wrapper, ship on **itch.io** first | Free; Steam optional later |
| Free hosting | **GitHub Pages** (repo must be public on a free GitHub plan) or **Cloudflare Pages**; plus **itch.io** | Free, auto-deploy from git |
| Combat engine | Deterministic, seeded, fixed tick, runs without graphics | Enables the balance simulator and later async PvP |
| Alternative | Godot 4 | Good engine, but harder for Claude to run/test in this environment; iOS export also needs a Mac |

## 4. Budget (one-off / yearly)
| Item | Cost | Note |
|---|---|---|
| Hosting (GitHub/Cloudflare Pages, itch.io) | 0 | |
| Google Play Console | US$25 one-time | |
| Apple Developer Program | US$99 / year | Needed for TestFlight and App Store |
| Steam Direct (optional) | US$100 per game | Coming Soon page ≥ 2 weeks before release |
| A Mac for iOS builds | borrow / cloud CI | Xcode only runs on macOS |

## 5. Work breakdown and schedule
| ID | Phase | Task | Owner | Start | End | Depends on | Done when |
|---|---|---|---|---|---|---|---|
| T01 | P0 Foundation | Approve plan, alpha scope and tech stack | You (PO) | 11 Nov 2026 | 14 Nov 2026 |  | Decisions logged in PROJECT_PLAN.md |
| T02 | P0 Foundation | Game Design Doc v1: round flow, gold/interest, levels, shop odds, star-up, player HP | Both | 12 Nov 2026 | 20 Nov 2026 | T01 | docs/GDD.md reviewed by PO |
| T03 | P0 Foundation | Game project skeleton: Vite + TypeScript + Phaser, tests, loads data/*.json | Claude | 16 Nov 2026 | 19 Nov 2026 | T01 | npm test + npm run build pass |
| T04 | P0 Foundation | Auto-deploy to free hosting (GitHub Pages or Cloudflare Pages) on every push | Claude | 19 Nov 2026 | 21 Nov 2026 | T03 | Public URL shows the empty board |
| T05 | P0 Foundation | Register Google Play Console (US$25) and finish identity verification | You (PO) | 11 Nov 2026 | 27 Nov 2026 |  | Console account verified |
| T06 | P0 Foundation | Enrol Apple Developer Program (US$99/yr); confirm access to a Mac | You (PO) | 16 Nov 2026 | 04 Dec 2026 |  | Membership active; Mac plan decided |
| T07 | P0 Foundation | Recruit testers: 15+ Android (Gmail), 5+ iPhone, 5+ PC | You (PO) | 16 Nov 2026 | 10 Jan 2027 |  | Tester list with emails |
| T08 | P0 Foundation | Sketch batch 1 on iPad: ~30 base bodies (one per body family) | You (PO) | 12 Nov 2026 | 13 Dec 2026 |  | 30 sketches named V### |
| **M0** | **Milestone** | **M0 – empty board online** | **Both** | **22 Nov 2026** | **22 Nov 2026** | **T04** |  |
| T09 | P1 Battle core | Board 8×8 + bench, drag-drop with mouse and touch | Claude | 23 Nov 2026 | 29 Nov 2026 | T03 | Units placed and saved per round |
| T10 | P1 Battle core | Deterministic combat sim: move, target, attack speed, range, damage = stats × type chart × Legendary rule | Claude | 23 Nov 2026 | 04 Dec 2026 | T02 | Same seed → same result; unit tests |
| T11 | P1 Battle core | Energy + skill framework: ~12 skill templates (damage, AoE, heal, buff, debuff, stun, summon, revive, transform…) | Claude | 01 Dec 2026 | 09 Dec 2026 | T10 | All 108 Vinmon cast a skill |
| T12 | P1 Battle core | Status effects from mechanics.json (Dại, Độc, Bỏng, Choáng, Trói, Bay…) | Claude | 03 Dec 2026 | 09 Dec 2026 | T10 | Each effect has a test |
| T13 | P1 Battle core | Thiên địch target priority and Cộng sinh bonuses (relations.json) | Claude | 07 Dec 2026 | 11 Dec 2026 | T10 |  |
| T14 | P1 Battle core | Headless simulator + balance report (1,000s of fights → win rate per Vinmon) | Claude | 07 Dec 2026 | 13 Dec 2026 | T11 | Report CSV/HTML |
| **M1** | **Milestone** | **M1 – two teams fight in the browser with skills** | **Both** | **13 Dec 2026** | **13 Dec 2026** | **T11,T12** |  |
| T15 | P2 Game loop | Pixelize sketch batch 1 → sprites in game; PO clean-up | Both | 14 Dec 2026 | 20 Dec 2026 | T08 |  |
| T16 | P2 Game loop | Economy: gold, interest, streaks, XP/levels, shop 5 slots with tier odds, roll/lock | Claude | 14 Dec 2026 | 20 Dec 2026 | T02 |  |
| T17 | P2 Game loop | Star-up: 3 copies → ★2, 3 × ★2 → ★3 | Claude | 16 Dec 2026 | 20 Dec 2026 | T16 |  |
| T18 | P2 Game loop | Synergy engine: all 31 Tộc hệ incl. 12 Con Giáp, Sơn Tinh | Claude | 17 Dec 2026 | 23 Dec 2026 | T11 |  |
| T19 | P2 Game loop | Items: PvE wild-animal rounds drop items; equip; 50 items data-driven | Claude | 21 Dec 2026 | 30 Dec 2026 | T11 |  |
| T20 | P2 Game loop | Round flow: prep timer → battle → player damage → elimination → ranking | Claude | 21 Dec 2026 | 27 Dec 2026 | T16 |  |
| T21 | P2 Game loop | 7 AI opponents with different strategies | Claude | 23 Dec 2026 | 03 Jan 2027 | T20 |  |
| T22 | P2 Game loop | 20 folklore signature skills (Cá Chép hóa rồng, Cóc, Hồ Tinh…) | Claude | 28 Dec 2026 | 06 Jan 2027 | T11 |  |
| T23 | P2 Game loop | Sketch batch 2: special Legendary/unique designs | You (PO) | 14 Dec 2026 | 03 Jan 2027 | T08 |  |
| **M2** | **Milestone** | **M2 – full match playable start to finish vs bots** | **Both** | **03 Jan 2027** | **03 Jan 2027** | **T16-T21** |  |
| T24 | P3 Alpha polish | Vietnamese UI: HUD, shop, synergy panel, tooltips, Vindex inside the game | Claude | 04 Jan 2027 | 10 Jan 2027 | M2 |  |
| T25 | P3 Alpha polish | Audio: CC0/CC-BY SFX and music, with credits | Claude | 06 Jan 2027 | 10 Jan 2027 |  |  |
| T26 | P3 Alpha polish | First-game tutorial | Claude | 08 Jan 2027 | 12 Jan 2027 | T24 |  |
| T27 | P3 Alpha polish | Balance pass 1 using the simulator; PO playtests | Both | 06 Jan 2027 | 13 Jan 2027 | T14 |  |
| T28 | P3 Alpha polish | Import sketch batch 2 sprites | Both | 04 Jan 2027 | 10 Jan 2027 | T23 |  |
| T29 | P3 Alpha polish | Bug bash + performance on a cheap Android phone browser | Both | 11 Jan 2027 | 14 Jan 2027 |  |  |
| T30 | P3 Alpha polish | Feedback form (Google Form) + version number on screen | Both | 12 Jan 2027 | 13 Jan 2027 |  |  |
| **M3** | **Milestone** | **M3 – ALPHA on the web (free host + itch.io page)** | **Both** | **15 Jan 2027** | **15 Jan 2027** | **T24-T30** |  |
| T31 | P4 Beta build | Alpha playtest window: collect feedback | You (PO) | 16 Jan 2027 | 29 Jan 2027 | M3 | Feedback triaged into backlog |
| T32 | P4 Beta build | Fixes + balance pass 2 | Claude | 18 Jan 2027 | 31 Jan 2027 | T31 |  |
| T33 | P4 Beta build | Phone layout: landscape, touch targets, safe areas, battery/perf | Claude | 18 Jan 2027 | 27 Jan 2027 | M3 |  |
| T34 | P4 Beta build | Android app: Capacitor wrap, signed AAB, icon, splash | Claude | 25 Jan 2027 | 29 Jan 2027 | T33,T05 |  |
| T35 | P4 Beta build | iOS app: Capacitor + Xcode build (Mac or macOS CI) → TestFlight | Both | 27 Jan 2027 | 02 Feb 2027 | T33,T06 | Needs a Mac |
| T36 | P4 Beta build | PC app: desktop wrapper (Tauri or Electron) → itch.io download | Claude | 27 Jan 2027 | 31 Jan 2027 | M3 |  |
| T37 | P4 Beta build | Store material: privacy policy page, screenshots, VN/EN text, content rating forms | Both | 25 Jan 2027 | 02 Feb 2027 |  |  |
| T38 | P4 Beta build | Upload Play closed test; submit TestFlight Beta App Review | Both | 01 Feb 2027 | 03 Feb 2027 | T34,T35,T37 |  |
| T39 | P4 Beta build | Legal check: Decree 147/2024 category for release in Vietnam; name/trademark search | You (PO) | 04 Jan 2027 | 03 Feb 2027 |  |  |
| BUF | Buffer | Tết Nguyên Đán buffer (Tết = Sat 6 Feb 2027) – store reviews run, no dev planned | Both | 04 Feb 2027 | 14 Feb 2027 |  |  |
| T40 | P5 Beta | Beta live: Play closed test (12+ testers × 14 days), TestFlight external, itch.io PC | Both | 15 Feb 2027 | 19 Feb 2027 | T38 |  |
| T41 | P5 Beta | Beta monitoring and hotfixes | Both | 15 Feb 2027 | 26 Feb 2027 | T40 |  |
| T42 | P5 Beta | (Optional) Steam: pay Direct fee, Coming Soon page ≥ 2 weeks before release | You (PO) | 15 Feb 2027 | 28 Feb 2027 |  |  |
| **M4** | **Milestone** | **M4 – BETA on Android, iOS and PC** | **Both** | **26 Feb 2027** | **26 Feb 2027** | **T40** |  |
| T43 | P5 Beta | Retro + roadmap after beta (online async PvP, store production release) | Both | 26 Feb 2027 | 28 Feb 2027 | M4 |  |

**Critical path:** T02 → T10 → T11 → T16/T18/T19 → T20 → T21 → T24 → **Alpha** → T33 → T34/T35 → T38 → **Beta**.
Parallel art track: T08 → T15, T23 → T28 (draft sprites fill gaps, so art never blocks code).

## 6. Store rules that drive the dates
- **Google Play, personal accounts created after 13 Nov 2023:** before *production*, a closed test with
  **at least 12 testers opted in for the last 14 days continuously**. Our Android beta *is* that closed
  test, so production can follow ~2 weeks after beta (mid-March). Recruit 15+ to cover dropouts.
- **Apple:** US$99/yr; external TestFlight testers (up to 10,000) need **Beta App Review** for the first
  build; TestFlight builds expire after 90 days. iOS builds need **macOS + Xcode**.
- **Steam:** US$100 per game; a public Coming Soon page for **at least 2 weeks** before release.
- Register store accounts **now** (identity checks take days to weeks).

## 7. Risks (top 8)
| # | Risk | P | I | Response |
|---|---|---|---|---|
| R1 | Scope too big for 9 weeks to alpha | H | H | Data-driven skills/items (templates, not 108 hand-coded); "Should" items may slip to beta |
| R2 | No Mac for iOS | M | H | Decide by 4 Dec: borrow a Mac, or macOS CI runner; else iOS beta moves to March |
| R3 | Sprites not ready | M | M | Draft sprites already exist for all 108; hand-drawn replace them gradually |
| R4 | Balance broken at alpha | H | M | Headless simulator from M1; alpha is for feedback |
| R5 | Fewer than 12 Android testers for 14 days | M | M | Recruit 15–20 from Nov; family/colleagues/Facebook groups |
| R6 | Vietnamese regulation (Decree 147/2024/NĐ-CP) for distributing games in VN | M | H | Offline vs-bots play is closest to type G4 (no player/server interaction); licences/registration apply to *businesses* providing the service. Get a lawyer's opinion before a commercial VN store release; free alpha/beta testing is lower risk |
| R7 | IP: too close to Pokémon (names, look, UI) | M | H | Own designs, own UI; never use Pokémon names/assets; check the "Vinmon" name (T39) |
| R8 | Holidays (Christmas/New Year, Tết) | H | M | Tết buffer planned; alpha before Tết |

## 8. Way of working
- **Weekly sprint** (Mon–Sun). Monday: you pick tasks from this table; Sunday: demo link + short review.
- **Per session:** "Continue Vinmon – task Txx". Claude reads `docs/SESSION_NOTES.md` + this file,
  does the task, tests it, pushes, updates status.
- **Definition of done:** builds, tests pass, deployed preview works on phone + PC, notes updated.
- **Tracker:** Google Sheet tab "Kế hoạch dự án" (status column) mirrors this table.

## Sources
- Google Play testing requirement: https://support.google.com/googleplay/android-developer/answer/14151465
- Apple Developer Program fee: https://developer.apple.com/programs/whats-included/
- Godot iOS export needs macOS + Xcode: https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_ios.html
- Steam Direct: https://partner.steamgames.com/steamdirect
- Decree 147/2024/NĐ-CP (game types G1–G4, Art. 37): https://luatvietnam.vn/linh-vuc-khac/tro-choi-dien-tu-la-gi-883-95390-article.html ,
  https://luatvietnam.vn/doanh-nghiep/dieu-kien-thu-tuc-de-cung-cap-dich-vu-tro-choi-dien-tu-g2-g3-g4-561-101208-article.html
