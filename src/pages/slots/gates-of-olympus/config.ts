import type { SlotConfig } from '../_shared/types';

/**
 * Gates of Olympus-style configuration.
 *
 * Symbols: crown (top), gold ring, hourglass, chalice (high tier mystic items);
 *          red gem, purple gem, yellow gem, green gem, blue gem (mid/low tier);
 *          Zeus' lightning scatter; multiplier orbs.
 */
export const gatesOfOlympusConfig: SlotConfig = {
  id: 'gates-of-olympus',
  name: 'Gates of Olympus',
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'zeus-bolt',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 15,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    { id: 'crown', tier: 'top', label: 'crown', payout: { 8: 10, 10: 25, 12: 50 } },
    { id: 'ring', tier: 'high', label: 'ring', payout: { 8: 5, 10: 12, 12: 25 } },
    { id: 'hourglass', tier: 'high', label: 'hourglass', payout: { 8: 2.5, 10: 6, 12: 15 } },
    { id: 'chalice', tier: 'high', label: 'chalice', payout: { 8: 2, 10: 4, 12: 10 } },
    { id: 'gem-red', tier: 'mid', label: 'red gem', payout: { 8: 1, 10: 2, 12: 5 } },
    { id: 'gem-purple', tier: 'mid', label: 'purple gem', payout: { 8: 0.8, 10: 1.6, 12: 4 } },
    { id: 'gem-yellow', tier: 'low', label: 'yellow gem', payout: { 8: 0.6, 10: 1.2, 12: 3 } },
    { id: 'gem-green', tier: 'low', label: 'green gem', payout: { 8: 0.5, 10: 0.9, 12: 2.5 } },
    { id: 'gem-blue', tier: 'low', label: 'blue gem', payout: { 8: 0.3, 10: 0.7, 12: 2 } },
    { id: 'zeus-bolt', tier: 'scatter', label: 'lightning bolt', payout: { 4: 3, 5: 5, 6: 100 } },
  ],
  // Calibrated for ~96.5% RTP and ~0.5% scatter trigger rate.
  weightsBase: [4, 6, 9, 11, 12, 14, 16, 16, 18, 2.0],
  weightsFree: [6, 8, 10, 12, 13, 14, 14, 14, 14, 2.7],
  multiplierTableBase: {
    pPerTumble: 0.14,
    maxPerTumble: 2,
    values: [
      [2, 22], [3, 18], [4, 15], [5, 13], [6, 11], [8, 10], [10, 9],
      [15, 7], [20, 6], [25, 5], [50, 4], [100, 2], [250, 0.8], [500, 0.15],
    ],
  },
  multiplierTableFree: {
    pPerTumble: 0.38,
    maxPerTumble: 3,
    values: [
      [2, 22], [3, 19], [4, 16], [5, 13], [6, 11], [8, 10], [10, 9],
      [15, 7], [20, 6], [25, 5], [50, 3.5], [100, 2], [250, 0.9], [500, 0.20],
    ],
  },
  theme: {
    accent: '#ffc62a',
    glow: 'rgba(255, 198, 42, 0.55)',
    gridClass: 'grid-bg-olympus',
    cellClass: 'cell-olympus',
    stageClass: 'olympus-stage',
  },
};
