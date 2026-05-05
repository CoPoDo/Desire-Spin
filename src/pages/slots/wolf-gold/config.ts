import type { SlotConfig } from '../_shared/types';

/** Wolf Gold — Southwest wildlife theme. Wolf top-pay, full-moon
 *  tableau with eagles, cougars, mustangs. Coyote scatter. */

export const wolfGoldConfig: SlotConfig = {
  id: 'wolf-gold',
  name: 'Wolf Gold',
  // Real Wolf Gold (Pragmatic) max-win is 9,500× the bet (jackpot
  // Grand-pot triggers boost the headline above the standard 5,000×).
  maxWinMultiplier: 9500,
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'coyote',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 12,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    { id: 'wolf',    tier: 'top',  label: 'Wolf',       payout: { 8: 18, 10: 35, 12: 70 } },
    { id: 'eagle',   tier: 'high', label: 'Eagle',      payout: { 8: 4.5, 10: 9, 12: 22 } },
    { id: 'cougar',  tier: 'high', label: 'Cougar',     payout: { 8: 3.4, 10: 7, 12: 17 } },
    { id: 'mustang', tier: 'high', label: 'Mustang',    payout: { 8: 2.6, 10: 5, 12: 13 } },
    { id: 'feather', tier: 'mid',  label: 'Feather',    payout: { 8: 2,   10: 3.4, 12: 9 } },
    { id: 'arrow',   tier: 'mid',  label: 'Arrow',      payout: { 8: 1.4, 10: 2.4, 12: 6 } },
    { id: 'turquoise', tier: 'low', label: 'Turquoise', payout: { 8: 1,   10: 1.6, 12: 4 } },
    { id: 'amber',   tier: 'low',  label: 'Amber',      payout: { 8: 0.8, 10: 1.2, 12: 3 } },
    { id: 'jasper',  tier: 'low',  label: 'Jasper',     payout: { 8: 0.6, 10: 1.0, 12: 2.4 } },
    { id: 'coyote',  tier: 'scatter', label: 'Coyote',  payout: { 4: 5, 5: 12, 6: 100 } },
  ],
  weightsBase: [3, 7, 8, 9, 12, 14, 16, 17, 18, 2.0],
  weightsFree: [5, 8, 9, 11, 13, 14, 14, 14, 14, 2.6],
  // Audited multiplier weights — same low-skew distribution as Bonanza /
  // Olympus to mirror real Pragmatic orb frequency (heavy 2-5×, rare 100×+).
  multiplierTableBase: {
    pPerTumble: 0.04,
    maxPerTumble: 2,
    values: [
      [2, 22], [3, 16], [4, 13], [5, 10], [6, 7], [8, 6], [10, 5],
      [12, 4], [15, 3.5], [20, 3], [25, 2.5], [50, 1.8], [100, 1.2], [500, 0.3],
    ],
  },
  multiplierTableFree: {
    pPerTumble: 0.30,
    maxPerTumble: 3,
    values: [
      [2, 24], [3, 18], [4, 14], [5, 11], [6, 8], [8, 6], [10, 5],
      [15, 4], [20, 3], [25, 2.5], [50, 1.8], [100, 1.2], [200, 0.7], [500, 0.25],
    ],
  },
  theme: {
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.65)',
    gridClass: 'grid-bg-wolf',
    cellClass: 'cell-wolf',
    // Real Wolf Gold (Pragmatic) is a 5×3 reel slot — the reels
    // physically scroll vertically with motion blur during the spin
    // animation, then stop sequentially left-to-right (the iconic
    // Pragmatic reel-spin sound + visual). Set prespinStyle: 'reel-spin'
    // so the visual matches the real-game character rather than the
    // tumble fall-out used by Bonanza/Olympus.
    prespinStyle: 'reel-spin',
  },
};
