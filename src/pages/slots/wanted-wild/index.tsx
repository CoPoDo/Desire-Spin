import { LineSlotView } from '../_shared/LineSlotView';
import { makePaylines, type LineSlotProfile } from '../_shared/lineEngine';
import { WANTED_SYMBOL_MAP } from './symbols';
import { WantedScene } from './Scene';

export const WANTED_PROFILE: LineSlotProfile = {
  id: 'wanted-wild', cols: 5, rows: 5, paylines: makePaylines(5, 5, 15), maxWin: 12500,
  scatterId: 'poster', wildId: 'wild', feature: 'wanted', freeSpins: 10,
  symbols: [
    { id: 'outlaw', weight: 3, freeWeight: 4, pay: { 3: 20, 4: 100, 5: 500 } },
    { id: 'sheriff', weight: 6, pay: { 3: 10, 4: 40, 5: 150 } },
    { id: 'revolver', weight: 8, pay: { 3: 6, 4: 20, 5: 80 } },
    { id: 'whiskey', weight: 10, pay: { 3: 4, 4: 12, 5: 40 } },
    { id: 'horseshoe', weight: 12, pay: { 3: 2.5, 4: 7, 5: 20 } },
    { id: 'boot', weight: 14, pay: { 3: 2, 4: 5, 5: 15 } },
    { id: 'hat', weight: 16, pay: { 3: 1.5, 4: 3, 5: 10 } },
    { id: 'card', weight: 18, pay: { 3: 1.2, 4: 2.5, 5: 7 } },
    { id: 'coin', weight: 20, pay: { 3: 1, 4: 2, 5: 5 } },
    { id: 'poster', weight: 1.2, freeWeight: 1.5, scatter: true },
    { id: 'vs', weight: 0.9, freeWeight: 1.5 },
    { id: 'wild', weight: 0, freeWeight: 0.5, wild: true },
  ],
};

export function WantedWild() {
  return <LineSlotView profile={WANTED_PROFILE} title="Wanted Dead or a Wild" subtitle="5×5 · 15 paylines · DuelReels" scene={<WantedScene />} symbolMap={WANTED_SYMBOL_MAP} accent="#e8a449" />;
}
