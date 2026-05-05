# Desire-Spin

A play-money emulator of modern crypto-casino slots. **No real wagering, no real money, no crypto, no accounts** — just a faithful client-side recreation of the games for entertainment and education.

v1 ships two high-fidelity tumble slots inspired by Pragmatic Play:

- **Sweet Bonanza** — 6×5 pay-anywhere, fruit/candy theme, sticky free-spin multipliers, ~96.5% target RTP
- **Gates of Olympus** — 6×5 pay-anywhere, Greek-myth theme, Zeus drops multiplier orbs, ~96.5% target RTP

Both back onto a shared engine with provably-fair RNG (Stake-style HMAC-SHA256 + server seed + client seed + nonce), free spins, retriggers, ante bet, and buy-bonus.

Future iterations: Dice, Mines, Crash, Plinko (placeholders in the lobby).

---

## Run locally

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production bundle in dist/
npm run preview      # serve the production build
npm test             # vitest
```

You start with 1,000 in play money. Refilling is free (top-bar `+1,000` button or Settings).

---

## How to deploy (step-by-step)

The app is a static SPA — works on Vercel, Netlify, Cloudflare Pages, or GitHub Pages. The plan you approved chose **Vercel**.

### 1. Push the branch (this is what `git push -u origin claude/gambling-emulator-app-UlrCo` does)

If you're following along inside Claude Code, the branch is already pushed for you.

### 2. One-time Vercel setup (about 90 seconds)

1. Go to [vercel.com](https://vercel.com) and sign in with the GitHub account that owns `CoPoDo/Desire-Spin`.
2. Click **Add New… → Project**.
3. Find `CoPoDo/Desire-Spin` in the list and click **Import**.
4. **Framework Preset:** Vite (auto-detected).
5. **Build Command:** `npm run build` (auto-detected).
6. **Output Directory:** `dist` (auto-detected).
7. **Root Directory:** leave as `./`.
8. There are *no environment variables* to set.
9. Click **Deploy**.

The first build takes ~30–60 seconds. When it finishes you'll get a URL like `https://desire-spin.vercel.app`.

### 3. After that — fully automatic

Every push to *any* branch creates a unique preview URL. Pushes to your default branch (e.g. `main` once you merge) deploy to your production URL automatically. Nothing else to do.

If you want to use **Netlify** or **Cloudflare Pages** instead: same flow, different domain. Both auto-detect Vite and need zero config.

---

## Architecture

| Layer | Files |
|---|---|
| RNG core | `src/lib/sha256.ts`, `src/lib/fairness.ts` |
| State hooks | `src/hooks/{useBalance,useFairness,useBetHistory,useSound}.ts` |
| App shell | `src/App.tsx`, `src/components/layout/*` |
| Fairness UI | `src/components/fairness/*` |
| Slot engine | `src/pages/slots/_shared/{engine,types,Grid,ImmersiveSlotView,BetControls,Paytable}.{ts,tsx}` |
| Sweet Bonanza | `src/pages/slots/sweet-bonanza/{config.ts,index.tsx,symbols.tsx,Art.tsx}` |
| Gates of Olympus | `src/pages/slots/gates-of-olympus/{config.ts,index.tsx,symbols.tsx,Art.tsx}` |
| Tests | `tests/{sha256,fairness,engine}.test.ts` |

### Provably-fair RNG

Each spin draws floats from `HMAC-SHA256(serverSeed, "${clientSeed}:${nonce}:${cursor}")`. The committed (hashed) server seed is shown in the Fairness panel before any bet; you can reveal it later via "Rotate" and verify all bets that used it. Same algorithm Stake / BC.Game / Roobet use publicly.

### Slot engine

Game-agnostic. Each slot is a `SlotConfig` (symbols, weights, paytable, multiplier table, theme). The engine returns a deterministic `frames[]` from `(rng, config, bet, mode)`; the React layer plays it back with framer-motion for drop / explode / count-up animations.

Pay-anywhere ≥ 8 matching symbols anywhere on the 6×5 grid. Tumble cascade replaces winning cells. Multipliers can land at any time; in **base** game they apply per chain, in **free** spins they accumulate on the grid and sum-multiply the spin payout at the end.

### RTP calibration

At 80,000-spin samples, both games measure within ±5% of the real-world target (96.5% RTP, ~0.4% scatter trigger rate, ~27% hit rate). Real audits use 100M+ spins; this is an emulator, not a regulator.

---

## Disclaimer

Game names referenced are trademarks of their respective owners. Desire-Spin is unaffiliated fan software for entertainment and educational purposes only. All artwork is original. No real currency or cryptocurrency is involved. Do not gamble with real money — and if you have a problem with gambling, see [GamCare](https://www.gamcare.org.uk/) or call 1-800-GAMBLER.
