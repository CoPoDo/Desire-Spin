# Authored art, continuous motion and source-backed rules

## Visible changes

All nine reel-game families now use coherent original painted symbols and cabinet materials. Wanted, Olympus, Sweet, Sugar, Juan, Wolf, Pharaoh and Bass have individually composed game worlds; the local Classic machine has an ivory/brass/ruby cabinet. The lobby uses the same key art. Game actions remain in a compact integrated control rail, with 44 px touch targets and complete boards on narrow phone layouts.

The moving strip contains both the previous board and the committed next result. Its motion accelerates and decelerates continuously, using fractional responsive geometry, then hands over with the same symbol/key/multiplier data. Art is decoded before controls appear. Tumble survivors keep their actual DOM identities and column positions; only winning cells leave. Sugar's marks stay anchored below its moving candies. Multiplier landing effects emphasize already-landed orbs instead of replacing the board or replaying a second drop. Reduced motion and skip use the same prepared outcome.

## Rules and accounting

- Wanted exposes all three distinct natural/purchased features, with explicit 80× / 200× / 400× confirmation and one complete wager/result entry.
- Original Olympus uses the documented paytable, whole-tumble multipliers, winning-feature carry, separate scatter awards, 15 free spins / +5 retriggers, four-scatter paid entry and a 5,000× cap. Ante charges 1.25× and excludes bonus buying.
- Sugar uses seven paying classes and its complete public cluster table. Purchased entry can award 10–30 spins. Sweet uses its unscaled public pays and free-only multiplier set.
- Wolf uses the published 25-line diagram, central giant, money respins and jackpot rules. Pharaoh offers 1–3 lines, Eye Wilds and two-Cobra awards with unresolved rules clearly disclosed.
- Bass uses its original ten-class table and ten paths, valued fish, post-landing extra-fish events, queued collector upgrades and 2,100× cap. Its 100× purchase is explicitly a local shortcut because the original lacks a buy.
- Blackjack insurance, exact public Keno/Plinko/Cases tables, Roulette/Sic Bo inside combinations, one-stake RPS streaks and multi-target Slide received targeted corrections. Slide uses the public 2% edge conversion and one ledger for all targets.

The [34-game matrix](MECHANICS_AUDIT_2026-10-08.md) is the detailed source and limitation record. The [probability report](SLOT_PROBABILITY_AUDIT_2026-10-08.md) covers 4.14 million primary holdout rounds/conditional spins, independent calibration streams, analytical checks and production-RNG cross-checks. The separate tumble audit covers another 1.26 million base/ante/purchase cycles. Frequencies are fixed, local and independent of wallet/history; no adaptive payback or payout scaling is used. These measurements are not certified provider RTP.

## Existing saves and tab safety

Existing v1 saves remain compatible. Valid balances, seeds, nonces, history, preferences and statistics are retained. Older history rows are not rewritten with a new rules version; new entries carry their model revision. An exclusive browser Web Lock prevents multiple tabs from simultaneously mounting wallets or recovering journals. Waiting tabs automatically start after ownership is released. See [cross-tab behavior and limits](CROSS_TAB_PLAY.md); older-build tabs should be closed or reloaded after deployment.

## Verification

Final `npm run check` passes TypeScript, **426 tests across 34 files**, and a production build. Tests cover numerical payouts, caps, multi-target aggregation, repeated/interrupted actions, saved-state migration, tab ownership, actual-target landing, keyed cascade topology and reduced-motion behavior. Test workers are capped at two to keep local/CI memory bounded.

Browser findings and screenshots are summarized in [final visual QA](FINAL_QA_2026-10-08.md). Production verification is read-only. Runtime dependency audit reports zero vulnerabilities; the pre-existing Tailwind 3 development-only transitive advisories remain outside the shipped browser bundle.

## Honest limits

Private provider reel/PAR distributions are unavailable. Wanted's exact numbered paths remain unverified; Sweet purchase-entry/version-cap details conflict across sources; some intermediate money values and Pharaoh's provisional rules/progressive behavior remain unresolved. Hosted multiplayer/server hash chains and every operator-specific advanced control are not reproduced. Locally defined games retain their visible local rules. This is independent play-money software, with no deposits, withdrawals or real-money wagering.
