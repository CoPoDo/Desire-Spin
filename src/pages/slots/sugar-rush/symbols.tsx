/** Sugar Rush dessert-themed symbols — every cell ships as custom SVG art
 *  matching the visual quality bar of the other slots in the lobby. */
import { motion } from 'framer-motion';

const wrap = 'bonanza-sym';
const scatterWrap = 'bonanza-sym bonanza-sym-scatter sugar-sym-scatter';

/** Donut — pink-glazed with rainbow sprinkles, hole in the middle. */
export function DonutSymbol() {
  return (
    <div className={wrap} style={{ color: '#ff7ad9' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="dn-dough" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#fff5e0" />
            <stop offset="60%" stopColor="#d8a458" />
            <stop offset="100%" stopColor="#5a3018" />
          </radialGradient>
          <radialGradient id="dn-glaze" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="40%" stopColor="#ff7ad9" />
            <stop offset="80%" stopColor="#c042b8" />
            <stop offset="100%" stopColor="#5a124a" />
          </radialGradient>
        </defs>
        {/* Donut dough (outer ring) */}
        <circle cx="32" cy="34" r="24" fill="url(#dn-dough)" stroke="#5a3018" strokeWidth=".8" />
        {/* Pink glaze on top with drip pattern */}
        <path
          d="M 32 14 C 18 14 10 22 10 32 C 10 30 12 26 18 24 L 22 30 L 26 22 L 32 28 L 38 20 L 42 28 L 48 22 L 54 28 C 54 22 46 14 32 14 Z"
          fill="url(#dn-glaze)"
          stroke="#5a124a"
          strokeWidth=".5"
        />
        {/* Glaze drip over hole */}
        <circle cx="32" cy="34" r="9" fill="url(#dn-dough)" stroke="#5a3018" strokeWidth=".7" />
        {/* Sprinkles */}
        {[
          [22, 22, '#ffd166', -20],
          [26, 18, '#1fff7a', 30],
          [38, 18, '#5fb8ff', -10],
          [44, 22, '#ff5560', 60],
          [16, 28, '#a78bfa', 80],
          [20, 32, '#ffd166', 0],
          [44, 30, '#1fff7a', 45],
          [48, 26, '#ff5560', 75],
          [42, 32, '#5fb8ff', -25],
          [28, 14, '#a78bfa', 90],
        ].map(([x, y, color, rot], i) => (
          <rect
            key={i}
            x={Number(x) - 0.7}
            y={Number(y) - 0.3}
            width="3"
            height="0.7"
            rx="0.3"
            fill={String(color)}
            transform={`rotate(${rot} ${x} ${y})`}
          />
        ))}
        {/* Highlight */}
        <ellipse cx="22" cy="22" rx="3" ry="1.5" fill="rgba(255,255,255,.55)" transform="rotate(-25 22 22)" />
      </svg>
    </div>
  );
}

/** Cupcake — frosted with cherry on top. */
export function CupcakeSymbol() {
  return (
    <div className={wrap} style={{ color: '#ffae50' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="cc-wrapper" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd8b8" />
            <stop offset="50%" stopColor="#c8932e" />
            <stop offset="100%" stopColor="#5a3a04" />
          </linearGradient>
          <radialGradient id="cc-frost" cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="40%" stopColor="#ffaad0" />
            <stop offset="80%" stopColor="#ff5fa2" />
            <stop offset="100%" stopColor="#7a1c4a" />
          </radialGradient>
        </defs>
        {/* Wrapper (paper liner) */}
        <path d="M 12 36 L 18 60 L 46 60 L 52 36 Z" fill="url(#cc-wrapper)" stroke="#3a2204" strokeWidth=".7" />
        {/* Wrapper pleats */}
        {[20, 26, 32, 38, 44].map((x, i) => (
          <line key={i} x1={x} y1="36" x2={x + (x - 32) * 0.18} y2="60" stroke="#3a2204" strokeWidth=".4" opacity=".55" />
        ))}
        {/* Frosting (swirled mound) */}
        <path
          d="M 14 36 Q 18 22 24 24 Q 28 14 36 18 Q 44 14 46 22 Q 52 24 50 36 Z"
          fill="url(#cc-frost)"
          stroke="#7a1c4a"
          strokeWidth=".5"
        />
        {/* Frost swirl detail */}
        <path d="M 22 32 Q 28 24 34 28 Q 40 22 44 30" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".7" />
        {/* Cherry on top */}
        <circle cx="36" cy="14" r="3" fill="#c8102e" stroke="#5a081a" strokeWidth=".4" />
        <ellipse cx="35" cy="13" rx="1" ry=".7" fill="rgba(255,255,255,.7)" />
        <path d="M 36 11 Q 38 7 40 8" fill="none" stroke="#1aa744" strokeWidth=".8" strokeLinecap="round" />
        {/* Sprinkles on frosting */}
        <circle cx="22" cy="28" r=".7" fill="#1fff7a" />
        <circle cx="42" cy="30" r=".7" fill="#5fb8ff" />
        <circle cx="32" cy="22" r=".7" fill="#ffd166" />
      </svg>
    </div>
  );
}

/** Popsicle — three-coloured striped popsicle on a stick. */
export function PopsicleSymbol() {
  return (
    <div className={wrap} style={{ color: '#5fb8ff' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <linearGradient id="ps-stick" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8761a" />
            <stop offset="100%" stopColor="#5a3a04" />
          </linearGradient>
          <linearGradient id="ps-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a3d4ff" />
            <stop offset="100%" stopColor="#1f6ac8" />
          </linearGradient>
          <linearGradient id="ps-mid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fffac4" />
            <stop offset="100%" stopColor="#ffae50" />
          </linearGradient>
          <linearGradient id="ps-bot" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffaa9b" />
            <stop offset="100%" stopColor="#c8102e" />
          </linearGradient>
        </defs>
        {/* Stick */}
        <rect x="29" y="46" width="6" height="14" rx="1" fill="url(#ps-stick)" stroke="#3a1a04" strokeWidth=".5" />
        {/* Popsicle body — rounded rectangle */}
        <path
          d="M 18 14 Q 18 10 22 10 L 42 10 Q 46 10 46 14 L 46 46 L 18 46 Z"
          fill="url(#ps-top)"
          stroke="#0a3a6a"
          strokeWidth=".7"
        />
        {/* Three colour stripes */}
        <rect x="18" y="14" width="28" height="11" fill="url(#ps-top)" />
        <rect x="18" y="25" width="28" height="11" fill="url(#ps-mid)" />
        <rect x="18" y="36" width="28" height="10" fill="url(#ps-bot)" />
        {/* Stripe dividers (slight wave) */}
        <path d="M 18 25 Q 32 23 46 25" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".7" />
        <path d="M 18 36 Q 32 34 46 36" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth=".7" />
        {/* Highlight along the side */}
        <rect x="22" y="14" width="2" height="32" fill="rgba(255,255,255,.45)" />
        {/* Frost crystals */}
        <circle cx="38" cy="20" r=".7" fill="rgba(255,255,255,.7)" />
        <circle cx="40" cy="32" r=".7" fill="rgba(255,255,255,.6)" />
        <circle cx="24" cy="40" r=".7" fill="rgba(255,255,255,.6)" />
      </svg>
    </div>
  );
}

/** Gingerbread — gingerbread man cookie with icing eyes + smile. */
export function GingerbSymbol() {
  return (
    <div className={wrap} style={{ color: '#c8932e' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="gb-cookie" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#e8a868" />
            <stop offset="60%" stopColor="#a87042" />
            <stop offset="100%" stopColor="#5a3018" />
          </radialGradient>
        </defs>
        {/* Head */}
        <circle cx="32" cy="16" r="8" fill="url(#gb-cookie)" stroke="#3a1a04" strokeWidth=".7" />
        {/* Body (rounded rectangle) */}
        <path d="M 22 22 Q 22 24 24 26 L 24 42 Q 24 46 32 46 Q 40 46 40 42 L 40 26 Q 42 24 42 22 Z" fill="url(#gb-cookie)" stroke="#3a1a04" strokeWidth=".7" />
        {/* Arms */}
        <path d="M 22 28 Q 14 26 12 32 Q 18 36 24 34" fill="url(#gb-cookie)" stroke="#3a1a04" strokeWidth=".7" />
        <path d="M 42 28 Q 50 26 52 32 Q 46 36 40 34" fill="url(#gb-cookie)" stroke="#3a1a04" strokeWidth=".7" />
        {/* Legs */}
        <path d="M 26 46 L 22 60 L 30 60 L 30 46 Z" fill="url(#gb-cookie)" stroke="#3a1a04" strokeWidth=".7" />
        <path d="M 38 46 L 42 60 L 34 60 L 34 46 Z" fill="url(#gb-cookie)" stroke="#3a1a04" strokeWidth=".7" />
        {/* Icing eyes */}
        <circle cx="29" cy="15" r="1.4" fill="#fff5e0" stroke="#3a1a04" strokeWidth=".3" />
        <circle cx="35" cy="15" r="1.4" fill="#fff5e0" stroke="#3a1a04" strokeWidth=".3" />
        <circle cx="29" cy="15" r=".5" fill="#1a0a04" />
        <circle cx="35" cy="15" r=".5" fill="#1a0a04" />
        {/* Icing smile */}
        <path d="M 28 19 Q 32 21 36 19" stroke="#fff5e0" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        {/* Bowtie */}
        <path d="M 28 24 L 32 26 L 36 24 L 35 28 L 32 27 L 29 28 Z" fill="#c8102e" stroke="#5a081a" strokeWidth=".4" />
        {/* Buttons */}
        <circle cx="32" cy="32" r="1.2" fill="#fff5e0" stroke="#3a1a04" strokeWidth=".3" />
        <circle cx="32" cy="38" r="1.2" fill="#fff5e0" stroke="#3a1a04" strokeWidth=".3" />
        {/* Icing piping on legs/arms */}
        <path d="M 16 30 L 22 30" stroke="#fff5e0" strokeWidth=".5" strokeDasharray="1 1" />
        <path d="M 42 30 L 48 30" stroke="#fff5e0" strokeWidth=".5" strokeDasharray="1 1" />
        <path d="M 24 56 L 28 56" stroke="#fff5e0" strokeWidth=".5" strokeDasharray="1 1" />
        <path d="M 36 56 L 40 56" stroke="#fff5e0" strokeWidth=".5" strokeDasharray="1 1" />
      </svg>
    </div>
  );
}

/** Jellybean — wrapped pile of colourful jellybeans. */
export function JellybeanSymbol() {
  return (
    <div className={wrap} style={{ color: '#a78bfa' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          {(['p', 'g', 'b', 'y', 'r'] as const).map((id) => {
            const colors: Record<string, [string, string]> = {
              p: ['#dab8ff', '#5a1ec0'],
              g: ['#9bdf66', '#1aa744'],
              b: ['#7ac4ff', '#1f6ac8'],
              y: ['#fff5c4', '#c8932e'],
              r: ['#ffaa9b', '#c8102e'],
            };
            const [light, dark] = colors[id]!;
            return (
              <radialGradient key={id} id={`jb-${id}`} cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
                <stop offset="20%" stopColor={light} />
                <stop offset="80%" stopColor={dark} />
                <stop offset="100%" stopColor="#1a0a04" />
              </radialGradient>
            );
          })}
        </defs>
        {/* 7 jellybeans piled */}
        {[
          [16, 30, 'p', -10],
          [26, 26, 'g',  20],
          [38, 28, 'b', -15],
          [48, 32, 'y',  10],
          [22, 38, 'r',   5],
          [34, 36, 'p', -25],
          [44, 40, 'g',  30],
        ].map(([x, y, c, rot], i) => (
          <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
            <ellipse cx="0" cy="0" rx="6" ry="3.6" fill={`url(#jb-${c})`} stroke="#1a0a04" strokeWidth=".4" />
            <ellipse cx="-1.6" cy="-1" rx="1.6" ry=".8" fill="rgba(255,255,255,.65)" />
          </g>
        ))}
        {/* Bowl rim suggestion */}
        <ellipse cx="32" cy="50" rx="22" ry="3" fill="rgba(0,0,0,.18)" />
      </svg>
    </div>
  );
}

/** Gumball — single bright green/colourful gumball with sheen. */
export function GumSymbol() {
  return (
    <div className={wrap} style={{ color: '#1fff7a' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="gb-ball" cx="35%" cy="30%" r="68%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="20%" stopColor="#c4ffd6" />
            <stop offset="55%" stopColor="#1fff7a" />
            <stop offset="85%" stopColor="#0a7a3a" />
            <stop offset="100%" stopColor="#02300a" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#gb-ball)" stroke="#02300a" strokeWidth="1" />
        <ellipse cx="22" cy="22" rx="6" ry="3.5" fill="rgba(255,255,255,.55)" transform="rotate(-25 22 22)" />
        <circle cx="44" cy="42" r="1.5" fill="rgba(255,255,255,.45)" />
        {/* Tiny sparkle */}
        <path d="M 20 20 L 21 22 L 23 22 L 21.5 23 L 22 25 L 20 24 L 18 25 L 18.5 23 L 17 22 L 19 22 Z" fill="#fff" opacity=".75" />
      </svg>
    </div>
  );
}

/** Mint candy — peppermint swirl disc. */
export function MintSymbol() {
  return (
    <div className={wrap} style={{ color: '#7ad6e0' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="mt-disc" cx="40%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="80%" stopColor="#d8f7fa" />
            <stop offset="100%" stopColor="#1aa7c8" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="22" fill="url(#mt-disc)" stroke="#0a4a68" strokeWidth="1" />
        {/* Peppermint pinwheel stripes — 6 red wedges */}
        {[0, 60, 120, 180, 240, 300].map((rot, i) => (
          <path
            key={i}
            d="M 32 32 L 32 12 A 20 20 0 0 1 50 22 Z"
            fill="#c8102e"
            transform={`rotate(${rot} 32 32)`}
          />
        ))}
        {/* White wedges between */}
        {[30, 90, 150, 210, 270, 330].map((rot, i) => (
          <path
            key={i}
            d="M 32 32 L 32 12 A 20 20 0 0 1 50 22 Z"
            fill="rgba(255,255,255,.85)"
            transform={`rotate(${rot} 32 32)`}
          />
        ))}
        {/* Centre cap */}
        <circle cx="32" cy="32" r="3" fill="#fff" stroke="#0a4a68" strokeWidth=".5" />
        {/* Highlight */}
        <ellipse cx="22" cy="22" rx="4" ry="2" fill="rgba(255,255,255,.6)" transform="rotate(-25 22 22)" />
      </svg>
    </div>
  );
}

/** Pink wrapped candy. */
export function PinkCandySymbol() {
  return (
    <div className={wrap} style={{ color: '#ff5fa2' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="pc-body" cx="40%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#ffe7f1" />
            <stop offset="55%" stopColor="#ff5fa2" />
            <stop offset="100%" stopColor="#7a124d" />
          </radialGradient>
        </defs>
        {/* Centre candy */}
        <circle cx="32" cy="34" r="14" fill="url(#pc-body)" stroke="#5a0828" strokeWidth=".7" />
        {/* Wrapper twists */}
        <path d="M 14 34 L 4 28 L 8 38 L 4 48 Z" fill="#ff8fbf" stroke="#5a0828" strokeWidth=".4" />
        <path d="M 50 34 L 60 28 L 56 38 L 60 48 Z" fill="#ff8fbf" stroke="#5a0828" strokeWidth=".4" />
        {/* Wrapper crinkle */}
        <path d="M 6 32 L 12 34" stroke="#5a0828" strokeWidth=".4" />
        <path d="M 6 42 L 12 38" stroke="#5a0828" strokeWidth=".4" />
        <path d="M 58 32 L 52 34" stroke="#5a0828" strokeWidth=".4" />
        <path d="M 58 42 L 52 38" stroke="#5a0828" strokeWidth=".4" />
        {/* Highlight */}
        <ellipse cx="26" cy="28" rx="5" ry="2.6" fill="rgba(255,255,255,.55)" />
      </svg>
    </div>
  );
}

/** Blue wrapped candy. */
export function BlueCandySymbol() {
  return (
    <div className={wrap} style={{ color: '#22d3ee' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="bc-body" cx="40%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#cdf3ff" />
            <stop offset="55%" stopColor="#22a8e0" />
            <stop offset="100%" stopColor="#0e3f6e" />
          </radialGradient>
        </defs>
        <rect x="16" y="20" width="32" height="28" rx="14" fill="url(#bc-body)" stroke="#0e3f6e" strokeWidth=".7" />
        <path d="M 16 34 L 4 28 L 8 38 L 4 48 Z" fill="#7ad6ff" stroke="#0e3f6e" strokeWidth=".4" />
        <path d="M 48 34 L 60 28 L 56 38 L 60 48 Z" fill="#7ad6ff" stroke="#0e3f6e" strokeWidth=".4" />
        <path d="M 6 32 L 16 34" stroke="#0e3f6e" strokeWidth=".4" />
        <path d="M 6 42 L 16 38" stroke="#0e3f6e" strokeWidth=".4" />
        <path d="M 58 32 L 48 34" stroke="#0e3f6e" strokeWidth=".4" />
        <path d="M 58 42 L 48 38" stroke="#0e3f6e" strokeWidth=".4" />
        <ellipse cx="26" cy="28" rx="5" ry="2.6" fill="rgba(255,255,255,.55)" />
      </svg>
    </div>
  );
}

/** Lollipop scatter — swirled candy on a stick (matches Bonanza scatter style). */
export function LollipopSymbol() {
  return (
    <div className={scatterWrap} style={{ color: '#ff5fa2' }}>
      <svg viewBox="0 0 64 64" className="w-full h-full">
        <defs>
          <radialGradient id="sg-lp" cx="38%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="20%" stopColor="#ffe7f1" />
            <stop offset="55%" stopColor="#ff5fa2" />
            <stop offset="85%" stopColor="#a8124d" />
            <stop offset="100%" stopColor="#4a0824" />
          </radialGradient>
          <linearGradient id="sg-stick" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="100%" stopColor="#a8a29e" />
          </linearGradient>
        </defs>
        <circle cx="32" cy="28" r="22" fill="rgba(255,200,230,.15)" />
        <circle cx="32" cy="28" r="18" fill="url(#sg-lp)" stroke="#5a0828" strokeWidth="1" />
        <path d="M32 14 A 14 14 0 0 1 46 28 A 14 14 0 0 1 32 42 A 14 14 0 0 1 18 28 A 14 14 0 0 1 32 14 Z" fill="none" stroke="#fff" strokeWidth="1" opacity=".55" />
        <path d="M32 18 A 10 10 0 0 1 42 28 A 10 10 0 0 1 32 38 A 10 10 0 0 1 22 28 A 10 10 0 0 1 32 18 Z" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".75" />
        <path d="M32 22 A 6 6 0 0 1 38 28 A 6 6 0 0 1 32 34 A 6 6 0 0 1 26 28 A 6 6 0 0 1 32 22 Z" fill="none" stroke="#fff" strokeWidth="1.4" opacity=".9" />
        <ellipse cx="26" cy="22" rx="5" ry="3" fill="rgba(255,255,255,.7)" />
        <rect x="30" y="46" width="4" height="14" rx="1.5" fill="url(#sg-stick)" stroke="#5a4a30" strokeWidth=".6" />
      </svg>
    </div>
  );
}

/** Tiered colour gradient for the Sugar Rush heart multiplier — escalates
 *  from soft pink → magenta → red → orange-fire as the value goes up. */
function heartTier(value: number) {
  if (value >= 200) return { stops: ['#fffbe0', '#ffd166', '#ff5560', '#c8102e', '#5a0810'], glow: 'rgba(255,200,80,1)', stroke: '#5a0810' };
  if (value >= 50)  return { stops: ['#fff5e0', '#ffe0a8', '#ffae50', '#c8102e', '#5a0810'], glow: 'rgba(255,174,80,.95)', stroke: '#5a0810' };
  if (value >= 12)  return { stops: ['#fff5fb', '#ffaad0', '#ff5fa2', '#c41a72', '#5a0828'], glow: 'rgba(255,95,162,.95)', stroke: '#5a0828' };
  if (value >= 6)   return { stops: ['#fff5fb', '#ffd1e2', '#ff7ad9', '#c042b8', '#5a124a'], glow: 'rgba(255,122,217,.85)', stroke: '#5a124a' };
  return { stops: ['#fff5fb', '#ffd1e2', '#ffaad0', '#ff7ad9', '#a8124d'], glow: 'rgba(255,170,208,.85)', stroke: '#7a1c4a' };
}

export function MultiplierSymbol({ value }: { value: number; accent?: string }) {
  // Real Sugar Rush's multiplier symbols are HEART-SHAPED candy hearts,
  // not the round orbs Sweet Bonanza uses. Sugar Rush gets its own SVG
  // heart with theme-tiered candy colours so it's visibly distinct.
  const t = heartTier(value);
  const id = `sr-mult-${value}`;
  return (
    <motion.div
      className="w-full h-full flex items-center justify-center relative"
      initial={{ scale: 0.4, opacity: 0, rotate: -10 }}
      animate={{ scale: [0.4, 1.18, 1], opacity: 1, rotate: 0 }}
      transition={{ duration: 0.45, ease: [0.34, 1.6, 0.64, 1] }}
    >
      <svg viewBox="0 0 64 64" className="w-[92%] h-[92%]"
        style={{ filter: `drop-shadow(0 0 10px ${t.glow}) drop-shadow(0 4px 6px rgba(0,0,0,.55))` }}
      >
        <defs>
          <radialGradient id={id} cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor={t.stops[0]} stopOpacity="0.95" />
            <stop offset="20%" stopColor={t.stops[1]} />
            <stop offset="55%" stopColor={t.stops[2]} />
            <stop offset="85%" stopColor={t.stops[3]} />
            <stop offset="100%" stopColor={t.stops[4]} />
          </radialGradient>
        </defs>
        {/* Candy-heart silhouette */}
        <path
          d="M 32 56 C 8 38 4 22 18 14 C 26 10 32 16 32 22 C 32 16 38 10 46 14 C 60 22 56 38 32 56 Z"
          fill={`url(#${id})`}
          stroke={t.stroke}
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        {/* Glaze highlight */}
        <ellipse cx="22" cy="20" rx="6" ry="3.6" fill="rgba(255,255,255,.62)" />
        {/* Tiny sparkle */}
        <circle cx="42" cy="28" r="1.6" fill="rgba(255,255,255,.85)" />
      </svg>
      <span
        className="absolute font-mono font-black"
        style={{
          fontSize: 'clamp(0.7rem, 2.2cqw, 1.85rem)',
          color: '#fff',
          textShadow:
            `0 1px 2px rgba(0,0,0,.85), 0 0 6px ${t.glow}, 0 0 14px ${t.glow}`,
          letterSpacing: '-0.04em',
          marginTop: '-2%',
        }}
      >
        {value}×
      </span>
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
