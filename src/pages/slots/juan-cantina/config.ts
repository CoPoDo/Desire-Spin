import type { SlotConfig } from '../_shared/types';

/**
 * Juan's Cantina — Mexican mariachi fiesta tumble slot.
 *
 * Reuses the shared 6×5 cluster engine (same as Sweet Bonanza & Sugar
 * Rush). Theme: Juan the mariachi at a sun-baked desert cantina, with
 * sombrero, guitar, tequila, chilli, taco, lime, cactus, sugar skull
 * and a maraca scatter that triggers free spins.
 */

export const juanCantinaConfig: SlotConfig = {
  id: 'juan-cantina',
  name: "Juan's Cantina",
  cols: 6,
  rows: 5,
  payAnywhereThreshold: 8,
  scatterId: 'maraca',
  scatterTriggerCount: 4,
  scatterRetriggerCount: 3,
  freeSpinsAwardOnTrigger: 12,
  freeSpinsAwardOnRetrigger: 5,
  buyBonusCost: 100,
  ante: { betMultiplier: 1.25, scatterWeightBoost: 2.0 },
  multiplierFreeMode: 'sum-at-end',
  symbols: [
    { id: 'juan',     tier: 'top',  label: 'Juan the Mariachi', payout: { 8: 15, 10: 30, 12: 60 } },
    { id: 'sombrero', tier: 'high', label: 'sombrero',          payout: { 8: 4,  10: 8,  12: 22 } },
    { id: 'guitar',   tier: 'high', label: 'guitar',            payout: { 8: 3,  10: 6,  12: 16 } },
    { id: 'tequila',  tier: 'high', label: 'tequila',           payout: { 8: 2.4, 10: 5, 12: 12 } },
    { id: 'chilli',   tier: 'mid',  label: 'chilli',            payout: { 8: 1.8, 10: 3, 12: 9 } },
    { id: 'taco',     tier: 'mid',  label: 'taco',              payout: { 8: 1.4, 10: 2.4, 12: 6 } },
    { id: 'lime',     tier: 'low',  label: 'lime',              payout: { 8: 1,   10: 1.6, 12: 4 } },
    { id: 'cactus',   tier: 'low',  label: 'cactus',            payout: { 8: 0.8, 10: 1.2, 12: 3 } },
    { id: 'skull',    tier: 'low',  label: 'sugar skull',       payout: { 8: 0.6, 10: 1.0, 12: 2.4 } },
    { id: 'maraca',   tier: 'scatter', label: 'maraca',         payout: { 4: 4, 5: 10, 6: 100 } },
  ],
  // Order matches symbols[] above.
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
    accent: '#ffae50', // mariachi gold-orange
    glow: 'rgba(255,174,80,0.6)',
    gridClass: 'grid-bg-juan',
    cellClass: 'cell-juan',
    // Cantina is a tumble slot mechanically (cousin of Sweet Bonanza), so
    // the spin-start transition is the same gravity fall-out — old fiesta
    // symbols drop down off the grid, new ones cascade in from above.
    // Per-slot personality comes from the warm-dusk stage-light + papel
    // picado bunting + cactus silhouettes (see Pass 5/6) — the spin
    // transition itself stays mechanically consistent with the engine.
    prespinStyle: 'fall',
  },
};
