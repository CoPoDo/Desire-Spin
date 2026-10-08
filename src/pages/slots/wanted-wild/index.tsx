import { ArtworkGate } from '../_shared/ArtworkGate';
import { LineSlotView } from '../_shared/LineSlotView';
import { makePaylines, type LineSlotProfile } from '../_shared/lineEngine';
import { WANTED_SYMBOL_MAP, WANTED_ATLAS } from './symbols';
import { WantedScene, WANTED_WORLD } from './Scene';
import { WANTED_FEATURE_ATLAS } from './features';

export const WANTED_PROFILE: LineSlotProfile = {
  id: 'wanted-wild', cols: 5, rows: 5, paylines: makePaylines(5, 5, 15), maxWin: 12500,
  scatterId: 'poster', wildId: 'wild', feature: 'wanted', freeSpins: 10,
  wantedCollect: { wildProbability: .015475, multiplierProbability: .009285 },
  // Public pay values expressed per line stake (total-stake values ×15).
  // Symbol artwork, line topology and occurrence weights remain local.
  // Fixed feature-specific frequencies are sampled offline; never depend on
  // balance, past wins, session history, or the published paytable payouts.
  symbols: [
    { id: 'outlaw', weight: 3, freeWeight: 4, pay: { 3: 30, 4: 150, 5: 300 } },
    { id: 'sheriff', weight: 6, pay: { 3: 15, 4: 75, 5: 150 } },
    { id: 'revolver', weight: 8, pay: { 3: 7.5, 4: 37.5, 5: 75 } },
    { id: 'whiskey', weight: 10, pay: { 3: 7.5, 4: 37.5, 5: 75 } },
    { id: 'skull', weight: 10, pay: { 3: 7.5, 4: 37.5, 5: 75 } },
    { id: 'horseshoe', weight: 12, pay: { 3: 1.5, 4: 7.5, 5: 15 } },
    { id: 'boot', weight: 14, pay: { 3: 1.5, 4: 7.5, 5: 15 } },
    { id: 'hat', weight: 16, pay: { 3: 1.5, 4: 7.5, 5: 15 } },
    { id: 'card', weight: 18, pay: { 3: 1.5, 4: 7.5, 5: 15 } },
    { id: 'coin', weight: 20, pay: { 3: 1.5, 4: 7.5, 5: 15 } },
    { id: 'poster', weight: .9, freeWeight: 0, scatter: true, bonus: 'train-robbery' },
    { id: 'duel', weight: .35, freeWeight: 0, scatter: true, bonus: 'duel-at-dawn' },
    { id: 'dead', weight: .13, freeWeight: 0, scatter: true, bonus: 'dead-mans-hand' },
    { id: 'vs', weight: 1.05, freeWeight: 1.5, bonusWeights: { 'duel-at-dawn': 4.55 } },
    { id: 'wild', weight: 0, freeWeight: .5, bonusWeights: { 'train-robbery': 7.8 }, wild: true, pay: { 5: 300 } },
  ],
};

const WANTED_ASSETS = [WANTED_ATLAS, WANTED_WORLD, WANTED_FEATURE_ATLAS];
export function WantedWild() {
  return <ArtworkGate assets={WANTED_ASSETS} title="Wanted Dead or a Wild"><LineSlotView profile={WANTED_PROFILE} title="Wanted Dead or a Wild" subtitle="5×5 · 15 paylines · DuelReels" scene={<WantedScene />} symbolMap={WANTED_SYMBOL_MAP} accent="#e8a449" /></ArtworkGate>;
}
