import { motion } from 'framer-motion';

/** Standard wrapper for non-scatter symbols — the `.bonanza-sym` CSS class
 *  drives drop-shadow + GPU promotion (matches the Olympus pattern). */
const wrap = 'bonanza-sym';
/** Scatter (lollipop) wrapper adds the idle pulse + extra glow. */
const scatterWrap = 'bonanza-sym bonanza-sym-scatter';

export function HeartSymbol() {
  return (
    <div className={`${wrap} bonanza-sym-heart`}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="hr" cx="50%" cy="38%" r="65%">
            <stop offset="0%" stopColor="#fff5f9" />
            <stop offset="22%" stopColor="#ffb4c8" />
            <stop offset="55%" stopColor="#ff3d6b" />
            <stop offset="85%" stopColor="#c8123a" />
            <stop offset="100%" stopColor="#5a081a" />
          </radialGradient>
          <radialGradient id="hr-glint" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M32 56 C 8 38 4 22 18 14 C 26 10 32 16 32 22 C 32 16 38 10 46 14 C 60 22 56 38 32 56 Z"
          fill="url(#hr)"
          stroke="#5a081a"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Big highlight */}
        <ellipse cx="22" cy="20" rx="7" ry="4.5" fill="rgba(255,255,255,.65)" />
        {/* Small sparkle */}
        <circle cx="40" cy="30" r="3" fill="url(#hr-glint)" />
      </svg>
    </div>
  );
}

export function GrapeSymbol() {
  // Bunch of 7 berries arranged in a triangle (top row 3, mid row 2, bot row 1
  // plus a top centre). Each berry gets its own rotated radial gradient so the
  // light source feels consistent across the cluster.
  const g: { x: number; y: number; r: number }[] = [
    { x: 32, y: 17, r: 7.5 },
    { x: 22, y: 27, r: 7.5 }, { x: 32, y: 27, r: 7.5 }, { x: 42, y: 27, r: 7.5 },
    { x: 27, y: 37, r: 7.5 }, { x: 37, y: 37, r: 7.5 },
    { x: 32, y: 47, r: 7.5 },
  ];
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="grp" cx="34%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
            <stop offset="20%" stopColor="#dab8ff" />
            <stop offset="55%" stopColor="#9b5bff" />
            <stop offset="85%" stopColor="#5a1ec0" />
            <stop offset="100%" stopColor="#260a5c" />
          </radialGradient>
          <linearGradient id="grp-stem" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7fc950" />
            <stop offset="100%" stopColor="#3a6a1f" />
          </linearGradient>
        </defs>
        {/* Stem */}
        <path d="M30 14 Q 38 6 46 10" stroke="url(#grp-stem)" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* Leaf */}
        <path d="M40 8 Q 50 12 44 20 Q 40 14 40 8 Z" fill="#7fc950" stroke="#3a6a1f" strokeWidth=".6" />
        <path d="M42 10 Q 47 15 44 18" stroke="#3a6a1f" strokeWidth=".5" fill="none" />
        {/* Berries */}
        {g.map((c, i) => (
          <g key={i}>
            <circle cx={c.x} cy={c.y} r={c.r} fill="url(#grp)" stroke="rgba(38,10,92,.6)" strokeWidth=".8" />
            {/* Tiny shine on each berry */}
            <ellipse cx={c.x - 2} cy={c.y - 2.5} rx="2" ry="1.4" fill="rgba(255,255,255,.6)" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function WatermelonSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(0,160,80,0.45)]">
        <defs>
          <linearGradient id="wm" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8aa8" />
            <stop offset="80%" stopColor="#ff3d6b" />
          </linearGradient>
        </defs>
        <path d="M8 50 A 28 28 0 0 1 56 50 L 8 50 Z" fill="url(#wm)" />
        <path d="M8 50 A 28 28 0 0 1 56 50 L 8 50 Z" fill="none" stroke="#ffe2ec" strokeWidth="2" />
        <path d="M5 50 L 59 50" stroke="#fff" strokeWidth="3" />
        <path d="M5 50 L 59 50" stroke="#1aa744" strokeWidth="2" transform="translate(0 4)" />
        <circle cx="22" cy="40" r="2.2" fill="#1a1f29" />
        <circle cx="32" cy="34" r="2.2" fill="#1a1f29" />
        <circle cx="42" cy="40" r="2.2" fill="#1a1f29" />
        <circle cx="32" cy="44" r="2.2" fill="#1a1f29" />
      </svg>
    </div>
  );
}

