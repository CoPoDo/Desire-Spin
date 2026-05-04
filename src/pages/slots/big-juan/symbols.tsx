/** Big Juan symbol art — full SVG for the high-tier characters; lower
 *  tier still uses emoji on a tinted disc (see SymbolCell). */

/** Big Juan — portly Mexican mariachi mascot per real Pragmatic Big Juan:
 *  HUGE curly black mustache, red sombrero, green-and-gold mariachi vest,
 *  hands raised holding maracas. NOT a luchador wrestler. */
export function BigJuanSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="bj-hat" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a8a" />
          <stop offset="35%" stopColor="#ff5560" />
          <stop offset="78%" stopColor="#c8102e" />
          <stop offset="100%" stopColor="#5a0810" />
        </linearGradient>
        <radialGradient id="bj-skin" cx="50%" cy="48%" r="55%">
          <stop offset="0%" stopColor="#ffe4c4" />
          <stop offset="60%" stopColor="#c89058" />
          <stop offset="100%" stopColor="#5a3018" />
        </radialGradient>
        <linearGradient id="bj-vest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3aff8a" />
          <stop offset="55%" stopColor="#1a8a3a" />
          <stop offset="100%" stopColor="#0a4a1a" />
        </linearGradient>
        <linearGradient id="bj-trim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="100%" stopColor="#a8761a" />
        </linearGradient>
      </defs>
      {/* Body — round-bellied charro suit, green vest with gold trim */}
      <path d="M 10 40 Q 14 32 22 32 L 42 32 Q 50 32 54 40 L 56 58 L 8 58 Z" fill="url(#bj-vest)" stroke="#0a3a18" strokeWidth="1" strokeLinejoin="round" />
      {/* Big rounded belly */}
      <ellipse cx="32" cy="48" rx="18" ry="11" fill="url(#bj-vest)" stroke="#0a3a18" strokeWidth=".8" />
      {/* Gold trim along vest opening */}
      <path d="M 24 32 L 24 58" stroke="url(#bj-trim)" strokeWidth="1.4" />
      <path d="M 40 32 L 40 58" stroke="url(#bj-trim)" strokeWidth="1.4" />
      {/* Gold buttons down the front */}
      <circle cx="32" cy="38" r="1" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".25" />
      <circle cx="32" cy="44" r="1" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".25" />
      <circle cx="32" cy="50" r="1" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".25" />
      {/* White shirt collar */}
      <path d="M 26 32 L 32 36 L 38 32 L 38 30 L 26 30 Z" fill="#fff5e0" stroke="#5a3018" strokeWidth=".4" />
      {/* Red bow tie */}
      <path d="M 28 33 L 32 36 L 36 33 L 36 38 L 32 36 L 28 38 Z" fill="#ff5560" stroke="#5a0810" strokeWidth=".4" />
      {/* Head — round, jolly, ruddy cheeks */}
      <ellipse cx="32" cy="22" rx="11" ry="11" fill="url(#bj-skin)" stroke="#5a3018" strokeWidth="1" />
      {/* Cheeks (rosy) */}
      <ellipse cx="24" cy="25" rx="2.5" ry="1.8" fill="#ff6f6f" opacity=".55" />
      <ellipse cx="40" cy="25" rx="2.5" ry="1.8" fill="#ff6f6f" opacity=".55" />
      {/* Eyes — small, friendly, smiling */}
      <path d="M 26 21 Q 28 19 30 21" stroke="#1a0a04" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M 34 21 Q 36 19 38 21" stroke="#1a0a04" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      {/* Big curly black mustache — hallmark of real Big Juan */}
      <path d="M 22 27 Q 18 26 16 28 Q 17 30 20 29 Q 24 28 26 28 Q 28 28 32 28 Q 36 28 38 28 Q 40 28 44 29 Q 47 30 48 28 Q 46 26 42 27 Q 38 28 36 28 L 32 30 L 28 28 Q 26 28 22 27 Z"
        fill="#0a0408" stroke="#000" strokeWidth=".4" />
      {/* Mustache curl tips */}
      <path d="M 16 28 Q 14 30 16 31 Q 17 30 16 28 Z" fill="#0a0408" />
      <path d="M 48 28 Q 50 30 48 31 Q 47 30 48 28 Z" fill="#0a0408" />
      {/* Smile beneath mustache */}
      <path d="M 28 31 Q 32 33 36 31" fill="none" stroke="#1a0a04" strokeWidth=".7" strokeLinecap="round" />
      {/* SOMBRERO — wide red brim with gold trim, sits on top */}
      <ellipse cx="32" cy="13" rx="22" ry="5" fill="url(#bj-hat)" stroke="#3a0408" strokeWidth="1" />
      <ellipse cx="32" cy="14.5" rx="20" ry="1.5" fill="rgba(0,0,0,.3)" />
      {/* Sombrero crown */}
      <path d="M 24 13 Q 22 4 32 2 Q 42 4 40 13 Z" fill="url(#bj-hat)" stroke="#3a0408" strokeWidth="1" />
      {/* Sombrero gold band */}
      <path d="M 23 12 Q 32 10 41 12 L 41 9 Q 32 7 23 9 Z" fill="url(#bj-trim)" stroke="#5a3a04" strokeWidth=".3" />
      {/* Sombrero pom-poms on rim */}
      <circle cx="10" cy="13" r="1.6" fill="#1fff7a" stroke="#0a3a18" strokeWidth=".3" />
      <circle cx="54" cy="13" r="1.6" fill="#1fff7a" stroke="#0a3a18" strokeWidth=".3" />
      {/* Sombrero highlight */}
      <ellipse cx="28" cy="6" rx="2" ry="3" fill="rgba(255,255,255,.4)" />
      {/* Hands holding maracas (raised in fiesta pose) */}
      <circle cx="14" cy="40" r="3.5" fill="url(#bj-skin)" stroke="#5a3018" strokeWidth=".7" />
      <circle cx="50" cy="40" r="3.5" fill="url(#bj-skin)" stroke="#5a3018" strokeWidth=".7" />
      {/* Maracas (small gourds with handles) */}
      <ellipse cx="11" cy="34" rx="2.5" ry="3" fill="#ffd166" stroke="#5a3a04" strokeWidth=".5" />
      <rect x="10.5" y="36" width="1" height="3" fill="#5a3a04" />
      <ellipse cx="9.5" cy="32.5" rx="0.6" ry="0.9" fill="rgba(255,255,255,.5)" />
      <ellipse cx="53" cy="34" rx="2.5" ry="3" fill="#ffd166" stroke="#5a3a04" strokeWidth=".5" />
      <rect x="52.5" y="36" width="1" height="3" fill="#5a3a04" />
      <ellipse cx="51.5" cy="32.5" rx="0.6" ry="0.9" fill="rgba(255,255,255,.5)" />
    </svg>
  );
}

