# Where we left off

A running note for whoever (Claude or human) picks up this repo next.

## Status

Gates of Olympus is now **deeply parity-matched** to the real Pragmatic
Play game (within the constraints of an emulator with no copyrighted
audio/art assets). Many improvements deployed this session — see the git
log for the full trail.

## Real-Olympus parity features implemented

### Gameplay
- 6×5 pay-anywhere tumble engine with cascade chains
- Multiplier orbs (random per-tumble + dramatic Lightning Strike)
- Free spins (15 from 4+ scatters), retrigger (+5 from 3 in FS) with
  prominent "+5 FREE SPINS" callout
- Persistent grid multipliers in FS, sum-multiply at end of each spin
- Buy bonus (100×) with confirmation dialog
- Ante bet (+25%, ~2× scatter chance) — toggle in bottom bar
- Auto-play (10/25/50/100/∞) — pauses on big wins / overlays
- Turbo (lightning bolt button)
- Tap-to-skip with on-screen "Tap to skip" hint
- Provably-fair RNG with verification panel

### Probability calibration (matches real game)
- Multiplier orbs: ~10% of base spins (real ~7-10%)
- Free spins trigger: ~0.35% (real ~0.4-0.5%)
- Lightning Strike: ~0.8% (rare special event)
- Hit rate: ~28% (real 24-28%)
- RTP: ~96-100% at 100k samples (real 96.5%)
- Volatility: 5/5 (real high)
- Max win: 5,000× cap

### Visual presentation
- Painted Zeus/arch backdrop image with reels positioned inside the arch
- Six-tier wins (BIG → HUGE → MEGA → EPIC → SENSATIONAL → COLOSSAL)
- Coin shower particle system (gold + jewel-toned gems) on big wins
- Cluster popups (gold serif gradient) over each winning cluster
- Cascading WIN counter that scales with payout
- Cell drop bounce + landing squish + per-column stagger
- Win cell puff-out on tumble (brightness flash + scale + fade)
- Win cell radiating gold halo
- Win cluster illumination (wide gold radial glow)
- Symbol art: faceted hexagonal gems + ornate crown/ring/hourglass/chalice
- Tiered multiplier orbs (normal / big / huge with extra glow)
- Sticky multiplier orb halo (violet+gold) during free spins
- FS background tint (multiply-blend purple+amber overlay)
- Persistent FS HUD (Spins / Total Multiplier / Won) with prominent
  TOTAL MULT counter that pulses on each new orb
- Lightning Strike Zeus-area flash + bolts radiating from upper-left
- Scatter idle pulse (always when on grid)
- Scatter column pulse on 3+ scatters visible
- Scatter near-miss tease at 2 scatters (subtle gold inset glow)
- Anticipation effect at 3+ scatters (red-amber border + callout)
- Lightning flash on each scatter landing
- Ambient sky lightning every 12-30s
- Idle cell glints every 2.4-6.4s when at rest
- Pre-spin reels-blur transition
- Welcome splash on game load ("MAX WIN 5,000×")
- Free-spins outro "TOTAL WIN" overlay
- Big-win celebration with vignette + pulsing halo + serif gold counter
- Spin button gold shimmer pulse + sweep highlight when idle
- Spin button color shift (-12° hue) during free spins

### Audio
- Synthesized SFX palette (no copyrighted audio):
  - spin click, drop thunks (multi-layer), win chimes (escalating per chain)
  - multiplier zap, lightning strike (rumble→crack→hiss→zing)
  - thunder, scatter-land, big-win, mega-win
  - free-spins-trigger fanfare, free-spins-end resolve
  - coin tinkle (staggered through coin shower)
- Phrygian-mode background music — base + free-spins tracks
- Music ducks (20%) during big-win celebrations
- Music intensity switches when entering / exiting FS
- Audio context closes on unmount (no resource leaks)

### UI / UX
- Full-screen immersive layout (no scrolling, locked)
- Floating top bar (back / balance + refill / menu)
- Bottom action bar (bet stepper + buy / spin / turbo + auto + info + music + ante)
- Crisp SVG icon set (turbo, autoplay, info, music, plus, minus, back,
  spin arrow, stop, dots)
- Olympus-themed bottom sheets (bet preset + autoplay options) with
  decorative ⚡ corners and gold-gradient active states
- Buy Free Spins confirmation dialog (purple→gold gradient, lightning
  bolts, you-get / cost cards)
- Game Info modal: 3 tabs (Paytable / How to Play / Features) +
  RTP / Volatility / Max Win indicator card at top
- Session stats panel: spins, FS triggered, wagered, won, biggest win,
  biggest multiplier, net result, session length
- Bet history (last 50 spins) with seed verification info
- Provably-fair panel (rotate, verify, edit client seed)
- Status row states: live cascade msg / AUTO N indicator /
  PLACE YOUR BET prompt / INSUFFICIENT BALANCE warning
- PWA manifest (installable as app)

### Reliability
- ErrorBoundary at app root with reload/lobby recovery
- Stale setTimeout cancellation between spins (no state-leak between bets)
- Body scroll lock on slot page (Android URL bar safety)
- Image preload + onError gradient fallback
- Refund-on-error in spin pipeline (no eaten bets if engine throws)
- Idempotent music start (no chop on every spin)
- Defensive seed validation (consumeNonce → guarded RNG init)

## Architecture quick map

