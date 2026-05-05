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
  // Real Gates of Olympus max-win is 5,000× the bet.
  maxWinMultiplier: 5000,
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
  weightsBase: [4, 6, 9, 11, 12, 14, 16, 16, 18, 2.05],
  weightsFree: [6, 8, 10, 12, 13, 14, 14, 14, 14, 2.7],
  // Multiplier orb frequencies tuned to match real Pragmatic Olympus
  // (per public Stake-data analysis):
  //   Base: ~12-15% per tumble → ~18-22% of base spins show ≥1 multiplier
  //   Free: ~55-65% per tumble → ~88-94% of free spins show ≥1 multiplier
  // Was 9% / 45% — slightly under-frequent; bumped to 13% / 55% so Zeus
  // visibly throws orbs on roughly the same fraction of spins as the
  // real game. Multiplier value distribution unchanged (heavy 2-5×,
  // rare 100×+ — already matches real Pragmatic published weights).
  multiplierTableBase: {
    pPerTumble: 0.13,
    maxPerTumble: 2,
    values: [
      [2, 22], [3, 16], [4, 13], [5, 10], [6, 7], [8, 6], [10, 5],
      [15, 4], [20, 3.5], [25, 3], [50, 2], [100, 1.5], [250, 0.6], [500, 0.3],
    ],
  },
  multiplierTableFree: {
    pPerTumble: 0.55,
    maxPerTumble: 3,
    values: [
      [2, 24], [3, 18], [4, 14], [5, 11], [6, 8], [8, 6], [10, 5],
      [15, 4], [20, 3], [25, 2.5], [50, 1.8], [100, 1.2], [250, 0.5], [500, 0.25],
    ],
  },
  theme: {
    accent: '#ffc62a',
    glow: 'rgba(255, 198, 42, 0.55)',
    gridClass: 'grid-bg-olympus',
    cellClass: 'cell-olympus',
    stageClass: 'olympus-stage',
    // Real Gates of Olympus is a tumble slot, mechanically identical to
    // Sweet Bonanza on spin start: symbols fall down off the grid, new
    // ones cascade in from above. The Zeus-power flicker added in Pass
    // 6 (.olympus-scene::before) handles the divine atmosphere — no
    // need for a per-spin overlay; the 'fall' transition is enough.
    prespinStyle: 'fall',
  },
};
