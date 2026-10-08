# Local slot probability audit — 8 October 2026

## What this establishes

This is a reproducible audit of **local play-money outcome frequencies**, after the source-backed rules/paytable corrections in [the mechanics audit](MECHANICS_AUDIT_2026-10-08.md). It does not recover proprietary provider reel strips, PAR sheets, correlations, jackpot odds, or certified RTP.

Every payout is evaluated from the configured public paytable and feature rules. This pass adds **no payout scaling, outcome rejection, loss recovery, balance-dependent odds, session-history adjustments, or forced winning purchases**. Calibration changes fixed symbol occurrence weights only. A small/zero-paying purchase remains possible.

The original frequency defects were material. Across three seeds, 6,000 purchases per Wanted feature returned 1.28% of price for Train, 188.46% for Duel, and 1,113.40% for Dead Man. Sugar's 6,000 purchases returned 40.77%; Wolf's 30,000 complete base rounds returned 27.10%. A single unlucky Train purchase was insufficient evidence; the independent batch samples established the problem. [Preserved baseline](slot-sampling-baseline-2026-10-08.json).

## Final independent samples

The primary table covers **4,140,000 rounds/conditional spins**, across three seeds per scenario. Every base sample includes all naturally triggered features in the same paid cycle. Purchases divide the complete payout by their **full 80×/200×/400×/100× price**, not by the nominal one-unit spin bet.

The interval is mean ± 1.96 × sample standard error, using Welford's variance calculation. It is a **descriptive normal approximation**, not a coverage guarantee for rare-tailed slots. The seed range is the range of the three independent batch means. Zero-paying rounds, cost-recovery rates, quantiles, trigger counts and cap counts are preserved in JSON.

| Scenario | Local reference target* | Final rounds | Observed return | Approximate 95% interval | Seed mean range |
|---|---:|---:|---:|---:|---:|
| Wanted, complete base cycle | 96.38% | 600,000 | 100.727% | 97.082–104.372% | 97.388–105.909% |
| Wanted, Train purchase | 96.38% | 90,000 | 96.531% | 95.861–97.201% | 96.165–96.982% |
| Wanted, Duel purchase | 96.38% | 90,000 | 97.719% | 95.961–99.477% | 95.539–99.752% |
| Wanted, Dead Man purchase | 96.38% | 90,000 | 93.572% | 91.127–96.017% | 92.278–95.562% |
| Wolf, complete base cycle | 96.00% | 600,000 | 99.429% | 95.473–103.386% | 94.600–104.647% |
| Sugar, complete base cycle | 96.50% | 600,000 | 101.571% | 95.336–107.806% | 98.005–105.950% |
| Sugar, purchase | 96.50% | 90,000 | 99.252% | 97.130–101.375% | 97.240–101.698% |
| Big Juan, complete base cycle | 96.70% | 600,000 | 96.460% | 94.741–98.179% | 95.204–97.285% |
| Big Juan, purchase | 96.53% | 90,000 | 96.631% | 96.043–97.218% | 95.545–97.197% |
| Big Bass, complete base cycle | 96.69% | 600,000 | 94.859% | 89.436–100.282% | 89.987–98.091% |
| Big Bass, local demo purchase | 96.69% | 90,000 | 98.338% | 96.949–99.726% | 98.029–98.550% |

*Targets come from the repository's pinned game references, with the same approximate local target applied to Wanted buys and the local Bass buy. These are not claims that each provider purchase mode has an independently verified identical RTP. In particular, the existence of a local Bass purchase does not establish original-version buy availability.

**Residual differences are real limitations.** The Wanted-base, Dead-buy, Sugar-buy and Bass-buy reference targets fall outside their displayed normal intervals. The results establish that the earlier order-of-magnitude defects were corrected; they do not establish that every local mode now has exactly the public target return. The published paytable was not distorted to force a target. Samples above 100% are sample estimates, not evidence of a guaranteed profitable strategy or a certified positive expectation.

### Wolf conditional free-spin diagnostic

600,000 independently generated Wolf free spins averaged **13.05612× base stake per spin** (approximate interval 12.90566–13.20659×; seed means 12.90406–13.15365×). This includes the giant center symbol and Money Respin when triggered, but it is conditional on already being in free spins. **It is not a 1,305.6% paid-game RTP**, nor the expected value of an entire free-spin feature. The complete paid-cycle row above includes actual feature entry probability, all five awarded spins, and retriggers.

### Raw final reports

