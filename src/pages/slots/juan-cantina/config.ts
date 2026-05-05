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
  // Cantina is a Bonanza-style cousin; max-win matches the typical
  // Pragmatic headline of 5,000× displayed in the welcome splash.
  maxWinMultiplier: 5000,
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
  // Audited multiplier weights — same low-skewed distribution shape
  // as Bonanza/Olympus so Cantina's bonus pacing matches Pragmatic
  // norms (heavy 2-5×, rare 100×+).
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
