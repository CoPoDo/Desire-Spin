# Desire Spin fidelity audit

> This historical inventory is superseded where noted by the [October 2026 mechanics audit](MECHANICS_AUDIT_2026-10-08.md), which records current rules and source uncertainty, and the [local probability audit](SLOT_PROBABILITY_AUDIT_2026-10-08.md).

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
| Slide | 2% edge, 32-bit +1-denominator conversion | Independent multi-target local rounds; no hosted player/hash-chain service | Source-backed local simulation |

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

## Reliability and presentation follow-up — 2026-10-08

The following corrections apply to the local play-money implementation. They do
not certify provider-equivalent probability tables or licensed visuals.

- Line and Sugar Rush games now derive the complete base/feature cycle from one
  nonce, preserve its starting stake/options, and record one wager and payout
  before playing its presentation. Navigating away or refreshing cannot abandon
  the remaining free-spin awards. Sugar Rush bonus purchases now include their
  full 100× cost in that same history entry.
- All slot controls use a synchronous round lock and the wallet's fresh debit
  result. Repeated spin clicks skip presentation rather than debit again. A
  failed outcome calculation refunds only an unsettled wager.
- The maximum payout applies across the whole base/feature cycle. Final tumble
  frames and feature-end totals agree with settlement, and caps stop further
  feature generation. Pathological RNG/configurations have explicit safety
  guards rather than unbounded loops.
- Tumble animation keys are seed-replay deterministic. New symbols land before
  their multiplier presentation. Turbo scales grid timing, and reduced-motion
  mode resolves without long transform/particle sequences. Reel completion is
  once-only and stale timers/listeners are canceled on unmount.
- Line evaluation considers the best eligible Wild substitution once per line,
  including Wild-only prefixes. Local paylines include balanced diagonals and
  are inspectable in each game's paytable; they are not represented as exact
  provider lines. VS/expanding-symbol transforms follow the initial reel stops.
- Wolf Gold replays the held-money respin boards separately, preserving the
  original grid on which its line wins were evaluated.
- Local rule/pay screens now disclose implemented payouts, feature behavior,
  caps, and probability limitations. Sweet Bonanza displays its existing 1.9×
  base calibration in the base paytable, with separate free-spin values, and
  correctly describes multipliers as a free-spin-only feature. Unsupported
  claims about bonus expected return/RTP were removed from purchase/info UI.
- Shared accessible dialogs replace the tumble bet, autoplay, and buy sheets.
  Autoplay pauses for menus and stops on backgrounding. Line and Sugar Rush
  controls include visible Skip, Turbo, and rule/pay access with mobile titles,
  status announcements, and readable result displays.

New deterministic coverage: `tests/slot-regression.test.ts` and
`tests/slot-controls.test.tsx`. Big Juan interruption/control coverage is in
`tests/big-juan-ui.test.tsx` and `tests/big-juan-animation.test.tsx`.

### Landing-continuity follow-up

A user-reported “reel lands, then the board changes” defect was traced to
multiple independent presentation bugs and corrected:

- The shared reel renderer discarded `multiplier` and original cell keys, so a
  multiplier's landed representation differed from the resting grid. It now
  carries the complete cell and uses the same artwork renderer at both stages.
- Tumble multiplier cells are now determined before the initial/drop frame, so
  the landing frame already contains the actual outcome. Following multiplier
  frames emphasize those same cells rather than substituting new symbols.
  Later multipliers may occupy only newly entering cells; non-winning survivors
  retain their identity and descend in their original columns. Cosmetic token
  replacements on an already stopped losing board were removed. These changes
  alter the local probability path; the existing RTP smoke envelope passes, but
  old point estimates must not be treated as current certified RTP.
- Sugar Rush frames now carry deterministic candy keys. The UI moves surviving
  keyed elements down, removes only winners, and drops newly keyed candies from
  above. Multiplier-position backgrounds stay anchored under their own grid
  cells instead of moving with the candy artwork.
- Wolf/Wanted/Pharaoh use actual finite vertical strips containing the committed
  stop symbols. Their former wobble-then-replace presentation was removed.
  Wanted/Wolf's announced Wild/expansion features remain separate, intentional
  post-stop transforms.
- Big Juan's moving/resting reels now share the same SVG renderer. Final strip
  content remains until the synchronous rest-view handoff. Bonus cells and the
  fourth reel contain the prepared outcome throughout their finite roll.
- Desktop line and Sugar boards are height-constrained to the viewport; their
  control areas and headers use quieter borders, spacing, and less ornamental
  glow. Narrow layouts can scroll through all controls.

`tests/slot-landing.test.tsx` verifies identical final cell/artwork data through
reel-to-grid handoff, multiplier board identity, retained survivor DOM nodes,
Sugar's column/gravity topology, and once-only reel completion. Sugar control
coverage additionally checks that the exact candy DOM node and artwork survive
movement to the next row.
