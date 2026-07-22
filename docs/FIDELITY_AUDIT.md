# Desire Spin fidelity audit

Audit date: **2026-07-22**
Reference policy: official provider rules first, official Stake game material second, documented canonical rules for generic table/instant games. Proprietary reel strips and PAR sheets are never represented as known when they are unavailable.

Status legend: **Rebuilt** = critical structural mismatch corrected; **Verified** = rules match the pinned public specification; **Calibrated** = observable rules match but private probability data is approximated; **Follow-up** = playable, with a non-critical reference-polish item remaining.

## Provider games

| Game | Pinned reference | Principal gap found | Implemented correction | Status |
|---|---|---|---|---|
| Sweet Bonanza | Pragmatic original | Fake base-game multiplier bombs and fictional lightning strike | Base multipliers disabled, fictional event removed, free-spin multiplier flow retained, RTP recalibrated | Calibrated |
| Gates of Olympus | Pragmatic original | Generic effects leaked into other themes | Isolated to the tumble family; standard multiplier/tumble flow and 15-spin feature retained | Calibrated |
| Sugar Rush | Pragmatic original | Incorrect 6×5 pay-anywhere Bonanza clone | Dedicated 7×7 orthogonal clusters, tumbling, persistent multiplier positions, 3–7 scatter award ladder | Rebuilt |
| Wanted Dead or a Wild | Hacksaw original | Incorrect 6×5 tumble slot | 5×5, 15 paylines, vertical reel stops, DuelReels expansion, three selectable bonus behaviours | Rebuilt/Calibrated |
| Wolf Gold | Pragmatic original | Incorrect 6×5 tumble and multiplier-orb feature | 5×3, 25 paylines, expanding free-spin symbols, 3-respin Money Respin with held values | Rebuilt/Calibrated |
| Big Juan | Current official sver=5 client + rules, audited 2026-07-22 | Dedicated engine still had duplicate lines, wrong Wild logic, leading-Wild errors, stale feature rules, unlocked settlement and a non-closing bonus | Exact 40 lines/display loops/value set; final-grid multi-group Wild Switch; deterministic guaranteed WIN; current jackpot/Extra rules; whole-round cap, locking and settlement; responsive day/night stages. See `BIG_JUAN_FIDELITY.md` | Rebuilt/Calibrated |
| Big Bass Bonanza | Pragmatic original | Five single cells with anywhere matching | 5×3, ten paylines, left-to-right evaluation, free spins, fish money values, fisherman collection and progression | Rebuilt/Calibrated |
| Pharaoh's Gold | Realtime Gaming classic | Incorrect 6×5 tumble/orb game | Replaced by a 3×3, three-payline classic reel implementation | Rebuilt/Observable |
| Aviator | Spribe observable client | Crash reskin without explicit simulation boundary | Two bets, cashout, history, flight motion and local player activity; clearly labelled local simulation | Observable |

## Stake Originals

| Game | Rules/math audit | Presentation audit | Status |
|---|---|---|---|
| Dice | 99/chance over-under model matches the 1% edge | Split control panel is compact but desktop-scaled globally | Verified |
| Limbo | 0.99/u distribution and 1,000,000× cap | Minimal numeric presentation matches the reference direction | Verified |
| Mines | 5×5, 1–24 mines and combinatorial cashout | Grid and random-pick flow present | Verified |
| Crash | Correct 1% crash distribution | Two bets, history, countdown-style flow and labelled simulated player feed | Verified/Local simulation |
| Plinko | Binomial paths; Easy/Medium/Hard/Expert, 8–16 rows; Expert reaches 10,000× | Peg contacts, acceleration, trails and impact feedback | Rebuilt/Calibrated |
| Wheel | 10–50 segments and three risks | Wheel presentation works; exact current label/icon polish remains | Follow-up |
| Hilo | Higher/lower probability and cashout implemented | Card history present; exact shoe UX remains a polish item | Follow-up |
| Dragon Tower | Difficulty-based row progression implemented | Canonical name and route corrected | Follow-up |
| Keno | 40-number, up-to-ten selection model | Published current Stake tables still require per-mode fixture capture | Calibrated |
| Roulette | European 0–36, straight/outside/street/six-line bets | Wheel/table present; split/corner control overlays remain follow-up | Follow-up |
| Blackjack | 3:2, split, double and dealer flow | Insurance/surrender are outside the pinned local rules | Verified to manifest |
| Baccarat | Punto Banco and pair side bets | Squeeze/roadmap presentation remains optional polish | Verified |
| Diamonds | Previous rarity-weighted engine was not Stake Diamonds | Uniform seven colours; pair, two pair, trips, full house, quads and five-kind exact paytable; 98.29% analytical RTP | Rebuilt/Verified |
| Video Poker | Full-pay 9/6 Jacks or Better | Hold/draw flow present | Verified |
| Flip | Streak multiplier and cashout model | Canonical product name and route corrected | Verified |
| Pump | Difficulty-based progressive cashout | Exact current curve capture remains | Calibrated |
| Rock Paper Scissors | Win/push/loss resolution | Minimal reference-style interaction | Verified |
| Cases | Prior single prize pool lacked reference modes | Four 98% pools—Easy, Medium, Hard, Expert—with 10,000× maximum and reel presentation | Rebuilt/Calibrated |
| Slide | 0.99/u multiplier distribution | Shared-looking local round presentation | Verified/Local simulation |

## Canonical games

| Game | Pinned rules | Result | Status |
|---|---|---|---|
| Three Cups | Equal-probability shell game | Canonical name/route retained | Verified |
| Classic 3-Reel Slot | Three reels, one payline | Canonical single-line presentation; local strip remains calibrated | Calibrated |
| Dragon Tiger | Eight-deck shoe, Dragon/Tiger/Tie, main-bet push on tie | Replaced one-deck draw and recalibrated tie return | Rebuilt |
| Sic Bo | Macau-style three dice and standard returns | Replaced artificial 99% payouts; added specific doubles and standard totals/triples | Rebuilt |
| Scratch Card | 3×3 match-three instant card | Published local paytable and deterministic reveal | Calibrated |
| 75-Ball Bingo | B/I/N/G/O ranges, free centre, line patterns | 75-ball card and distinct draws implemented | Verified/Calibrated paytable |

## Cross-cutting findings and corrections

- All game routes now use dynamic imports; the lobby no longer eagerly bundles every engine and renderer.
- Shared `GameReferenceManifest`, `RoundOutcome`, and `GameEvent` contracts separate reference data, deterministic results, and animation playback.
- Desktop originals expand beyond the former phone-width island; dedicated slot stages use wide responsive compositions.
- Reel games stop columns sequentially with vertical motion. Cluster and tumble games use distinct removal/drop animation rather than one universal blur.
- Reduced-motion preferences disable long animation loops and transitions.
- Fairness wording now states that seeds are local. Crash/Aviator player activity is labelled simulation.
- Original or reusable art/audio is required; provider media is not copied into the repository.

## Acceptance evidence

- Registry tests require exactly 34 unique manifests and lobby routes and reject all five removed IDs.
- Golden tests cover Diamonds categories/RTP, Cases risk RTP, Sugar Rush cluster/spots, Sweet Bonanza base multiplier exclusion, Big Bass dimensions/paylines, deterministic reel outcomes, and event chronology.
- The full legacy engine/RTP suite remains active alongside the new fidelity suite.
