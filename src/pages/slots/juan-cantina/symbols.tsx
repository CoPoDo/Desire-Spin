/** Juan's Cantina symbols — original SVG art for the high-tier characters
 *  (Juan, sombrero, guitar, tequila) and emoji-on-tinted-disc for low/mid
 *  tier. Maraca scatter pulses with a gold halo.
 */
import { motion } from 'framer-motion';

const wrap = 'juan-sym';
const heroWrap = 'juan-sym juan-sym-hero';
const scatterWrap = 'juan-sym juan-sym-scatter';

/** Juan the Mariachi — the top-tier character. Drawn as a stylised
 *  portrait: dark hair / mustache, pinkish-tan face, bold sombrero
 *  and red bandana.
 */
export function JuanSymbol() {
  return (
    <div className={heroWrap} style={{ color: '#ffae50' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="juan-hat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="55%" stopColor="#c8932e" />
            <stop offset="100%" stopColor="#5a3a04" />
          </linearGradient>
          <radialGradient id="juan-face" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#ffe4c4" />
            <stop offset="60%" stopColor="#d4985f" />
            <stop offset="100%" stopColor="#7a4a2a" />
          </radialGradient>
          <linearGradient id="juan-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8102e" />
            <stop offset="50%" stopColor="#ff5560" />
            <stop offset="100%" stopColor="#7a0810" />
          </linearGradient>
        </defs>
        {/* Sombrero brim (huge oval) */}
        <ellipse cx="32" cy="22" rx="26" ry="6" fill="url(#juan-hat)" stroke="#5a3a04" strokeWidth="1.2" />
        {/* Sombrero crown */}
        <path d="M22 22 Q 22 6 32 6 Q 42 6 42 22 Z" fill="url(#juan-hat)" stroke="#5a3a04" strokeWidth="1.2" />
        {/* Hat band (red) */}
        <rect x="22" y="20" width="20" height="3" fill="url(#juan-band)" stroke="rgba(122,8,16,.6)" strokeWidth=".4" />
        {/* Hat stitching detail */}
        <path d="M8 22 Q 32 28 56 22" fill="none" stroke="#5a3a04" strokeWidth=".5" opacity=".6" />
        {/* Face */}
        <ellipse cx="32" cy="36" rx="11" ry="13" fill="url(#juan-face)" stroke="#5a3a1a" strokeWidth=".8" />
        {/* Eyes */}
        <ellipse cx="28" cy="34" rx="1.2" ry="1.5" fill="#1a1f29" />
        <ellipse cx="36" cy="34" rx="1.2" ry="1.5" fill="#1a1f29" />
        {/* Eye shines */}
        <circle cx="27.5" cy="33.5" r=".4" fill="#fff" />
        <circle cx="35.5" cy="33.5" r=".4" fill="#fff" />
        {/* Mustache (curly) */}
        <path d="M24 42 Q 28 40 32 42 Q 36 40 40 42 Q 38 46 32 44 Q 26 46 24 42 Z" fill="#1a1f29" stroke="#000" strokeWidth=".4" />
        <path d="M22 42 Q 24 39 27 41" fill="none" stroke="#1a1f29" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M42 42 Q 40 39 37 41" fill="none" stroke="#1a1f29" strokeWidth="1.2" strokeLinecap="round" />
        {/* Mouth (smile) */}
        <path d="M28 47 Q 32 49 36 47" fill="none" stroke="#5a081a" strokeWidth=".8" strokeLinecap="round" />
        {/* Bandana / shirt collar */}
        <path d="M20 50 L 32 56 L 44 50 L 44 60 L 20 60 Z" fill="url(#juan-band)" stroke="#5a081a" strokeWidth=".7" />
        {/* Shirt buttons */}
        <circle cx="32" cy="56" r=".7" fill="#ffd166" />
        <circle cx="32" cy="58.5" r=".7" fill="#ffd166" />
      </svg>
    </div>
  );
}

export function SombreroSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="som-hat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5c4" />
            <stop offset="40%" stopColor="#ffd166" />
            <stop offset="80%" stopColor="#a8761a" />
            <stop offset="100%" stopColor="#3a2a04" />
          </linearGradient>
          <linearGradient id="som-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#c8102e" />
            <stop offset="50%" stopColor="#ff5560" />
            <stop offset="100%" stopColor="#7a0810" />
          </linearGradient>
        </defs>
        {/* Brim */}
        <ellipse cx="32" cy="40" rx="28" ry="10" fill="url(#som-hat)" stroke="#3a2a04" strokeWidth="1.2" />
        {/* Brim shadow */}
        <ellipse cx="32" cy="42" rx="26" ry="2" fill="rgba(0,0,0,.3)" />
        {/* Crown (wider, traditional cone) */}
        <path d="M22 40 Q 16 14 32 10 Q 48 14 42 40 Z" fill="url(#som-hat)" stroke="#3a2a04" strokeWidth="1.2" />
        {/* Hat band */}
        <path d="M21 38 Q 32 36 43 38 L 43 33 Q 32 31 21 33 Z" fill="url(#som-band)" stroke="#5a081a" strokeWidth=".5" />
        {/* Decorative pompoms hanging */}
        <circle cx="6" cy="40" r="2.5" fill="#c8102e" />
        <circle cx="58" cy="40" r="2.5" fill="#1fff7a" />
        <circle cx="4" cy="44" r="1.5" fill="#ffd166" />
        <circle cx="60" cy="44" r="1.5" fill="#5fb8ff" />
        {/* Embroidery stitching */}
        <path d="M14 38 Q 32 32 50 38" fill="none" stroke="#5a3a04" strokeWidth=".6" opacity=".55" />
        {/* Top highlight */}
        <ellipse cx="28" cy="20" rx="3" ry="6" fill="rgba(255,255,255,.45)" />
      </svg>
    </div>
  );
}

