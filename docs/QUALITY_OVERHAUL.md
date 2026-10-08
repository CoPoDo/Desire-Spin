# Quality overhaul — October 2026

## Scope
All 34 game routes and their engines, UI, shared state, persistence, audio, and build tooling were reviewed. This remains independent, browser-local play-money software. Existing `desire-spin:v1:` saves are preserved and validated on read; valid balances, seeds, nonces, history, favorites and preferences survive the update.

## Principal changes
- Integer-cent wallet operations reject invalid and unaffordable transactions synchronously. Saved values are repaired field by field instead of discarding a valid account of prior play.
- Outcomes and accounting are separated from animation. Deterministic instant/slot rounds settle once before playback. Interactive games settle earned value or complete their specified remaining decisions when leaving. Crash/Aviator cashouts are protected against same-frame double settlement.
- Reel strips contain the actual committed symbols and artwork. Multiplier values survive reel-to-grid handoff. Sugar Rush preserves survivor identities through gravity while multiplier spots stay fixed. Bonus animation and rapid skip/navigation flows have regression coverage.
- Corrected full-round slot caps, Wild line evaluation, complete Big Bass feature probabilities and termination, Blackjack split rules, Video Poker drawing, Hilo boundaries, Pump/Dragon Tower ladders, Dice boundary probabilities and Plinko symmetry.
- Autoplay stops on unavailable funds, errors, hidden tabs and configured limits. Keyboard shortcuts ignore held keys, forms, controls and background modal interactions.
- Restrained lobby with game categories, original vector instant-game artwork, independently focusable favorites, clear credit labels and mobile-accessible history. No fabricated LIVE/NEW badges or dead promotion/sports navigation.
- Shared focus-trapped dialogs restore focus, close with Escape, contain scrolling and respect reduced motion. Destructive settings explain their effect before applying it.
- Updated Vite, React Router, Vitest and Happy DOM; Node 22.12+ is required. GitHub quality checks run type checks, all tests, a production build and the production-dependency audit.

## Verification
See `npm run check` for the reproducible aggregate check. Tests cover numerical rules, RTP envelopes, atomic wallet operations, save repair, interrupted/repeated actions, audio cleanup, actual reel landing identity and reduced-motion branches. Browser QA additionally exercises all 34 routes, desktop and narrow-phone layouts, actual reel landing, game menus, keyboard dismissal and wallet/stat reconciliation.

The Happy DOM test environment uses Framer Motion's JavaScript path because it has no real browser animation timeline. Browser QA remains necessary for actual CSS/WAAPI playback.

## Boundaries
- Provider math is not claimed to be exact. Proprietary PAR sheets/reel strips are unavailable; local probabilities/paylines and demo bonus shortcuts are disclosed. Published target RTP is not a promise for a session.
- Seeds and results are local, without an independent server commitment. Crash/Aviator activity is explicitly simulated.
- The production dependency audit is clean. The full development audit still reports transitive Tailwind 3 build-tool advisories in glob/selector parsers; they are not shipped in the browser bundle. A Tailwind 4 migration is a separate compatibility change and was not forced into this gameplay release.
- Local storage cannot guarantee recovery from browser/OS termination at every instruction. No backend or cross-device wallet is implied.