/** Señorita — female fiesta dancer character with red flamenco-style
 *  dress, dark hair, hibiscus flower behind her ear. Replaces the
 *  out-of-place "El Diablo" devil — real Big Juan is a fiesta theme. */
export function DiabloSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="sn-skin" cx="50%" cy="42%" r="60%">
          <stop offset="0%" stopColor="#ffe4c4" />
          <stop offset="60%" stopColor="#c89058" />
          <stop offset="100%" stopColor="#5a3018" />
        </radialGradient>
        <linearGradient id="sn-dress" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a8a" />
          <stop offset="45%" stopColor="#ff5560" />
          <stop offset="100%" stopColor="#5a0810" />
        </linearGradient>
        <linearGradient id="sn-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a1a08" />
          <stop offset="100%" stopColor="#0a0408" />
        </linearGradient>
      </defs>
      {/* Flamenco dress — flared skirt with ruffles */}
      <path d="M 6 56 Q 10 38 28 36 L 36 36 Q 54 38 58 56 Z" fill="url(#sn-dress)" stroke="#5a0810" strokeWidth="1" strokeLinejoin="round" />
      {/* Skirt ruffle layers */}
      <path d="M 8 50 Q 16 46 32 46 Q 48 46 56 50" fill="none" stroke="#fff5e0" strokeWidth=".7" opacity=".6" />
      <path d="M 6 56 Q 14 52 32 52 Q 50 52 58 56" fill="none" stroke="#fff5e0" strokeWidth=".5" opacity=".4" />
      {/* Bodice — fitted upper dress with ruffle edge */}
      <path d="M 24 30 Q 24 26 28 26 L 36 26 Q 40 26 40 30 L 40 38 L 24 38 Z" fill="url(#sn-dress)" stroke="#5a0810" strokeWidth=".7" />
      {/* Shoulder ruffles */}
      <path d="M 22 30 Q 24 28 26 30 Q 27 32 26 33 Q 24 32 22 30" fill="url(#sn-dress)" stroke="#5a0810" strokeWidth=".4" />
      <path d="M 42 30 Q 40 28 38 30 Q 37 32 38 33 Q 40 32 42 30" fill="url(#sn-dress)" stroke="#5a0810" strokeWidth=".4" />
      {/* Head */}
      <ellipse cx="32" cy="20" rx="9" ry="10" fill="url(#sn-skin)" stroke="#5a3018" strokeWidth=".8" />
      {/* Hair — pulled back, dark waves */}
      <path d="M 23 18 Q 22 8 32 6 Q 42 8 41 18 Q 40 14 32 14 Q 24 14 23 18 Z" fill="url(#sn-hair)" stroke="#000" strokeWidth=".4" />
      {/* Bun on top */}
      <ellipse cx="32" cy="6" rx="3" ry="2" fill="url(#sn-hair)" stroke="#000" strokeWidth=".3" />
      {/* Hibiscus flower behind right ear */}
      <g transform="translate(40 16)">
        <circle cx="0" cy="0" r="1" fill="#ffd166" />
        {[0, 72, 144, 216, 288].map((a) => {
          const x = Math.cos((a * Math.PI) / 180) * 1.8;
          const y = Math.sin((a * Math.PI) / 180) * 1.8;
          return <ellipse key={a} cx={x} cy={y} rx="1.4" ry=".9" fill="#ff5560" stroke="#5a0810" strokeWidth=".2" transform={`rotate(${a} ${x} ${y})`} />;
        })}
        <circle cx="0" cy="0" r=".5" fill="#fff5c4" />
      </g>
      {/* Eyes — almond, dark lashes */}
      <ellipse cx="28" cy="20" rx="1.4" ry="1" fill="#1a0a04" />
      <ellipse cx="36" cy="20" rx="1.4" ry="1" fill="#1a0a04" />
      <path d="M 26.5 19.5 Q 28 19 29.5 19.5" stroke="#1a0a04" strokeWidth=".5" fill="none" />
      <path d="M 34.5 19.5 Q 36 19 37.5 19.5" stroke="#1a0a04" strokeWidth=".5" fill="none" />
      {/* Cheeks */}
      <ellipse cx="25" cy="23" rx="1.6" ry="1.2" fill="#ff6f6f" opacity=".5" />
      <ellipse cx="39" cy="23" rx="1.6" ry="1.2" fill="#ff6f6f" opacity=".5" />
      {/* Lips — red */}
      <path d="M 30 25 Q 32 26 34 25 Q 33 27 32 27 Q 31 27 30 25 Z" fill="#c8102e" stroke="#5a0810" strokeWidth=".25" />
      {/* Earring (gold hoop) */}
      <circle cx="23" cy="21" r="1" fill="none" stroke="#ffd166" strokeWidth=".5" />
      <circle cx="41" cy="21" r="1" fill="none" stroke="#ffd166" strokeWidth=".5" />
      {/* Castanets in hand (raised) */}
      <ellipse cx="46" cy="38" rx="2" ry="2.5" fill="#a8761a" stroke="#5a3a04" strokeWidth=".4" />
      <ellipse cx="46" cy="35" rx="1.6" ry="1.2" fill="#fff5c4" stroke="#5a3a04" strokeWidth=".25" />
    </svg>
  );
}

