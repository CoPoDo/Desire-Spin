# Cascade and sound follow-up

The user reported that initial reel landing now looked good but replacement
symbols after a win still appeared to spawn, and requested replacement of the
old audio/voices. This follow-up changes presentation only; payout math, RNG,
wallet transactions, history revisions and saved balances are unchanged.

## Physical cascade implementation

Olympus and Sweet Bonanza use the shared `Grid`; Sugar Rush uses the same new
`cascadeMotion` clock over its fixed multiplier-position layer. The renderer no
longer combines Framer layout projection and calc-based new-cell transforms.

1. Winners clear over140ms. Their bounded exit copies do not enter layout.
2. Surviving keyed DOM nodes remain at their exact previous row during clearing.
3. New nodes are positioned at rows-1,-2,etc above their column, before paint.
4. A single requestAnimationFrame clock moves survivors and arrivals by whole
   responsive row strides, with column stagger and gravity acceleration.
5. A small bounded landing settle ends at exact zero translation. No fade-in or
   final outcome-board replacement is used. Clear/fall/land sound cues come from
   this same clock, rather than guessed timers.

Turbo scales that timeline and is selected before a round; its control is locked
during playback so a mid-fall speed change cannot snap a symbol to its target. Reduced motion/skip immediately settles the same
outcome; unmount cancels frames. Sugar waits for the complete fall before showing
its next winning cluster or updating marked/multiplied positions.

## Evidence recorded during development

- Focused motion/control tests passed34/34, including actual inline start and
  intermediate transforms, persistent DOM identity, whole-row geometry, off-board
  arrivals, column ordering, normal/turbo/reduced motion, StrictMode replay,
  unmount cancellation, and exactly ordered audio phase callbacks.
- Native Chromium, actual Olympus free-spin sequence: a718-frame DOM-geometry
  recording contained20 moving tracks (8 arrivals,12 survivors). Every arrival
  began completely above the board; all nodes retained identity, had multiple
  intermediate positions, and settled.22 sampled browser frames contained falls.
- A separate base-game win recorded24 falling frames. These are measured browser
  geometry samples, not an inference from final result keys.
- A native screenshot sequence was encoded at its actual capture timestamps.
  The screen tool captures approximately6frames/second. This preview illustrates
  the real clear/fall/settle sequence but is not a full-framerate motion recording.
- A320×680 actual iframe viewport showed the bonus/turbo/retrigger controls and
  board fully visible. Additional mobile winning-cascade coverage is recorded
  below when completed; a no-win observation is not counted as a cascade pass.

- Olympus320×680 turbo winning cascade:719 recorded frames,18 moving tracks
  (9 arrivals/9 survivors), all arrivals above the board, stable identities,
  intermediate movement and complete landings.
- Sweet Bonanza320×680:716 recorded frames,61 moving tracks across repeated
  cascades (26 arrivals/35 survivors); all four position/identity checks passed.
- Sugar Rush320×680: a real sequence exposed a first-tumble index-0 bug that
  marked all49 cells incoming. Corrected the frame arrival list and made the
  planner count only genuinely new keys. The repeated final run recorded717
  frames/158 moving tracks (121 arrivals/37 survivors), all four checks passed.
  The capture includes whole-board free-spin entries as well as partial tumbles.
- Global/per-game audio controls were exercised in the320px game menu: scrolling,
  master mute/unmute, separate game mix and restoring global mix. Minimum input
  target heights were then raised to44px. No listening claim is inferred from UI.

The temporary observation harness only records rendered DOM geometry and node
identity. It does not set outcomes, modify RNG/state, or replace game controls.
It is ignored locally and is not shipped.

## Audio

See `audio/README.md` for media provenance, rendering, lifecycle, licenses and
listening limits. The old oscillator palette and pitch-shifted deviceTTS are
replaced. The user listened to candidates and preferred the expression-controlled
second Olympus voice; final narration follows that direction. No actor likeness
or provider recordings were copied.

## Release checks

The aggregate check passed454 tests across34 files, TypeScript and the production
build. Final publication verification is recorded after the last control safeguard
check.191 MP3 assets passed decode/hash/level checks. No new dependencies were
added, and no payout or accounting engine was changed.