- [Wanted final](slot-sampling-wanted-final-2026-10-08.json): seeds 196613, 262147, 327673; final Train weight 7.8. Its source-change list names Bass only, which was outside this run's selected scenarios. No Wanted source changed during that run.
- [Wolf final](slot-sampling-wolf-final-2026-10-08.json): the same independent final seeds, after the exact 25 public paylines landed; no selected source changed during the run.
- [Sugar and Big Juan holdout](slot-sampling-holdout-2026-10-08.json): seeds 104729, 130363, 155921. Its older Wanted/Wolf rows are superseded by the final reports. Bass changed while the report ran, but Bass was excluded from this run. Sugar and Big Juan did not change.
- [Bass final](slot-sampling-bass-final-2026-10-08.json): seeds 196613, 262147, 327673, after its public-paytable/progression/cap corrections; no selected source changed during the run.
- [Earlier calibration](slot-sampling-calibration-2026-10-08.json) used seeds 98127, 45219, 73901, separate from both holdout sets. It records candidate settings, before the final Sugar adjustment and analytical Train adjustment.
- [Bass calibration](slot-sampling-bass-calibration-2026-10-08.json) precedes the final scatter-frequency change from 3.35 to 2.9.

No holdout result was used to select individual winning rounds. After the analytical Train correction, its final report uses a fresh seed set. Larger production-RNG checks described below are checks of the frozen model, not adaptive weight updates.

## Fixed frequency changes

### Wanted

- Train Wild occurrence: local weight 7.8, with ordinary free-spin weights totaling 118. Its Wild probability per newly sampled cell is therefore 7.8/125.8. Previous weight 0.5 made the sticky-Wild purchase nearly inert.
- Duel VS occurrence: explicit local feature weight 4.55, replacing the former hidden effective weight 6. Other Duel symbol weights are unchanged.
- Dead collection: fixed per-cell Wild probability 0.015475 and multiplier probability 0.009285. Public 20-Wild/31× limits, three-miss reset flow, and three Showdown spins remain unchanged.
- Base VS occurrence: weight 1.05. Distinct natural bonus symbols still determine the triggered mode; purchases are never selected by player history or previous results.
- The 80×/200×/400× purchase prices, public pays and 12,500× whole-round cap are unchanged.

### Train analytical cross-check

`expectedStickyTrainPayout` in `tests/slot-sampling-math.ts` computes the exact **pre-cent-rounding mean of the local independent-cell model**, rather than estimating this particular mean by fitting a random seed.

On spin t, a cell is a sticky Wild with probability `1 - (1 - pWild)^t`. An ordinary class with fresh-cell probability p has probability `p × (1 - pWild)^(t - 1)`. Enumerating leading-Wild prefixes and the subsequent matched run gives each line's expectation, including cases where a shorter high-paying Wild substitution beats a longer low-symbol match. Correlation between different paylines affects variance, but not the sum of their means.

At the final weight, the local ten-spin Train expectation is **77.03634365× base stake**, or **96.29542956% of its 80× price**, before cent rounding. Rounding each of ten spins can move the one-unit-buy return by at most 0.0625 percentage points. Its maximum line-only feature total is 3,000×, below the 12,500× round cap, so cap truncation does not change this calculation. This analytical result is about this emulator's cells and paylines, not the provider's proprietary math.

### Wolf

- Fixed base weights: Wild 4, money 10, scatter 7.4. Existing free weights stay Wild 1.2, money 6, scatter 1.4.
- Public exact 25 paylines were transcribed in a separate source-backed correction before the final Wolf sample.
- Scatter restrictions, 3×3 giant, five initial free spins, +3 retriggers, held-money respin logic and the 1,000× full-screen award are unchanged by this calibration.
- The internal money-value selection frequencies remain local. The exhaustive list of ordinary money values is not fully source-verified; do not imply the local set is a recovered provider distribution.

### Sugar

- Seven paying classes and all 77 public cluster pays remain fixed.
- Base weights: `[4,7,8,9,11,12,14,0.515]`; free weights: `[4,7,8,9,11,12,19.65,0.55]`, with the final entry in each list being scatter weight.
- Both the initial grid and subsequent tumble refills use the appropriate fixed base/free distribution. Multiplier marks/spots, persistent feature state, 3–7-scatter purchase entry, free-spin awards and 5,000× cap are unchanged.
- Free-spin weights are separated from base weights because the same initial approximation produced a severely low-return purchase. No paytable value or won amount is rescaled.

### Big Juan and Big Bass

- Big Juan's frequencies were **not changed**. Both complete-base and purchased-feature samples remain compatible with its local calibration targets at this resolution.
- Bass frequency changes after the source-backed mechanics correction: base scatter 2.9; free fisherman 1.88. All other symbol and money frequencies were retained.
- Bass's removed payout scaling was not reintroduced. Fish retain values on every occurrence, actual public pay amounts are used, multiplier upgrades wait for the proper batch, extra fish obey the exactly-one-Wild condition, and a whole-round 2,100× cap applies.

