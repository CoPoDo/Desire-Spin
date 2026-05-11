/** Big Juan symbol art — full SVG illustrations for all character symbols
 *  plus chunky letter art for royals. Designed for high-density cartoon
 *  appeal: strong silhouettes, heavy outlines, saturated gradients, and
 *  the specific identifying details that match the real game's look
 *  (Juan's enormous mustache and sombrero, chihuahua on a pink pillow
 *  with a yellow sombrero, chili wild surrounded by flames, ornate
 *  purple vihuela with stars, etc).
 *
 *  All symbols use a 64×64 viewBox so they render consistently at any
 *  cell size. The exported function names are unchanged so callers in
 *  index.tsx, JuanCharacter.tsx, Art.tsx, and BonusRound.tsx work
 *  without modification. */

// ═══════════════════════════════════════════════════════════════════════
//  BIG JUAN — portly mariachi mascot
// ═══════════════════════════════════════════════════════════════════════

/** The signature character. Massive red sombrero (wider than his head),
 *  enormous curly black handlebar mustache, big squinted-happy eyes,
 *  wide-open smile with teeth, round belly, green-and-gold mariachi
 *  vest with white shirt + red bow tie underneath, hands raised holding
 *  maracas in fiesta pose. */
export function BigJuanSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="juan-som" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff9090" />
          <stop offset="35%" stopColor="#ff4858" />
          <stop offset="70%" stopColor="#c8102e" />
          <stop offset="100%" stopColor="#5a0810" />
        </linearGradient>
        <linearGradient id="juan-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="50%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#7a4810" />
        </linearGradient>
        <radialGradient id="juan-skin" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffe8d0" />
          <stop offset="50%" stopColor="#dca070" />
          <stop offset="100%" stopColor="#6a3818" />
        </radialGradient>
        <linearGradient id="juan-vest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3fd870" />
          <stop offset="55%" stopColor="#1a8a3a" />
          <stop offset="100%" stopColor="#0a4218" />
        </linearGradient>
        <radialGradient id="juan-maraca" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="55%" stopColor="#ffc04a" />
          <stop offset="100%" stopColor="#7a4810" />
        </radialGradient>
      </defs>

      {/* ═══ BODY — round-bellied charro vest ═══ */}
      <path d="M 8 42 Q 10 33 22 33 L 42 33 Q 54 33 56 42 L 58 64 L 6 64 Z"
        fill="url(#juan-vest)" stroke="#062a10" strokeWidth="1.1" strokeLinejoin="round" />
      {/* Belly bulge */}
      <ellipse cx="32" cy="50" rx="22" ry="12" fill="url(#juan-vest)"
        stroke="#062a10" strokeWidth="0.6" />
      {/* Vest V-neck opening */}
      <path d="M 22 33 L 32 43 L 42 33 L 42 37 L 32 47 L 22 37 Z"
        fill="#fff5e8" stroke="#062a10" strokeWidth="0.5" />
      {/* Red bow tie */}
      <path d="M 26 38 L 32 42 L 38 38 L 38 46 L 32 42 L 26 46 Z"
        fill="#e02030" stroke="#5a0810" strokeWidth="0.5" />
      <ellipse cx="32" cy="42" rx="1.2" ry="1" fill="#7a0810" />
      {/* Gold lapel trim down both sides */}
      <path d="M 22 33 Q 23 45 22 64" stroke="url(#juan-gold)" strokeWidth="1.6" fill="none" />
      <path d="M 42 33 Q 41 45 42 64" stroke="url(#juan-gold)" strokeWidth="1.6" fill="none" />
      {/* Gold ornate embroidery curls on vest */}
      <path d="M 13 43 Q 15 41 17 43 Q 15 45 13 43 Z" fill="none"
        stroke="url(#juan-gold)" strokeWidth="0.7" />
      <path d="M 47 43 Q 49 41 51 43 Q 49 45 47 43 Z" fill="none"
        stroke="url(#juan-gold)" strokeWidth="0.7" />
      <path d="M 11 52 Q 13 50 15 52" fill="none"
        stroke="url(#juan-gold)" strokeWidth="0.5" opacity="0.8" />
      <path d="M 49 52 Q 51 50 53 52" fill="none"
        stroke="url(#juan-gold)" strokeWidth="0.5" opacity="0.8" />
      {/* Gold buttons */}
      <circle cx="32" cy="50" r="1.3" fill="url(#juan-gold)" stroke="#5a3a04" strokeWidth="0.3" />
      <circle cx="32" cy="56" r="1.3" fill="url(#juan-gold)" stroke="#5a3a04" strokeWidth="0.3" />

      {/* ═══ HEAD ═══ */}
      <ellipse cx="32" cy="23" rx="12.5" ry="11.5" fill="url(#juan-skin)"
        stroke="#5a3018" strokeWidth="0.9" />
      {/* Rosy cheeks */}
      <ellipse cx="23" cy="26" rx="3" ry="2.3" fill="#ff7080" opacity="0.55" />
      <ellipse cx="41" cy="26" rx="3" ry="2.3" fill="#ff7080" opacity="0.55" />
      {/* Squinted happy eyes (^^) */}
      <path d="M 23 20 Q 26 17 29 20" stroke="#1a0a04" strokeWidth="1.6"
        fill="none" strokeLinecap="round" />
      <path d="M 35 20 Q 38 17 41 20" stroke="#1a0a04" strokeWidth="1.6"
        fill="none" strokeLinecap="round" />

      {/* ═══ ENORMOUS HANDLEBAR MUSTACHE ═══ */}
      {/* Main mustache body — sweeps from one side to the other with curled tips */}
      <path d="
        M 32 28
        Q 28 27 24 28
        Q 18 28 14 30
        Q 9 32 7 34
        Q 6 36 8 37
        Q 11 38 12 36
        Q 14 34 17 33
        Q 21 32 25 32
        Q 28 33 32 33
        Q 36 33 39 32
        Q 43 32 47 33
        Q 50 34 52 36
        Q 53 38 56 37
        Q 58 36 57 34
        Q 55 32 50 30
        Q 46 28 40 28
        Q 36 27 32 28 Z"
        fill="#0a0408" stroke="#000" strokeWidth="0.3" />
      {/* Curled tip details (round bulges at ends) */}
      <ellipse cx="10" cy="36" rx="1.6" ry="1.1" fill="#0a0408" />
      <ellipse cx="54" cy="36" rx="1.6" ry="1.1" fill="#0a0408" />
      {/* Subtle highlight along top of mustache */}
      <path d="M 18 29 Q 32 30 46 29" fill="none"
        stroke="rgba(255,255,255,0.15)" strokeWidth="0.7" />

      {/* ═══ OPEN SMILE WITH TEETH ═══ */}
      <path d="M 27 33 Q 32 37 37 33 L 37 34 Q 32 38 27 34 Z"
        fill="#5a0810" stroke="#1a0a04" strokeWidth="0.4" />
      <rect x="28.5" y="33.4" width="7" height="1.1" fill="#fff8e8" rx="0.3" />

      {/* ═══ MASSIVE SOMBRERO ═══ */}
      {/* Wide brim (extends well past the head) */}
      <ellipse cx="32" cy="14" rx="28" ry="5.5"
        fill="url(#juan-som)" stroke="#3a0408" strokeWidth="1.2" />
      {/* Shadow under brim */}
      <ellipse cx="32" cy="16" rx="23" ry="2.2" fill="rgba(0,0,0,0.4)" />
      {/* Crown — round dome */}
      <path d="M 22 14 Q 18 1 32 -1 Q 46 1 42 14 Z"
        fill="url(#juan-som)" stroke="#3a0408" strokeWidth="1.2" />
      {/* Crown highlight */}
      <ellipse cx="27" cy="5" rx="2.6" ry="3.8" fill="rgba(255,255,255,0.45)" />
      {/* Gold band around crown */}
      <path d="M 21 13 Q 32 10 43 13 L 43 8 Q 32 5 21 8 Z"
        fill="url(#juan-gold)" stroke="#5a3a04" strokeWidth="0.4" />
      {/* Gold scalloped trim along brim edge */}
      <path d="M 5 14 Q 6 16 8 14 Q 10 16 12 14 Q 14 16 16 14 Q 18 16 20 14 Q 22 16 24 14 Q 26 16 28 14 Q 30 16 32 14 Q 34 16 36 14 Q 38 16 40 14 Q 42 16 44 14 Q 46 16 48 14 Q 50 16 52 14 Q 54 16 56 14 Q 58 16 60 14"
        fill="none" stroke="url(#juan-gold)" strokeWidth="0.9" />
      {/* Decorative pom-poms at brim edges */}
      <circle cx="5" cy="15" r="2" fill="#1fff7a" stroke="#0a3a18" strokeWidth="0.4" />
      <circle cx="59" cy="15" r="2" fill="#5fb8ff" stroke="#0a2a5a" strokeWidth="0.4" />

      {/* ═══ HANDS + MARACAS ═══ */}
      <circle cx="11" cy="44" r="3.5" fill="url(#juan-skin)" stroke="#5a3018" strokeWidth="0.6" />
      <circle cx="53" cy="44" r="3.5" fill="url(#juan-skin)" stroke="#5a3018" strokeWidth="0.6" />
      {/* Left maraca (tilted -15°) */}
      <g transform="rotate(-15 9 38)">
        <ellipse cx="9" cy="36" rx="2.8" ry="3.6" fill="url(#juan-maraca)"
          stroke="#5a3a04" strokeWidth="0.5" />
        <circle cx="7.6" cy="35" r="0.4" fill="#c8102e" />
        <circle cx="10.4" cy="35" r="0.4" fill="#1fff7a" />
        <circle cx="9" cy="37" r="0.4" fill="#5fb8ff" />
        <ellipse cx="7.6" cy="34" rx="0.8" ry="1.2" fill="rgba(255,255,255,0.6)" />
        <rect x="8.2" y="39" width="1.6" height="3.5" fill="#5a3a04" stroke="#3a1a04" strokeWidth="0.3" />
        <rect x="7.8" y="40.5" width="2.4" height="0.9" fill="#c8102e" />
      </g>
      {/* Right maraca (tilted +15°) */}
      <g transform="rotate(15 55 38)">
        <ellipse cx="55" cy="36" rx="2.8" ry="3.6" fill="url(#juan-maraca)"
          stroke="#5a3a04" strokeWidth="0.5" />
        <circle cx="53.6" cy="35" r="0.4" fill="#c8102e" />
        <circle cx="56.4" cy="35" r="0.4" fill="#5fb8ff" />
        <circle cx="55" cy="37" r="0.4" fill="#1fff7a" />
        <ellipse cx="53.6" cy="34" rx="0.8" ry="1.2" fill="rgba(255,255,255,0.6)" />
        <rect x="54.2" y="39" width="1.6" height="3.5" fill="#5a3a04" stroke="#3a1a04" strokeWidth="0.3" />
        <rect x="53.8" y="40.5" width="2.4" height="0.9" fill="#c8102e" />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  SEÑORITA — fiesta dancer
