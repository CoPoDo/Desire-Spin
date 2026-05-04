/** Pharaoh's Gold symbols — Egyptian iconography. Hero: pharaoh
 *  death-mask portrait. Scatter: scarab beetle. */
import { motion } from 'framer-motion';

const wrap = 'pharaoh-sym';
const heroWrap = 'pharaoh-sym pharaoh-sym-hero';
const scatterWrap = 'pharaoh-sym pharaoh-sym-scatter';

/** Pharaoh — golden death-mask portrait (Tutankhamun-inspired stylised). */
export function PharaohSymbol() {
  return (
    <div className={heroWrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ph-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5c4" />
            <stop offset="35%" stopColor="#ffd166" />
            <stop offset="80%" stopColor="#a8761a" />
            <stop offset="100%" stopColor="#3a2204" />
          </linearGradient>
          <linearGradient id="ph-strip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f4a8a" />
            <stop offset="100%" stopColor="#0a1f4a" />
          </linearGradient>
        </defs>
        {/* Headdress (nemes) — flared sides */}
        <path
          d="M14 24 Q 12 12 32 8 Q 52 12 50 24 L 52 38 Q 52 44 48 46 L 16 46 Q 12 44 12 38 Z"
          fill="url(#ph-gold)"
          stroke="#3a2204"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Headdress stripes (alternating gold/blue) */}
        <rect x="14" y="14" width="36" height="2" fill="url(#ph-strip)" />
        <rect x="13" y="22" width="38" height="2" fill="url(#ph-strip)" />
        <rect x="13" y="32" width="38" height="2" fill="url(#ph-strip)" />
        <rect x="14" y="40" width="36" height="2" fill="url(#ph-strip)" />
        {/* Face (in the centre) */}
        <ellipse cx="32" cy="32" rx="9" ry="11" fill="#d8a458" stroke="#5a3a0a" strokeWidth=".7" />
        {/* Eyes — large kohl-lined */}
        <ellipse cx="28" cy="30" rx="2" ry="1.4" fill="#fff5e0" />
        <ellipse cx="36" cy="30" rx="2" ry="1.4" fill="#fff5e0" />
        <ellipse cx="28" cy="30" rx="1.1" ry="1.1" fill="#1a0a04" />
        <ellipse cx="36" cy="30" rx="1.1" ry="1.1" fill="#1a0a04" />
        <circle cx="27.7" cy="29.7" r=".3" fill="#fff" />
        <circle cx="35.7" cy="29.7" r=".3" fill="#fff" />
        {/* Kohl makeup (extending out) */}
        <path d="M24 30 L 22 29" stroke="#1a0a04" strokeWidth=".7" strokeLinecap="round" />
        <path d="M40 30 L 42 29" stroke="#1a0a04" strokeWidth=".7" strokeLinecap="round" />
        <path d="M25 31 Q 23 32 22 32" stroke="#1a0a04" strokeWidth=".5" fill="none" />
        <path d="M39 31 Q 41 32 42 32" stroke="#1a0a04" strokeWidth=".5" fill="none" />
        {/* Eyebrows */}
        <path d="M25 28 Q 28 27 31 28" stroke="#1a0a04" strokeWidth=".9" fill="none" strokeLinecap="round" />
        <path d="M33 28 Q 36 27 39 28" stroke="#1a0a04" strokeWidth=".9" fill="none" strokeLinecap="round" />
        {/* Nose */}
        <path d="M32 31 L 31 36 L 33 36 Z" fill="rgba(0,0,0,.25)" />
        {/* Mouth (subtle smile) */}
        <path d="M29 39 Q 32 40 35 39" stroke="#5a081a" strokeWidth=".7" fill="none" strokeLinecap="round" />
        {/* Beard (false ceremonial beard) */}
        <path d="M30 42 L 30 50 L 32 52 L 34 50 L 34 42 Z" fill="url(#ph-gold)" stroke="#3a2204" strokeWidth=".5" />
        <path d="M30 44 L 34 44" stroke="#3a2204" strokeWidth=".3" />
        <path d="M30 47 L 34 47" stroke="#3a2204" strokeWidth=".3" />
        {/* Cobra (uraeus) on forehead */}
        <ellipse cx="32" cy="18" rx="2" ry="1.4" fill="#1f4a8a" stroke="#0a1f4a" strokeWidth=".4" />
        <circle cx="32" cy="17" r=".7" fill="#ffd166" />
        {/* Decorative collar */}
        <path d="M16 46 Q 32 50 48 46 L 48 56 L 16 56 Z" fill="#1f4a8a" stroke="#0a1f4a" strokeWidth=".5" />
        <path d="M18 48 Q 32 52 46 48" fill="none" stroke="#ffd166" strokeWidth=".6" />
        <path d="M20 50 Q 32 54 44 50" fill="none" stroke="#ff5560" strokeWidth=".5" />
        <path d="M22 52 Q 32 56 42 52" fill="none" stroke="#ffd166" strokeWidth=".5" />
      </svg>
    </div>
  );
}

