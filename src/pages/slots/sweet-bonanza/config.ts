import type { SlotConfig } from '../_shared/types';

/**
 * Sweet Bonanza-style configuration.
 *
 * Symbols: red heart (top), purple grape, green watermelon (high tier);
 *          blue blueberries, plum, green apple (mid tier);
 *          banana yellow (lowest paying); lollipop scatter; multiplier bombs.
 *
 * Pay table values mirror Pragmatic's published tier ratios for 8-9 / 10-11 / 12+.
 * Weights are balanced for ~96% RTP smoke (acceptable band 95–98%).
 */

export const sweetBonanzaConfig: SlotConfig = {
  id: 'sweet-bonanza',
  name: 'Sweet Bonanza',
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'lollipop',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 10,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    {
      id: 'heart',
      tier: 'top',
      label: 'red heart',
      payout: { 8: 10, 10: 25, 12: 50 },
    },
    {
      id: 'grape',
      tier: 'high',
      label: 'grapes',
      payout: { 8: 2.5, 10: 5, 12: 15 },
    },
    {
      id: 'watermelon',
      tier: 'high',
      label: 'watermelon',
      payout: { 8: 2.1, 10: 4.5, 12: 12 },
    },
    {
      id: 'plum',
      tier: 'high',
      label: 'plum',
      payout: { 8: 1.8, 10: 4, 12: 10 },
    },
    {
      id: 'apple',
      tier: 'mid',
      label: 'apple',
      payout: { 8: 1.5, 10: 2, 12: 8 },
    },
    {
      id: 'blueberry',
      tier: 'mid',
      label: 'blueberries',
      payout: { 8: 1.2, 10: 1.6, 12: 4.8 },
    },
    {
      id: 'banana',
      tier: 'low',
      label: 'banana',
      payout: { 8: 1, 10: 1.4, 12: 3.6 },
    },
    {
      id: 'candy-pink',
      tier: 'low',
      label: 'pink candy',
      payout: { 8: 0.8, 10: 1.2, 12: 2.4 },
    },
    {
      id: 'candy-blue',
      tier: 'low',
      label: 'blue candy',
      payout: { 8: 0.6, 10: 0.9, 12: 2 },
    },
    {
      id: 'lollipop',
      tier: 'scatter',
      label: 'lollipop',
      payout: { 4: 3, 5: 5, 6: 100 },
    },
  ],
  // Order matches symbols[] above.
  // Heart, grape, watermelon, plum, apple, blueberry, banana, pink, blue, lollipop
  // Calibrated for ~96.5% RTP and ~0.4% scatter trigger rate.
  weightsBase: [4, 8, 9, 10, 12, 14, 16, 16, 18, 2.0],
  weightsFree: [6, 9, 10, 12, 13, 14, 14, 14, 14, 2.6],
  multiplierTableBase: {
    pPerTumble: 0.13,
    maxPerTumble: 2,
    values: [
      [2, 22], [3, 18], [4, 16], [5, 14], [6, 12], [8, 10], [10, 9],
      [12, 7], [15, 6], [20, 5], [25, 4], [50, 3], [100, 1.5], [500, 0.20],
    ],
  },
  multiplierTableFree: {
    pPerTumble: 0.40,
    maxPerTumble: 3,
    values: [
      [2, 18], [3, 16], [4, 14], [5, 12], [6, 11], [8, 10], [10, 9],
      [15, 8], [20, 7], [25, 6], [50, 5], [100, 3], [200, 1.2], [500, 0.30],
    ],
  },
  theme: {
    accent: '#ff5fa2',
    glow: 'rgba(255,95,162,0.55)',
    gridClass: 'grid-bg-bonanza',
  },
};
