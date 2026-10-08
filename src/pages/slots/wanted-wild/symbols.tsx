import type { CSSProperties } from 'react';
import { SkullSymbol, TrainSymbol, DuelSymbol, DeadSymbol } from './features';

export const WANTED_ATLAS = '/art-v2/wanted/symbols-atlas.webp';
const WIDTH = 1448;
const HEIGHT = 1086;
const RECTS: Record<string, [number, number, number, number]> = {"outlaw": [95, 135, 309, 345], "sheriff": [456, 133, 652, 341], "revolver": [816, 133, 1026, 342], "whiskey": [1177, 134, 1340, 343], "horseshoe": [108, 449, 294, 640], "boot": [460, 440, 665, 640], "hat": [805, 473, 1034, 628], "card": [1176, 444, 1359, 647], "coin": [107, 750, 299, 941], "poster": [461, 742, 658, 954], "vs": [804, 748, 1024, 949], "wild": [1160, 742, 1360, 953]};

function PaintedSymbol({ id }: { id: string }) {
  const [x, y, right, bottom] = RECTS[id];
  const width = right - x, height = bottom - y;
  const ratio = width / height;
  const style: CSSProperties = { width: `${ratio >= 1 ? 91 : 91 * ratio}%`, height: `${ratio >= 1 ? 91 / ratio : 91}%` };
  return <span className={`wanted-painted-symbol wanted-symbol-${id}`} aria-hidden="true"><span className="wanted-sprite-crop" style={style}><img src={WANTED_ATLAS} alt="" draggable={false} width={WIDTH} height={HEIGHT} style={{ width: `${WIDTH / width * 100}%`, height: `${HEIGHT / height * 100}%`, maxWidth: 'none', left: `${-x / width * 100}%`, top: `${-y / height * 100}%` }} /></span>{id === 'vs' && <span className="wanted-symbol-lettering vs">VS</span>}{id === 'wild' && <span className="wanted-symbol-lettering wild">WILD</span>}{id === 'poster' && <span className="wanted-symbol-lettering poster">WANTED</span>}</span>;
}

export const WANTED_SYMBOL_MAP = {
  'outlaw': () => <PaintedSymbol id="outlaw" />,
  'sheriff': () => <PaintedSymbol id="sheriff" />,
  'revolver': () => <PaintedSymbol id="revolver" />,
  'whiskey': () => <PaintedSymbol id="whiskey" />,
  'horseshoe': () => <PaintedSymbol id="horseshoe" />,
  'boot': () => <PaintedSymbol id="boot" />,
  'hat': () => <PaintedSymbol id="hat" />,
  'card': () => <PaintedSymbol id="card" />,
  'coin': () => <PaintedSymbol id="coin" />,
  'poster': TrainSymbol,
  'duel': DuelSymbol,
  'dead': DeadSymbol,
  'skull': SkullSymbol,
  'blank': () => <span className="wanted-blank-symbol" />,
  'collection-multiplier': () => <PaintedSymbol id="coin" />,
  'vs': () => <PaintedSymbol id="vs" />,
  'wild': () => <PaintedSymbol id="wild" />,
};
