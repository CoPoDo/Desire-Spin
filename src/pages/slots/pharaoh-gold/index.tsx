import { ArtworkGate } from '../_shared/ArtworkGate';
import { LineSlotView } from '../_shared/LineSlotView';
import { useMemo, useState } from 'react';
import { pharaohProfileForLines, type PharaohLines } from './profile';
import { PHARAOH_SYMBOL_MAP, PHARAOH_ATLAS, PHARAOH_WORLD, PHARAOH_COBRA } from './symbols';
import { PharaohScene } from './Scene';

export { PHARAOH_PROFILE, pharaohProfileForLines } from './profile';

const PHARAOH_ASSETS = [PHARAOH_ATLAS, PHARAOH_WORLD, PHARAOH_COBRA];
export function PharaohGold() {
  const [lines, setLines] = useState<PharaohLines>(3);
  const profile = useMemo(() => pharaohProfileForLines(lines), [lines]);
  return <ArtworkGate title="Pharaoh's Gold" assets={PHARAOH_ASSETS}><LineSlotView profile={profile} title="Pharaoh's Gold" subtitle={`3 reels · ${lines} active ${lines === 1 ? 'line' : 'lines'} · Local probabilities`} scene={<PharaohScene />} symbolMap={PHARAOH_SYMBOL_MAP} accent="#e6be70" extraControls={(busy) => <label className="line-count-control">Lines<select aria-label="Active paylines" value={lines} disabled={busy} onChange={(event) => setLines(Number(event.target.value) as PharaohLines)}><option value={1}>1 line</option><option value={2}>2 lines</option><option value={3}>3 lines</option></select></label>} /></ArtworkGate>;
}
