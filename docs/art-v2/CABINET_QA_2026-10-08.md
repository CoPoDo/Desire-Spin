# Olympus, Sugar Rush and Sweet Bonanza cabinet QA

## Visual implementation

- Original wide painted worlds and matching lossless-alpha symbol atlases. Native crop bounds are taken from each theme's checked-in atlas metadata.
- Olympus: midnight-blue carved/metal-edged cabinet, large 6×5 board left, Zeus outside the cabinet on the right.
- Sugar Rush: mint patisserie cabinet, cream 7×7 board, pink/cream fixed position marks. First win is a pale dashed spot; active multipliers are solid pink spots with their value fixed in the corner below moving candies.
- Bonanza: outdoor fruit orchard, warm fruitwood cabinet, cream 6×5 board and jewel-like painted fruit. Bomb values use native dark text over the ivory badge.
- Bet, round win, spin and tools are in one physical control rail. 44 px stepper/tool hit areas and 56–62 px spin button. Native accessible labels and visible keyboard focus.
- Each game waits for artwork to load before mounting playable controls. No engine/wallet/fairness logic was added to that loading layer.
- Lobby art matches each game's new world.

## Browser checks

Using the cloud browser against the actual Vite app at localhost:5173:

- All three desktop cabinets inspected at 1180×757.
- All three inspected in actual 320×680 iframe viewports. All reel rows and essential bet/win/spin/tool controls are visible without scrolling. The Bonanza mobile tool/stepper buttons measured 44 px high and 44–55 px wide; spin measured 56×56 px.
- Bonanza normal spin showed 6 continuous real reel strips and 30 original cells before landing. Normal and turbo rounds settled at 30 cells,0 moving strips,0 retired exit nodes.
- Sugar normal winning cascade settled at 49 cells and 0 retired nodes. Seven first-hit positions were marked without a multiplier. A later 10-spin bonus completed with 9 marked positions and 7 active 2× positions, clearly visually distinct.
- Olympus confirmed 15-spin play-money bonus completed. Its feature HUD stayed inside the cabinet below the title, clear of the app bar. It settled with 30 cells and 0 retired exits.
- Bet dialog opened by Enter and closed by Escape on mobile Bonanza. Sugar Spin activated by Enter. Ante changes total stake from 0.20 to 0.25 and can be toggled back.
- Bonus dialogs disclose the complete play-credit cost and locked stake; Cancel does not start a round.
- Autoplay start was exercised. A browser-extension metadata/protocol timeout made repeated browser-level stop inspection inconclusive; a focused regression verifies cabinet Stop clears autoplay and does not start another paid round after the current round settles.

## Mechanics bindings preserved

- Shared SpinReel and Grid motion implementation was not changed.
- Sugar candy survivors retain engine-provided keys; the fixed position layer does not move with symbols.
- Gates feature HUD follows multiplierApplied.sumOfMultipliers, resets at feature boundaries, and therefore displays the winning-feature accumulator rather than merely summing currently visible tokens.
- Existing stake, ante, autoplay, paytable, confirmation and playback sequencing remain wired.

## Checks

- TypeScript lint passed.
- Production build passed.
- Final full suite passed 301 tests across 22 files, including the additional autoplay-stop regression.
- Engine changes in this branch belong to the parallel mechanics audit, not this presentation change.
