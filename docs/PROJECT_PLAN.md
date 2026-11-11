# VieAni (Vietnam Animal) – project plan (Nov 2026 → Feb 2027)

Roles: **You = Product Owner** (vision, scope calls, art sketches, community, testers, legal).
**Claude = developer/tech lead** (code, data, tools, builds, tests, docs). One task per session where possible.

## Decisions (T01, confirmed 11 Nov 2026)
| Topic | Decision |
|---|---|
| Name | Project renamed **Vinmon → VieAni** ("Vietnam Animal") to stay clear of Pokémon. Encyclopedia files renamed to `vieindex.*` (11 Nov); the `vinmon` palette file name is unchanged. |
| Scope | Alpha = single player vs 7 AI bots (see MoSCoW below) |
| Tech | **TypeScript + Phaser + Vite**, web only |
| Platform | **Web only, on itch.io, for alpha and beta.** Native Android/iOS/PC after beta, once there is a community (PO has a MacBook for iOS later) |
| Repo | Stays **private**; builds are pushed to itch.io (butler) |
| Store accounts | Google Play / Apple / Steam **skipped** until the native phase (cost now: 0) |

## 1. Milestones
| Milestone | Date | What "done" means |
|---|---|---|
| M0 Foundation | Sun 22 Nov 2026 | Game project set up, auto-deployed to a hidden itch.io page |
| M1 Battle core | Sun 13 Dec 2026 | Two teams fight in the browser, with skills, types, status effects |
| M2 Game loop | Sun 03 Jan 2027 | A full match (shop → battle → ranking) playable vs 7 bots |
| **M3 ALPHA (itch.io)** | **Fri 15 Jan 2027** | Shared with invited testers + feedback form; hard deadline 31 Jan |
| Buffer – Tết | 04–14 Feb 2027 | Tết Nguyên Đán is Sat 6 Feb 2027 |
| **M4 PUBLIC BETA (itch.io)** | **Fri 26 Feb 2027** | Public page, installable on phones as a web app, community running |

## 2. Scope (MoSCoW)
- **Must (alpha):** single player vs 7 AI bots; 8×8 board + bench; shop/gold/interest/levels; star-up;
  all 108 VieAni (draft sprites where no hand-drawn sprite yet); type chart + Legendary rule;
  31 synergies; 50 items; Thiên địch/Cộng sinh; Vietnamese UI; works in phone and PC browsers.
- **Should (alpha, may slip to beta):** 20 folklore signature skills; tutorial; music/SFX.
- **Could (beta):** English UI; installable web app (PWA); save/resume.
- **Won't (before March 2027):** native store apps, real-time online PvP, accounts, payments/ads, leaderboards.

## 3. Tech stack
| Part | Choice | Why |
|---|---|---|
| Game | TypeScript + Phaser + Vite | Claude can build, run and screenshot-test it in the cloud session; one codebase can later be wrapped for phones/PC |
| Combat | Deterministic, seeded, fixed tick, runs without graphics | Balance simulator now; async PvP later |
| Hosting | itch.io HTML5 page, uploaded with butler from GitHub Actions | Free; works with a private repo |
| Phone | Responsive layout + PWA ("add to home screen") | App-like on phones with no store fees |
| Later (native) | Capacitor (Android/iOS), Tauri/Electron (PC) | Re-uses the same web build |

**What you need to set up for T04:** a free itch.io account, an itch.io API key saved as a GitHub
repository secret (`BUTLER_API_KEY`) – Claude will give step-by-step instructions. Note: butler cannot
push to a page set to *Private*; we keep the page as *Draft/Restricted* until alpha.

## 4. Budget
| Item | Cost |
|---|---|
| itch.io hosting, GitHub private repo, GitHub Actions (within free monthly minutes) | 0 |
| Store fees (Google Play US$25, Apple US$99/yr, Steam US$100) | deferred to the native phase |

