/** Big Juan symbol art — full SVG for the high-tier characters; lower
 *  tier still uses emoji on a tinted disc (see SymbolCell). */

/** Big Juan — masked luchador wrestler hero (red+gold mask, flexed pose). */
export function BigJuanSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="bj-mask" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a8a" />
          <stop offset="35%" stopColor="#ff5560" />
          <stop offset="80%" stopColor="#a8102e" />
          <stop offset="100%" stopColor="#3a0408" />
        </linearGradient>
        <radialGradient id="bj-skin" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="#ffe4c4" />
          <stop offset="60%" stopColor="#c89058" />
          <stop offset="100%" stopColor="#5a3018" />
        </radialGradient>
        <linearGradient id="bj-cape" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="60%" stopColor="#c8932e" />
          <stop offset="100%" stopColor="#5a3a04" />
        </linearGradient>
        <linearGradient id="bj-trim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="100%" stopColor="#a8761a" />
        </linearGradient>
      </defs>
      {/* Cape */}
      <path d="M 8 32 L 14 56 L 50 56 L 56 32 Q 56 44 32 50 Q 8 44 8 32 Z" fill="url(#bj-cape)" stroke="#3a1a04" strokeWidth=".7" />
      {/* Shoulders */}
      <path d="M 8 36 Q 12 30 22 30 L 42 30 Q 52 30 56 36 L 54 56 L 10 56 Z" fill="url(#bj-skin)" stroke="#3a1a08" strokeWidth="1" strokeLinejoin="round" />
      {/* Pec definition */}
      <path d="M 22 32 Q 26 38 28 44" stroke="#5a3018" strokeWidth=".6" fill="none" />
      <path d="M 42 32 Q 38 38 36 44" stroke="#5a3018" strokeWidth=".6" fill="none" />
      <path d="M 32 30 L 32 50" stroke="#5a3018" strokeWidth=".5" />
      {/* Bicep highlights */}
      <ellipse cx="13" cy="42" rx="2.5" ry="3" fill="rgba(255,255,255,.18)" />
      <ellipse cx="51" cy="42" rx="2.5" ry="3" fill="rgba(255,255,255,.18)" />
      {/* Head */}
      <ellipse cx="32" cy="20" rx="13" ry="14" fill="url(#bj-mask)" stroke="#3a0408" strokeWidth="1.2" />
      {/* Mask top peak */}
      <path d="M 26 6 L 32 2 L 38 6 L 36 12 L 28 12 Z" fill="url(#bj-mask)" stroke="#3a0408" strokeWidth=".8" />
      {/* Gold trim around face */}
      <path d="M 22 18 Q 32 12 42 18 L 42 26 Q 32 22 22 26 Z" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".5" />
      {/* Eye holes */}
      <ellipse cx="27" cy="22" rx="3" ry="2.4" fill="#1a0a04" />
      <ellipse cx="37" cy="22" rx="3" ry="2.4" fill="#1a0a04" />
      <ellipse cx="27" cy="22" rx="2.4" ry="1.8" fill="url(#bj-skin)" />
      <ellipse cx="37" cy="22" rx="2.4" ry="1.8" fill="url(#bj-skin)" />
      <ellipse cx="27" cy="22" rx="1.2" ry="1.2" fill="#1a0a04" />
      <ellipse cx="37" cy="22" rx="1.2" ry="1.2" fill="#1a0a04" />
      <circle cx="26.7" cy="21.7" r=".3" fill="#fff" />
      <circle cx="36.7" cy="21.7" r=".3" fill="#fff" />
      {/* Mask centre stripe */}
      <rect x="31" y="6" width="2" height="22" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".3" />
      {/* Decorative gold stars */}
      <path d="M 18 14 L 19 16 L 21 16 L 19.5 17 L 20 19 L 18 18 L 16 19 L 16.5 17 L 15 16 L 17 16 Z" fill="url(#bj-trim)" />
      <path d="M 46 14 L 47 16 L 49 16 L 47.5 17 L 48 19 L 46 18 L 44 19 L 44.5 17 L 43 16 L 45 16 Z" fill="url(#bj-trim)" />
      {/* Mouth */}
      <path d="M 28 30 Q 32 32 36 30 Q 35 31 32 31 Q 29 31 28 30 Z" fill="#1a0a04" />
      <path d="M 22 28 Q 32 32 42 28" fill="none" stroke="#3a0408" strokeWidth=".5" />
      {/* Fists */}
      <circle cx="22" cy="50" r="3" fill="url(#bj-skin)" stroke="#3a1a08" strokeWidth=".7" />
      <circle cx="42" cy="50" r="3" fill="url(#bj-skin)" stroke="#3a1a08" strokeWidth=".7" />
      <rect x="19" y="46" width="6" height="2" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".3" />
      <rect x="39" y="46" width="6" height="2" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".3" />
    </svg>
  );
}

