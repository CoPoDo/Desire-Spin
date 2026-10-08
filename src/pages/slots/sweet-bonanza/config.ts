import type { SlotConfig } from '../_shared/types';

/**
 * Sweet Bonanza-style configuration.
 *
 * Symbols: red heart (top), purple grape, green watermelon (high tier);
 *          blue blueberries, plum, green apple (mid tier);
 *          banana yellow (lowest paying); lollipop scatter; multiplier bombs.
 *
 * Pay table values mirror Pragmatic's published tier ratios for 8-9 / 10-11 / 12+.
 * Occurrence weights are local; no certified provider RTP is claimed.
 */

export const sweetBonanzaConfig: SlotConfig = {
  id: 'sweet-bonanza',
  name: 'Sweet Bonanza',
  // Pinned to Stake's advertised original-game 21,100× limit.
  // Other provider/operator releases advertise a different maximum.
  maxWinMultiplier: 21100,
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'lollipop',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 10,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 1.09 },
  multiplierFreeMode: 'sum-at-end',
  // Multiplier bombs are a free-spins feature in the original game.
  multiplierBaseMode: 'disabled',
  symbols: [
    { id: 'heart', tier: 'top', label: 'red heart', payout: { 8: 10, 10: 25, 12: 50 } },
    { id: 'grape', tier: 'low', label: 'grapes', payout: { 8: 0.4, 10: 0.9, 12: 4 } },
    { id: 'watermelon', tier: 'low', label: 'watermelon', payout: { 8: 0.5, 10: 1, 12: 5 } },
    { id: 'plum', tier: 'mid', label: 'plum', payout: { 8: 0.8, 10: 1.2, 12: 8 } },
    { id: 'apple', tier: 'mid', label: 'apple', payout: { 8: 1, 10: 1.5, 12: 10 } },
    { id: 'blueberry', tier: 'high', label: 'blue oval candy', payout: { 8: 1.5, 10: 2, 12: 12 } },
    { id: 'banana', tier: 'low', label: 'banana', payout: { 8: 0.25, 10: 0.75, 12: 2 } },
    { id: 'candy-pink', tier: 'high', label: 'square candy', payout: { 8: 2.5, 10: 10, 12: 25 } },
    { id: 'candy-blue', tier: 'high', label: 'pentagon candy', payout: { 8: 2, 10: 5, 12: 15 } },
    { id: 'lollipop', tier: 'scatter', label: 'lollipop', payout: {4:3,5:5,6:100} },
  ],
  // Order matches symbols[] above.
  // Heart, grape, watermelon, plum, apple, blueberry, banana, pink, blue, lollipop
  // Local symbol weights, not provider reel strips.
  weightsBase: [4, 16, 14, 12, 11, 9, 18, 6, 8, 2.25],
  weightsFree: [4, 16, 14, 12, 11, 9, 26, 6, 8, 2.6],
  // Published original-game value set; occurrence weights are local.
  // No provider PAR distribution or exact return is claimed.
  multiplierTableBase: { pPerTumble: 0, maxPerTumble: 1, values: [[2, 1]] },
  multiplierTableFree: {
    pPerTumble: 0.75,
    maxPerTumble: 3,
    values: [
      [2, 24], [3, 18], [5, 16], [8, 10], [10, 8], [12, 6], [15, 5],
      [18, 4], [20, 3], [25, 2.5], [30, 2], [35, 1.5], [50, 1.2], [100, .7],
    ],
  },
  theme: {
    accent: '#ff5fa2',
    glow: 'rgba(255,95,162,0.55)',
    gridClass: 'grid-bg-bonanza',
    cellClass: 'cell-bonanza',
    // Real Sweet Bonanza on spin start: existing candies cascade DOWN off
    // the grid, then new candies cascade in from above. No blur — tumble
    // slots don't have spinning reels. This 'fall' transition mirrors that
    // — the old grid translates downward + fades, then initialDrop fires
    // and new cells animate in from above (existing Grid behaviour).
    prespinStyle: 'fall',
  },
};
