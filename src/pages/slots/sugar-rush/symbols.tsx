/** Sugar Rush dessert-themed symbols. Lightweight emoji-on-tinted-disc
 *  approach (vs Sweet Bonanza's full SVG art) so this slot ships quickly
 *  while still feeling distinct. */
import { motion } from 'framer-motion';

const wrap = 'bonanza-sym';
const scatterWrap = 'bonanza-sym bonanza-sym-scatter';

const SYMBOL_COLOR: Record<string, string> = {
  donut:     '#ff7ad9',
  cupcake:   '#ffae50',
  popsicle:  '#5fb8ff',
  gingerb:   '#c8932e',
  jellybean: '#a78bfa',
  gum:       '#1fff7a',
  mint:      '#7ad6e0',
  'candy-pink': '#ff5fa2',
  'candy-blue': '#22d3ee',
  lollipop:  '#ff5fa2',
};

const SYMBOL_EMOJI: Record<string, string> = {
  donut:     '🍩',
  cupcake:   '🧁',
  popsicle:  '🍦',
  gingerb:   '🍪',
  jellybean: '🍬',
  gum:       '🟢',
  mint:      '🍃',
  'candy-pink': '🟣',
  'candy-blue': '🟦',
  lollipop:  '🍭',
};

function makeEmojiSymbol(id: string) {
  const color = SYMBOL_COLOR[id] ?? '#ff7ad9';
  const emoji = SYMBOL_EMOJI[id] ?? '?';
  return function EmojiSymbol() {
    return (
      <div
        className={wrap}
        style={{ color }}
      >
        <div
          className="relative w-full h-full flex items-center justify-center"
        >
          {/* Subtle disc backdrop tinted to symbol color so each cell
           * has the colored "candy puck" feel. */}
          <div
            className="absolute inset-2 rounded-full"
            style={{
              background:
                `radial-gradient(circle at 35% 30%, ${color}55, ${color}20 60%, transparent 80%)`,
              filter: 'blur(2px)',
            }}
          />
          <span
            className="relative select-none"
            style={{
              fontSize: '70%',
              filter: `drop-shadow(0 4px 6px rgba(0,0,0,.55)) drop-shadow(0 0 8px ${color}88)`,
              lineHeight: 1,
            }}
          >
            {emoji}
          </span>
        </div>
      </div>
    );
  };
}

export const DonutSymbol     = makeEmojiSymbol('donut');
export const CupcakeSymbol   = makeEmojiSymbol('cupcake');
export const PopsicleSymbol  = makeEmojiSymbol('popsicle');
export const GingerbSymbol   = makeEmojiSymbol('gingerb');
export const JellybeanSymbol = makeEmojiSymbol('jellybean');
export const GumSymbol       = makeEmojiSymbol('gum');
export const MintSymbol      = makeEmojiSymbol('mint');
export const PinkCandySymbol = makeEmojiSymbol('candy-pink');
export const BlueCandySymbol = makeEmojiSymbol('candy-blue');

export function LollipopSymbol() {
  return (
    <div className={scatterWrap} style={{ color: '#ff5fa2' }}>
      <div className="relative w-full h-full flex items-center justify-center">
        <div
          className="absolute inset-1 rounded-full"
          style={{
            background:
              'radial-gradient(circle at 35% 30%, rgba(255,232,244,.5), rgba(255,95,162,.2) 55%, transparent 80%)',
          }}
        />
        <span
          className="relative select-none"
          style={{
            fontSize: '78%',
            filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.55)) drop-shadow(0 0 14px rgba(255,200,230,.85))',
            lineHeight: 1,
          }}
        >
          🍭
        </span>
      </div>
    </div>
  );
}

export function MultiplierSymbol({ value }: { value: number; accent?: string }) {
  // Reuse Bonanza's tiered orb classes — same colour escalation.
  const tier =
    value >= 200 ? 'fire'
    : value >= 50  ? 'gold'
    : value >= 12  ? 'blue'
    : value >= 6   ? 'purple'
    :                'pink';
  return (
    <motion.div
      className="w-full h-full flex items-center justify-center"
      initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
    >
      <div className={`bonanza-orb bonanza-orb-${tier}`}>
        <span className="bonanza-orb-text">{value}×</span>
      </div>
    </motion.div>
  );
}

export const SUGAR_SYMBOL_MAP: Record<string, React.FC> = {
  donut: DonutSymbol,
  cupcake: CupcakeSymbol,
  popsicle: PopsicleSymbol,
  gingerb: GingerbSymbol,
  jellybean: JellybeanSymbol,
  gum: GumSymbol,
  mint: MintSymbol,
  'candy-pink': PinkCandySymbol,
  'candy-blue': BlueCandySymbol,
  lollipop: LollipopSymbol,
};
