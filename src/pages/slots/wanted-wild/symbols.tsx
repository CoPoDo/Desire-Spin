/** Wanted Dead or a Wild symbols — Western themed. Heroes get full SVG
 *  art (outlaw, sheriff, revolver, whiskey, poster scatter); the rest
 *  are detailed SVGs as well so every cell reads cleanly at slot scale. */
import { motion } from 'framer-motion';

const wrap = 'wanted-sym';
const heroWrap = 'wanted-sym wanted-sym-hero';
const scatterWrap = 'wanted-sym wanted-sym-scatter';

/** Masked Outlaw — top tier. Cowboy hat + bandana mask + grim eyes. */
export function OutlawSymbol() {
  return (
    <div className={heroWrap} style={{ color: '#c8932e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ow-hat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3a18" />
            <stop offset="60%" stopColor="#3a1a04" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
          <radialGradient id="ow-face" cx="50%" cy="42%" r="55%">
            <stop offset="0%" stopColor="#e0c8a8" />
            <stop offset="60%" stopColor="#a8784a" />
            <stop offset="100%" stopColor="#5a3a1a" />
          </radialGradient>
          <linearGradient id="ow-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#5a081a" />
            <stop offset="50%" stopColor="#c8102e" />
            <stop offset="100%" stopColor="#5a081a" />
          </linearGradient>
        </defs>
        {/* Cowboy hat brim */}
        <path d="M6 22 Q 32 28 58 22 Q 56 25 32 26 Q 8 25 6 22 Z" fill="url(#ow-hat)" stroke="#1a0a02" strokeWidth="1" />
        {/* Hat crown — pinched (cowboy) */}
        <path d="M22 22 Q 22 8 32 8 Q 42 8 42 22 Q 38 19 32 19 Q 26 19 22 22 Z" fill="url(#ow-hat)" stroke="#1a0a02" strokeWidth="1" />
        {/* Centre crease */}
        <path d="M32 9 Q 31 16 32 19" stroke="#0a0402" strokeWidth=".5" fill="none" />
        {/* Hat band */}
        <path d="M22 22 Q 32 24 42 22 L 42 20 Q 32 22 22 20 Z" fill="#5a3a04" stroke="#1a0a04" strokeWidth=".4" />
        <circle cx="38" cy="21" r="1" fill="#ffd166" stroke="#5a3a04" strokeWidth=".3" />
        {/* Face */}
        <ellipse cx="32" cy="38" rx="11" ry="13" fill="url(#ow-face)" stroke="#3a1a08" strokeWidth=".7" />
        {/* Heavy eyebrows (intimidating) */}
        <path d="M24 32 Q 27 30 31 32" stroke="#1a0a04" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <path d="M33 32 Q 37 30 40 32" stroke="#1a0a04" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* Eyes — narrow, piercing */}
        <ellipse cx="27.5" cy="35" rx="1.6" ry="1" fill="#1a0a04" />
        <ellipse cx="36.5" cy="35" rx="1.6" ry="1" fill="#1a0a04" />
        <circle cx="27.7" cy="34.7" r=".4" fill="#fff" />
        <circle cx="36.7" cy="34.7" r=".4" fill="#fff" />
        {/* Bandana mask covering nose + mouth */}
        <path d="M18 40 Q 32 44 46 40 L 46 52 L 18 52 Z" fill="url(#ow-band)" stroke="#5a081a" strokeWidth=".7" />
        {/* Bandana fold lines */}
        <path d="M22 44 L 24 50" stroke="#5a081a" strokeWidth=".4" />
        <path d="M40 44 L 42 50" stroke="#5a081a" strokeWidth=".4" />
        <path d="M30 42 Q 32 47 30 52" stroke="#5a081a" strokeWidth=".3" fill="none" />
        <path d="M34 42 Q 32 47 34 52" stroke="#5a081a" strokeWidth=".3" fill="none" />
        {/* Bandana tie knot at side */}
        <circle cx="46" cy="42" r="1.5" fill="#7a0810" />
        <path d="M47 41 L 51 38 M48 43 L 53 44" stroke="#5a081a" strokeWidth="1" strokeLinecap="round" />
        {/* Coat collar */}
        <path d="M16 52 L 32 56 L 48 52 L 48 60 L 16 60 Z" fill="#3a1a08" stroke="#1a0a04" strokeWidth=".7" />
      </svg>
    </div>
  );
}

/** Sheriff badge — 6-pointed star with engraved word. */
export function SheriffSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="sh-gold" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="22%" stopColor="#fff5c4" />
            <stop offset="55%" stopColor="#ffd166" />
            <stop offset="85%" stopColor="#a8761a" />
            <stop offset="100%" stopColor="#3a2a04" />
          </radialGradient>
        </defs>
        {/* Outer 6-pointed star */}
        <path
          d="M32 4 L 38 22 L 58 22 L 42 34 L 48 54 L 32 42 L 16 54 L 22 34 L 6 22 L 26 22 Z"
          fill="url(#sh-gold)"
          stroke="#3a2a04"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Ball tips on each star point */}
        {[
          [32, 4], [58, 22], [48, 54], [16, 54], [6, 22],
        ].map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.5" fill="#fff5c4" stroke="#3a2a04" strokeWidth=".4" />
        ))}
        {/* Central engraving disc */}
        <circle cx="32" cy="32" r="9" fill="#a8761a" stroke="#3a2a04" strokeWidth=".7" />
        <text x="32" y="31" textAnchor="middle" fontSize="3.5" fontFamily="serif" fontWeight="800" fill="#fff5c4">
          SHERIFF
        </text>
        <path d="M26 35 Q 32 37 38 35" fill="none" stroke="#fff5c4" strokeWidth=".4" />
        <text x="32" y="38" textAnchor="middle" fontSize="2.4" fontFamily="serif" fill="#fff5c4">
          DEPT
        </text>
        {/* Star highlight */}
        <ellipse cx="22" cy="18" rx="3" ry="2" fill="rgba(255,255,255,.55)" />
      </svg>
    </div>
  );
}

