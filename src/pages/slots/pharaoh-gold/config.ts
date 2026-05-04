import type { SlotConfig } from '../_shared/types';

/** Pharaoh's Gold — Egyptian-themed pay-anywhere tumble slot. Hot
 *  desert palette (gold + lapis blue + carnelian red). Pharaoh top-pay,
 *  scarab beetle scatter that triggers free spins. */

export const pharaohGoldConfig: SlotConfig = {
  id: 'pharaoh-gold',
  name: "Pharaoh's Gold",
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'scarab',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 12,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    { id: 'pharaoh', tier: 'top',  label: 'Pharaoh',     payout: { 8: 18, 10: 35, 12: 70 } },
    { id: 'eye',     tier: 'high', label: 'Eye of Horus',payout: { 8: 4.5, 10: 9, 12: 22 } },
    { id: 'ankh',    tier: 'high', label: 'Ankh',        payout: { 8: 3.4, 10: 7, 12: 17 } },
    { id: 'jackal',  tier: 'high', label: 'Jackal',      payout: { 8: 2.6, 10: 5, 12: 13 } },
    { id: 'falcon',  tier: 'mid',  label: 'Falcon',      payout: { 8: 2,   10: 3.4, 12: 9 } },
    { id: 'lotus',   tier: 'mid',  label: 'Lotus',       payout: { 8: 1.4, 10: 2.4, 12: 6 } },
    { id: 'gem-blue',  tier: 'low', label: 'Lapis gem',   payout: { 8: 1,   10: 1.6, 12: 4 } },
    { id: 'gem-red',   tier: 'low', label: 'Carnelian',   payout: { 8: 0.8, 10: 1.2, 12: 3 } },
    { id: 'gem-green', tier: 'low', label: 'Malachite',   payout: { 8: 0.6, 10: 1.0, 12: 2.4 } },
    { id: 'scarab',  tier: 'scatter', label: 'Scarab',  payout: { 4: 5, 5: 12, 6: 100 } },
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
    accent: '#ffd166',
    glow: 'rgba(255,209,102,0.65)',
    gridClass: 'grid-bg-pharaoh',
    cellClass: 'cell-pharaoh',
    // Egyptian-themed Pragmatic / RTG slots (John Hunter & the Tomb of
    // the Scarab Queen, Cleocatra, Eye of Horus, Book of Ra-likes) are
    // overwhelmingly reel slots — symbols on rotating columns, not
    // tumbling cascades. Match that real-world inspiration with a
    // vertical reel-scroll smear on spin start.
    prespinStyle: 'reel-spin',
  },
};