// ═══════════════════════════════════════════════════════════════════════

/** Pretty Mexican dancer with dark hair pulled back, red hibiscus flower
 *  behind her ear, large dark eyes with lashes, red lips, gold hoop
 *  earrings, red flamenco dress with white ruffled trim. */
export function DiabloSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="sn-skin" cx="40%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffead0" />
          <stop offset="55%" stopColor="#d8a070" />
          <stop offset="100%" stopColor="#6a3818" />
        </radialGradient>
        <linearGradient id="sn-dress" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8090" />
          <stop offset="40%" stopColor="#e02030" />
          <stop offset="100%" stopColor="#5a0810" />
        </linearGradient>
        <linearGradient id="sn-hair" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a1a08" />
          <stop offset="100%" stopColor="#0a0408" />
        </linearGradient>
      </defs>
      {/* Flamenco dress — flared with multiple ruffle tiers */}
      <path d="M 4 60 Q 8 38 28 36 L 36 36 Q 56 38 60 60 Z"
        fill="url(#sn-dress)" stroke="#5a0810" strokeWidth="1" strokeLinejoin="round" />
      {/* Ruffle layers — wavy white edges */}
      <path d="M 6 56 Q 12 50 22 52 Q 32 54 42 52 Q 52 50 58 56"
        fill="none" stroke="#fff5e8" strokeWidth="1" opacity="0.7" />
      <path d="M 4 60 Q 10 56 20 58 Q 32 60 44 58 Q 54 56 60 60"
        fill="none" stroke="#fff5e8" strokeWidth="0.8" opacity="0.55" />
      {/* Polka dots on dress */}
      <circle cx="18" cy="48" r="0.8" fill="#fff5e8" opacity="0.7" />
      <circle cx="28" cy="50" r="0.8" fill="#fff5e8" opacity="0.7" />
      <circle cx="38" cy="48" r="0.8" fill="#fff5e8" opacity="0.7" />
      <circle cx="46" cy="50" r="0.8" fill="#fff5e8" opacity="0.7" />
      <circle cx="22" cy="54" r="0.7" fill="#fff5e8" opacity="0.6" />
      <circle cx="42" cy="54" r="0.7" fill="#fff5e8" opacity="0.6" />
      {/* Bodice (fitted top with off-shoulder ruffles) */}
      <path d="M 22 28 Q 22 24 28 24 L 36 24 Q 42 24 42 28 L 42 38 L 22 38 Z"
        fill="url(#sn-dress)" stroke="#5a0810" strokeWidth="0.7" />
      {/* Off-shoulder ruffle */}
      <path d="M 20 28 Q 24 26 28 28 Q 27 30 25 30 Q 22 30 20 28 Z"
        fill="url(#sn-dress)" stroke="#5a0810" strokeWidth="0.4" />
      <path d="M 44 28 Q 40 26 36 28 Q 37 30 39 30 Q 42 30 44 28 Z"
        fill="url(#sn-dress)" stroke="#5a0810" strokeWidth="0.4" />
      {/* White trim on bodice */}
      <path d="M 22 32 L 42 32" stroke="#fff5e8" strokeWidth="0.6" opacity="0.7" />
      {/* HEAD */}
      <ellipse cx="32" cy="18" rx="10" ry="11" fill="url(#sn-skin)" stroke="#5a3018" strokeWidth="0.8" />
      {/* Hair — pulled back with center part */}
      <path d="M 22 16 Q 21 5 32 3 Q 43 5 42 16 Q 38 11 32 11 Q 26 11 22 16 Z"
        fill="url(#sn-hair)" stroke="#000" strokeWidth="0.4" />
      {/* Hair bun on top */}
      <ellipse cx="32" cy="4" rx="3.5" ry="2.5" fill="url(#sn-hair)" stroke="#000" strokeWidth="0.3" />
      {/* HIBISCUS FLOWER behind ear (right side) */}
      <g transform="translate(41 14)">
        {[0, 72, 144, 216, 288].map((a) => {
          const x = Math.cos((a * Math.PI) / 180) * 2.4;
          const y = Math.sin((a * Math.PI) / 180) * 2.4;
          return (
            <ellipse key={a} cx={x} cy={y} rx="2.2" ry="1.4"
              fill="#ff4858" stroke="#5a0810" strokeWidth="0.3"
              transform={`rotate(${a} ${x} ${y})`} />
          );
        })}
        <circle cx="0" cy="0" r="1.4" fill="#ffd166" stroke="#5a3a04" strokeWidth="0.3" />
        <circle cx="0" cy="0" r="0.5" fill="#fff5e8" />
      </g>
      {/* EYES — almond shape with lashes */}
      <ellipse cx="28" cy="19" rx="1.8" ry="1.2" fill="#fff5e8" />
      <ellipse cx="36" cy="19" rx="1.8" ry="1.2" fill="#fff5e8" />
      <ellipse cx="28" cy="19.2" rx="1.2" ry="1" fill="#3a2a08" />
      <ellipse cx="36" cy="19.2" rx="1.2" ry="1" fill="#3a2a08" />
      <circle cx="28.3" cy="18.8" r="0.4" fill="#fff" />
      <circle cx="36.3" cy="18.8" r="0.4" fill="#fff" />
      {/* Eyelashes */}
      <path d="M 26.5 18 Q 27.5 17.4 28.5 18 M 27.5 17.6 Q 28 17 28.5 17.4" stroke="#1a0a04" strokeWidth="0.4" fill="none" />
      <path d="M 35.5 18 Q 36.5 17.4 37.5 18 M 35.5 17.6 Q 36 17 36.5 17.4" stroke="#1a0a04" strokeWidth="0.4" fill="none" />
      {/* Eyebrows */}
      <path d="M 26 16 Q 28 15.4 30 16" stroke="#1a0a04" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      <path d="M 34 16 Q 36 15.4 38 16" stroke="#1a0a04" strokeWidth="0.6" fill="none" strokeLinecap="round" />
      {/* Cheek blush */}
      <ellipse cx="25" cy="22" rx="1.8" ry="1.2" fill="#ff7080" opacity="0.5" />
      <ellipse cx="39" cy="22" rx="1.8" ry="1.2" fill="#ff7080" opacity="0.5" />
      {/* RED LIPS — fuller, more shaped */}
      <path d="M 29 24 Q 32 22.8 35 24 Q 33.5 26 32 26 Q 30.5 26 29 24 Z"
        fill="#c8102e" stroke="#5a0810" strokeWidth="0.3" />
      <path d="M 30.5 23.5 Q 32 23 33.5 23.5" stroke="#fff5e8" strokeWidth="0.2" fill="none" opacity="0.7" />
      {/* Gold hoop earrings */}
      <circle cx="22" cy="20" r="1.4" fill="none" stroke="#ffd166" strokeWidth="0.7" />
      <circle cx="42" cy="20" r="1.4" fill="none" stroke="#ffd166" strokeWidth="0.7" />
      {/* Decorative castanet in raised hand */}
      <g transform="translate(48 36) rotate(20)">
        <ellipse cx="0" cy="0" rx="2.2" ry="2.8" fill="#a8761a" stroke="#5a3a04" strokeWidth="0.4" />
        <ellipse cx="0" cy="-1" rx="1.6" ry="1.2" fill="#fff5c4" stroke="#5a3a04" strokeWidth="0.2" />
      </g>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  VIHUELA — ornate Mexican guitar
