import type { SlotConfig } from '../_shared/types';

/**
 * Sugar Rush — sweet-themed slot reusing the pay-anywhere tumble engine
 * from Sweet Bonanza. Real Sugar Rush uses 7×7 cluster pays with sticky
 * grid-multipliers in the BASE game (not just free spins). The emulator
 * here is a 6×5 pay-anywhere variant with the same engine — different
 * theme, different pay table tuning, but mechanically a Bonanza cousin.
 *
 * Symbols are dessert-themed: donut, cupcake, popsicle, gingerbread,
 * jellybean, and pastel candies. Lollipop scatter triggers free spins.
 */

export const sugarRushConfig: SlotConfig = {
  id: 'sugar-rush',
  name: 'Sugar Rush',
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'lollipop',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 12,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  // Real Sugar Rush has STICKY multipliers that persist across the
  // entire FS round — base-engine 'sum-at-end' approximates this since
  // it sums all visible orbs at end of each tumble chain.
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    { id: 'donut',     tier: 'top',  label: 'donut',          payout: { 8: 12, 10: 25, 12: 50 } },
    { id: 'cupcake',   tier: 'high', label: 'cupcake',        payout: { 8: 3,  10: 6,  12: 18 } },
    { id: 'popsicle',  tier: 'high', label: 'popsicle',       payout: { 8: 2.4, 10: 5, 12: 14 } },
    { id: 'gingerb',   tier: 'high', label: 'gingerbread',    payout: { 8: 2,  10: 4,  12: 11 } },
    { id: 'jellybean', tier: 'mid',  label: 'jellybean',      payout: { 8: 1.5, 10: 2.4, 12: 8 } },
    { id: 'gum',       tier: 'mid',  label: 'gumball',        payout: { 8: 1.2, 10: 1.8, 12: 5 } },
    { id: 'mint',      tier: 'low',  label: 'mint',           payout: { 8: 1,  10: 1.4, 12: 3.6 } },
    { id: 'candy-pink',tier: 'low',  label: 'pink candy',     payout: { 8: 0.8, 10: 1.2, 12: 2.4 } },
    { id: 'candy-blue',tier: 'low',  label: 'blue candy',     payout: { 8: 0.6, 10: 0.9, 12: 2 } },
    { id: 'lollipop',  tier: 'scatter', label: 'lollipop',    payout: { 4: 3, 5: 8, 6: 100 } },
  ],
  // Order matches symbols[] above.
  weightsBase: [4, 8, 9, 10, 12, 14, 16, 16, 18, 2.0],
  weightsFree: [6, 9, 10, 12, 13, 14, 14, 14, 14, 2.6],
  multiplierTableBase: {
    pPerTumble: 0.05, // Sugar Rush has slightly higher base orb rate
    maxPerTumble: 2,
    values: [
      [2, 10], [3, 9], [4, 8], [5, 7], [6, 6.5], [8, 6], [10, 6],
      [12, 5.5], [15, 5], [20, 5], [25, 5], [50, 4.5], [100, 3], [500, 0.7],
    ],
  },
  multiplierTableFree: {
    pPerTumble: 0.32, // Real Sugar Rush FS feels denser than Bonanza
    maxPerTumble: 3,
    values: [
      [2, 12], [3, 11], [4, 10], [5, 9], [6, 8], [8, 7.5], [10, 7],
      [15, 6.5], [20, 6], [25, 5.5], [50, 5], [100, 4], [200, 2], [500, 0.6],
    ],
  },
  theme: {
    accent: '#ff7ad9', // hotter pink than Bonanza's softer rose
    glow: 'rgba(255,122,217,0.6)',
    gridClass: 'grid-bg-bonanza', // reuse the bonanza grid bg for now
    cellClass: 'cell-bonanza',
  },
};