/** Guitar — Mexican vihuela / acoustic with rosette + strings. */
export function GuitarSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="bj-gtr-body" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fff0c4" />
          <stop offset="40%" stopColor="#d8932e" />
          <stop offset="80%" stopColor="#7a4a04" />
          <stop offset="100%" stopColor="#2a1a04" />
        </radialGradient>
      </defs>
      <ellipse cx="32" cy="44" rx="16" ry="14" fill="url(#bj-gtr-body)" stroke="#2a1a04" strokeWidth="1" />
      <ellipse cx="32" cy="28" rx="10" ry="8" fill="url(#bj-gtr-body)" stroke="#2a1a04" strokeWidth="1" />
      {/* Sound hole rosette */}
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
      {[28, 32, 36].map((x, i) => (
        <circle key={i} cx={x} cy="5.5" r=".8" fill="#ffd166" />
      ))}
      {/* Decorative inlays around the rosette (Mexican wooden inlay) */}
      <circle cx="32" cy="42" r="5.5" fill="none" stroke="#ff5560" strokeWidth=".5" opacity=".6" />
      <circle cx="32" cy="42" r="6.5" fill="none" stroke="#1fff7a" strokeWidth=".4" opacity=".5" />
      {/* Body highlight */}
      <ellipse cx="24" cy="36" rx="3" ry="6" fill="rgba(255,255,255,.35)" />
    </svg>
  );
}