// ═══════════════════════════════════════════════════════════════════════

/** Vihuela in vibrant purple with gold star decorations and ornate
 *  rosette around the sound hole. Distinctive Mexican folk-art look,
 *  not a plain acoustic guitar. */
export function GuitarSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="gtr-body" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#d090ff" />
          <stop offset="40%" stopColor="#7030c0" />
          <stop offset="80%" stopColor="#3a1060" />
          <stop offset="100%" stopColor="#1a0840" />
        </radialGradient>
        <linearGradient id="gtr-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5c4" />
          <stop offset="50%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#7a4810" />
        </linearGradient>
      </defs>
      {/* Vihuela body — distinctive figure-8 shape, wider lower bout */}
      <ellipse cx="32" cy="44" rx="17" ry="15" fill="url(#gtr-body)"
        stroke="#1a0840" strokeWidth="1.2" />
      <ellipse cx="32" cy="28" rx="11" ry="9" fill="url(#gtr-body)"
        stroke="#1a0840" strokeWidth="1.2" />
      {/* Body gradient highlight on left side */}
      <ellipse cx="22" cy="36" rx="3" ry="7" fill="rgba(255,255,255,0.3)" />
      {/* ═══ GOLD STAR DECORATIONS scattered across body ═══ */}
      {[
        { x: 26, y: 38, s: 1.4 },
        { x: 40, y: 36, s: 1.2 },
        { x: 44, y: 48, s: 1.5 },
        { x: 24, y: 52, s: 1.2 },
        { x: 36, y: 54, s: 1 },
        { x: 20, y: 44, s: 1 },
      ].map((star, i) => {
        const pts = [];
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? 2 * star.s : 0.8 * star.s;
          const a = (k * 36 - 90) * Math.PI / 180;
          pts.push(`${star.x + Math.cos(a) * r},${star.y + Math.sin(a) * r}`);
        }
        return <polygon key={i} points={pts.join(' ')} fill="url(#gtr-gold)"
          stroke="#5a3a04" strokeWidth="0.3" />;
      })}
      {/* ═══ ORNATE ROSETTE around sound hole ═══ */}
      <circle cx="32" cy="40" r="7" fill="none" stroke="url(#gtr-gold)" strokeWidth="0.4" />
      <circle cx="32" cy="40" r="6" fill="none" stroke="#ff5560" strokeWidth="0.5" opacity="0.7" />
      <circle cx="32" cy="40" r="5" fill="none" stroke="#1fff7a" strokeWidth="0.4" opacity="0.6" />
      {/* Sound hole */}
      <circle cx="32" cy="40" r="3.6" fill="#0a0408" stroke="#5a3a04" strokeWidth="0.6" />
      <circle cx="32" cy="40" r="3" fill="none" stroke="url(#gtr-gold)" strokeWidth="0.3" />
      {/* Bridge — gold ornate with pegs */}
      <rect x="25" y="48" width="14" height="2.2" fill="url(#gtr-gold)" stroke="#5a3a04" strokeWidth="0.4" />
      {[27, 30, 32, 34, 37].map((x, i) => (
        <circle key={i} cx={x} cy="49" r="0.4" fill="#1a0a04" />
      ))}
      {/* Strings */}
      {[29, 30.5, 32, 33.5, 35].map((x, i) => (
        <line key={i} x1={x} y1="11" x2={x} y2="49" stroke="#fff5c4" strokeWidth="0.35" opacity="0.85" />
      ))}
      {/* Neck */}
      <rect x="29" y="13" width="6" height="8" fill="#3a1a04" stroke="#5a3a04" strokeWidth="0.7" />
      {/* Fret markers */}
      <line x1="29" y1="16" x2="35" y2="16" stroke="#fff5c4" strokeWidth="0.3" opacity="0.6" />
      <line x1="29" y1="19" x2="35" y2="19" stroke="#fff5c4" strokeWidth="0.3" opacity="0.6" />
      {/* Headstock with tuning pegs */}
      <rect x="27" y="3" width="10" height="10" rx="1" fill="#3a1a04" stroke="#5a3a04" strokeWidth="0.7" />
      {[28.5, 32, 35.5].map((x, i) => (
        <g key={i}>
          <circle cx={x} cy="6" r="0.9" fill="url(#gtr-gold)" stroke="#5a3a04" strokeWidth="0.2" />
          <circle cx={x} cy="10" r="0.9" fill="url(#gtr-gold)" stroke="#5a3a04" strokeWidth="0.2" />
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHILI WILD — red pepper engulfed in flames
// ═══════════════════════════════════════════════════════════════════════

/** Bright red chili pepper with bright orange/yellow FLAMES wrapping
 *  around it (the key real-game element that was missing). Green stem
 *  on top, glossy highlight on body, "WILD" banner across the bottom. */
export function ChilliSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="chl-body" cx="38%" cy="32%" r="70%">
          <stop offset="0%" stopColor="#ffd0d4" />
          <stop offset="20%" stopColor="#ff7080" />
          <stop offset="50%" stopColor="#e02030" />
          <stop offset="85%" stopColor="#8a0820" />
          <stop offset="100%" stopColor="#4a0410" />
        </radialGradient>
        <radialGradient id="chl-flame-yellow" cx="50%" cy="60%" r="50%">
          <stop offset="0%" stopColor="#fff5a0" />
          <stop offset="50%" stopColor="#ffc040" />
          <stop offset="100%" stopColor="#ff6020" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="chl-flame-orange" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffa040" />
          <stop offset="50%" stopColor="#ff5020" />
          <stop offset="100%" stopColor="#c81020" />
        </linearGradient>
      </defs>

      {/* ═══ FLAMES — outer orange layer, big and dramatic ═══ */}
      {/* Outer flame silhouette wraps around the chili */}
      <path d="
        M 32 4
        Q 26 6 22 12
        Q 14 14 10 22
        Q 4 30 8 40
        Q 4 48 14 54
        Q 18 60 30 58
        Q 42 60 50 54
        Q 60 48 56 40
        Q 60 30 54 22
        Q 50 14 42 12
        Q 38 6 32 4 Z"
        fill="url(#chl-flame-orange)" opacity="0.85" />
      {/* Inner yellow flame tongues — pointed wisps */}
      <path d="M 18 16 Q 16 10 22 8 Q 20 12 22 16 Z" fill="#ffd040" opacity="0.9" />
      <path d="M 46 16 Q 48 10 42 8 Q 44 12 42 16 Z" fill="#ffd040" opacity="0.9" />
      <path d="M 10 32 Q 6 28 8 22 Q 12 26 12 32 Z" fill="#ffc040" opacity="0.8" />
      <path d="M 54 32 Q 58 28 56 22 Q 52 26 52 32 Z" fill="#ffc040" opacity="0.8" />
      <path d="M 14 48 Q 8 50 10 56 Q 16 52 18 48 Z" fill="#ff8040" opacity="0.8" />
      <path d="M 50 48 Q 56 50 54 56 Q 48 52 46 48 Z" fill="#ff8040" opacity="0.8" />
      {/* Yellow glow layer (closest to chili) */}
      <ellipse cx="32" cy="34" rx="18" ry="22" fill="url(#chl-flame-yellow)" opacity="0.7" />

      {/* ═══ CHILI PEPPER BODY ═══ */}
      <path d="
        M 28 16
        C 22 18 18 26 18 36
        C 18 46 24 54 32 56
        C 40 54 46 46 46 36
        C 46 26 42 18 36 16
        Q 34 14 32 14
        Q 30 14 28 16 Z"
        fill="url(#chl-body)" stroke="#3a0410" strokeWidth="1.2" strokeLinejoin="round" />
      {/* Glossy highlight on body */}
      <path d="M 22 22 Q 19 30 21 42 Q 22 46 24 46 Q 25 30 25 22 Z"
        fill="rgba(255,255,255,0.55)" />
      <ellipse cx="22" cy="22" rx="2.2" ry="3" fill="rgba(255,255,255,0.75)" />
      {/* Body shadow on right */}
      <path d="M 40 24 Q 44 36 38 50" fill="none"
        stroke="rgba(90,8,16,0.45)" strokeWidth="1.5" />

      {/* ═══ STEM ═══ */}
      <path d="M 28 14 Q 32 8 36 14 Q 34 18 32 18 Q 30 18 28 14 Z"
        fill="#3aa840" stroke="#1a4a18" strokeWidth="0.6" />
      <path d="M 32 6 Q 30 10 32 14" stroke="#1a4a18" strokeWidth="1.8"
        fill="none" strokeLinecap="round" />
      <path d="M 32 6 Q 36 4 38 8" fill="#3aa840" stroke="#1a4a18" strokeWidth="0.4" />

      {/* ═══ WILD BANNER at bottom ═══ */}
      <rect x="18" y="50" width="28" height="9" rx="2"
        fill="url(#chl-flame-orange)" stroke="#5a0810" strokeWidth="0.7" />
      <rect x="19" y="51" width="26" height="7" rx="1.5"
        fill="none" stroke="url(#chl-flame-yellow)" strokeWidth="0.5" opacity="0.9" />
      <text x="32" y="56.5" textAnchor="middle" fontSize="6.5"
        fontFamily="'Fraunces','Georgia',serif" fontWeight="900"
        fill="#fff5c4" stroke="#3a0408" strokeWidth="0.3">WILD</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  HOT SAUCE — vintage glass bottle with chili label
// ═══════════════════════════════════════════════════════════════════════

/** Glass bottle filled with red sauce, vintage paper label featuring a
 *  chili pepper graphic and "SALSA" text, cork top with foil wrap, and
 *  steam wisps rising from the cork. */
export function HotSauceSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="hs-sauce" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff7040" />
          <stop offset="35%" stopColor="#e02030" />
          <stop offset="100%" stopColor="#5a0810" />
        </linearGradient>
        <linearGradient id="hs-cork" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#c89058" />
          <stop offset="100%" stopColor="#5a3018" />
        </linearGradient>
        <linearGradient id="hs-foil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffd166" />
          <stop offset="100%" stopColor="#8a5810" />
        </linearGradient>
      </defs>
      {/* Steam wisps above cork */}
      <path d="M 28 4 Q 26 2 28 0" stroke="#fff5e8" strokeWidth="1" fill="none"
        strokeLinecap="round" opacity="0.7" />
      <path d="M 32 3 Q 34 1 32 -1" stroke="#fff5e8" strokeWidth="1" fill="none"
        strokeLinecap="round" opacity="0.8" />
      <path d="M 36 4 Q 38 2 36 0" stroke="#fff5e8" strokeWidth="1" fill="none"
        strokeLinecap="round" opacity="0.7" />
      {/* Cork */}
      <rect x="27" y="6" width="10" height="5" rx="1.4"
        fill="url(#hs-cork)" stroke="#3a1a08" strokeWidth="0.5" />
      {/* Foil wrap around neck */}
      <rect x="26" y="10" width="12" height="4" fill="url(#hs-foil)"
        stroke="#5a3a04" strokeWidth="0.4" />
      <path d="M 28 11 L 28 14 M 32 11 L 32 14 M 36 11 L 36 14"
        stroke="#5a3a04" strokeWidth="0.3" opacity="0.5" />
      {/* Bottle neck */}
      <rect x="28" y="13" width="8" height="6" fill="url(#hs-sauce)"
        stroke="#3a0408" strokeWidth="0.5" />
      <rect x="28" y="13" width="8" height="6" fill="none"
        stroke="rgba(255,255,255,0.3)" strokeWidth="0.4" />
      {/* Bottle body — wider at bottom */}
      <path d="M 22 21 Q 22 19 28 19 L 36 19 Q 42 19 42 21 L 42 54 Q 42 60 38 60 L 26 60 Q 22 60 22 54 Z"
        fill="url(#hs-sauce)" stroke="#3a0408" strokeWidth="0.9"
        strokeLinejoin="round" />
      {/* Glass highlight (left side gloss strip) */}
      <path d="M 24 24 Q 24 36 25 46" stroke="rgba(255,255,255,0.55)"
        strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 26 24 Q 26 30 26 36" stroke="rgba(255,255,255,0.3)"
        strokeWidth="0.5" fill="none" />
      {/* Glass shine on right edge */}
      <path d="M 40 28 Q 40 38 40 48" stroke="rgba(255,255,255,0.2)"
        strokeWidth="1.2" fill="none" />
      {/* ═══ PAPER LABEL with chili icon and SALSA text ═══ */}
      <rect x="23" y="28" width="18" height="22" rx="1"
        fill="#fff5e0" stroke="#5a3a04" strokeWidth="0.5" />
      <rect x="24" y="29" width="16" height="20" rx="0.5"
        fill="none" stroke="#c8102e" strokeWidth="0.4" />
      {/* Chili graphic on label */}
      <g transform="translate(32 35)">
        <path d="M -3 -2 Q -5 0 -4 3 Q -3 5 0 5 Q 3 5 4 3 Q 5 0 3 -2 Q 2 -3 0 -3 Q -2 -3 -3 -2 Z"
          fill="#c8102e" stroke="#3a0408" strokeWidth="0.3" />
        <path d="M -1 -2.5 Q 0 -4 1 -2.5" stroke="#1fa84a" strokeWidth="0.8"
          fill="none" strokeLinecap="round" />
      </g>
      {/* SALSA text */}
      <text x="32" y="44" textAnchor="middle" fontSize="3.4"
        fontFamily="'Fraunces','Georgia',serif" fontWeight="900"
        fill="#5a0810">SALSA</text>
      <text x="32" y="47.5" textAnchor="middle" fontSize="2.2"
        fontFamily="'Fraunces','Georgia',serif" fontWeight="700"
        fill="#5a0810">★ HOT ★</text>
      {/* Drip down side of bottle */}
      <path d="M 41 52 Q 42 56 41.5 58 Q 41 56.5 41 52 Z"
        fill="#e02030" stroke="#3a0408" strokeWidth="0.3" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  CHIHUAHUA — black-and-white dog on pink pillow with yellow sombrero
// ═══════════════════════════════════════════════════════════════════════

/** Small white chihuahua with black patches, sitting on a pink tasseled
 *  pillow, wearing a tiny yellow sombrero. Big alert ears, big sweet
 *  round eyes with sparkles, pink tongue out. Matches the real game's
 *  very specific look. */
export function ChihuahuaSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <radialGradient id="ch-fur" cx="50%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#f0e0c8" />
          <stop offset="100%" stopColor="#806844" />
        </radialGradient>
        <linearGradient id="ch-pillow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffb0d0" />
          <stop offset="50%" stopColor="#ff7aaa" />
          <stop offset="100%" stopColor="#a8407a" />
        </linearGradient>
        <linearGradient id="ch-som" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fff5a0" />
          <stop offset="40%" stopColor="#ffd040" />
          <stop offset="100%" stopColor="#a86a10" />
        </linearGradient>
        <linearGradient id="ch-trim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8090" />
          <stop offset="100%" stopColor="#a02030" />
        </linearGradient>
      </defs>
      {/* ═══ PINK PILLOW underneath (the real-game detail) ═══ */}
      <ellipse cx="32" cy="56" rx="24" ry="6" fill="url(#ch-pillow)"
        stroke="#7a1858" strokeWidth="0.8" />
      {/* Pillow shadow underneath */}
      <ellipse cx="32" cy="60" rx="18" ry="2" fill="rgba(0,0,0,0.3)" />
      {/* Gold tassels at pillow corners */}
      {[10, 54].map((x, i) => (
        <g key={i} transform={`translate(${x} 58)`}>
          <circle r="1.5" fill="url(#ch-som)" stroke="#5a3a04" strokeWidth="0.3" />
          <line x1="0" y1="1.5" x2="-1" y2="4" stroke="#ffd040" strokeWidth="0.5" />
          <line x1="0" y1="1.5" x2="0" y2="4" stroke="#ffd040" strokeWidth="0.5" />
          <line x1="0" y1="1.5" x2="1" y2="4" stroke="#ffd040" strokeWidth="0.5" />
        </g>
      ))}
      {/* Pillow seam highlight */}
      <path d="M 12 55 Q 32 51 52 55" fill="none"
        stroke="#fff5e8" strokeWidth="0.5" opacity="0.6" />

      {/* ═══ DOG BODY (sitting upright) ═══ */}
      <ellipse cx="32" cy="46" rx="13" ry="10" fill="url(#ch-fur)"
        stroke="#5a3a18" strokeWidth="0.7" />
      {/* Black patches on body (the spotted look) */}
      <ellipse cx="38" cy="44" rx="4" ry="3" fill="#3a2a14" opacity="0.85" />
      <ellipse cx="26" cy="48" rx="2.5" ry="2" fill="#3a2a14" opacity="0.85" />
      {/* Front paws */}
      <ellipse cx="26" cy="53" rx="2.6" ry="2.8" fill="url(#ch-fur)"
        stroke="#5a3a18" strokeWidth="0.5" />
      <ellipse cx="38" cy="53" rx="2.6" ry="2.8" fill="url(#ch-fur)"
        stroke="#5a3a18" strokeWidth="0.5" />
      {/* Paw pad lines */}
      <line x1="25" y1="55" x2="26.5" y2="55" stroke="#5a3a18" strokeWidth="0.4" />
      <line x1="27" y1="55" x2="28" y2="55" stroke="#5a3a18" strokeWidth="0.4" />
      <line x1="37" y1="55" x2="38" y2="55" stroke="#5a3a18" strokeWidth="0.4" />
      <line x1="38.5" y1="55" x2="40" y2="55" stroke="#5a3a18" strokeWidth="0.4" />

      {/* ═══ HEAD (apple-shaped, classic chihuahua) ═══ */}
      <ellipse cx="32" cy="29" rx="11" ry="11" fill="url(#ch-fur)"
        stroke="#5a3a18" strokeWidth="0.8" />
      {/* Black patch around right eye */}
      <ellipse cx="36" cy="27" rx="4" ry="3.5" fill="#3a2a14" opacity="0.85" />
      {/* ═══ EARS — large, alert, triangular ═══ */}
      <path d="M 22 24 L 17 11 L 25 18 Z" fill="url(#ch-fur)"
        stroke="#5a3a18" strokeWidth="0.6" />
      <path d="M 42 24 L 47 11 L 39 18 Z" fill="#3a2a14"
        stroke="#1a0a04" strokeWidth="0.6" />
      {/* Inner ear pink */}
      <path d="M 22 22 L 20 14 L 24 18 Z" fill="#ffa0c0" opacity="0.8" />
      <path d="M 42 22 L 44 14 L 40 18 Z" fill="#ff8aa0" opacity="0.7" />

      {/* ═══ EYES — big round and sweet ═══ */}
      <ellipse cx="27" cy="28" rx="2.4" ry="2.6" fill="#1a0a04" />
      <ellipse cx="37" cy="28" rx="2.4" ry="2.6" fill="#1a0a04" />
      {/* Eye sparkles */}
      <ellipse cx="27.6" cy="27.2" rx="0.8" ry="1" fill="#fff" />
      <ellipse cx="37.6" cy="27.2" rx="0.8" ry="1" fill="#fff" />
      <circle cx="26.6" cy="29" r="0.4" fill="#fff" opacity="0.8" />
      <circle cx="36.6" cy="29" r="0.4" fill="#fff" opacity="0.8" />

      {/* ═══ SNOUT, NOSE, TONGUE ═══ */}
      <ellipse cx="32" cy="34" rx="4.5" ry="3.2" fill="#fff5e8"
        stroke="#5a3a18" strokeWidth="0.4" />
      <ellipse cx="32" cy="32" rx="1.6" ry="1.2" fill="#1a0a04" />
      {/* Tongue */}
      <path d="M 30.5 34.5 Q 32 38 33.5 34.5 Q 34 37 32 38 Q 30 37 30.5 34.5 Z"
        fill="#ff6080" stroke="#7a1830" strokeWidth="0.3" />
      <line x1="32" y1="35" x2="32" y2="37.5" stroke="#a02030" strokeWidth="0.3" />
      {/* Mouth corners */}
      <path d="M 29 34 Q 31 35.5 32 35" stroke="#5a3018" strokeWidth="0.3"
        fill="none" strokeLinecap="round" />
      <path d="M 35 34 Q 33 35.5 32 35" stroke="#5a3018" strokeWidth="0.3"
        fill="none" strokeLinecap="round" />

      {/* ═══ YELLOW SOMBRERO on top of head ═══ */}
      <ellipse cx="32" cy="15" rx="15" ry="3.2" fill="url(#ch-som)"
        stroke="#5a3a04" strokeWidth="0.7" />
      <ellipse cx="32" cy="16.5" rx="12" ry="1.2" fill="rgba(0,0,0,0.3)" />
      <path d="M 25 15 Q 24 8 32 7 Q 40 8 39 15 Z"
        fill="url(#ch-som)" stroke="#5a3a04" strokeWidth="0.7" />
      {/* Red band around crown */}
      <path d="M 25 14 Q 32 12 39 14 L 39 11 Q 32 9 25 11 Z"
        fill="url(#ch-trim)" stroke="#5a0810" strokeWidth="0.3" />
      {/* Pom-poms */}
      <circle cx="18" cy="15.5" r="1.2" fill="#1fa84a" stroke="#0a3a18" strokeWidth="0.3" />
      <circle cx="46" cy="15.5" r="1.2" fill="#5fb8ff" stroke="#0a2a5a" strokeWidth="0.3" />
      {/* Crown highlight */}
      <ellipse cx="28" cy="10" rx="1.6" ry="2.2" fill="rgba(255,255,255,0.5)" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  PIÑATA — donkey piñata (scatter symbol)
// ═══════════════════════════════════════════════════════════════════════

/** Rainbow-colored donkey piñata with paper streamer fringe, X-shaped
 *  paper eye, decorative stars, and tassels hanging from the legs.
 *  Suspended from a string. */
export function PinataSvg({ size = '100%' }: { size?: string | number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size}>
      <defs>
        <linearGradient id="pin-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff4858" />
          <stop offset="25%" stopColor="#ffd166" />
          <stop offset="50%" stopColor="#1fa84a" />
          <stop offset="75%" stopColor="#5fb8ff" />
          <stop offset="100%" stopColor="#c042b8" />
        </linearGradient>
        <radialGradient id="pin-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(255,209,102,0.4)" />
          <stop offset="100%" stopColor="rgba(255,209,102,0)" />
        </radialGradient>
      </defs>
      {/* Glow halo (scatter signal) */}
      <circle cx="32" cy="36" r="28" fill="url(#pin-glow)" />
      {/* String hanging it */}
      <line x1="34" y1="2" x2="34" y2="18" stroke="#806844"
        strokeWidth="0.6" strokeDasharray="1 1" />
      {/* ═══ DONKEY BODY ═══ */}
      <ellipse cx="28" cy="38" rx="18" ry="13" fill="url(#pin-body)"
        stroke="#1a0a04" strokeWidth="1.1" />
      {/* HEAD (positioned upper right) */}
      <ellipse cx="46" cy="28" rx="9" ry="7.5" fill="url(#pin-body)"
        stroke="#1a0a04" strokeWidth="1" />
      {/* EARS (two pointed up) */}
      <path d="M 48 22 L 50 13 L 54 18 Z" fill="#ff4858"
        stroke="#1a0a04" strokeWidth="0.6" />
      <path d="M 44 22 L 42 13 L 46 18 Z" fill="#1fa84a"
        stroke="#1a0a04" strokeWidth="0.6" />
      {/* X-shaped paper eye */}
      <line x1="48" y1="25" x2="51" y2="28" stroke="#1a0a04" strokeWidth="1.2" />
      <line x1="51" y1="25" x2="48" y2="28" stroke="#1a0a04" strokeWidth="1.2" />
      {/* Mouth */}
      <path d="M 50 30 Q 53 31 53 32" stroke="#1a0a04" strokeWidth="0.7"
        fill="none" strokeLinecap="round" />

      {/* ═══ PAPER STREAMER FRINGE on body (concentric layers) ═══ */}
      {/* Bottom fringe */}
      <path d="M 14 48 Q 16 50 16 52 M 18 49 Q 20 51 20 53 M 22 50 Q 24 52 24 54 M 26 50 Q 28 52 28 54 M 30 50 Q 32 52 32 54 M 34 50 Q 36 52 36 54 M 38 50 Q 40 52 40 54 M 42 49 Q 44 51 44 53"
        stroke="#fff5e8" strokeWidth="0.6" fill="none" />
      {/* Color stripes (paper layers across body) */}
      <path d="M 14 32 Q 18 30 28 30 Q 38 30 44 32" stroke="#ff4858"
        strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M 14 36 Q 18 34 28 34 Q 38 34 44 36" stroke="#ffd166"
        strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M 14 40 Q 18 38 28 38 Q 38 38 44 40" stroke="#1fa84a"
        strokeWidth="1" fill="none" opacity="0.6" />
      <path d="M 14 44 Q 18 42 28 42 Q 38 42 44 44" stroke="#5fb8ff"
        strokeWidth="1" fill="none" opacity="0.6" />

      {/* Tail (paper streamers fanning out left) */}
      <path d="M 10 36 Q 4 34 2 38 Q 6 39 10 39" fill="#5fb8ff"
        stroke="#1a0a04" strokeWidth="0.5" />
      <path d="M 10 38 Q 2 42 2 46 Q 6 44 10 42" fill="#ffd166"
        stroke="#1a0a04" strokeWidth="0.5" />
      <path d="M 8 40 L 4 50" stroke="#ff4858" strokeWidth="1" strokeLinecap="round" />

      {/* Legs */}
      <line x1="20" y1="50" x2="20" y2="56" stroke="#1a0a04" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="26" y1="50" x2="26" y2="56" stroke="#1a0a04" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="34" y1="50" x2="34" y2="56" stroke="#1a0a04" strokeWidth="2.2" strokeLinecap="round" />
      <line x1="40" y1="50" x2="40" y2="56" stroke="#1a0a04" strokeWidth="2.2" strokeLinecap="round" />
      {/* Paper tassels at hoof ends */}
      <path d="M 19 56 L 19 60 M 20 56 L 20 60 M 21 56 L 21 60" stroke="#ff4858" strokeWidth="0.4" />
      <path d="M 25 56 L 25 60 M 26 56 L 26 60 M 27 56 L 27 60" stroke="#1fa84a" strokeWidth="0.4" />
      <path d="M 33 56 L 33 60 M 34 56 L 34 60 M 35 56 L 35 60" stroke="#ffd166" strokeWidth="0.4" />
      <path d="M 39 56 L 39 60 M 40 56 L 40 60 M 41 56 L 41 60" stroke="#5fb8ff" strokeWidth="0.4" />

      {/* Decorative stars on body */}
      {[
        { x: 22, y: 36 },
        { x: 32, y: 42 },
      ].map((s, i) => {
        const pts = [];
        for (let k = 0; k < 10; k++) {
          const r = k % 2 === 0 ? 2 : 0.8;
          const a = (k * 36 - 90) * Math.PI / 180;
          pts.push(`${s.x + Math.cos(a) * r},${s.y + Math.sin(a) * r}`);
        }
        return <polygon key={i} points={pts.join(' ')}
          fill="#fff5e8" stroke="#7a4810" strokeWidth="0.3" />;
      })}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  ROYAL LETTERS — chunky illustrated 3D letters
// ═══════════════════════════════════════════════════════════════════════

/** Royal letter symbol (A / K / Q / J / 10) — a CHUNKY ornate letter
 *  with a strong gradient fill, heavy black outline, gloss highlight,
 *  drop shadow, and a small decorative flourish. No more chip-style
 *  disc behind it — the letter IS the symbol. */
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
  // Convert the supplied color to a lighter "top" and darker "bottom"
  // for the gradient. Done as inline color stops since the supplied
  // colors are bright primaries that already work as the mid-tone.
  const isTen = letter === '10';
  const fontSize = isTen ? 50 : 64;

  return (
    <svg viewBox="0 0 64 64" width={size} height={size} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="25%" stopColor={color} stopOpacity="1" />
          <stop offset="70%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor="#1a0a04" stopOpacity="0.85" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.65)" />
          <stop offset="45%" stopColor="rgba(255,255,255,0.1)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <filter id={`${id}-shadow`}>
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.4" />
          <feOffset dx="0" dy="2" result="offsetblur" />
          <feFlood floodColor="rgba(0,0,0,0.6)" />
          <feComposite in2="offsetblur" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Drop shadow text (offset down, blurred) */}
      <text x="32" y={isTen ? 48 : 52} textAnchor="middle"
        fontSize={fontSize} fontWeight="900"
        fontFamily="'Fraunces','Georgia',serif"
        fill="rgba(0,0,0,0.55)"
        style={{ filter: 'blur(1.8px)' }}>
        {letter}
      </text>
      {/* Outlined letter (heavy stroke + gradient fill) */}
      <text x="32" y={isTen ? 46 : 50} textAnchor="middle"
        fontSize={fontSize} fontWeight="900"
        fontFamily="'Fraunces','Georgia',serif"
        fill={`url(#${id}-fill)`}
        stroke="#1a0a04" strokeWidth="3.5"
        strokeLinejoin="round"
        paintOrder="stroke fill">
        {letter}
      </text>
      {/* Gloss overlay (top half lighter) */}
      <text x="32" y={isTen ? 46 : 50} textAnchor="middle"
        fontSize={fontSize} fontWeight="900"
        fontFamily="'Fraunces','Georgia',serif"
        fill={`url(#${id}-gloss)`}
        style={{ pointerEvents: 'none' }}>
        {letter}
      </text>
      {/* Subtle corner glow accent in the symbol's color */}
      <circle cx="52" cy="14" r="2.4" fill={color} opacity="0.5" />
      <circle cx="52" cy="14" r="1" fill="#fff" opacity="0.8" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Compatibility aliases — keep older import names working
// ═══════════════════════════════════════════════════════════════════════

export { DiabloSvg as SenoritaSvg };
