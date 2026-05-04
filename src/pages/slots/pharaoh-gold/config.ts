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