/** Boot — leather cowboy/wrestling boot with stitching. */
export function BootSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="bj-bt-leather" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#a87042" />
          <stop offset="50%" stopColor="#5a3018" />
          <stop offset="100%" stopColor="#1a0a02" />
        </linearGradient>
      </defs>
      {/* Boot shaft */}
      <path d="M16 8 L 30 8 L 32 36 L 16 36 Z" fill="url(#bj-bt-leather)" stroke="#1a0a02" strokeWidth=".8" />
      {/* Boot foot */}
      <path d="M16 36 L 32 36 L 52 48 Q 54 50 54 54 L 16 54 Z" fill="url(#bj-bt-leather)" stroke="#1a0a02" strokeWidth=".8" strokeLinejoin="round" />
      {/* Heel */}
      <rect x="16" y="50" width="6" height="6" fill="#3a1a04" stroke="#1a0a02" strokeWidth=".6" />
      {/* Stitching */}
      <path d="M18 12 L 28 12" stroke="#ffd166" strokeWidth=".4" strokeDasharray="1 1.5" />
      <path d="M18 22 L 30 22" stroke="#ffd166" strokeWidth=".4" strokeDasharray="1 1.5" />
      <path d="M18 32 L 30 32" stroke="#ffd166" strokeWidth=".4" strokeDasharray="1 1.5" />
      {/* Top fold */}
      <path d="M16 8 L 30 8 L 30 12 L 16 12 Z" fill="#3a1a08" stroke="#1a0a02" strokeWidth=".4" />
      {/* Decorative star */}
      <path d="M22 18 L 23 21 L 26 21 L 24 23 L 25 26 L 22 24 L 19 26 L 20 23 L 18 21 L 21 21 Z" fill="#ffd166" stroke="#5a3a04" strokeWidth=".3" />
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
  );
}

/** Maracas — pair of crossed gourd shakers with painted patterns,
 *  tied with red ribbon. Replaces the wrestling glove (which didn't
 *  fit the real Big Juan fiesta theme). */