export function PlumSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(110,30,170,0.45)]">
        <defs>
          <radialGradient id="pl" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#d6a8ff" />
            <stop offset="60%" stopColor="#7a35c8" />
            <stop offset="100%" stopColor="#3b105e" />
          </radialGradient>
        </defs>
        <path d="M32 14 C 18 14 12 28 12 38 C 12 50 22 56 32 56 C 42 56 52 50 52 38 C 52 28 46 14 32 14 Z" fill="url(#pl)" />
        <path d="M32 16 Q 36 26 32 56" stroke="#3b105e" strokeWidth="1.3" fill="none" />
        <path d="M32 14 Q 38 8 44 12" stroke="#5a8a3c" strokeWidth="2" fill="none" />
        <ellipse cx="44" cy="11" rx="6" ry="3" fill="#7fbf52" />
      </svg>
    </div>
  );
}

export function AppleSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(60,180,80,0.5)]">
        <defs>
          <radialGradient id="ap" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#c2ff8e" />
            <stop offset="55%" stopColor="#48c93a" />
            <stop offset="100%" stopColor="#1a5f1c" />
          </radialGradient>
        </defs>
        <path d="M32 16 C 18 16 10 28 12 40 C 14 52 24 58 32 56 C 40 58 50 52 52 40 C 54 28 46 16 32 16 Z" fill="url(#ap)" />
        <path d="M32 18 C 32 14 36 10 40 12" stroke="#5a3a1c" strokeWidth="2.5" fill="none" />
        <path d="M34 14 Q 44 6 50 12" fill="#7fbf52" />
        <ellipse cx="22" cy="26" rx="6" ry="3" fill="#fff" opacity="0.45" />
      </svg>
    </div>
  );
}

export function BlueberrySymbol() {
  // 3-2-1 arrangement of 6 berries with calyx star detail (the little
  // five-point crown on real blueberries) — adds character vs flat circles.
  const dots = [
    { x: 22, y: 26 }, { x: 32, y: 22 }, { x: 42, y: 26 },
    { x: 26, y: 38 }, { x: 38, y: 38 },
    { x: 32, y: 50 },
  ];
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="bb" cx="34%" cy="28%" r="68%">
            <stop offset="0%" stopColor="#dceaff" />
            <stop offset="20%" stopColor="#a3c8ff" />
            <stop offset="55%" stopColor="#3263e0" />
            <stop offset="85%" stopColor="#1a3a8a" />
            <stop offset="100%" stopColor="#08163d" />
          </radialGradient>
        </defs>
        {dots.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={9} fill="url(#bb)" stroke="rgba(8,22,61,.65)" strokeWidth=".9" />
            {/* Calyx star — five small lines forming a crown at the top */}
            <g stroke="rgba(255,255,255,.45)" strokeWidth=".5" fill="none">
              <line x1={d.x} y1={d.y - 2} x2={d.x} y2={d.y - 4.5} />
              <line x1={d.x - 1.5} y1={d.y - 1.5} x2={d.x - 3} y2={d.y - 3} />
              <line x1={d.x + 1.5} y1={d.y - 1.5} x2={d.x + 3} y2={d.y - 3} />
            </g>
            {/* Big highlight */}
            <ellipse cx={d.x - 2} cy={d.y - 2.5} rx="2.2" ry="1.5" fill="rgba(255,255,255,.65)" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function BananaSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(220,180,30,0.5)]">
        <defs>
          <linearGradient id="bn" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff3a3" />
            <stop offset="50%" stopColor="#ffd24a" />
            <stop offset="100%" stopColor="#a37306" />
          </linearGradient>
        </defs>
        <path d="M10 20 C 14 38 24 52 50 50 C 50 48 50 46 48 44 C 30 44 22 32 18 18 Z" fill="url(#bn)" stroke="#7a4d04" strokeWidth="1.4" />
        <path d="M50 50 L 56 56" stroke="#3b2a06" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </div>
  );
}

