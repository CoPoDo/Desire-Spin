# Desire Spin

A private, client-side, play-money recreation of modern slots, Stake Originals, and canonical casino games. There are no accounts, deposits, withdrawals, cryptocurrency, or real multiplayer.

The lobby contains **34 retained games**; five unsupported prototypes and all of their routes/assets were removed. See the dated [fidelity audit](docs/FIDELITY_AUDIT.md) for the reference and implementation status of every retained title.

## Run locally

```bash
npm install
npm run dev
npm test
npm run build
```

The starting balance is 1,000 play-money credits and can be refilled freely.

## Architecture

- `src/games/references.ts` pins the reference version, published rules, RTP target, and known proprietary gaps for all 34 games.
- `src/games/contracts.ts` defines reference manifests, deterministic round outcomes, and chronological playback events.
- Sweet Bonanza and Gates use the pay-anywhere tumble engine.
- Sugar Rush has a dedicated 7×7 orthogonal-cluster engine with persistent 2×–128× multiplier spots.
- Wanted, Wolf Gold, and Pharaoh's Gold use reel/payline state machines with game-specific features.
- Big Juan and Big Bass Bonanza use dedicated engines.
- Every route is lazy-loaded so the lobby no longer downloads every game implementation up front.

## Local fairness replay

Outcomes use deterministic HMAC-SHA256 floats derived from a locally generated secret seed, client seed, nonce, and cursor. The Fairness panel can reveal and replay those inputs. Because the application has no backend, this is a local integrity and replay tool—not an independently committed server-seed system.

Crash and Aviator show simulated local round activity and bot wagers. They do not connect to other players or a shared server.

## Fidelity policy

Observable rules, layouts, feature flows, and timing target the pinned reference versions. When proprietary reel strips or PAR sheets are unavailable, local weights are calibrated toward published RTP and volatility and are explicitly documented as approximations. Artwork and audio are original or reusable assets rather than copied provider media.

## Disclaimer

Game names referenced are trademarks of their respective owners. Desire Spin is unaffiliated fan software for entertainment and educational use. No real currency or winnings are involved.