export function GloveSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="bj-mar1" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="55%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#5a3a04" />
        </radialGradient>
        <radialGradient id="bj-mar2" cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="#ffb4b8" />
          <stop offset="55%" stopColor="#ff5560" />
          <stop offset="100%" stopColor="#5a0810" />
        </radialGradient>
      </defs>
      {/* Maraca 1 — gold gourd, leaning left */}
      <g transform="rotate(-22 22 32)">
        {/* Gourd body */}
        <ellipse cx="22" cy="20" rx="9" ry="11" fill="url(#bj-mar1)" stroke="#5a3a04" strokeWidth="1" />
        {/* Painted ring patterns */}
        <ellipse cx="22" cy="14" rx="6.5" ry="1.2" fill="none" stroke="#5a0810" strokeWidth=".5" />
        <ellipse cx="22" cy="20" rx="8.5" ry="1.4" fill="none" stroke="#5a0810" strokeWidth=".6" />
        <ellipse cx="22" cy="26" rx="7" ry="1.2" fill="none" stroke="#5a0810" strokeWidth=".5" />
        {/* Floral dot pattern */}
        <circle cx="18" cy="17" r=".7" fill="#1fff7a" />
        <circle cx="26" cy="17" r=".7" fill="#5fb8ff" />
        <circle cx="22" cy="22" r=".7" fill="#ff5560" />
        {/* Highlight */}
        <ellipse cx="18" cy="14" rx="2" ry="2.5" fill="rgba(255,255,255,.5)" />
        {/* Handle */}
        <rect x="20" y="30" width="4" height="14" fill="#5a3a04" stroke="#3a1a04" strokeWidth=".4" />
        {/* Handle wrap (red ribbon) */}
        <rect x="19.5" y="34" width="5" height="2" fill="#ff5560" stroke="#5a0810" strokeWidth=".25" />
      </g>
      {/* Maraca 2 — red gourd, leaning right */}
      <g transform="rotate(22 42 32)">
        {/* Gourd body */}
        <ellipse cx="42" cy="20" rx="9" ry="11" fill="url(#bj-mar2)" stroke="#5a0810" strokeWidth="1" />
        {/* Painted ring patterns */}
        <ellipse cx="42" cy="14" rx="6.5" ry="1.2" fill="none" stroke="#5a3a04" strokeWidth=".5" />
        <ellipse cx="42" cy="20" rx="8.5" ry="1.4" fill="none" stroke="#5a3a04" strokeWidth=".6" />
        <ellipse cx="42" cy="26" rx="7" ry="1.2" fill="none" stroke="#5a3a04" strokeWidth=".5" />
        {/* Floral dot pattern */}
        <circle cx="38" cy="17" r=".7" fill="#ffd166" />
        <circle cx="46" cy="17" r=".7" fill="#1fff7a" />
        <circle cx="42" cy="22" r=".7" fill="#fff5c4" />
        {/* Highlight */}
        <ellipse cx="38" cy="14" rx="2" ry="2.5" fill="rgba(255,255,255,.55)" />
        {/* Handle */}
        <rect x="40" y="30" width="4" height="14" fill="#5a3a04" stroke="#3a1a04" strokeWidth=".4" />
        {/* Handle wrap (gold ribbon) */}
        <rect x="39.5" y="34" width="5" height="2" fill="#ffd166" stroke="#5a3a04" strokeWidth=".25" />
      </g>
      {/* Crossed-X tie ribbon at the centre */}
      <path d="M 26 46 Q 32 50 38 46 Q 36 52 32 52 Q 28 52 26 46 Z" fill="#ff5560" stroke="#5a0810" strokeWidth=".4" />
      <path d="M 30 50 Q 32 56 28 60" fill="none" stroke="#ff5560" strokeWidth="1" strokeLinecap="round" />
      <path d="M 34 50 Q 32 56 36 60" fill="none" stroke="#ff5560" strokeWidth="1" strokeLinecap="round" />
      {/* Motion shake lines */}
      <path d="M 4 10 L 7 12" stroke="#ffd166" strokeWidth=".6" strokeLinecap="round" opacity=".7" />
      <path d="M 60 10 L 57 12" stroke="#ff5560" strokeWidth=".6" strokeLinecap="round" opacity=".7" />
      <path d="M 4 18 L 7 19" stroke="#ffd166" strokeWidth=".5" strokeLinecap="round" opacity=".6" />
      <path d="M 60 18 L 57 19" stroke="#ff5560" strokeWidth=".5" strokeLinecap="round" opacity=".6" />
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

/** Royal letter symbol (A / K / Q / J / 10) — stylised gradient letter
 *  on a colored card-style disc with corner flourishes. */
export function RoyalSvg({
  letter,
  color,
  size = '100%',
}: {
  letter: string;
  color: string;
  size?: string | number;
}) {
  const id = `royal-${letter.toLowerCase()}`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor={color} />
          <stop offset="100%" stopColor="#1a0a04" />
        </linearGradient>
        <radialGradient id={`${id}-disc`} cx="35%" cy="32%" r="70%">
          <stop offset="0%" stopColor={`${color}55`} />
          <stop offset="60%" stopColor={`${color}22`} />
          <stop offset="100%" stopColor="#1a0a02" />
        </radialGradient>
      </defs>
      {/* Disc backdrop */}
      <circle cx="32" cy="32" r="26" fill={`url(#${id}-disc)`} stroke={color} strokeWidth="1.4" />
      {/* Inner ring (decorative) */}
      <circle cx="32" cy="32" r="22" fill="none" stroke={`${color}66`} strokeWidth=".4" />
      {/* Corner flourishes */}
      <path d="M 16 16 L 22 16 M 16 16 L 16 22" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <path d="M 48 16 L 42 16 M 48 16 L 48 22" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <path d="M 16 48 L 22 48 M 16 48 L 16 42" stroke={color} strokeWidth="1" strokeLinecap="round" />
      <path d="M 48 48 L 42 48 M 48 48 L 48 42" stroke={color} strokeWidth="1" strokeLinecap="round" />
      {/* Big letter */}
      <text
        x="32"
        y={letter === '10' ? 41 : 43}
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="900"
        fontSize={letter === '10' ? 24 : 30}
        fill={`url(#${id}-fill)`}
        stroke="#1a0a04"
        strokeWidth=".8"
        style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }}
      >
        {letter}
      </text>
      {/* Highlight on letter */}
      <text
        x="32"
        y={letter === '10' ? 41 : 43}
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="900"
        fontSize={letter === '10' ? 24 : 30}
        fill="rgba(255,255,255,.18)"
        transform="translate(-1, -1)"
      >
        {letter}
      </text>
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