## Pharaoh analytical sanity

The independent rules audit enumerated all 6³ outcomes of each active horizontal payline at fixed local weights `{pharaoh:10, ankh:12, scarab:14, cobra:28, eye:1, blank:12}`. With total stake divided equally among active lines, the pre-aggregate-rounding returns are:

| Active lines | Local analytical return |
|---:|---:|
| 1 | 89.4577171858% |
| 2 | 89.4577171858% |
| 3 | 94.3168036776% |

The third line's larger Mask pay explains the difference. Mask 50/50/100, Scarab 25, two-Cobra 2 / three-Cobra 5, and Eye Wild are source-backed. **Ankh 25, blank frequencies, the second/third-line placement and the two-Cobra positional convention remain provisional local choices.** There is no network progressive. Tests in `tests/pharaoh-wolf-rules.test.ts` pin the enumeration. These values must not be presented as an RTG PAR reconstruction or a certified provider RTP.

## RNG, uncertainty, and reproduction

The large offline runs use a seeded Mulberry32 source through the same `Rng` interface and unmodified production payout engines, for practical execution time. **The app still uses its HMAC-SHA256 RNG.** The benchmark source is never used by gameplay. The seed is fixed for a scenario/batch and the stream is consumed sequentially across rounds; it is not reset after a loss or favorable feature.

The [production-HMAC cross-check](slot-sampling-hmac-2026-10-08.json) uses 10,000 base rounds and 1,000 buys per seed across three different seeds, or 30,000/3,000 per scenario. This is too small to certify rare tails. The first 3,000 HMAC Dead purchases were unusually low (77.52%, approximate interval 65.54–89.50), so that specific frozen-mode check was expanded rather than silently omitted or used to tune the RNG. The expanded [30,000-purchase HMAC tail check](slot-sampling-dead-hmac-2026-10-08.json) returned **93.017%**, with approximate interval **88.761–97.273%**, consistent with the large fast-source estimate. Per-seed means were 95.691%, 88.032% and 95.329%; no source changed during the run.

Cent rounding is applied by each engine as in its normal outcome calculation. Big Juan's benchmark reports the engine's unit-stake multiplier before its final UI credit-rounding step. Actual returns can consequently vary slightly with wager denomination. Neither the fast source nor HMAC seed replay establishes licensed server equivalence.

Run from the repository root with the already installed Node/Vite toolchain:

```bash
# Large final samples; these do not change app state or frequencies.
node scripts/benchmark-slots.mjs --base=200000 --buys=30000 --seeds=196613,262147,327673 --only=wanted,wolf,bass --phase=holdout --output=/tmp/slot-final.json
node scripts/benchmark-slots.mjs --base=200000 --buys=30000 --seeds=104729,130363,155921 --only=sugar,juan --phase=holdout --output=/tmp/slot-sugar-juan.json

# Actual gameplay RNG, smaller independent batches.
node scripts/benchmark-slots.mjs --base=10000 --buys=1000 --seeds=524287,786433,999983 --only=wanted,wolf,sugar,juan,bass --rng=hmac --phase=production-rng-crosscheck --output=/tmp/slot-hmac.json

# Expanded rare-tail check of one frozen mode.
node scripts/benchmark-slots.mjs --base=2 --buys=10000 --seeds=524287,786433,999983 --only=wanted --scenarios=wanted-dead-mans-hand --rng=hmac --phase=production-rng-tail-check --output=/tmp/slot-dead-hmac.json
```

The script records source hashes, commit identifier, seed/count/mode inputs and whether selected source files changed during sampling. New runs should use the current source hashes, not assume the commit identifier alone describes an uncommitted working tree. No packages are downloaded by the benchmark.

## Verification

`tests/slot-probability.test.ts` verifies purchase-cost denominators, sample statistics, deterministic offline sampling, finite fixed weights, the Train analytical calculation, complete HMAC replay, payout-sum/cap invariants and intentionally broad non-degenerate purchase bands. These broad bands catch severe weight mistakes; they are **not assertions of an exact RTP**.

The last focused check passed TypeScript, `git diff --check`, and 67 tests across the probability, mechanics-audit, slot-regression, Pharaoh/Wolf and Big Bass mechanics suites. The parent task owns final full-app checks after the other concurrent UI/mechanics changes. This engine-level audit alone does not certify account-ledger UI behavior or every animation path.