/** El Diablo — devil/villain character with horns. */
export function DiabloSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="dv-skin" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#ff8a8a" />
          <stop offset="50%" stopColor="#a8102e" />
          <stop offset="100%" stopColor="#3a0408" />
        </radialGradient>
        <linearGradient id="dv-horn" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="60%" stopColor="#c8932e" />
          <stop offset="100%" stopColor="#3a2204" />
        </linearGradient>
      </defs>
      {/* Cape */}
      <path d="M 8 38 L 12 56 L 52 56 L 56 38 Q 50 50 32 52 Q 14 50 8 38 Z" fill="#1a0a02" stroke="#000" strokeWidth=".6" />
      {/* Shoulders */}
      <path d="M 12 42 Q 18 36 28 36 L 36 36 Q 46 36 52 42 L 50 56 L 14 56 Z" fill="url(#dv-skin)" stroke="#000" strokeWidth=".8" />
      {/* Head */}
      <ellipse cx="32" cy="22" rx="11" ry="13" fill="url(#dv-skin)" stroke="#000" strokeWidth="1" />
      {/* Horns (left + right, curved) */}
      <path d="M 22 14 Q 16 6 14 12 Q 18 14 22 14 Z" fill="url(#dv-horn)" stroke="#000" strokeWidth=".5" />
      <path d="M 42 14 Q 48 6 50 12 Q 46 14 42 14 Z" fill="url(#dv-horn)" stroke="#000" strokeWidth=".5" />
      {/* Eyes (yellow, glaring) */}
      <ellipse cx="27" cy="21" rx="2.4" ry="1.6" fill="#ffd166" />
      <ellipse cx="37" cy="21" rx="2.4" ry="1.6" fill="#ffd166" />
      <ellipse cx="27" cy="21" rx=".7" ry="1.4" fill="#1a0a04" />
      <ellipse cx="37" cy="21" rx=".7" ry="1.4" fill="#1a0a04" />
      {/* Brow furrow (angry) */}
      <path d="M 22 18 L 30 19" stroke="#1a0a04" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 34 19 L 42 18" stroke="#1a0a04" strokeWidth="1.4" strokeLinecap="round" />
      {/* Goatee */}
      <path d="M 30 32 L 32 38 L 34 32" fill="#1a0a04" />
      {/* Sinister grin (with fangs) */}
      <path d="M 26 30 Q 32 32 38 30" fill="#1a0a04" stroke="#000" strokeWidth=".4" />
      <path d="M 28 30 L 28.5 32 L 29 30 Z" fill="#fff5e0" />
      <path d="M 35 30 L 35.5 32 L 36 30 Z" fill="#fff5e0" />
      {/* Pointed mustache */}
      <path d="M 26 28 L 22 27" stroke="#1a0a04" strokeWidth="1" strokeLinecap="round" />
      <path d="M 38 28 L 42 27" stroke="#1a0a04" strokeWidth="1" strokeLinecap="round" />
      {/* Pointed beard tip */}
      <path d="M 32 38 L 32 44" stroke="#1a0a04" strokeWidth="1.2" />
      {/* Trident in hand */}
      <line x1="48" y1="56" x2="56" y2="36" stroke="#5a3a04" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 54 36 L 56 32 L 58 36 L 56 42 Z" fill="url(#dv-horn)" stroke="#3a2204" strokeWidth=".5" />
      <path d="M 53 38 L 55 34" stroke="url(#dv-horn)" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M 59 38 L 57 34" stroke="url(#dv-horn)" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

/** Sombrero (re-using same wide-brim hat used in Juan's Cantina). */
export function SombreroSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="bj-som-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="40%" stopColor="#ffd166" />
          <stop offset="80%" stopColor="#a8761a" />
          <stop offset="100%" stopColor="#3a2a04" />
        </linearGradient>
        <linearGradient id="bj-som-band" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#c8102e" />
          <stop offset="50%" stopColor="#ff5560" />
          <stop offset="100%" stopColor="#7a0810" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="40" rx="28" ry="10" fill="url(#bj-som-hat)" stroke="#3a2a04" strokeWidth="1.2" />
      <ellipse cx="32" cy="42" rx="26" ry="2" fill="rgba(0,0,0,.3)" />
      <path d="M22 40 Q 16 14 32 10 Q 48 14 42 40 Z" fill="url(#bj-som-hat)" stroke="#3a2a04" strokeWidth="1.2" />
      <path d="M21 38 Q 32 36 43 38 L 43 33 Q 32 31 21 33 Z" fill="url(#bj-som-band)" stroke="#5a081a" strokeWidth=".5" />
      <circle cx="6" cy="40" r="2.5" fill="#c8102e" />
      <circle cx="58" cy="40" r="2.5" fill="#1fff7a" />
      <ellipse cx="28" cy="20" rx="3" ry="6" fill="rgba(255,255,255,.45)" />
    </svg>
  );
}

