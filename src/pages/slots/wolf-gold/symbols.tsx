/** Wolf Gold symbols — Southwest wildlife. Wolf top, coyote scatter. */
import { motion } from 'framer-motion';

const wrap = 'wolf-sym';
const heroWrap = 'wolf-sym wolf-sym-hero';
const scatterWrap = 'wolf-sym wolf-sym-scatter';

/** Wolf head — top-pay. Stylised silver-grey wolf with golden eyes. */
export function WolfSymbol() {
  return (
    <div className={heroWrap} style={{ color: '#a78bfa' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="wf-fur" cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#dde4f0" />
            <stop offset="50%" stopColor="#7a808c" />
            <stop offset="100%" stopColor="#1a1f29" />
          </radialGradient>
        </defs>
        {/* Head silhouette */}
        <path
          d="M14 30 Q 12 14 24 8 L 32 4 L 40 8 Q 52 14 50 30
             L 48 42 Q 44 50 38 52 L 32 56 L 26 52 Q 20 50 16 42 Z"
          fill="url(#wf-fur)"
          stroke="#0a0d12"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Pointed ears */}
        <path d="M14 16 L 18 4 L 22 16 Z" fill="url(#wf-fur)" stroke="#0a0d12" strokeWidth=".7" />
        <path d="M50 16 L 46 4 L 42 16 Z" fill="url(#wf-fur)" stroke="#0a0d12" strokeWidth=".7" />
        {/* Inner ears (pink) */}
        <path d="M16 14 L 18 8 L 20 14 Z" fill="#7a606a" />
        <path d="M48 14 L 46 8 L 44 14 Z" fill="#7a606a" />
        {/* Eyes (gold/amber, intense) */}
        <ellipse cx="24" cy="26" rx="2.6" ry="1.6" fill="#ffd166" />
        <ellipse cx="40" cy="26" rx="2.6" ry="1.6" fill="#ffd166" />
        <ellipse cx="24" cy="26" rx="1.2" ry="1.2" fill="#1a0a04" />
        <ellipse cx="40" cy="26" rx="1.2" ry="1.2" fill="#1a0a04" />
        <circle cx="23.6" cy="25.6" r=".4" fill="#fff" />
        <circle cx="39.6" cy="25.6" r=".4" fill="#fff" />
        {/* Brow furrow */}
        <path d="M20 22 Q 23 21 26 23" stroke="#0a0d12" strokeWidth=".8" fill="none" strokeLinecap="round" />
        <path d="M38 23 Q 41 21 44 22" stroke="#0a0d12" strokeWidth=".8" fill="none" strokeLinecap="round" />
        {/* Snout */}
        <path d="M28 32 Q 32 38 36 32 Q 36 42 32 46 Q 28 42 28 32 Z" fill="#5a606a" stroke="#1a1f29" strokeWidth=".5" />
        {/* Nose */}
        <ellipse cx="32" cy="38" rx="2" ry="1.4" fill="#1a0a04" />
        {/* Mouth/teeth slit */}
        <path d="M28 44 Q 32 46 36 44" stroke="#1a0a04" strokeWidth=".7" fill="none" strokeLinecap="round" />
        {/* Fang glints */}
        <path d="M30 46 L 30 49" stroke="#fff" strokeWidth=".4" />
        <path d="M34 46 L 34 49" stroke="#fff" strokeWidth=".4" />
        {/* Fur shading along cheeks */}
        <path d="M16 30 Q 20 32 22 36" stroke="#0a0d12" strokeWidth=".4" fill="none" />
        <path d="M48 30 Q 44 32 42 36" stroke="#0a0d12" strokeWidth=".4" fill="none" />
        {/* Highlight on forehead */}
        <ellipse cx="26" cy="14" rx="2.5" ry="2" fill="rgba(255,255,255,.45)" />
      </svg>
    </div>
  );
}

/** Eagle — bald eagle profile with white head. */
export function EagleSymbol() {
  return (
    <div className={wrap} style={{ color: '#fff5e0' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="eg-body" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3a1a" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
          <radialGradient id="eg-head" cx="50%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="60%" stopColor="#dde4f0" />
            <stop offset="100%" stopColor="#7a808c" />
          </radialGradient>
        </defs>
        {/* Body */}
        <path d="M22 32 Q 22 50 32 56 Q 42 50 42 32 Q 42 22 32 18 Q 22 22 22 32 Z" fill="url(#eg-body)" stroke="#0a0d12" strokeWidth=".7" />
        {/* Head (white) */}
        <ellipse cx="32" cy="16" rx="7" ry="6" fill="url(#eg-head)" stroke="#0a0d12" strokeWidth=".7" />
        {/* Beak (gold, hooked) */}
        <path d="M32 16 L 42 18 L 32 21 Z" fill="#ffd166" stroke="#5a3a04" strokeWidth=".5" />
        <path d="M40 18 Q 42 19 41 21" stroke="#5a3a04" strokeWidth=".4" fill="none" />
        {/* Eye */}
        <circle cx="34" cy="14" r="1.2" fill="#ffd166" />
        <circle cx="34" cy="14" r=".5" fill="#1a0a04" />
        {/* Spread wings */}
        <path d="M22 28 Q 8 34 4 46 Q 14 38 22 36" fill="url(#eg-body)" stroke="#0a0d12" strokeWidth=".5" />
        <path d="M42 28 Q 56 34 60 46 Q 50 38 42 36" fill="url(#eg-body)" stroke="#0a0d12" strokeWidth=".5" />
        {/* Wing feather hints */}
        <path d="M10 38 L 22 34" stroke="#0a0d12" strokeWidth=".3" />
        <path d="M14 42 L 22 38" stroke="#0a0d12" strokeWidth=".3" />
        <path d="M54 38 L 42 34" stroke="#0a0d12" strokeWidth=".3" />
        <path d="M50 42 L 42 38" stroke="#0a0d12" strokeWidth=".3" />
        {/* Tail feathers (white) */}
        <path d="M28 56 L 30 60 L 32 58 L 34 60 L 36 56 Z" fill="#dde4f0" />
        {/* Talons */}
        <path d="M28 56 L 26 60" stroke="#ffd166" strokeWidth="1" strokeLinecap="round" />
        <path d="M36 56 L 38 60" stroke="#ffd166" strokeWidth="1" strokeLinecap="round" />
      </svg>
    </div>
  );
}

/** Cougar — yellow-eyed mountain lion head. */
export function CougarSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffae50' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="cg-fur" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="50%" stopColor="#a87042" />
            <stop offset="100%" stopColor="#3a1a04" />
          </radialGradient>
        </defs>
        {/* Head shape */}
        <path
          d="M14 30 Q 12 14 24 8 L 32 4 L 40 8 Q 52 14 50 30 L 46 44 Q 40 52 32 54 Q 24 52 18 44 Z"
          fill="url(#cg-fur)"
          stroke="#1a0a02"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Rounder ears (vs wolf's pointed) */}
        <path d="M16 14 Q 14 6 22 8 Q 22 14 18 14 Z" fill="url(#cg-fur)" stroke="#1a0a02" strokeWidth=".7" />
        <path d="M48 14 Q 50 6 42 8 Q 42 14 46 14 Z" fill="url(#cg-fur)" stroke="#1a0a02" strokeWidth=".7" />
        {/* Inner ears */}
        <path d="M18 12 Q 18 8 21 9" fill="#7a4a18" />
        <path d="M46 12 Q 46 8 43 9" fill="#7a4a18" />
        {/* Eyes (golden-green slit) */}
        <ellipse cx="24" cy="26" rx="2.6" ry="1.8" fill="#9bdf66" />
        <ellipse cx="40" cy="26" rx="2.6" ry="1.8" fill="#9bdf66" />
        <ellipse cx="24" cy="26" rx=".5" ry="1.5" fill="#1a0a04" />
        <ellipse cx="40" cy="26" rx=".5" ry="1.5" fill="#1a0a04" />
        {/* Brow */}
        <path d="M20 22 Q 23 21 26 23" stroke="#1a0a02" strokeWidth=".7" fill="none" strokeLinecap="round" />
        <path d="M38 23 Q 41 21 44 22" stroke="#1a0a02" strokeWidth=".7" fill="none" strokeLinecap="round" />
        {/* Muzzle */}
        <path d="M28 34 Q 32 40 36 34 Q 36 44 32 46 Q 28 44 28 34 Z" fill="#fff5e0" stroke="#1a0a02" strokeWidth=".5" />
        {/* Nose (small pink) */}
        <path d="M30 36 Q 32 38 34 36 L 32 39 Z" fill="#a82048" />
        {/* Mouth */}
        <path d="M30 42 Q 32 43 34 42" stroke="#1a0a02" strokeWidth=".5" fill="none" />
        {/* Whiskers */}
        <path d="M22 40 L 14 41" stroke="#fff5e0" strokeWidth=".25" />
        <path d="M22 42 L 14 43" stroke="#fff5e0" strokeWidth=".25" />
        <path d="M42 40 L 50 41" stroke="#fff5e0" strokeWidth=".25" />
        <path d="M42 42 L 50 43" stroke="#fff5e0" strokeWidth=".25" />
      </svg>
    </div>
  );
}

/** Mustang — running horse silhouette. */
export function MustangSymbol() {
  return (
    <div className={wrap} style={{ color: '#a87042' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ms-coat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a87042" />
            <stop offset="55%" stopColor="#5a3018" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
        </defs>
        {/* Body (mid-stride) */}
        <path
          d="M 4 36 Q 12 28 24 30 L 36 28 Q 48 26 56 32 L 56 40 Q 50 42 44 40 L 30 42 Q 18 44 10 42 Z"
          fill="url(#ms-coat)"
          stroke="#0a0d12"
          strokeWidth=".8"
          strokeLinejoin="round"
        />
        {/* Head + neck */}
        <path d="M 50 32 L 58 22 Q 62 22 60 28 L 56 32 Z" fill="url(#ms-coat)" stroke="#0a0d12" strokeWidth=".7" />
        {/* Mane */}
        <path d="M 48 30 L 50 22 L 52 28 L 54 22 L 56 28 Z" fill="#1a0a02" />
        {/* Ear */}
        <path d="M 56 22 L 58 18 L 60 22 Z" fill="url(#ms-coat)" stroke="#0a0d12" strokeWidth=".4" />
        {/* Eye */}
        <circle cx="58" cy="26" r=".7" fill="#1a0a04" />
        {/* Front legs (raised, mid-gallop) */}
        <path d="M 18 42 L 14 56 L 18 58 L 22 44" fill="url(#ms-coat)" stroke="#0a0d12" strokeWidth=".5" />
        <path d="M 28 42 L 26 56 L 30 58 L 32 44" fill="url(#ms-coat)" stroke="#0a0d12" strokeWidth=".5" />
        {/* Back legs */}
        <path d="M 44 42 L 42 56 L 46 58 L 48 44" fill="url(#ms-coat)" stroke="#0a0d12" strokeWidth=".5" />
        <path d="M 52 42 L 50 56 L 54 58 L 56 44" fill="url(#ms-coat)" stroke="#0a0d12" strokeWidth=".5" />
        {/* Tail (flowing) */}
        <path d="M 4 36 Q -2 38 0 46 Q 4 42 6 38" fill="#1a0a02" />
        {/* Hooves */}
        <ellipse cx="16" cy="58" rx="2" ry="1" fill="#0a0d12" />
        <ellipse cx="28" cy="58" rx="2" ry="1" fill="#0a0d12" />
        <ellipse cx="44" cy="58" rx="2" ry="1" fill="#0a0d12" />
        <ellipse cx="52" cy="58" rx="2" ry="1" fill="#0a0d12" />
      </svg>
    </div>
  );
}

/** Feather — single eagle feather with gold tip. */
export function FeatherSymbol() {
  return (
    <div className={wrap} style={{ color: '#fff5e0' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ft-vane" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde4f0" />
            <stop offset="50%" stopColor="#a8784a" />
            <stop offset="100%" stopColor="#3a1a04" />
          </linearGradient>
        </defs>
        {/* Stem (rachis) */}
        <line x1="32" y1="6" x2="32" y2="60" stroke="#3a1a04" strokeWidth=".8" />
        {/* Vanes (left + right) */}
        <path d="M32 8 Q 14 16 14 36 Q 14 50 32 54 Z" fill="url(#ft-vane)" stroke="#3a1a04" strokeWidth=".5" />
        <path d="M32 8 Q 50 16 50 36 Q 50 50 32 54 Z" fill="url(#ft-vane)" stroke="#3a1a04" strokeWidth=".5" />
        {/* Feather barbs (lines) */}
        {Array.from({ length: 12 }).map((_, i) => {
          const y = 12 + i * 3.5;
          return (
            <g key={i}>
              <line x1="32" y1={y} x2={20 + i * 0.4} y2={y - 1} stroke="#3a1a04" strokeWidth=".25" />
              <line x1="32" y1={y} x2={44 - i * 0.4} y2={y - 1} stroke="#3a1a04" strokeWidth=".25" />
            </g>
          );
        })}
        {/* Decorative gold tip with bead */}
        <circle cx="32" cy="60" r="2.5" fill="#ffd166" stroke="#5a3a04" strokeWidth=".5" />
        <circle cx="32" cy="60" r=".7" fill="#5a3a04" />
        {/* Top dark patches (eagle pattern) */}
        <ellipse cx="32" cy="14" rx="6" ry="3" fill="rgba(0,0,0,.5)" />
        <ellipse cx="32" cy="20" rx="8" ry="2" fill="rgba(0,0,0,.3)" />
      </svg>
    </div>
  );
}

/** Arrow — wooden shaft with feather fletching + flint head. */
export function ArrowSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ar-shaft" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5a3a18" />
            <stop offset="50%" stopColor="#a8761a" />
            <stop offset="100%" stopColor="#3a1a04" />
          </linearGradient>
        </defs>
        {/* Shaft (diagonal) */}
        <rect
          x="6"
          y="30"
          width="42"
          height="4"
          fill="url(#ar-shaft)"
          stroke="#1a0a02"
          strokeWidth=".4"
          transform="rotate(-12 32 32)"
        />
        {/* Flint arrowhead */}
        <path
          d="M 48 26 L 60 32 L 48 38 L 44 32 Z"
          fill="#7a808c"
          stroke="#1a0a02"
          strokeWidth=".6"
          transform="rotate(-12 32 32)"
        />
        <path
          d="M 48 28 L 56 32 L 48 36 Z"
          fill="#dde4f0"
          opacity=".6"
          transform="rotate(-12 32 32)"
        />
        {/* Sinew binding */}
        <line x1="44" y1="29" x2="44" y2="35" stroke="#5a081a" strokeWidth=".7" transform="rotate(-12 32 32)" />
        {/* Fletching feathers (3) */}
        <path d="M 4 30 L 14 26 L 14 34 Z" fill="#c8102e" stroke="#5a081a" strokeWidth=".4" transform="rotate(-12 32 32)" />
        <path d="M 6 32 L 14 32 L 6 34 Z" fill="#fff5e0" stroke="#5a3a04" strokeWidth=".4" transform="rotate(-12 32 32)" />
        <path d="M 4 34 L 14 30 L 14 38 Z" fill="#1f4a8a" stroke="#0a1f4a" strokeWidth=".4" transform="rotate(-12 32 32)" />
        {/* Bind ring on shaft */}
        <line x1="14" y1="29" x2="14" y2="35" stroke="#5a081a" strokeWidth=".7" transform="rotate(-12 32 32)" />
      </svg>
    </div>
  );
}

/** Generic gem (turquoise / amber / jasper) for low tier */
function makeGemSymbol(id: string, baseColor: string, midColor: string, deepColor: string) {
  return function Gem() {
    return (
      <div className={wrap} style={{ color: baseColor }}>
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <defs>
            <linearGradient id={`wf-gem-${id}-light`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="100%" stopColor={baseColor} stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id={`wf-gem-${id}-mid`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={baseColor} stopOpacity="0.9" />
              <stop offset="100%" stopColor={midColor} />
            </linearGradient>
            <linearGradient id={`wf-gem-${id}-deep`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={midColor} />
              <stop offset="100%" stopColor={deepColor} />
            </linearGradient>
          </defs>
          {/* Hexagonal gem with metal bezel */}
          <path
            d="M32 6 L 52 16 L 60 32 L 52 48 L 32 58 L 12 48 L 4 32 L 12 16 Z"
            fill={`url(#wf-gem-${id}-deep)`}
            stroke="#1a0a02"
            strokeWidth="1.5"
          />
          {/* Top crown */}
          <path d="M32 6 L 52 16 L 32 24 Z" fill={`url(#wf-gem-${id}-light)`} />
          <path d="M32 6 L 12 16 L 32 24 Z" fill={`url(#wf-gem-${id}-light)`} opacity=".82" />
          <path d="M52 16 L 60 32 L 32 24 Z" fill={`url(#wf-gem-${id}-mid)`} />
          <path d="M12 16 L 4 32 L 32 24 Z" fill={`url(#wf-gem-${id}-mid)`} opacity=".75" />
          {/* Lower facets */}
          <path d="M32 24 L 60 32 L 52 48 L 32 58 Z" fill="rgba(255,255,255,0.06)" />
          <path d="M32 24 L 4 32 L 12 48 L 32 58 Z" fill="rgba(0,0,0,0.18)" />
          {/* Highlight */}
          <ellipse cx="40" cy="13" rx="3" ry="1.5" fill="rgba(255,255,255,.55)" transform="rotate(-12 40 13)" />
        </svg>
      </div>
    );
  };
}

export const TurquoiseSymbol = makeGemSymbol('turq', '#7adfe0', '#1aa7c8', '#0a4a68');
export const AmberSymbol     = makeGemSymbol('amber', '#ffc850', '#c89232', '#5a3a04');
export const JasperSymbol    = makeGemSymbol('jasper', '#e87a52', '#a8421a', '#3a0a04');

/** Coyote silhouette scatter — howling at moon. */
export function CoyoteSymbol() {
  return (
    <div className={scatterWrap} style={{ color: '#a78bfa' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        {/* Halo */}
        <circle cx="32" cy="32" r="26" fill="rgba(167,139,250,.15)" />
        {/* Moon backdrop */}
        <circle cx="32" cy="20" r="8" fill="#fff5e0" stroke="#a78bfa" strokeWidth=".6" />
        <circle cx="29" cy="18" r="1" fill="rgba(140,120,180,.5)" />
        <circle cx="34" cy="22" r="1.4" fill="rgba(140,120,180,.4)" />
        {/* Coyote silhouette howling — sitting */}
        <g transform="translate(32 36)">
          {/* Hindquarters */}
          <ellipse cx="-4" cy="12" rx="6" ry="3" fill="#0a0d12" />
          <ellipse cx="-2" cy="10" rx="5" ry="6" fill="#0a0d12" />
          {/* Body / chest (raised) */}
          <path d="M-2 8 L 2 -4 L 6 -10 L 4 0 Q 4 6 0 10 Z" fill="#0a0d12" />
          {/* Head (raised, pointing up + left) */}
          <path d="M2 -8 L 6 -16 L 8 -16 L 9 -12 L 6 -8 Z" fill="#0a0d12" />
          {/* Snout (pointed) */}
          <path d="M6 -16 L 12 -18 L 8 -16 Z" fill="#0a0d12" />
          {/* Pointed ear */}
          <path d="M5 -14 L 7 -19 L 8 -14 Z" fill="#0a0d12" />
          {/* Tail (curled up behind) */}
          <path d="M -8 8 Q -14 4 -10 0 Q -8 4 -6 6" stroke="#0a0d12" strokeWidth="1.2" fill="none" />
          {/* Front legs */}
          <line x1="2" y1="8" x2="2" y2="14" stroke="#0a0d12" strokeWidth="1" />
          <line x1="-2" y1="10" x2="-2" y2="14" stroke="#0a0d12" strokeWidth="1" />
        </g>
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
      <div className={`wolf-orb ${tier !== 'normal' ? `wolf-orb-${tier}` : ''}`}>
        <span className="wolf-orb-text">{value}×</span>
      </div>
    </motion.div>
  );
}

export const WOLF_SYMBOL_MAP: Record<string, React.FC> = {
  wolf: WolfSymbol,
  eagle: EagleSymbol,
  cougar: CougarSymbol,
  mustang: MustangSymbol,
  feather: FeatherSymbol,
  arrow: ArrowSymbol,
  turquoise: TurquoiseSymbol,
  amber: AmberSymbol,
  jasper: JasperSymbol,
  coyote: CoyoteSymbol,
};
