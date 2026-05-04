/** Wanted Dead or a Wild scene — gritty Western desert at twilight.
 *  Layered: dusk sky → distant mesa silhouettes → saloon building →
 *  wood-plank fence foreground → swirling dust + tumbling spore particles. */
export function WantedScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Sky — twilight burn */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #f5b06a 0%, #d8442a 18%, #8a1818 38%, #2a0810 70%, #0a0204 100%)',
        }}
      />
      {/* Big sun (low) — subtle heat-shimmer pulse so the dusk sky feels
       *  alive instead of a static gradient. Long 5s cycle. */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '38%',
          width: '52%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,200,120,.55) 0%, rgba(220,80,60,.4) 30%, transparent 65%)',
          filter: 'blur(2px)',
          animation: 'wantedSunHaze 5s ease-in-out infinite',
          transform: 'translate(-50%, -50%)',
          transformOrigin: 'center',
        }}
      />

      {/* 2. Distant mesa silhouettes + saloon */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '40%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ww-mesa-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a2818" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#1a0610" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ww-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a1a08" stopOpacity="1" />
            <stop offset="100%" stopColor="#0a0204" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ww-saloon" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3018" stopOpacity="1" />
            <stop offset="100%" stopColor="#1a0a04" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Mesas */}
        <path d="M0,50 L0,32 L8,32 L8,22 L26,22 L26,32 L46,32 L46,26 L66,26 L66,32 L88,32 L88,18 L100,18 L100,50 Z" fill="url(#ww-mesa-far)" />
        {/* Saloon — main building, slightly left of centre. Real-game-style
         * false-front facade with bold SALOON sign, swinging double doors,
         * batwing door tops, plank cladding, lit windows, balcony rail. */}
        <g transform="translate(38 18)">
          {/* Plank-clad facade */}
          <rect x="0" y="4" width="22" height="14" fill="url(#ww-saloon)" />
          {/* Plank divisions (vertical lines) */}
          {[3, 6, 9, 12, 15, 18].map((x, i) => (
            <line key={i} x1={x} y1="4" x2={x} y2="18" stroke="#1a0a02" strokeWidth=".15" opacity=".6" />
          ))}
          {/* False front (the iconic tall western parapet) */}
          <rect x="4" y="-2" width="14" height="8" fill="url(#ww-saloon)" />
          {/* False-front decorative pediment top */}
          <path d="M 4 -2 L 11 -4 L 18 -2 Z" fill="url(#ww-saloon)" stroke="#0a0204" strokeWidth=".15" />
          {/* SALOON sign banner on false front */}
          <rect x="3" y="0" width="16" height="3.5" fill="#3a1a08" stroke="#ffd166" strokeWidth=".15" />
          <text
            x="11"
            y="2.4"
            textAnchor="middle"
            fontSize="2.4"
            fontFamily="serif"
            fontWeight="800"
            fill="#ffd166"
          >
            SALOON
          </text>
          {/* Door (lit warmly inside) */}
          {/* Batwing double doors (saloon-style swing doors) */}
          <rect x="8" y="11" width="6" height="7" fill="rgba(255,200,80,.6)" stroke="#1a0a02" strokeWidth=".2" />
          <line x1="11" y1="11" x2="11" y2="18" stroke="#1a0a02" strokeWidth=".25" />
          {/* Slatted batwing pattern */}
          {[12, 13.5, 15, 16.5].map((y, i) => (
            <line key={i} x1="8" y1={y} x2="14" y2={y} stroke="#1a0a02" strokeWidth=".15" opacity=".55" />
          ))}
          {/* Lit windows on either side of door */}
          <rect x="1.5" y="9" width="4" height="4" fill="rgba(255,200,80,.42)" stroke="#1a0a02" strokeWidth=".18" />
          <line x1="3.5" y1="9" x2="3.5" y2="13" stroke="#1a0a02" strokeWidth=".15" />
          <line x1="1.5" y1="11" x2="5.5" y2="11" stroke="#1a0a02" strokeWidth=".15" />
          <rect x="16.5" y="9" width="4" height="4" fill="rgba(255,200,80,.42)" stroke="#1a0a02" strokeWidth=".18" />
          <line x1="18.5" y1="9" x2="18.5" y2="13" stroke="#1a0a02" strokeWidth=".15" />
          <line x1="16.5" y1="11" x2="20.5" y2="11" stroke="#1a0a02" strokeWidth=".15" />
          {/* Porch posts */}
          <rect x="-1" y="9" width=".7" height="9" fill="#1a0a04" />
          <rect x="22.5" y="9" width=".7" height="9" fill="#1a0a04" />
          {/* Awning (overhang above the porch) */}
          <rect x="-2" y="8.5" width="26" height="1.4" fill="#1a0a04" />
          {/* Awning support diagonals */}
          <line x1="-1" y1="9" x2="-2" y2="8.5" stroke="#1a0a04" strokeWidth=".2" />
          <line x1="23" y1="9" x2="24" y2="8.5" stroke="#1a0a04" strokeWidth=".2" />
          {/* Hitching rail in front of saloon (where horses tie) */}
          <line x1="-3" y1="17.5" x2="25" y2="17.5" stroke="#3a1a04" strokeWidth=".25" />
          {/* Horse silhouette tied to the rail */}
          <g transform="translate(-3 14.5)" fill="#0a0204">
            <ellipse cx="2.5" cy="2" rx="2.5" ry="1" />
            <rect x="3" y="2.5" width="1.4" height="1.5" />
            <rect x="0.6" y="2.5" width="1.4" height="1.5" />
            <path d="M 0 1.5 L -1 0 L 0 0.5 Z" />
          </g>
        </g>
        {/* Foreground ground */}
        <path d="M0,50 L0,42 Q14,40 28,42 Q44,44 60,42 Q76,40 92,44 Q98,46 100,44 L100,50 Z" fill="url(#ww-near)" />
        {/* Wagon wheel detail (right side) */}
        <g transform="translate(82 44)" stroke="#1a0a04" strokeWidth=".25" fill="none">
          <circle cx="0" cy="0" r="2.4" fill="#3a1a08" />
          {[0, 60, 120].map((a, i) => (
            <line key={i} x1={-2.4 * Math.cos((a * Math.PI) / 180)} y1={-2.4 * Math.sin((a * Math.PI) / 180)} x2={2.4 * Math.cos((a * Math.PI) / 180)} y2={2.4 * Math.sin((a * Math.PI) / 180)} />
          ))}
        </g>
      </svg>

      {/* 3. Cactus silhouette + nailed WANTED poster on a fence post */}
      <WantedCactus position={{ bottom: '5%', left: '4%' }} size="min(54px, 12cqw)" />

      {/* Nailed WANTED poster on a fence post (right of the cactus) */}
      <svg
        className="absolute"
        style={{
          bottom: '6%',
          left: '20%',
          width: 'min(38px, 8cqw)',
          aspectRatio: '1 / 1.5',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.6))',
          opacity: 0.92,
        }}
        viewBox="0 0 30 45"
      >
        <defs>
          <linearGradient id="ww-post" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3a18" />
            <stop offset="100%" stopColor="#1a0a02" />
          </linearGradient>
        </defs>
        {/* Fence post */}
        <rect x="13" y="0" width="4" height="45" fill="url(#ww-post)" />
        {/* Crossbar at top */}
        <rect x="6" y="3" width="18" height="1.5" fill="url(#ww-post)" />
        {/* Poster (slightly tilted, off-cream) */}
        <g transform="rotate(-4 15 18)">
          <rect x="3" y="6" width="24" height="24" fill="#f5e9d4" stroke="#5a3a04" strokeWidth=".4" />
          {/* Bullet hole */}
          <circle cx="22" cy="10" r=".9" fill="#1a0a02" stroke="#3a1a04" strokeWidth=".2" />
          {/* WANTED text */}
          <text x="15" y="13" textAnchor="middle" fontSize="3.4" fontFamily="serif" fontWeight="900" fill="#1a0a02">WANTED</text>
          <line x1="5" y1="14.5" x2="25" y2="14.5" stroke="#1a0a02" strokeWidth=".25" />
          {/* Skull face */}
          <circle cx="15" cy="20" r="3.5" fill="#fff5e0" stroke="#1a0a02" strokeWidth=".25" />
          <ellipse cx="13.5" cy="20" rx=".7" ry=".9" fill="#1a0a02" />
          <ellipse cx="16.5" cy="20" rx=".7" ry=".9" fill="#1a0a02" />
          <rect x="13" y="22.5" width="4" height="1" fill="#fff5e0" stroke="#1a0a02" strokeWidth=".15" />
          {/* DEAD OR ALIVE */}
          <text x="15" y="27" textAnchor="middle" fontSize="1.6" fontFamily="serif" fontWeight="700" fill="#1a0a02">DEAD OR ALIVE</text>
        </g>
      </svg>
      {/* Rusted horseshoe nailed to a fence post on the right (replaces a
       *  wheat emoji that read as a green sprout — wrong palette + wrong
       *  vibe for a dusty western backdrop). */}
      <Horseshoe position={{ bottom: '7%', right: '12%' }} size="min(28px, 6cqw)" />

      {/* Rolling tumbleweeds across the foreground — proper SVG tumbleweed
       *  (tangled dry-brush ball) instead of a potted-plant emoji. Two
       *  staggered instances at different sizes so it feels organic rather
       *  than a single repeating sprite. */}
      <div
        className="absolute"
        style={{
          bottom: '7%',
          left: 0,
          width: 'min(28px, 6cqw)',
          aspectRatio: '1 / 1',
          animation: 'wantedTumbleweed 22s linear infinite',
          willChange: 'transform, opacity',
        }}
      >
        <Tumbleweed />
      </div>
      <div
        className="absolute"
        style={{
          bottom: '5%',
          left: 0,
          width: 'min(22px, 5cqw)',
          aspectRatio: '1 / 1',
          animation: 'wantedTumbleweed 30s linear 14s infinite',
          willChange: 'transform, opacity',
          opacity: 0.85,
        }}
      >
        <Tumbleweed />
      </div>

      {/* Warm dusk stage-light glow behind reels */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,165,80,.28) 0%, rgba(200,80,40,.14) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 4. Sparkle dust + dust motes */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 14% 22%, rgba(255,200,120,.85), transparent 60%),
            radial-gradient(1.5px 1.5px at 72% 16%, rgba(255,180,80,.75), transparent 60%),
            radial-gradient(1.5px 1.5px at 38% 32%, rgba(255,232,168,.6), transparent 60%),
            radial-gradient(2px 2px at 88% 38%, rgba(255,180,100,.7), transparent 60%),
            radial-gradient(1.4px 1.4px at 22% 48%, rgba(255,210,140,.6), transparent 60%),
            radial-gradient(1.4px 1.4px at 64% 50%, rgba(255,200,120,.55), transparent 60%),
            radial-gradient(2px 2px at 8% 62%, rgba(255,180,80,.5), transparent 60%),
            radial-gradient(1.4px 1.4px at 92% 64%, rgba(255,210,140,.55), transparent 60%)
          `,
          mixBlendMode: 'screen',
          animation: 'bonanzaSparkle 5s ease-in-out infinite',
        }}
      />

      {/* 5. Vignette + frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(72% 72% at 50% 50%, transparent 50%, rgba(0,0,0,.45) 100%)',
        }}
      />
      <div
        className="absolute inset-0 rounded-[14px] pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 0 2px rgba(200,147,46,.25), inset 0 0 22px rgba(122,74,4,.4)',
        }}
      />
    </div>
  );
}

function WantedCactus({
  position,
  size,
}: {
  position: { bottom?: string; left?: string; right?: string };
  size: string;
}) {
  return (
    <svg
      className="absolute"
      style={{
        ...position,
        width: size,
        aspectRatio: '1 / 1.5',
        filter:
          'drop-shadow(2px 0 4px rgba(255,140,40,.3)) drop-shadow(0 4px 6px rgba(0,0,0,.6))',
      }}
      viewBox="0 0 50 75"
    >
      <path
        d="M 22 75 L 22 38 Q 22 28 18 28 Q 12 28 12 34 L 12 48 Q 12 52 16 52
           L 18 52 L 18 36 Q 18 30 22 30 Z"
        fill="#1a0a02"
      />
      <path
        d="M 28 75 L 28 28 Q 28 18 34 18 L 38 18 Q 42 18 42 24 L 42 36
           Q 42 40 38 40 L 36 40 L 36 30 Q 36 26 32 26 Q 28 26 28 32 Z"
        fill="#1a0a02"
      />
      {/* Spine pattern */}
      {[24, 30].map((x) => (
        <line key={x} x1={x} y1="34" x2={x} y2="72" stroke="rgba(255,150,80,.16)" strokeWidth=".4" />
      ))}
    </svg>
  );
}

/** Tumbleweed — tangled ball of dry brush. Built from concentric arcs +
 *  radial twigs to read as a wind-blown bramble at any size. */
function Tumbleweed() {
  return (
    <svg
      viewBox="0 0 32 32"
      style={{ width: '100%', height: '100%', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.55))' }}
    >
      {/* Outer twig spokes radiating from centre — gives the bramble silhouette */}
      <g stroke="#5a3a14" strokeWidth=".7" strokeLinecap="round" fill="none" opacity=".95">
        {[0, 30, 60, 95, 130, 165, 200, 235, 270, 305, 340].map((deg, i) => {
          const r1 = 4 + (i % 3) * 0.4;
          const r2 = 13 + (i * 1.3) % 3;
          const a = (deg * Math.PI) / 180;
          const x1 = 16 + Math.cos(a) * r1;
          const y1 = 16 + Math.sin(a) * r1;
          const x2 = 16 + Math.cos(a) * r2;
          const y2 = 16 + Math.sin(a) * r2;
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
        })}
      </g>
      {/* Mid-density tangle: arcs that don't form a perfect circle */}
      <g stroke="#7a4a1a" strokeWidth=".55" fill="none" opacity=".85">
        <path d="M 6 14 Q 12 7 22 9 Q 28 12 26 22 Q 22 28 12 26 Q 5 22 6 14 Z" />
        <path d="M 10 12 Q 18 10 24 16 Q 24 22 16 24 Q 9 22 10 12 Z" />
        <path d="M 8 18 Q 14 24 22 22 Q 26 18 22 12" />
      </g>
      {/* Inner brighter strands for depth */}
      <g stroke="#a87038" strokeWidth=".4" fill="none" opacity=".75">
        <path d="M 12 12 Q 18 14 20 20" />
        <path d="M 22 13 Q 18 18 13 20" />
        <path d="M 11 18 L 22 18" />
      </g>
      {/* A few stray twigs poking out of the silhouette */}
      <g stroke="#3a1a04" strokeWidth=".6" strokeLinecap="round" opacity=".9">
        <line x1="2" y1="14" x2="6" y2="15" />
        <line x1="29" y1="18" x2="25" y2="17" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="14" y1="30" x2="15" y2="26" />
      </g>
    </svg>
  );
}

/** Horseshoe — rusted iron horseshoe with nail-holes. Sits as a small
 *  prop on the right of the scene. */
function Horseshoe({
  position,
  size,
}: {
  position: { bottom?: string; right?: string; left?: string };
  size: string;
}) {
  return (
    <svg
      className="absolute"
      style={{
        ...position,
        width: size,
        aspectRatio: '1 / 1.05',
        filter: 'drop-shadow(0 3px 5px rgba(0,0,0,.6))',
        opacity: 0.92,
      }}
      viewBox="0 0 32 34"
    >
      <defs>
        <linearGradient id="ww-iron" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7a5a30" />
          <stop offset="55%" stopColor="#a87038" />
          <stop offset="100%" stopColor="#3a1a04" />
        </linearGradient>
      </defs>
      {/* Horseshoe — open-bottom U shape, slightly tilted */}
      <g transform="rotate(-12 16 17)">
        <path
          d="M 6 6 Q 6 0 16 0 Q 26 0 26 6 L 26 22 Q 26 28 22 28 L 22 12 Q 22 8 16 8 Q 10 8 10 12 L 10 28 Q 6 28 6 22 Z"
          fill="url(#ww-iron)"
          stroke="#1a0a02"
          strokeWidth=".7"
        />
        {/* Nail holes — 3 on each side */}
        {[
          [9, 9],
          [9, 14],
          [9, 19],
          [23, 9],
          [23, 14],
          [23, 19],
        ].map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r=".7" fill="#1a0a02" />
        ))}
        {/* Top inner highlight (rim sheen) */}
        <path d="M 8 4 Q 16 1 24 4" stroke="rgba(255,200,120,.45)" strokeWidth=".5" fill="none" />
      </g>
    </svg>
  );
}