/** Chilli (WILD) — bigger, more dramatic version of the cantina chilli. */
export function ChilliSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="bj-chl-body" cx="40%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#ffe0e4" />
          <stop offset="14%" stopColor="#ffb4b8" />
          <stop offset="44%" stopColor="#ff5560" />
          <stop offset="78%" stopColor="#c8102e" />
          <stop offset="100%" stopColor="#5a0810" />
        </radialGradient>
      </defs>
      {/* Halo (signals WILD) */}
      <circle cx="32" cy="32" r="28" fill="rgba(255,209,102,.18)" />
      {/* Pepper body */}
      <path d="M 24 14 C 16 18 12 32 16 44 C 20 56 36 60 44 52 C 50 46 50 36 46 28 C 42 22 32 18 32 14 Z" fill="url(#bj-chl-body)" stroke="#5a0810" strokeWidth="1.1" strokeLinejoin="round" />
      {/* Belly highlight */}
      <path d="M 22 22 Q 18 32 22 42" fill="none" stroke="rgba(255,255,255,.55)" strokeWidth="1.8" strokeLinecap="round" />
      <ellipse cx="22" cy="20" rx="2" ry="3" fill="rgba(255,255,255,.7)" />
      {/* Stem cup */}
      <path d="M 26 12 Q 32 8 36 14 Q 34 16 26 12 Z" fill="#7fc950" stroke="#1a3a08" strokeWidth=".5" />
      <path d="M 32 6 Q 30 10 32 14" stroke="#7fc950" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M 32 8 Q 38 6 40 12" fill="#7fc950" stroke="#2a5a18" strokeWidth=".5" />
      {/* WILD label */}
      <rect x="20" y="46" width="24" height="8" rx="2" fill="#ffd166" stroke="#5a3a04" strokeWidth=".5" />
      <text x="32" y="52" textAnchor="middle" fontSize="6" fontFamily="sans-serif" fontWeight="900" fill="#5a081a">WILD</text>
    </svg>
  );
}

/** Piñata (SCATTER) — colourful donkey shape with stars. */
export function PinataSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="bj-pin-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff5560" />
          <stop offset="33%" stopColor="#ffd166" />
          <stop offset="66%" stopColor="#1fff7a" />
          <stop offset="100%" stopColor="#5fb8ff" />
        </linearGradient>
      </defs>
      {/* Halo */}
      <circle cx="32" cy="32" r="28" fill="rgba(255,209,102,.18)" />
      {/* String */}
      <line x1="32" y1="2" x2="32" y2="14" stroke="#a8a29e" strokeWidth=".8" strokeDasharray="1 1" />
      {/* Body — donkey-ish silhouette */}
      <ellipse cx="32" cy="36" rx="20" ry="14" fill="url(#bj-pin-body)" stroke="#1a0a04" strokeWidth="1" />
      {/* Head */}
      <ellipse cx="48" cy="28" rx="9" ry="7" fill="url(#bj-pin-body)" stroke="#1a0a04" strokeWidth="1" />
      {/* Ears */}
      <path d="M 50 22 L 52 14 L 56 18 Z" fill="#ff5560" stroke="#1a0a04" strokeWidth=".5" />
      <path d="M 46 22 L 44 14 L 42 20 Z" fill="#1fff7a" stroke="#1a0a04" strokeWidth=".5" />
      {/* Eye */}
      <circle cx="52" cy="26" r="1.2" fill="#1a0a04" />
      <circle cx="51.7" cy="25.7" r=".4" fill="#fff" />
      {/* Tail (paper streamers) */}
      <path d="M 12 36 Q 6 32 4 38 Q 8 38 12 38" fill="#5fb8ff" stroke="#1a0a04" strokeWidth=".4" />
      <path d="M 12 38 Q 4 42 4 46 Q 8 44 12 42" fill="#ffd166" stroke="#1a0a04" strokeWidth=".4" />
      {/* Legs */}
      <line x1="22" y1="48" x2="22" y2="56" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="50" x2="28" y2="56" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
      <line x1="38" y1="50" x2="38" y2="56" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
      <line x1="42" y1="48" x2="42" y2="56" stroke="#1a0a04" strokeWidth="2" strokeLinecap="round" />
      {/* Stars / paper-fringe details */}
      <path d="M 22 32 L 23 34 L 25 34 L 23.5 35 L 24 37 L 22 36 L 20 37 L 20.5 35 L 19 34 L 21 34 Z" fill="#fff5e0" />
      <path d="M 32 40 L 33 42 L 35 42 L 33.5 43 L 34 45 L 32 44 L 30 45 L 30.5 43 L 29 42 L 31 42 Z" fill="#fff5e0" />
      {/* Streamers */}
      <line x1="20" y1="50" x2="18" y2="58" stroke="#ff5560" strokeWidth=".7" />
      <line x1="44" y1="50" x2="46" y2="58" stroke="#1fff7a" strokeWidth=".7" />
    </svg>
  );
}