/** Eye of Horus (Wedjat) — stylised line + spiral motif. */
export function EyeSymbol() {
  return (
    <div className={wrap} style={{ color: '#1f4a8a' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="eye-iris" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="60%" stopColor="#1f4a8a" />
            <stop offset="100%" stopColor="#0a1f4a" />
          </radialGradient>
        </defs>
        {/* White of eye (almond) */}
        <path
          d="M 8 32 Q 32 16 56 32 Q 32 44 8 32 Z"
          fill="#fff5e0"
          stroke="#1a0a04"
          strokeWidth="1.6"
        />
        {/* Iris */}
        <circle cx="32" cy="32" r="6" fill="url(#eye-iris)" />
        <circle cx="32" cy="32" r="2" fill="#1a0a04" />
        <circle cx="30.5" cy="30.5" r=".8" fill="#fff5e0" />
        {/* Eyebrow above */}
        <path d="M 12 24 Q 32 14 56 24" fill="none" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
        {/* Eye-of-Horus markings — line drop + spiral curl */}
        <path d="M 18 36 L 12 46" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
        <path d="M 28 38 Q 30 50 22 50" fill="none" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
        {/* Decorative gold accent */}
        <ellipse cx="48" cy="22" rx="4" ry="1.5" fill="#ffd166" opacity=".7" />
      </svg>
    </div>
  );
}

/** Ankh — looped cross. */
export function AnkhSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ak-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5c4" />
            <stop offset="50%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#5a3a04" />
          </linearGradient>
        </defs>
        {/* Loop */}
        <ellipse cx="32" cy="20" rx="12" ry="14" fill="none" stroke="url(#ak-gold)" strokeWidth="6" />
        <ellipse cx="32" cy="20" rx="12" ry="14" fill="none" stroke="#3a2204" strokeWidth="1" />
        {/* Crossbar */}
        <rect x="14" y="36" width="36" height="6" rx="1" fill="url(#ak-gold)" stroke="#3a2204" strokeWidth=".8" />
        {/* Stem */}
        <rect x="29" y="42" width="6" height="20" rx="1" fill="url(#ak-gold)" stroke="#3a2204" strokeWidth=".8" />
        {/* Highlight */}
        <ellipse cx="22" cy="14" rx="2.5" ry="3.5" fill="rgba(255,255,255,.45)" />
        <rect x="16" y="37" width="32" height="1" fill="rgba(255,255,255,.4)" />
      </svg>
    </div>
  );
}

