# Where we left off

A running note for whoever (Claude or human) picks up this repo next.

## What's done

The Gates of Olympus slot is essentially feature-complete vs. the real
Pragmatic Play game (within the constraints of an emulator with no
copyrighted assets). Run `git log --oneline` to see the trail.

### Real-Olympus features implemented
- 6×5 pay-anywhere tumble engine with cascade chains
- Multiplier orbs (random per-tumble + Lightning Strike)
- Free spins (15 from 4+ scatters), retrigger (+5 from 3 in FS)
- Persistent grid multipliers in FS, sum-multiply at end of each spin
- Buy bonus (100×) with confirmation dialog
- Ante bet (+25%, ~2× scatter chance)
- Auto-play (10/25/50/100/∞), turbo, tap-to-skip
- Tiered Big/Huge/Mega/Epic Win celebrations + coin shower
- Win-cluster popups + cascading WIN counter + win count-up
- Anticipation effect on 3+ scatters + lightning flash on each scatter land
- Persistent free-spins HUD (Spins / Multiplier / Won)
- Ambient sky lightning (12-30s) + scatter idle pulse
- Pre-spin reels blur transition
- Game info modal (Paytable / How to Play / Features tabs)
- Synthesized sound effects + Phrygian-mode background music (base + FS variants)
- PWA manifest (installable on phone)
- Provably-fair RNG with verification

### Architecture
- `src/pages/slots/_shared/ImmersiveSlotView.tsx` — full-screen slot view
  used by Olympus (Sweet Bonanza still uses the older `SlotShell.tsx`)
- `src/pages/slots/_shared/engine.ts` — game-agnostic spin engine
- `src/pages/slots/gates-of-olympus/` — Olympus config + symbols + page entry
- `src/components/layout/SlotPageLayout.tsx` — fullscreen layout for slot pages
- `src/hooks/useMusic.ts` — synthesized background music
- `src/hooks/useSound.ts` — synthesized SFX palette

### Tunable arch coordinates
`/slots/gates-of-olympus?tune=1` opens drag-sliders for the arch insets so
the user can dial in the grid placement live and report back the values.
Hard-coded defaults live in `src/pages/slots/gates-of-olympus/index.tsx`
under `archInsets={{ left: 22, top: 45, width: 56 }}`.

## Likely next priorities

1. **Sweet Bonanza immersive port** — currently uses the old card layout.
   Wants its own painted backdrop image (user can supply or AI-generate)
   and its own `archInsets`. The `ImmersiveSlotView` API already accepts
   `backdropSrc` + `backdropAspect` + `archInsets`, so it's mostly a
   matter of wiring + an image.
2. **Better symbol art** — current SVGs are clean but flat. Could add
   more 3D dimension, inner highlights, beveled rims.
3. **Dice / Mines / Crash / Plinko** — placeholders in the lobby. Real
   Olympus parity continues with these games using the same shell.
4. **Optimize image** — the painted Olympus image is 2.4MB. Convert to
   WebP for faster first-paint (Vercel can serve WebP automatically if
   we use `<picture>` or import via Vite's asset pipeline).
5. **Performance audit** — 30-cell grid with framer-motion `layout` is
   fine but could be lighter. CoinShower particles could use Canvas
   instead of DOM nodes for big celebrations.

## How to deploy
Vercel auto-deploys on every push to the branch. Production URL updates
when the branch is merged to `main`. See `README.md` for the one-time
setup walkthrough.

## Testing
- `npm test` — vitest, 20 tests
- `npm run dev` — local dev server at :5173
- `npm run build` — production bundle in `dist/`