/** Revolver — barrel + cylinder + grip. */
export function RevolverSymbol() {
  return (
    <div className={wrap} style={{ color: '#a8a29e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="rv-metal" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#dde4f0" />
            <stop offset="50%" stopColor="#7a808c" />
            <stop offset="100%" stopColor="#2a2f3a" />
          </linearGradient>
          <linearGradient id="rv-grip" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a4a18" />
            <stop offset="100%" stopColor="#2a1a04" />
          </linearGradient>
        </defs>
        {/* Barrel */}
        <rect x="22" y="26" width="34" height="6" rx="1" fill="url(#rv-metal)" stroke="#2a2f3a" strokeWidth=".7" />
        <rect x="22" y="26" width="34" height="1" fill="rgba(255,255,255,.4)" />
        {/* Front sight */}
        <rect x="55" y="24" width="2" height="3" fill="#2a2f3a" />
        {/* Cylinder */}
        <ellipse cx="22" cy="29" rx="6" ry="6" fill="url(#rv-metal)" stroke="#2a2f3a" strokeWidth="1" />
        {/* Cylinder chambers (6 dots arranged) */}
        {[0, 60, 120, 180, 240, 300].map((a, i) => {
          const x = 22 + Math.cos((a * Math.PI) / 180) * 3;
          const y = 29 + Math.sin((a * Math.PI) / 180) * 3;
          return <circle key={i} cx={x} cy={y} r=".7" fill="#1a1f29" />;
        })}
        <circle cx="22" cy="29" r=".8" fill="#3a3f4a" />
        {/* Trigger guard */}
        <path d="M14 32 Q 14 38 18 38 L 24 38 Q 28 38 28 32" fill="none" stroke="url(#rv-metal)" strokeWidth="2" />
        {/* Trigger */}
        <path d="M19 34 Q 21 38 22 36" fill="none" stroke="#2a2f3a" strokeWidth="1.5" strokeLinecap="round" />
        {/* Grip */}
        <path d="M16 34 L 12 50 L 18 54 L 24 38 Z" fill="url(#rv-grip)" stroke="#1a0a04" strokeWidth=".7" />
        {/* Grip checkering pattern */}
        <path d="M14 40 L 18 38 M14 44 L 20 42 M16 48 L 20 46" stroke="#1a0a04" strokeWidth=".3" />
        {/* Hammer */}
        <rect x="11" y="24" width="3" height="4" fill="url(#rv-metal)" stroke="#2a2f3a" strokeWidth=".5" />
      </svg>
    </div>
  );
}

/** Whiskey — corked brown bottle + glass with amber liquid. */
export function WhiskeySymbol() {
  return (
    <div className={wrap} style={{ color: '#c8932e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="wk-bottle" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9b6a2a" />
            <stop offset="40%" stopColor="#5a3a04" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
          <linearGradient id="wk-amber" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#a8761a" />
          </linearGradient>
        </defs>
        {/* Bottle */}
        <path d="M24 18 L 24 50 Q 24 58 32 58 Q 40 58 40 50 L 40 18 Z" fill="url(#wk-bottle)" stroke="#1a0a02" strokeWidth=".8" />
        {/* Bottle neck */}
        <rect x="29" y="6" width="6" height="14" fill="url(#wk-bottle)" stroke="#1a0a02" strokeWidth=".7" />
        {/* Cork */}
        <rect x="28" y="3" width="8" height="4" rx=".5" fill="#7a4a18" stroke="#3a1a04" strokeWidth=".5" />
        {/* Liquid (amber) */}
        <path d="M25 32 L 25 50 Q 25 57 32 57 Q 39 57 39 50 L 39 32 Z" fill="url(#wk-amber)" opacity=".85" />
        {/* Bottle highlight */}
        <path d="M27 24 L 27 48" stroke="rgba(255,200,80,.55)" strokeWidth="1.4" strokeLinecap="round" />
        {/* Old-timey label (off-white tag) */}
        <rect x="25" y="38" width="14" height="11" fill="#f5e9d4" stroke="#5a3a04" strokeWidth=".6" />
        <text x="32" y="44" textAnchor="middle" fontSize="3" fontFamily="serif" fontWeight="800" fill="#5a3a04">WHISKEY</text>
        <path d="M28 46 L 36 46" stroke="#5a3a04" strokeWidth=".25" />
        <text x="32" y="48.5" textAnchor="middle" fontSize="1.8" fontFamily="serif" fill="#7a4a04">1873 RESERVE</text>
        {/* Corner curl on label */}
        <path d="M25 38 L 27 39 L 25 41 Z" fill="#a8957a" />
      </svg>
    </div>
  );
}

/** Horseshoe — lucky bronze U-shape with nail dots. */
export function HorseshoeSymbol() {
  return (
    <div className={wrap} style={{ color: '#c8932e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="hs-bronze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe9a8" />
            <stop offset="40%" stopColor="#c8932e" />
            <stop offset="100%" stopColor="#5a3a04" />
          </linearGradient>
        </defs>
        {/* Outer U */}
        <path
          d="M14 18 Q 14 50 32 56 Q 50 50 50 18 L 42 18 Q 42 44 32 48 Q 22 44 22 18 Z"
          fill="url(#hs-bronze)"
          stroke="#3a2a04"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Top opening band */}
        <rect x="14" y="14" width="8" height="6" rx="1" fill="url(#hs-bronze)" stroke="#3a2a04" strokeWidth=".7" />
        <rect x="42" y="14" width="8" height="6" rx="1" fill="url(#hs-bronze)" stroke="#3a2a04" strokeWidth=".7" />
        {/* Nail dots — 7 pairs */}
        {[20, 26, 34, 42, 48].map((y, i) => (
          <g key={i}>
            <circle cx={16 + (Math.sin(i) * 0.8 - 0.5)} cy={y} r=".7" fill="#1a0a02" />
            <circle cx={48 - (Math.sin(i) * 0.8 - 0.5)} cy={y} r=".7" fill="#1a0a02" />
          </g>
        ))}
        {/* Highlight along inner rim */}
        <path d="M22 20 Q 22 42 32 46" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="1" />
      </svg>
    </div>
  );
}

/** Cowboy boot — leather with stitching + spur. */
export function BootSymbol() {
  return (
    <div className={wrap} style={{ color: '#c8932e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="bt-leather" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a87042" />
            <stop offset="50%" stopColor="#5a3018" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
        </defs>
        {/* Boot shaft */}
        <path d="M16 8 L 30 8 L 32 36 L 16 36 Z" fill="url(#bt-leather)" stroke="#1a0a02" strokeWidth=".8" />
        {/* Boot foot (bent forward) */}
        <path d="M16 36 L 32 36 L 52 48 Q 54 50 54 54 L 16 54 Z" fill="url(#bt-leather)" stroke="#1a0a02" strokeWidth=".8" strokeLinejoin="round" />
        {/* Heel */}
        <rect x="16" y="50" width="6" height="6" fill="#3a1a04" stroke="#1a0a02" strokeWidth=".6" />
        {/* Stitching lines */}
        <path d="M18 12 L 28 12" stroke="#ffd166" strokeWidth=".4" strokeDasharray="1 1.5" />
        <path d="M18 22 L 30 22" stroke="#ffd166" strokeWidth=".4" strokeDasharray="1 1.5" />
        <path d="M18 32 L 30 32" stroke="#ffd166" strokeWidth=".4" strokeDasharray="1 1.5" />
        {/* Top fold */}
        <path d="M16 8 L 30 8 L 30 12 L 16 12 Z" fill="#3a1a08" stroke="#1a0a02" strokeWidth=".4" />
        {/* Decorative star on shaft */}
        <path d="M22 18 L 23 21 L 26 21 L 24 23 L 25 26 L 22 24 L 19 26 L 20 23 L 18 21 L 21 21 Z" fill="#ffd166" stroke="#5a3a04" strokeWidth=".3" />
        {/* Toe cap */}
        <path d="M48 50 Q 52 50 54 52" fill="none" stroke="rgba(255,255,255,.3)" strokeWidth=".7" />
        {/* Spur */}
        <g transform="translate(54 48)">
          <circle cx="3" cy="0" r="3" fill="none" stroke="#dde4f0" strokeWidth=".7" />
          {[0, 60, 120, 180, 240, 300].map((a, i) => {
            const x = 3 + Math.cos((a * Math.PI) / 180) * 3;
            const y = Math.sin((a * Math.PI) / 180) * 3;
            return <line key={i} x1="3" y1="0" x2={x} y2={y} stroke="#dde4f0" strokeWidth=".4" />;
          })}
        </g>
      </svg>
    </div>
  );
}

/** Cowboy hat — Stetson silhouette. */
export function HatSymbol() {
  return (
    <div className={wrap} style={{ color: '#7a4a18' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ht-felt" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a87042" />
            <stop offset="55%" stopColor="#5a3018" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
        </defs>
        {/* Brim — wide shaped */}
        <path d="M4 38 Q 32 48 60 38 Q 56 44 32 46 Q 8 44 4 38 Z" fill="url(#ht-felt)" stroke="#1a0a02" strokeWidth="1" />
        {/* Crown — pinched front */}
        <path d="M22 38 Q 22 18 32 16 Q 42 18 42 38 Q 36 36 32 36 Q 28 36 22 38 Z" fill="url(#ht-felt)" stroke="#1a0a02" strokeWidth="1" />
        {/* Centre crease */}
        <path d="M32 18 Q 31 28 32 36" stroke="#0a0402" strokeWidth=".8" fill="none" />
        {/* Hat band */}
        <path d="M22 36 Q 32 38 42 36 L 42 32 Q 32 34 22 32 Z" fill="#3a2a04" stroke="#1a0a04" strokeWidth=".4" />
        {/* Little buckle */}
        <rect x="30" y="33" width="4" height="2" fill="#ffd166" stroke="#5a3a04" strokeWidth=".3" />
        {/* Highlight on crown */}
        <ellipse cx="27" cy="22" rx="2.5" ry="5" fill="rgba(255,200,140,.4)" />
      </svg>
    </div>
  );
}

/** Playing card — Ace of Spades with red corner. */
export function CardSymbol() {
  return (
    <div className={wrap} style={{ color: '#fff5e0' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        {/* Card */}
        <rect x="14" y="8" width="36" height="48" rx="3" fill="#fff5e0" stroke="#5a3a04" strokeWidth="1" transform="rotate(-6 32 32)" />
        {/* Top-left A */}
        <text x="20" y="22" fontSize="6" fontFamily="serif" fontWeight="800" fill="#1a0a04" transform="rotate(-6 32 32)">A</text>
        {/* Spade */}
        <g transform="translate(0 0) rotate(-6 32 32)">
          <path d="M22 25 Q 19 28 22 31 Q 24 30 22 25 Z" fill="#1a0a04" />
        </g>
        {/* Centre big spade */}
        <g transform="rotate(-6 32 32)">
          <path
            d="M32 22 C 26 28 22 32 26 38 C 28 42 32 40 32 38 C 32 40 36 42 38 38 C 42 32 38 28 32 22 Z"
            fill="#1a0a04"
          />
          {/* Stem */}
          <path d="M32 38 L 30 46 L 34 46 Z" fill="#1a0a04" />
        </g>
        {/* Bottom-right A (rotated) */}
        <g transform="rotate(174 32 32)">
          <text x="20" y="22" fontSize="6" fontFamily="serif" fontWeight="800" fill="#1a0a04">A</text>
        </g>
      </svg>
    </div>
  );
}

/** Gold coin — old-west doubloon. */
export function CoinSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="cn-gold" cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#fff5c4" />
            <stop offset="55%" stopColor="#ffd166" />
            <stop offset="85%" stopColor="#a8761a" />
            <stop offset="100%" stopColor="#3a2a04" />
          </radialGradient>
        </defs>
        {/* Main disc */}
        <circle cx="32" cy="32" r="22" fill="url(#cn-gold)" stroke="#3a2a04" strokeWidth="1" />
        {/* Inner ring */}
        <circle cx="32" cy="32" r="17" fill="none" stroke="#5a3a04" strokeWidth=".5" />
        {/* Centre $ */}
        <text
          x="32"
          y="40"
          textAnchor="middle"
          fontSize="22"
          fontFamily="serif"
          fontWeight="900"
          fill="#5a3a04"
          stroke="#3a2a04"
          strokeWidth=".4"
        >
          $
        </text>
        {/* Decorative dots around the rim */}
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((a, i) => {
          const x = 32 + Math.cos((a * Math.PI) / 180) * 19.5;
          const y = 32 + Math.sin((a * Math.PI) / 180) * 19.5;
          return <circle key={i} cx={x} cy={y} r=".6" fill="#5a3a04" />;
        })}
        {/* Highlight */}
        <ellipse cx="22" cy="22" rx="4" ry="2.5" fill="rgba(255,255,255,.55)" transform="rotate(-30 22 22)" />
      </svg>
    </div>
  );
}

/** Wanted Poster scatter — parchment with skull + WANTED text. */
export function PosterSymbol() {
  return (
    <div className={scatterWrap} style={{ color: '#ffd166' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="pst-paper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5d8" />
            <stop offset="100%" stopColor="#c89a5a" />
          </linearGradient>
        </defs>
        {/* Halo */}
        <circle cx="32" cy="32" r="26" fill="rgba(255,200,80,.18)" />
        {/* Paper with torn edges */}
        <path
          d="M8 10 Q 32 8 56 10 L 58 22 L 56 34 L 58 46 L 56 56 Q 32 58 8 56 L 6 44 L 8 32 L 6 20 Z"
          fill="url(#pst-paper)"
          stroke="#5a3a04"
          strokeWidth=".8"
        />
        {/* Bullet holes (2) */}
        <circle cx="14" cy="18" r="1.6" fill="#1a0a02" stroke="#3a1a04" strokeWidth=".4" />
        <circle cx="50" cy="48" r="1.4" fill="#1a0a02" stroke="#3a1a04" strokeWidth=".4" />
        {/* WANTED title */}
        <text x="32" y="20" textAnchor="middle" fontSize="6" fontFamily="serif" fontWeight="900" fill="#1a0a04">
          WANTED
        </text>
        <path d="M14 22 L 50 22" stroke="#1a0a04" strokeWidth=".5" />
        {/* Centre skull */}
        <g transform="translate(32 36)">
          <circle cx="0" cy="-2" r="6" fill="#fff5e0" stroke="#1a0a02" strokeWidth=".6" />
          <ellipse cx="-2.2" cy="-2" rx="1.2" ry="1.4" fill="#1a0a02" />
          <ellipse cx="2.2" cy="-2" rx="1.2" ry="1.4" fill="#1a0a02" />
          <path d="M-1 1.5 Q 0 3 1 1.5" fill="none" stroke="#1a0a02" strokeWidth=".5" />
          <rect x="-3" y="3.5" width="6" height="2" fill="#fff5e0" stroke="#1a0a02" strokeWidth=".4" />
          <line x1="-1.5" y1="3.5" x2="-1.5" y2="5.5" stroke="#1a0a02" strokeWidth=".3" />
          <line x1="0" y1="3.5" x2="0" y2="5.5" stroke="#1a0a02" strokeWidth=".3" />
          <line x1="1.5" y1="3.5" x2="1.5" y2="5.5" stroke="#1a0a02" strokeWidth=".3" />
        </g>
        {/* DEAD OR ALIVE */}
        <text x="32" y="50" textAnchor="middle" fontSize="3" fontFamily="serif" fontWeight="700" fill="#1a0a04">
          DEAD OR ALIVE
        </text>
        <text x="32" y="55" textAnchor="middle" fontSize="2.2" fontFamily="serif" fill="#5a3a04">
          REWARD $5,000
        </text>
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
      <div className={`wanted-orb ${tier !== 'normal' ? `wanted-orb-${tier}` : ''}`}>
        <span className="wanted-orb-text">{value}×</span>
      </div>
    </motion.div>
  );
}

export const WANTED_SYMBOL_MAP: Record<string, React.FC> = {
  outlaw: OutlawSymbol,
  sheriff: SheriffSymbol,
  revolver: RevolverSymbol,
  whiskey: WhiskeySymbol,
  horseshoe: HorseshoeSymbol,
  boot: BootSymbol,
  hat: HatSymbol,
  card: CardSymbol,
  coin: CoinSymbol,
  poster: PosterSymbol,
};
