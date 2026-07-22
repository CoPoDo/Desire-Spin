# Big Juan fidelity manifest

Audit date: **2026-07-22**
Pinned reference: **current official sver=5 client**
Local mode: **client-only, play money**

## Sources

- [Official game page](https://www.pragmaticplay.com/en/games/big-juan/)
- [Official release announcement](https://www.pragmaticplay.com/en/news/pragmatic-play-delivers-a-fiery-fun-filled-fiesta-with-big-juan/)
- [Current English rules PDF](https://www.daznbet.com/uploads/media/DUK/Game-Rules/Big_Juan_EN.pdf)
- [Older Spanish rules PDF](https://www.paston.es/img/logos/pdf/big-juan.pdf)
- Official sver=5 demo runtime `doInit`, embedded paytable, line definitions,
  response patcher, Wild Switch controller and feature event queue inspected on
  the audit date.

## Pinned documented behavior

| Area | Current reference behavior | Local implementation |
|---|---|---|
| Layout | 5 reels × 4 rows, 40 fixed left-to-right paylines | Exact ordered line definitions and exact current display-strip order |
| Paytable | Wild 1.25/3.75/12.5; Juan .625/2.5/6.25; Señorita .5/2/5; Chihuahua .375/1/3.75; Guitar/Sauce .25/.5/2.5; ranks .125/.25/1 | Exact total-bet multipliers with highest eligible win paid per line |
| Wild Switch | Every group of 6+ matching regular symbols across reels 2–4 becomes Wild; Scatter/Wild excluded | Every qualifying group changes; copies on reels 1/5 remain unchanged; one final-grid line evaluation |
| Wild teaser | Five matching eligible symbols across reels 2–3 tease reel 4; replacement animation is about 1 second | Dedicated reel-4 anticipation and grouped transform timeline |
| Scatter | 3/4/5 Piñatas award 10/12/15 respins | Maximum one visible Piñata per reel and reel-stop anticipation |
| Feature board | 3×3 board, center Bag fixed at 1× initially, one-position fourth reel | Dedicated feature state machine and responsive board |
| Guaranteed WIN | One seeded respin among the first three has WIN, exactly two Money and two Jackpot symbols | Deterministic 1–3 ordinal and exact four-symbol shape |
| Money values | .5, 1, 2, 3, 5, 8, 10, 15, 20, 25, 40, 50, 100, 125, 200, 250× | Exact value set |
| Extra Spin | Adds one respin whenever it lands, independently of WIN/BOOST/blank | Resolved before the fourth-reel branch |
| WIN | Collect Jackpot tokens; award visible Money plus the current Bag | Tokens resolve Mini→Minor→Major→Grand, then Money and Bag |
| BOOST | Add visible Money values to the persistent Bag; no direct payout | Exact state behavior |
| Jackpots | Mini 12.5×/3; Minor 50×/4; Major 250×/5; Grand 2500×/5; meters reset and can pay repeatedly | Sequential token collection with modulo reset and repeated awards |
| Bonus Buy | Costs 100× and visibly lands 4 or 5 Piñatas; reference Buy RTP 96.53% | Locked entry spin, single-seed whole-cycle replay, 12/15 respins |
| Round cap | 2,600× across triggering line win plus feature; feature ends immediately at cap | Base multiplier is included in every check; exact equality terminates the feature |
| RTP/volatility | 96.70%, very high; max-hit display 1 in 2,896,871 | Calibrated local probabilities; no claim of provider PAR identity |
| Controls | Coin value, coins/line, 40 fixed lines, Space/Enter starts or stops reels, autoplay, intro toggle, audio/SFX/history | Bet sheet, clickable/keyboard stop, turbo/autoplay, persistent intro preference, local history |

## Local calibration evidence

The hidden-outcome model is intentionally separate from the exposed display
loops. A 2026-07-22 seeded calibration produced:

- 5,000,000 base rounds: 61.8562% line-win contribution (95% Monte Carlo
  interval ±0.1452 percentage points), 0.4883% feature triggers and 0.5739%
  Wild Switch frequency;
- 1,000,000 conditional organic features: 71.1672× mean award, projecting a
  34.8137% feature contribution;
- combined projected standard-play RTP: 96.6699% (approximate 95% interval
  96.511%–96.829% around the published 96.70% target);
- 1,000,000 bought features: 96.4821× mean return per 100× cost (95% interval
  96.305×–96.659× around the published 96.53× target).

These measurements validate aggregate calibration, not provider identity.
Major/Grand marginal frequencies remain too sparse to claim statistical
validation and the provider's correlated server table remains unavailable.

## Version differences

The older Pastón rules and older captured client show Grand filling at four
tokens and a maximum total bet of 200. The pinned current sver=5 runtime uses
five Grand tokens and exposes total bets through 240. The English rules PDF
also uses five Grand tokens but has an operator-specific maximum bet of 36.
These are version/operator differences, not interchangeable rules.

## Proprietary boundary

The current runtime exposes display loops but the server supplies outcome
grids and correlated feature events. Uniformly sampling the visible strips
does not reproduce the published RTP, proving they are not a PAR sheet.
Consequently these remain calibrated approximations:

- base-game outcome/stop probabilities;
- feature cell correlations and Money/Jackpot probabilities;
- 4-versus-5 Bonus Buy entry weight;
- exact win-tier thresholds and some animation timings.

Provider imagery, mascot artwork, logo, music and recordings are not shipped.
The local scene and symbols are original code-native artwork inspired only by
the reference composition and feedback hierarchy.

## Regression coverage

`tests/big-juan.test.ts` pins the 40 lines, paytable, Wild substitution edge
cases, multi-group Wild Switch, scatter-per-reel constraint, Bonus Buy entry,
guaranteed-WIN shape, Extra Spin independence, Jackpot thresholds/reset,
exact Money values, exact/equality 2,600× cap behavior, deterministic base and
whole-feature timelines, and quick Monte Carlo drift envelopes. The UI replays
an immutable feature timeline; balance/history settle once for the complete
cycle, with a durable prepared settlement for navigation or refresh during
presentation.
