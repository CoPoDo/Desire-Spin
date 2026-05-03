import { motion } from 'framer-motion';

const wrap = 'w-full h-full p-1.5 flex items-center justify-center';

export function HeartSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,40,90,0.4)]">
        <defs>
          <radialGradient id="hr" cx="50%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffd2e1" />
            <stop offset="60%" stopColor="#ff3d6b" />
            <stop offset="100%" stopColor="#a8123a" />
          </radialGradient>
        </defs>
        <path d="M32 56 C 8 38 4 22 18 14 C 26 10 32 16 32 22 C 32 16 38 10 46 14 C 60 22 56 38 32 56 Z" fill="url(#hr)" stroke="#7a0c2c" strokeWidth="1.5" />
        <ellipse cx="22" cy="22" rx="6" ry="4" fill="#fff" opacity="0.55" />
      </svg>
    </div>
  );
}

export function GrapeSymbol() {
  const g: { x: number; y: number; r: number }[] = [
    { x: 32, y: 18, r: 7 },
    { x: 22, y: 26, r: 7 }, { x: 32, y: 26, r: 7 }, { x: 42, y: 26, r: 7 },
    { x: 26, y: 36, r: 7 }, { x: 38, y: 36, r: 7 },
    { x: 32, y: 46, r: 7 },
  ];
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(125,60,255,0.45)]">
        <path d="M30 14 Q 36 8 44 10" stroke="#5a8a3c" strokeWidth="2.2" fill="none" />
        <path d="M40 8 Q 46 14 38 18" fill="#7fbf52" />
        {g.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r={c.r} fill="url(#grp)" stroke="#3a1873" strokeWidth="0.8" />
        ))}
        <defs>
          <radialGradient id="grp" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#c8a8ff" />
            <stop offset="60%" stopColor="#7d3cff" />
            <stop offset="100%" stopColor="#3a1873" />
          </radialGradient>
        </defs>
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
  const dots = [
    { x: 22, y: 30 }, { x: 32, y: 24 }, { x: 42, y: 30 },
    { x: 26, y: 40 }, { x: 38, y: 40 }, { x: 32, y: 48 },
  ];
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(40,80,200,0.55)]">
        <defs>
          <radialGradient id="bb" cx="35%" cy="30%" r="65%">
            <stop offset="0%" stopColor="#a3c8ff" />
            <stop offset="60%" stopColor="#3263e0" />
            <stop offset="100%" stopColor="#102b80" />
          </radialGradient>
        </defs>
        {dots.map((d, i) => (
          <g key={i}>
            <circle cx={d.x} cy={d.y} r={9} fill="url(#bb)" stroke="#0a1842" strokeWidth="0.8" />
            <circle cx={d.x - 1.5} cy={d.y - 2} r={1.5} fill="#fff" opacity="0.5" />
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
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,90,160,0.6)]">
        <defs>
          <radialGradient id="lp" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#ffe7f1" />
            <stop offset="55%" stopColor="#ff5fa2" />
            <stop offset="100%" stopColor="#7a124d" />
          </radialGradient>
        </defs>
        <path d="M32 18 C 18 18 14 32 18 40 C 22 50 32 52 36 50 C 44 46 46 36 42 28 C 40 22 36 18 32 18 Z" fill="url(#lp)" />
        <path d="M32 52 L 30 60 L 38 60 L 36 52 Z" fill="#ffe7f1" />
        <path d="M22 28 Q 32 24 40 30" stroke="#ffe7f1" strokeWidth="2" fill="none" />
      </svg>
    </div>
  );
}

export function MultiplierSymbol({ value, accent }: { value: number; accent: string }) {
  return (
    <motion.div
      className="w-full h-full p-1 flex items-center justify-center"
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
    >
      <div
        className="rounded-full font-display font-extrabold flex items-center justify-center text-base sm:text-lg md:text-xl lg:text-2xl"
        style={{
          background: `radial-gradient(circle at 35% 30%, #fff, ${accent} 60%, #1a0a0a 100%)`,
          color: '#1a0a0a',
          width: '88%',
          aspectRatio: '1 / 1',
          boxShadow: `0 0 22px ${accent}80, 0 4px 12px rgba(0,0,0,0.6)`,
          border: '2px solid rgba(255,255,255,0.85)',
        }}
      >
        {value}×
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
