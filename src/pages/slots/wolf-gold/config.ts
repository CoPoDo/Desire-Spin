import type { SlotConfig } from '../_shared/types';

/** Wolf Gold — Southwest wildlife theme. Wolf top-pay, full-moon
 *  tableau with eagles, cougars, mustangs. Coyote scatter. */

export const wolfGoldConfig: SlotConfig = {
  id: 'wolf-gold',
  name: 'Wolf Gold',
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
  multiplierTableBase: {
    pPerTumble: 0.04,
    maxPerTumble: 2,
    values: [
      [2, 10], [3, 9], [4, 8], [5, 7], [6, 6.5], [8, 6], [10, 6],
      [12, 5.5], [15, 5], [20, 5], [25, 5], [50, 4.5], [100, 3], [500, 0.7],
    ],
  },
  multiplierTableFree: {
    pPerTumble: 0.30,
    maxPerTumble: 3,
    values: [
      [2, 12], [3, 11], [4, 10], [5, 9], [6, 8], [8, 7.5], [10, 7],
      [15, 6.5], [20, 6], [25, 5.5], [50, 5], [100, 4], [200, 2], [500, 0.6],
    ],
  },
  theme: {
    accent: '#a78bfa',
    glow: 'rgba(167,139,250,0.65)',
    gridClass: 'grid-bg-wolf',
    cellClass: 'cell-wolf',
  },
};