export function PinkCandySymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,90,160,0.45)]">
        <defs>
          <radialGradient id="pc" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#ffd1e2" />
            <stop offset="60%" stopColor="#ff5fa2" />
            <stop offset="100%" stopColor="#9b1d52" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="34" r="14" fill="url(#pc)" />
        <path d="M14 34 L 4 28 L 8 38 L 4 48 Z" fill="#ff8fbf" />
        <path d="M50 34 L 60 28 L 56 38 L 60 48 Z" fill="#ff8fbf" />
        <ellipse cx="26" cy="28" rx="5" ry="2.6" fill="#fff" opacity="0.5" />
      </svg>
    </div>
  );
}

export function BlueCandySymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(60,200,255,0.5)]">
        <defs>
          <radialGradient id="bc" cx="35%" cy="35%" r="60%">
            <stop offset="0%" stopColor="#cdf3ff" />
            <stop offset="60%" stopColor="#22a8e0" />
            <stop offset="100%" stopColor="#0e3f6e" />
          </radialGradient>
        </defs>
        <rect x="16" y="20" width="32" height="28" rx="14" fill="url(#bc)" />
        <path d="M16 34 L 4 28 L 8 38 L 4 48 Z" fill="#7ad6ff" />
        <path d="M48 34 L 60 28 L 56 38 L 60 48 Z" fill="#7ad6ff" />
        <ellipse cx="26" cy="28" rx="5" ry="2.6" fill="#fff" opacity="0.5" />
      </svg>
    </div>
  );
}

export function LollipopSymbol() {
  return (
    <div className={scatterWrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="lp-disc" cx="38%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#ffe7f1" />
            <stop offset="55%" stopColor="#ff5fa2" />
            <stop offset="85%" stopColor="#a8124d" />
            <stop offset="100%" stopColor="#4a0824" />
          </radialGradient>
          <radialGradient id="lp-swirl" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fff5fb" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff5fb" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="lp-stick" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="100%" stopColor="#a8a29e" />
          </linearGradient>
        </defs>
        {/* Halo ring */}
        <circle cx="32" cy="28" r="22" fill="rgba(255,200,230,.15)" />
        {/* Disc */}
        <circle cx="32" cy="28" r="18" fill="url(#lp-disc)" stroke="#5a0828" strokeWidth="1" />
        {/* Swirl pattern — concentric arcs giving the classic spiral candy look */}
        <path d="M32 14 A 14 14 0 0 1 46 28 A 14 14 0 0 1 32 42 A 14 14 0 0 1 18 28 A 14 14 0 0 1 32 14 Z"
              fill="none" stroke="#fff" strokeWidth="1" opacity=".55" />
        <path d="M32 18 A 10 10 0 0 1 42 28 A 10 10 0 0 1 32 38 A 10 10 0 0 1 22 28 A 10 10 0 0 1 32 18 Z"
              fill="none" stroke="#fff" strokeWidth="1.2" opacity=".75" />
        <path d="M32 22 A 6 6 0 0 1 38 28 A 6 6 0 0 1 32 34 A 6 6 0 0 1 26 28 A 6 6 0 0 1 32 22 Z"
              fill="none" stroke="#fff" strokeWidth="1.4" opacity=".9" />
        {/* Big highlight */}
        <ellipse cx="26" cy="22" rx="5" ry="3" fill="rgba(255,255,255,.7)" />
        {/* Stick */}
        <rect x="30" y="46" width="4" height="14" rx="1.5" fill="url(#lp-stick)" stroke="#5a4a30" strokeWidth=".6" />
      </svg>
    </div>
  );
}

export function MultiplierSymbol({ value }: { value: number; accent?: string }) {
  // Colour escalates with multiplier value — matches real Sweet Bonanza's
  // visible tier system (low pink → high gold/fire bombs).
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

export const BONANZA_SYMBOL_MAP: Record<string, React.FC> = {
  heart: HeartSymbol,
  grape: GrapeSymbol,
  watermelon: WatermelonSymbol,
  plum: PlumSymbol,
  apple: AppleSymbol,
  blueberry: BlueberrySymbol,
  banana: BananaSymbol,
  'candy-pink': PinkCandySymbol,
  'candy-blue': BlueCandySymbol,
  lollipop: LollipopSymbol,
};