| Layer | Files |
|---|---|
| RNG core | `src/lib/{sha256,fairness}.ts` |
| State hooks | `src/hooks/{useBalance,useFairness,useBetHistory,useSound,useMusic,useSessionStats}.ts` |
| Routing | `src/App.tsx` (slot routes use `SlotPageLayout`, others use `Layout`) |
| Slot view | `src/pages/slots/_shared/ImmersiveSlotView.tsx` (the big one) |
| Engine | `src/pages/slots/_shared/engine.ts` (game-agnostic) |
| Game configs | `src/pages/slots/{gates-of-olympus,sweet-bonanza}/config.ts` |
| Symbols | `src/pages/slots/{gates-of-olympus,sweet-bonanza}/symbols.tsx` |
| UI primitives | `src/components/ui/{icons,Modal,CountUp,CoinShower}.tsx` |
| Layouts | `src/components/layout/{GameProvider,Layout,SlotPageLayout,Sidebar,TopBar,GameCard,ComingSoon}.tsx` |
| Modals | `src/components/{SessionStatsPanel}.tsx` + `src/components/fairness/{FairnessPanel,BetHistoryTable}.tsx` |

### Tunable arch coordinates
`/slots/gates-of-olympus?tune=1` opens drag-sliders for the arch insets
so anyone can dial in the grid placement live and report the values.
Hard-coded defaults in `src/pages/slots/gates-of-olympus/index.tsx`:
`archInsets={{ left: 22, top: 45, width: 56 }}`.

## Originals (Stake-style)

19 Stake-style games deployed, all using the shared `OriginalPageLayout`
(back / title / balance + refill / menu) and the provably-fair RNG via
`fairness.consumeNonce()`. Each one is in `src/pages/originals/<name>/`
with `engine.ts` (game logic) + `index.tsx` (UI).

| Game      | RTP    | Mechanic |
|-----------|--------|----------|
| Dice      | 99%    | Slider over/under target, editable multiplier/chance, 50/50 presets |
| Limbo     | 99%    | Set target multiplier, RNG must beat it |
| Mines     | 99%    | 5×5 grid, reveal gems, dodge mines, "Pick Random", profit-on-cash stat |
| Crash     | 99%    | Multiplier rises, auto-cashout, bust-history bar chart |
| Plinko    | ~99%   | 8-16 rows × Low/Med/High risk, animated ball, bucket flash |
| Wheel     | ~99%   | 10/20/30/40/50 segments × Low/Med/High risk, spinning SVG |
| Hilo      | 99%    | Higher/lower cards, skip card, cashout streak |
| Tower     | 99%    | 9-row climb, 5 difficulties (easy → master), skull avoid |
| Keno      | ~99%   | 40-number 8×5 grid, pick 1-10, draw 10, 4 risk tables |
| Roulette  | 97.3%  | European single-0, multi-bet board, all standard outside bets |
| Blackjack | 99.5%  | Hit/Stand/Double, dealer stands on 17, BJ pays 3:2 |
| Baccarat  | ~98.9% | Punto Banco rules, multi-bet (Player/Banker/Tie) |
| Diamonds  | 99%    | 5-gem match, 7-tier rarity, 1000× max payout |
| Video Poker | 99.5% | Jacks or Better 5-card draw with hold/draw + paytable |
| Coin Flip | 99%    | Streak heads/tails at 1.98× per correct call, cashout anytime |
| Pump      | 99%    | Inflate balloon, each pump pop-risk vs growth (Easy 4% → Expert 50%) |
| 3 Cups    | 99%    | Find the ball under 3/4/5 cups (×2.97/3.96/4.95 payouts) |
| Mini Slot | ~96%   | Classic 3-reel single-line, 5 weighted symbols, 2-cherry consolation |
| Race      | 99%    | Pick 1 of 4 horses, 3.96× payout, animated race reveal |

All games that make sense (Dice/Limbo/Plinko/Wheel/Crash/Diamonds) ship
with **Manual / Auto tabs** and auto-bet config (count + stop-on-profit
+ stop-on-loss). Mines/Tower/Hilo/Blackjack are interactive single-round
games where auto-bet doesn't apply. Roulette/Baccarat have multi-bet
boards instead.

Shared components in `src/pages/originals/_shared/`:
- `BetInput` — bet amount + ½ / 2× / Max
- `AutoBetController` — Manual / Auto tabs, AutoConfigFields, live
  progress display, `useAutoBetRunner` hook

## Likely next priorities

1. **Sweet Bonanza immersive port** — currently uses the old card layout.
2. **More Slots** — Big Bass Bonanza, Sugar Rush, Wanted Dead or a Wild
   placeholders are in the lobby ready to wire up.
3. **More Originals** — Slide, Coin Flip, Video Poker, Pachinko remain.
4. **Real ball physics in Plinko** (currently keyframe interpolation).
5. **Volume sliders** — separate SFX + music sliders.
6. **Image optimization** — Olympus backdrop is 2.4MB PNG; could WebP.
7. **Game info modals** — per-game How to Play / Rules accessible from menu.

## How to deploy
Vercel auto-deploys on every push. Lobby URL is the production URL
once the branch is merged to `main`. See `README.md` for setup.

## Testing
- `npm test` — vitest, 20 tests
- `npm run dev` — local at :5173
- `npm run build` — production bundle in `dist/`
