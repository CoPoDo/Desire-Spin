import { motion } from 'framer-motion';

const wrap = 'w-full h-full p-1.5 flex items-center justify-center';

export function CrownSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,198,42,0.55)]">
        <defs>
          <linearGradient id="cr" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5b8" />
            <stop offset="60%" stopColor="#ffc62a" />
            <stop offset="100%" stopColor="#a37306" />
          </linearGradient>
        </defs>
        <path d="M8 28 L 18 18 L 26 32 L 32 14 L 38 32 L 46 18 L 56 28 L 52 50 L 12 50 Z" fill="url(#cr)" stroke="#7a4d04" strokeWidth="1.4" />
        <rect x="12" y="46" width="40" height="6" fill="#a37306" />
        <circle cx="18" cy="18" r="3" fill="#ff3d6b" stroke="#7a0c2c" />
        <circle cx="32" cy="14" r="3" fill="#22d3ee" stroke="#0e3f6e" />
        <circle cx="46" cy="18" r="3" fill="#22ff7a" stroke="#0a3a14" />
        <ellipse cx="22" cy="40" rx="3" ry="2" fill="#fff" opacity="0.6" />
      </svg>
    </div>
  );
}

export function RingSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,198,42,0.55)]">
        <defs>
          <radialGradient id="rg" cx="40%" cy="40%" r="60%">
            <stop offset="0%" stopColor="#fff5b8" />
            <stop offset="60%" stopColor="#ffc62a" />
            <stop offset="100%" stopColor="#7a4d04" />
          </radialGradient>
        </defs>
        <ellipse cx="32" cy="42" rx="20" ry="14" fill="none" stroke="url(#rg)" strokeWidth="6" />
        <path d="M22 26 L 32 8 L 42 26 Z" fill="url(#rg)" stroke="#7a4d04" strokeWidth="1.2" />
        <circle cx="32" cy="22" r="6" fill="#22d3ee" stroke="#0e3f6e" strokeWidth="1.4" />
        <circle cx="30" cy="20" r="2" fill="#fff" opacity="0.7" />
      </svg>
    </div>
  );
}

export function HourglassSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,198,42,0.4)]">
        <defs>
          <linearGradient id="hg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5b8" />
            <stop offset="60%" stopColor="#ffc62a" />
            <stop offset="100%" stopColor="#a37306" />
          </linearGradient>
        </defs>
        <rect x="14" y="10" width="36" height="6" fill="url(#hg)" stroke="#7a4d04" />
        <rect x="14" y="48" width="36" height="6" fill="url(#hg)" stroke="#7a4d04" />
        <path d="M16 16 L 48 16 L 32 32 L 48 48 L 16 48 L 32 32 Z" fill="rgba(255,255,255,0.08)" stroke="#ffc62a" strokeWidth="1.4" />
        <path d="M22 20 L 42 20 L 32 30 Z" fill="#ff8a3d" />
        <path d="M22 44 L 42 44 L 32 38 Z" fill="#ff8a3d" />
      </svg>
    </div>
  );
}

export function ChaliceSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_8px_rgba(255,198,42,0.5)]">
        <defs>
          <linearGradient id="ch" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5b8" />
            <stop offset="60%" stopColor="#ffc62a" />
            <stop offset="100%" stopColor="#7a4d04" />
          </linearGradient>
        </defs>
        <path d="M14 14 L 50 14 L 48 28 C 48 38 40 44 32 44 C 24 44 16 38 16 28 Z" fill="url(#ch)" stroke="#7a4d04" />
        <ellipse cx="32" cy="22" rx="14" ry="3" fill="#ff3d6b" />
        <rect x="29" y="44" width="6" height="10" fill="url(#ch)" />
        <rect x="22" y="54" width="20" height="4" fill="url(#ch)" stroke="#7a4d04" />
      </svg>
    </div>
  );
}