export function GuitarSymbol() {
  return (
    <div className={wrap} style={{ color: '#c8932e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="gtr-body" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fff0c4" />
            <stop offset="40%" stopColor="#d8932e" />
            <stop offset="80%" stopColor="#7a4a04" />
            <stop offset="100%" stopColor="#2a1a04" />
          </radialGradient>
        </defs>
        {/* Lower bout (big curve) */}
        <ellipse cx="32" cy="44" rx="16" ry="14" fill="url(#gtr-body)" stroke="#2a1a04" strokeWidth="1" />
        {/* Upper bout (smaller) */}
        <ellipse cx="32" cy="28" rx="10" ry="8" fill="url(#gtr-body)" stroke="#2a1a04" strokeWidth="1" />
        {/* Sound hole */}
        <circle cx="32" cy="42" r="4" fill="#1a0a04" stroke="#5a3a04" strokeWidth=".8" />
        <circle cx="32" cy="42" r="3" fill="none" stroke="rgba(255,209,102,.4)" strokeWidth=".5" />
        {/* Bridge */}
        <rect x="26" y="48" width="12" height="2" fill="#5a3a04" />
        {/* Strings */}
        {[28, 30, 32, 34, 36].map((x, i) => (
          <line key={i} x1={x} y1="14" x2={x} y2="50" stroke="#fff5c4" strokeWidth=".4" opacity=".8" />
        ))}
        {/* Neck */}
        <rect x="29" y="6" width="6" height="14" fill="#3a1a04" stroke="#5a3a04" strokeWidth=".7" />
        {/* Headstock */}
        <rect x="27" y="3" width="10" height="5" rx="1" fill="#3a1a04" stroke="#5a3a04" strokeWidth=".7" />
        {/* Tuning pegs */}
        {[28, 32, 36].map((x, i) => (
          <circle key={i} cx={x} cy="5.5" r=".8" fill="#ffd166" />
        ))}
        {/* Fret markers */}
        <line x1="29" y1="11" x2="35" y2="11" stroke="rgba(255,209,102,.6)" strokeWidth=".4" />
        <line x1="29" y1="16" x2="35" y2="16" stroke="rgba(255,209,102,.6)" strokeWidth=".4" />
        {/* Body highlight */}
        <ellipse cx="24" cy="36" rx="3" ry="6" fill="rgba(255,255,255,.35)" />
      </svg>
    </div>
  );
}

export function TequilaSymbol() {
  return (
    <div className={wrap} style={{ color: '#fff5c4' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="tq-bottle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3d4ff" />
            <stop offset="40%" stopColor="#5fb8ff" />
            <stop offset="100%" stopColor="#0a3a6a" />
          </linearGradient>
          <linearGradient id="tq-liquid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5c4" />
            <stop offset="100%" stopColor="#c8932e" />
          </linearGradient>
        </defs>
        {/* Bottle body */}
        <path d="M22 26 L 22 52 Q 22 58 32 58 Q 42 58 42 52 L 42 26 Z" fill="url(#tq-bottle)" stroke="#0a3a6a" strokeWidth=".8" />
        {/* Bottle neck */}
        <rect x="28" y="14" width="8" height="14" fill="url(#tq-bottle)" stroke="#0a3a6a" strokeWidth=".8" />
        {/* Bottle cap */}
        <rect x="27" y="10" width="10" height="5" rx="1" fill="#5a3a04" stroke="#3a1a04" strokeWidth=".7" />
        <rect x="28" y="11" width="8" height="1" fill="#ffd166" />
        {/* Liquid level (golden tequila) */}
        <path d="M23 36 L 23 52 Q 23 57 32 57 Q 41 57 41 52 L 41 36 Z" fill="url(#tq-liquid)" opacity=".85" />
        {/* Highlight */}
        <path d="M25 32 L 25 50" stroke="rgba(255,255,255,.6)" strokeWidth="1.5" strokeLinecap="round" />
        {/* Label */}
        <rect x="24" y="40" width="16" height="10" fill="#fff5e0" stroke="#5a3a04" strokeWidth=".6" />
        <text x="32" y="46" textAnchor="middle" fontSize="3.5" fontFamily="serif" fontWeight="700" fill="#5a3a04">TEQUILA</text>
        <text x="32" y="49.5" textAnchor="middle" fontSize="2.4" fontFamily="serif" fill="#7a4a04">Añejo</text>
        {/* Lime wedge on rim */}
        <path d="M37 14 Q 42 12 44 16 Q 42 20 37 16 Z" fill="#1fff7a" stroke="#0a3a14" strokeWidth=".4" />
      </svg>
    </div>
  );
}

const SYMBOL_COLOR: Record<string, string> = {
  chilli: '#ff5560',
  taco:   '#ffae50',
  lime:   '#1fff7a',
  cactus: '#5a8a3c',
  skull:  '#fff5fb',
};

const SYMBOL_EMOJI: Record<string, string> = {
  chilli: '🌶️',
  taco:   '🌮',
  lime:   '🍋',
  cactus: '🌵',
  skull:  '💀',
};

function makeEmojiSymbol(id: string) {
  const color = SYMBOL_COLOR[id] ?? '#ffae50';
  const emoji = SYMBOL_EMOJI[id] ?? '?';
  return function EmojiSymbol() {
    return (
      <div className={wrap} style={{ color }}>
        <div className="relative w-full h-full flex items-center justify-center">
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
              filter: `drop-shadow(0 4px 6px rgba(0,0,0,.6)) drop-shadow(0 0 8px ${color}88)`,
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

export const ChilliSymbol = makeEmojiSymbol('chilli');
export const TacoSymbol = makeEmojiSymbol('taco');
export const LimeSymbol = makeEmojiSymbol('lime');
export const CactusSymbol = makeEmojiSymbol('cactus');
export const SkullSymbol = makeEmojiSymbol('skull');

export function MaracaSymbol() {
  return (
    <div className={scatterWrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="mar-bowl" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#fff5c4" />
            <stop offset="20%" stopColor="#ffd166" />
            <stop offset="55%" stopColor="#c8932e" />
            <stop offset="85%" stopColor="#7a4a04" />
            <stop offset="100%" stopColor="#2a1a04" />
          </radialGradient>
        </defs>
        {/* Halo ring */}
        <circle cx="32" cy="28" r="22" fill="rgba(255,200,80,.18)" />
        {/* Maraca bowl (egg-shape, slightly tilted) */}
        <ellipse cx="32" cy="26" rx="14" ry="16" fill="url(#mar-bowl)" stroke="#3a1a04" strokeWidth="1" />
        {/* Decorative band */}
        <path d="M19 30 Q 32 34 45 30" fill="none" stroke="#c8102e" strokeWidth="1.5" />
        <path d="M19 33 Q 32 37 45 33" fill="none" stroke="#1fff7a" strokeWidth="1" />
        {/* Decorative dots */}
        <circle cx="24" cy="22" r="1.5" fill="#c8102e" />
        <circle cx="32" cy="18" r="1.5" fill="#5fb8ff" />
        <circle cx="40" cy="22" r="1.5" fill="#1fff7a" />
        <circle cx="28" cy="28" r="1.2" fill="#a78bfa" />
        <circle cx="36" cy="28" r="1.2" fill="#c042b8" />
        {/* Highlight */}
        <ellipse cx="26" cy="20" rx="4" ry="2.5" fill="rgba(255,255,255,.55)" />
        {/* Handle */}
        <rect x="29.5" y="40" width="5" height="18" rx="1.5" fill="url(#mar-bowl)" stroke="#3a1a04" strokeWidth=".8" />
        {/* Handle band */}
        <rect x="29" y="48" width="6" height="2" fill="#c8102e" stroke="#5a081a" strokeWidth=".4" />
      </svg>
    </div>
  );
}

export function MultiplierSymbol({ value }: { value: number; accent?: string }) {
  const tier = value >= 100 ? 'huge' : value >= 25 ? 'big' : 'normal';
  return (
    <motion.div
      className="w-full h-full flex items-center justify-center"
      initial={{ scale: 0.5, opacity: 0, rotate: -8 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
    >
      <div className={`juan-orb ${tier !== 'normal' ? `juan-orb-${tier}` : ''}`}>
        <span className="juan-orb-text">{value}×</span>
      </div>
    </motion.div>
  );
}

export const JUAN_SYMBOL_MAP: Record<string, React.FC> = {
  juan: JuanSymbol,
  sombrero: SombreroSymbol,
  guitar: GuitarSymbol,
  tequila: TequilaSymbol,
  chilli: ChilliSymbol,
  taco: TacoSymbol,
  lime: LimeSymbol,
  cactus: CactusSymbol,
  skull: SkullSymbol,
  maraca: MaracaSymbol,
};
