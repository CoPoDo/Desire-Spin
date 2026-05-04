import type { SlotConfig } from '../_shared/types';

/** Wanted Dead or a Wild — gritty Western-themed pay-anywhere slot.
 *
 *  Hero is the masked outlaw (top pay). Theme: dusty saloon town at
 *  twilight, bullet-riddled wanted posters, revolvers, whiskey, sheriff
 *  badges. Scatter is the wanted poster (a star backed by parchment).
 */

export const wantedWildConfig: SlotConfig = {
  id: 'wanted-wild',
  name: 'Wanted Dead or a Wild',
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'poster',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 10,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    { id: 'outlaw',    tier: 'top',  label: 'Masked Outlaw',  payout: { 8: 18, 10: 35, 12: 70 } },
    { id: 'sheriff',   tier: 'high', label: 'Sheriff badge',  payout: { 8: 4.5, 10: 9, 12: 24 } },
    { id: 'revolver',  tier: 'high', label: 'revolver',       payout: { 8: 3.4, 10: 7, 12: 18 } },
    { id: 'whiskey',   tier: 'high', label: 'whiskey bottle', payout: { 8: 2.6, 10: 5, 12: 13 } },
    { id: 'horseshoe', tier: 'mid',  label: 'horseshoe',      payout: { 8: 2,   10: 3.4, 12: 9 } },
    { id: 'boot',      tier: 'mid',  label: 'cowboy boot',    payout: { 8: 1.4, 10: 2.4, 12: 6 } },
    { id: 'hat',       tier: 'low',  label: 'cowboy hat',     payout: { 8: 1,   10: 1.6, 12: 4 } },
    { id: 'card',      tier: 'low',  label: 'playing card',   payout: { 8: 0.8, 10: 1.2, 12: 3 } },
    { id: 'coin',      tier: 'low',  label: 'gold coin',      payout: { 8: 0.6, 10: 1.0, 12: 2.4 } },
    { id: 'poster',    tier: 'scatter', label: 'wanted poster', payout: { 4: 4, 5: 10, 6: 100 } },
  ],
  weightsBase: [3, 7, 8, 9, 12, 14, 16, 17, 18, 2.0],
  weightsFree: [5, 8, 9, 11, 13, 14, 14, 14, 14, 2.6],
  // Audited multiplier weights — same low-skew distribution.
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
    accent: '#c8932e', // rusty gold
    glow: 'rgba(200,147,46,0.6)',
    gridClass: 'grid-bg-wanted',
    cellClass: 'cell-wanted',
    // Real Wanted Dead or a Wild (Hacksaw) is a reel slot — the reels
    // physically scroll vertically with motion blur during the spin
    // animation, then stop sequentially. Our app uses the tumble
    // engine, so we fake reel-scroll with a vertical scaleY smear +
    // small symmetric blur + upward translate. Reads as "reels
    // streaking upward fast" rather than the universal blur.
    prespinStyle: 'reel-spin',
  },
};