function gem(stop1: string, stop2: string, stop3: string, glow: string) {
  return function Gem() {
    return (
      <div className={wrap}>
        <svg viewBox="0 0 64 64" className="w-full h-full" style={{ filter: `drop-shadow(0 4px 8px ${glow})` }}>
          <defs>
            <linearGradient id={`gm-${stop2}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stop1} />
              <stop offset="60%" stopColor={stop2} />
              <stop offset="100%" stopColor={stop3} />
            </linearGradient>
          </defs>
          <path d="M32 8 L 56 24 L 32 56 L 8 24 Z" fill={`url(#gm-${stop2})`} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
          <path d="M32 8 L 22 24 L 8 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <path d="M32 8 L 42 24 L 56 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
          <path d="M22 24 L 32 56 L 42 24" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
          <path d="M16 18 L 24 22 L 28 14" fill="rgba(255,255,255,0.45)" />
        </svg>
      </div>
    );
  };
}

export const RedGemSymbol = gem('#ffd6dc', '#ff3d6b', '#7a0c2c', 'rgba(255,40,90,0.5)');
export const PurpleGemSymbol = gem('#e6d4ff', '#a78bfa', '#3b1873', 'rgba(167,139,250,0.5)');
export const YellowGemSymbol = gem('#fff5b8', '#ffc62a', '#7a4d04', 'rgba(255,198,42,0.45)');
export const GreenGemSymbol = gem('#caffd2', '#22ff7a', '#0a3a14', 'rgba(34,255,122,0.45)');
export const BlueGemSymbol = gem('#cdf3ff', '#22d3ee', '#0e3f6e', 'rgba(34,211,238,0.45)');

export function ZeusBoltSymbol() {
  return (
    <div className={wrap}>
      <svg viewBox="0 0 64 64" className="w-full h-full drop-shadow-[0_4px_10px_rgba(255,198,42,0.7)]">
        <defs>
          <linearGradient id="zb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5b8" />
            <stop offset="60%" stopColor="#ffc62a" />
            <stop offset="100%" stopColor="#ff8a3d" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="26" fill="rgba(0,0,0,0.35)" stroke="#ffc62a" strokeWidth="2" />
        <path d="M30 8 L 18 32 L 28 32 L 22 56 L 46 26 L 34 26 L 40 8 Z" fill="url(#zb)" stroke="#5a3a04" strokeWidth="1.2" />
      </svg>
    </div>
  );
}

export function OlympusMultiplierSymbol({ value, accent }: { value: number; accent: string }) {
  return (
    <motion.div
      className="w-full h-full p-1 flex items-center justify-center"
      initial={{ scale: 0.5, opacity: 0, rotate: -30 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: 'spring', stiffness: 320, damping: 16 }}
    >
      <div
        className="rounded-full font-display font-extrabold flex items-center justify-center text-base sm:text-lg md:text-xl lg:text-2xl"
        style={{
          background: `radial-gradient(circle at 35% 30%, #fffbe1, ${accent} 60%, #2a1804 100%)`,
          color: '#2a1804',
          width: '88%',
          aspectRatio: '1 / 1',
          boxShadow: `0 0 22px ${accent}cc, inset 0 0 12px rgba(255,255,255,0.6)`,
          border: '2px solid rgba(255,255,255,0.85)',
        }}
      >
        {value}×
      </div>
    </motion.div>
  );
}

export const OLYMPUS_SYMBOL_MAP: Record<string, React.FC> = {
  crown: CrownSymbol,
  ring: RingSymbol,
  hourglass: HourglassSymbol,
  chalice: ChaliceSymbol,
  'gem-red': RedGemSymbol,
  'gem-purple': PurpleGemSymbol,
  'gem-yellow': YellowGemSymbol,
  'gem-green': GreenGemSymbol,
  'gem-blue': BlueGemSymbol,
  'zeus-bolt': ZeusBoltSymbol,
};