/** Jackal head (Anubis) — stylised side profile. */
export function JackalSymbol() {
  return (
    <div className={wrap} style={{ color: '#1a0a04' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="jk-blk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2a14" />
            <stop offset="100%" stopColor="#0a0402" />
          </linearGradient>
        </defs>
        {/* Head + snout */}
        <path
          d="M 16 50 L 16 28 Q 16 12 28 10 L 32 6 L 36 10 Q 48 12 48 28 L 56 32 L 48 36 L 48 50 Z"
          fill="url(#jk-blk)"
          stroke="#5a3a0a"
          strokeWidth=".8"
          strokeLinejoin="round"
        />
        {/* Ear inside (left) */}
        <path d="M 28 12 L 32 6 L 32 22 Q 28 18 28 12 Z" fill="#a8761a" />
        {/* Ear inside (right) */}
        <path d="M 36 12 L 32 6 L 32 22 Q 36 18 36 12 Z" fill="#a8761a" opacity=".6" />
        {/* Eye (gold) */}
        <ellipse cx="40" cy="26" rx="2.5" ry="2" fill="#ffd166" />
        <circle cx="40" cy="26" r="1.2" fill="#1a0a04" />
        <circle cx="39.7" cy="25.7" r=".4" fill="#fff" />
        {/* Snout details */}
        <ellipse cx="54" cy="32" rx="2" ry="1.5" fill="#1a0a04" stroke="#3a2204" strokeWidth=".4" />
        <line x1="50" y1="32" x2="52" y2="32" stroke="#a8761a" strokeWidth=".5" />
        {/* Gold collar at neck */}
        <path d="M 16 48 L 48 48 L 50 56 L 14 56 Z" fill="#ffd166" stroke="#5a3a04" strokeWidth=".7" />
        <path d="M 18 50 L 46 50" stroke="#1f4a8a" strokeWidth=".7" />
        <circle cx="32" cy="52" r="1.5" fill="#1f4a8a" />
      </svg>
    </div>
  );
}

/** Falcon — Horus-inspired silhouette. */
export function FalconSymbol() {
  return (
    <div className={wrap} style={{ color: '#a8761a' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="fl-feather" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8761a" />
            <stop offset="60%" stopColor="#5a3a04" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
        </defs>
        {/* Body */}
        <path d="M 24 30 Q 24 50 32 56 Q 40 50 40 30 Q 40 18 32 14 Q 24 18 24 30 Z" fill="url(#fl-feather)" stroke="#1a0a02" strokeWidth=".7" />
        {/* Head */}
        <ellipse cx="32" cy="14" rx="6" ry="6" fill="url(#fl-feather)" stroke="#1a0a02" strokeWidth=".7" />
        {/* Beak */}
        <path d="M 32 13 L 38 12 L 32 16 Z" fill="#ffd166" stroke="#5a3a04" strokeWidth=".4" />
        {/* Eye */}
        <circle cx="34" cy="13" r="1" fill="#fff5e0" />
        <circle cx="34" cy="13" r=".5" fill="#1a0a04" />
        {/* Markings on cheek (Horus eye motif) */}
        <path d="M 28 14 L 26 16" stroke="#ffd166" strokeWidth=".5" />
        <path d="M 28 16 L 25 18" stroke="#ffd166" strokeWidth=".4" />
        {/* Wings */}
        <path d="M 24 30 Q 14 32 10 42 Q 18 38 24 36" fill="url(#fl-feather)" stroke="#1a0a02" strokeWidth=".5" />
        <path d="M 40 30 Q 50 32 54 42 Q 46 38 40 36" fill="url(#fl-feather)" stroke="#1a0a02" strokeWidth=".5" />
        {/* Tail feathers */}
        <path d="M 30 56 L 28 60 L 32 58 L 36 60 L 34 56 Z" fill="url(#fl-feather)" />
        {/* Crown */}
        <path d="M 28 8 L 32 4 L 36 8 Z" fill="#1f4a8a" stroke="#0a1f4a" strokeWidth=".5" />
        <circle cx="32" cy="6" r=".8" fill="#ffd166" />
      </svg>
    </div>
  );
}

/** Lotus flower — pink/white blossom. */
export function LotusSymbol() {
  return (
    <div className={wrap} style={{ color: '#ff7ad9' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="lt-pink" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="50%" stopColor="#ffaad0" />
            <stop offset="100%" stopColor="#7a1c64" />
          </linearGradient>
          <linearGradient id="lt-stem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fc950" />
            <stop offset="100%" stopColor="#1a3a08" />
          </linearGradient>
        </defs>
        {/* Outer 3 petals */}
        <path d="M 10 38 Q 20 18 32 18 Q 44 18 54 38 Q 32 50 10 38 Z" fill="url(#lt-pink)" stroke="#5a124a" strokeWidth=".7" />
        {/* Mid 3 petals */}
        <path d="M 18 38 Q 22 24 32 22 Q 42 24 46 38 Q 32 46 18 38 Z" fill="url(#lt-pink)" stroke="#5a124a" strokeWidth=".7" opacity=".95" />
        {/* Inner petal */}
        <path d="M 26 36 Q 28 28 32 28 Q 36 28 38 36 Q 32 42 26 36 Z" fill="#fff5fb" stroke="#5a124a" strokeWidth=".5" />
        {/* Centre yellow stigma */}
        <circle cx="32" cy="34" r="2" fill="#ffd166" stroke="#5a3a04" strokeWidth=".4" />
        {/* Stem */}
        <rect x="31" y="44" width="2" height="14" fill="url(#lt-stem)" />
        {/* Leaf */}
        <ellipse cx="38" cy="50" rx="6" ry="2" fill="url(#lt-stem)" stroke="#0a3a08" strokeWidth=".4" />
      </svg>
    </div>
  );
}

/** Generic gem (lapis blue / carnelian red / malachite green) */
function makeGemSymbol(id: string, baseColor: string, midColor: string, deepColor: string) {
  return function Gem() {
    return (
      <div className={wrap} style={{ color: baseColor }}>
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id={`gem-${id}-light`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
              <stop offset="100%" stopColor={baseColor} stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={`gem-${id}-mid`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={baseColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={midColor} />
            </linearGradient>
            <linearGradient id={`gem-${id}-deep`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={midColor} />
              <stop offset="100%" stopColor={deepColor} />
            </linearGradient>
          </defs>
          {/* Hexagonal gem outline */}
          <path
            d="M32 6 L 52 16 L 60 32 L 52 48 L 32 58 L 12 48 L 4 32 L 12 16 Z"
            fill={`url(#gem-${id}-deep)`}
            stroke="rgba(0,0,0,.5)"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Top crown facets */}
          <path d="M32 6 L 52 16 L 32 24 Z" fill={`url(#gem-${id}-light)`} />
          <path d="M32 6 L 12 16 L 32 24 Z" fill={`url(#gem-${id}-light)`} opacity=".82" />
          <path d="M52 16 L 60 32 L 32 24 Z" fill={`url(#gem-${id}-mid)`} />
          <path d="M12 16 L 4 32 L 32 24 Z" fill={`url(#gem-${id}-mid)`} opacity=".75" />
          {/* Lower facets */}
          <path d="M32 24 L 60 32 L 52 48 L 32 58 Z" fill="rgba(255,255,255,0.05)" />
          <path d="M32 24 L 4 32 L 12 48 L 32 58 Z" fill="rgba(0,0,0,0.18)" />
          {/* Bright crown highlight */}
          <ellipse cx="40" cy="13" rx="3" ry="1.5" fill="rgba(255,255,255,.6)" transform="rotate(-12 40 13)" />
        </svg>
      </div>
    );
  };
}

export const BlueGemSymbol  = makeGemSymbol('blue', '#7ac4ff', '#1f4a8a', '#0a1f4a');
export const RedGemSymbol   = makeGemSymbol('red',  '#ff8a8a', '#c8102e', '#5a0810');
export const GreenGemSymbol = makeGemSymbol('green','#9bdf66', '#1aa744', '#0a3a14');

/** Scarab beetle scatter — iridescent blue+gold with wings. */
export function ScarabSymbol() {
  return (
    <div className={scatterWrap} style={{ color: '#1fff7a' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="sb-shell" cx="50%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#9bdf66" />
            <stop offset="35%" stopColor="#1faa66" />
            <stop offset="75%" stopColor="#0a3a14" />
            <stop offset="100%" stopColor="#02100a" />
          </radialGradient>
          <linearGradient id="sb-wing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#7a4a04" />
          </linearGradient>
        </defs>
        {/* Halo */}
        <circle cx="32" cy="32" r="26" fill="rgba(255,209,102,.18)" />
        {/* Body — oval (head, thorax, abdomen) */}
        <ellipse cx="32" cy="20" rx="6" ry="5" fill="url(#sb-shell)" stroke="#0a3a14" strokeWidth=".7" />
        <ellipse cx="32" cy="32" rx="11" ry="14" fill="url(#sb-shell)" stroke="#0a3a14" strokeWidth=".7" />
        {/* Centre line down back */}
        <path d="M 32 24 L 32 46" stroke="#0a3a14" strokeWidth=".7" />
        {/* Wing markings (gold trim) */}
        <path d="M 22 30 L 32 46" stroke="url(#sb-wing)" strokeWidth=".7" />
        <path d="M 42 30 L 32 46" stroke="url(#sb-wing)" strokeWidth=".7" />
        {/* Spread wings (pharaoh-style) */}
        <path d="M 22 32 Q 4 36 6 46 Q 18 38 22 36" fill="url(#sb-wing)" stroke="#5a3a04" strokeWidth=".4" opacity=".75" />
        <path d="M 42 32 Q 60 36 58 46 Q 46 38 42 36" fill="url(#sb-wing)" stroke="#5a3a04" strokeWidth=".4" opacity=".75" />
        {/* Wing veins */}
        <path d="M 10 40 L 22 36" stroke="#5a3a04" strokeWidth=".3" />
        <path d="M 12 44 L 22 38" stroke="#5a3a04" strokeWidth=".3" />
        <path d="M 54 40 L 42 36" stroke="#5a3a04" strokeWidth=".3" />
        <path d="M 52 44 L 42 38" stroke="#5a3a04" strokeWidth=".3" />
        {/* Head pincers */}
        <path d="M 28 16 L 26 12" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        <path d="M 36 16 L 38 12" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        {/* Eyes */}
        <circle cx="29" cy="20" r=".7" fill="#ffd166" />
        <circle cx="35" cy="20" r=".7" fill="#ffd166" />
        {/* Six legs (3 each side) */}
        <path d="M 22 26 L 14 24" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        <path d="M 22 32 L 12 32" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        <path d="M 22 38 L 14 42" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        <path d="M 42 26 L 50 24" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        <path d="M 42 32 L 52 32" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        <path d="M 42 38 L 50 42" stroke="#0a3a14" strokeWidth="1" strokeLinecap="round" />
        {/* Highlight */}
        <ellipse cx="28" cy="26" rx="2.5" ry="3" fill="rgba(255,255,255,.45)" />
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
      <div className={`pharaoh-orb ${tier !== 'normal' ? `pharaoh-orb-${tier}` : ''}`}>
        <span className="pharaoh-orb-text">{value}×</span>
      </div>
    </motion.div>
  );
}

export const PHARAOH_SYMBOL_MAP: Record<string, React.FC> = {
  pharaoh: PharaohSymbol,
  eye: EyeSymbol,
  ankh: AnkhSymbol,
  jackal: JackalSymbol,
  falcon: FalconSymbol,
  lotus: LotusSymbol,
  'gem-blue': BlueGemSymbol,
  'gem-red': RedGemSymbol,
  'gem-green': GreenGemSymbol,
  scarab: ScarabSymbol,
};
