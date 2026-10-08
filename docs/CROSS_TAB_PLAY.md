# Local play across tabs

## Ownership

The app takes an origin-wide, exclusive [Web Lock](https://developer.mozilla.org/en-US/docs/Web/API/Web_Locks_API) before mounting `GameProvider` or any game. A second tab displays a waiting screen and joins automatically after the current owner closes or navigates away. The waiting tab does not initialize the wallet, repair stored values, start a game, or recover a pending-round journal.

The owner keeps the lock while backgrounded and during an active round. There is no lease expiry, timeout, or force-takeover button that could interrupt another tab. On `pagehide`, the game tree unmounts synchronously and its existing round-cleanup policies run before the lock is released. A restored page must reacquire ownership and load fresh state. Ordinary React unmounts and cancelled queued requests release their ownership too.

Web Locks requires a supported browser and a secure context (HTTPS, or localhost during development). Browsers where locking is unavailable or denied show an explanatory screen without mounting game state or changing saved data. There is deliberately no localStorage lease fallback: a read/check/write lease does not supply reliable mutual exclusion across renderer processes.

## Saved-state compatibility

Existing `desire-spin:v1:*` keys and valid values are retained. Balance, fairness, history, and session-stat hooks read newer persisted values before mutations and subscribe to storage changes. Same-document updates notify other mounted instances too. Mount effects re-read saved state before sanitizing it, avoiding overwrite of an earlier child recovery. If storage rejects a write, the current in-memory state remains usable; the app does not claim that a failed save is durable.

Historical records without a rules revision stay intact and are not retroactively stamped. Newly recorded rounds default to `CURRENT_RULES_VERSION`; an explicitly supplied historical revision is preserved.

## Deployment and scope

After updating from an older build, close or reload all older Desire Spin tabs before playing. Older code cannot participate in this new lock. The gate coordinates participating tabs on the same origin/storage partition only; different browsers, profiles, origins, or partitions have separate local play-money data.

This is a single-owner safeguard, not a database transaction. Balance, history, statistics, and journals remain separate best-effort localStorage writes. It prevents two participating tabs from running/recovering rounds concurrently, but cannot make multiple writes atomic across a browser crash, protect against manual storage edits, or recover data when storage itself is unavailable. No account, remote wallet, or real-money guarantee is added.

## Regression coverage

`tests/cross-tab-state.test.tsx` reproduces and covers stale wallet overwrites, duplicate nonces, dropped history/stat updates, delayed storage events, mount-time stale writes, quota failures, and history revision compatibility.

`tests/play-session-guard.test.tsx` covers exclusive ownership, untouched waiting-tab state, one-time settlement before handover, queued cancellation, StrictMode/fast remounts, pagehide/pageshow reacquisition, and unavailable/denied locking. The lock-queue test double models browser serialization; these unit tests are not a substitute for multi-tab browser QA.