## 5. Work breakdown and schedule
| ID | Phase | Task | Owner | Start | End | Depends on | Done when |
|---|---|---|---|---|---|---|---|
| T01 | P0 Foundation | Approve plan, alpha scope and tech stack; rename project to VieAni | You (PO) | 11 Nov 2026 | 14 Nov 2026 |  | Done 11 Nov: web-first, private repo, itch.io |
| T02 | P0 Foundation | Game Design Doc v1: round flow, gold/interest, levels, shop odds, star-up, player HP | Both | 12 Nov 2026 | 20 Nov 2026 | T01 | docs/GDD.md reviewed by PO |
| T03 | P0 Foundation | Game project skeleton: Vite + TypeScript + Phaser, tests, loads data/*.json | Claude | 16 Nov 2026 | 19 Nov 2026 | T01 | npm test + npm run build pass |
| T04 | P0 Foundation | Auto-deploy to itch.io (butler via GitHub Actions); PO creates itch.io account + API key secret | Both | 19 Nov 2026 | 21 Nov 2026 | T03 | Hidden itch.io page shows the empty board |
| T05 | P0 Foundation | Community channels: Facebook group or Discord server + itch.io devlog | You (PO) | 23 Nov 2026 | 13 Dec 2026 |  | Channel created; first devlog post |
| T06 | P0 Foundation | itch.io page: title, cover image, screenshots, description VN/EN | Both | 14 Dec 2026 | 12 Jan 2027 |  | Page ready to publish |
| T07 | P0 Foundation | Recruit 20–30 alpha testers (phone + PC browsers) | You (PO) | 16 Nov 2026 | 10 Jan 2027 |  | Tester list with emails |
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
| T24 | P3 Alpha polish | Vietnamese UI: HUD, shop, synergy panel, tooltips, VieIndex inside the game | Claude | 04 Jan 2027 | 10 Jan 2027 | M2 |  |
| T25 | P3 Alpha polish | Audio: CC0/CC-BY SFX and music, with credits | Claude | 06 Jan 2027 | 10 Jan 2027 |  |  |
| T44 | P3 Alpha polish | 8 battle backgrounds (Vietnamese landscapes, pixel art, `data/backgrounds.json`) | Both | 04 Jan 2027 | 12 Jan 2027 |  | Random background each battle |
| T26 | P3 Alpha polish | First-game tutorial | Claude | 08 Jan 2027 | 12 Jan 2027 | T24 |  |
| T27 | P3 Alpha polish | Balance pass 1 using the simulator; PO playtests | Both | 06 Jan 2027 | 13 Jan 2027 | T14 |  |
| T28 | P3 Alpha polish | Import sketch batch 2 sprites | Both | 04 Jan 2027 | 10 Jan 2027 | T23 |  |
| T29 | P3 Alpha polish | Bug bash + performance on a cheap Android phone browser | Both | 11 Jan 2027 | 14 Jan 2027 |  |  |
| T30 | P3 Alpha polish | Feedback form (Google Form) + version number on screen | Both | 12 Jan 2027 | 13 Jan 2027 |  |  |
| **M3** | **Milestone** | **M3 – ALPHA on itch.io (web)** | **Both** | **15 Jan 2027** | **15 Jan 2027** | **T24-T30** |  |
| T31 | P4 Beta build | Alpha playtest window: collect feedback | You (PO) | 16 Jan 2027 | 29 Jan 2027 | M3 | Feedback triaged into backlog |
| T32 | P4 Beta build | Fixes + balance pass 2 | Claude | 18 Jan 2027 | 31 Jan 2027 | T31 |  |
| T33 | P4 Beta build | Phone browser layout: landscape, touch targets, safe areas, battery/perf | Claude | 18 Jan 2027 | 27 Jan 2027 | M3 |  |
| T34 | P4 Beta build | Installable web app (PWA): home-screen icon, offline play, auto-update | Claude | 25 Jan 2027 | 29 Jan 2027 | T33 |  |
| T35 | P4 Beta build | Save/load runs + settings; English UI toggle | Claude | 25 Jan 2027 | 02 Feb 2027 | M3 |  |
| T36 | P4 Beta build | Light analytics (itch.io stats + in-game anonymous counters, no personal data) and privacy note | Claude | 27 Jan 2027 | 31 Jan 2027 | M3 |  |
| T37 | P4 Beta build | Content for beta: hand-drawn sprites for all Legendary + most-played VieAni | Both | 18 Jan 2027 | 03 Feb 2027 | T28 |  |
| T38 | P4 Beta build | Beta release candidate on hidden itch.io page; testers smoke-test | Both | 01 Feb 2027 | 03 Feb 2027 | T33-T37 |  |
| T39 | P4 Beta build | Legal check: Decree 147/2024 category for release in Vietnam; name/trademark search for VieAni | You (PO) | 04 Jan 2027 | 03 Feb 2027 |  |  |
| BUF | Buffer | Tết Nguyên Đán buffer (Tết = Sat 6 Feb 2027) – no dev planned | Both | 04 Feb 2027 | 14 Feb 2027 |  |  |
| T40 | P5 Beta | Public beta on itch.io + announcement (community, devlog, Vietnamese gaming groups) | Both | 15 Feb 2027 | 19 Feb 2027 | T38 |  |
| T41 | P5 Beta | Beta monitoring, hotfixes, weekly balance patch | Both | 15 Feb 2027 | 26 Feb 2027 | T40 |  |
| T42 | P5 Beta | Community: weekly devlog, feedback triage, vote on next features | You (PO) | 15 Feb 2027 | 28 Feb 2027 | T05 |  |
| **M4** | **Milestone** | **M4 – PUBLIC BETA on itch.io (web)** | **Both** | **26 Feb 2027** | **26 Feb 2027** | **T40** |  |
| T43 | P5 Beta | Retro + roadmap: native Android/iOS/PC (store accounts, Mac build), online async PvP | Both | 26 Feb 2027 | 28 Feb 2027 | M4 |  |

**Critical path:** T02 → T10 → T11 → T16/T18/T19 → T20 → T21 → T24 → **Alpha** → T33 → T34 → T38 → **Beta**.
Parallel art track: T08 → T15, T23 → T28 → T37 (draft sprites fill gaps, so art never blocks code).
Parallel community track: T05 → T06 → T07 → T42.

## 6. Risks
| # | Risk | P | I | Response |
|---|---|---|---|---|
| R1 | Scope too big for 9 weeks to alpha | H | H | Data-driven skills/items (templates, not 108 hand-coded); "Should" items may slip to beta |
| R2 | Sprites not ready | M | M | Draft sprites already exist for all 108; hand-drawn replace them gradually |
| R3 | Balance broken at alpha | H | M | Headless simulator from M1; alpha is for feedback |
| R4 | Too few players at beta | M | H | Start community in Nov (T05), devlogs, Vietnamese gaming/education groups |
| R5 | Vietnamese regulation (Decree 147/2024/NĐ-CP) | M | H | Offline vs-bots play is closest to type G4 (no player/server interaction); licences/registration apply to *businesses* providing the service. Get a lawyer's opinion before any commercial release in VN |
| R6 | IP: too close to Pokémon (names, look, UI) | M | H | Renamed to VieAni, encyclopedia renamed Vindex → VieIndex (a play on VN-Index); own designs and UI; trademark search (T39) |
| R7 | Phone browsers slow on cheap devices | M | M | Test on a low-end Android early (T29), limit effects |
| R8 | Holidays (Christmas/New Year, Tết) | H | M | Tết buffer planned; alpha before Tết |

## 7. Way of working
- **Weekly sprint** (Mon–Sun). Monday: pick tasks; Sunday: demo link + short review.
- **Per session:** "Continue VieAni – task Txx". Claude reads `docs/SESSION_NOTES.md` + this file,
  does the task, tests it, pushes, updates notes.
- **Definition of done:** builds, tests pass, itch.io preview works on phone + PC, notes updated.
- **Tracker:** Google Sheet tab "Kế hoạch dự án" (status column) mirrors this table.

## Sources
- itch.io butler (Private pages reject pushes): https://itch.io/docs/butler/pushing
- Decree 147/2024/NĐ-CP (game types G1–G4, Art. 37): https://luatvietnam.vn/linh-vuc-khac/tro-choi-dien-tu-la-gi-883-95390-article.html ,
  https://luatvietnam.vn/doanh-nghiep/dieu-kien-thu-tuc-de-cung-cap-dich-vu-tro-choi-dien-tu-g2-g3-g4-561-101208-article.html
- For the later native phase: Google Play testing rule https://support.google.com/googleplay/android-developer/answer/14151465 ;
  Apple fee https://developer.apple.com/programs/whats-included/ ; Steam Direct https://partner.steamgames.com/steamdirect
