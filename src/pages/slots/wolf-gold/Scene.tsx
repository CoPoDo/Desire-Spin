/** Wolf Gold scene — moonlit Southwest desert. Twilight purple sky with
 *  big silver full moon, distant mesa silhouettes, wolf-howling on a
 *  ridge, twinkling stars. */
export function WolfScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Sky: violet → indigo → black */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #6638c8 0%, #2a1268 30%, #0a0418 65%, #02010a 100%)',
        }}
      />
      {/* Stars layer */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(1.5px 1.5px at 14% 12%, rgba(255,255,255,.95), transparent 60%),
            radial-gradient(1px 1px at 28% 8%, rgba(220,200,255,.85), transparent 60%),
            radial-gradient(1px 1px at 42% 14%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(1.4px 1.4px at 56% 6%, rgba(167,139,250,.85), transparent 60%),
            radial-gradient(1px 1px at 72% 12%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(1.6px 1.6px at 86% 8%, rgba(220,200,255,.85), transparent 60%),
            radial-gradient(1px 1px at 22% 22%, rgba(255,255,255,.55), transparent 60%),
            radial-gradient(1.2px 1.2px at 64% 22%, rgba(255,255,255,.6), transparent 60%),
            radial-gradient(1px 1px at 92% 22%, rgba(220,200,255,.65), transparent 60%)
          `,
          mixBlendMode: 'screen',
          opacity: 0.9,
        }}
      />
      {/* Big silver moon — slow corona breathe so the moonlight reads as
       *  alive rather than a static decal. Real moons photographed at
       *  long exposure visibly bloom with a faint corona that subtly
       *  expands and contracts. */}
      <div
        className="absolute"
        style={{
          left: '70%',
          top: '24%',
          width: '32%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(220,200,255,.85) 30%, rgba(167,139,250,.4) 55%, transparent 75%)',
          borderRadius: '50%',
          filter: 'blur(.4px)',
          transform: 'translate(-50%, -50%)',
          animation: 'wolfMoonCorona 7s ease-in-out infinite',
        }}
      />
      {/* Moon detail (craters via inner radial dots) */}
      <div
        className="absolute"
        style={{
          left: '70%',
          top: '24%',
          transform: 'translate(-50%, -50%)',
          width: '20%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(2px 2px at 30% 35%, rgba(140,120,180,.45), transparent 50%), radial-gradient(2.5px 2.5px at 65% 50%, rgba(140,120,180,.35), transparent 50%), radial-gradient(1.5px 1.5px at 40% 65%, rgba(140,120,180,.4), transparent 50%)',
          borderRadius: '50%',
          opacity: 0.65,
        }}
      />

      {/* Moonlight beam — soft cone of pale-violet light from the moon
       * down toward the wolf-on-ridge area. Adds dramatic theatrical
       * lighting and ties the moon visually to the wolf silhouette.
       * Slow opacity breathe so the beam visibly intensifies as
       * passing clouds thin out, then fades as they thicken. Pairs
       * with the moon corona pulse (Pass 10) for a unified breath. */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: '6%',
          top: '24%',
          width: '36%',
          height: '52%',
          background:
            'linear-gradient(170deg, rgba(220,200,255,.22) 0%, rgba(167,139,250,.12) 40%, transparent 80%)',
          clipPath: 'polygon(40% 0%, 60% 0%, 100% 100%, 0% 100%)',
          mixBlendMode: 'screen',
          filter: 'blur(2px)',
          animation: 'wolfMoonBeamBreathe 7s ease-in-out infinite',
        }}
      />

      {/* Distant mesa silhouettes */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '40%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="wf-mesa-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a2068" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#0a041a" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="wf-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1a0a30" stopOpacity="1" />
            <stop offset="100%" stopColor="#02010a" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d="M0,50 L0,30 L10,30 L10,18 L26,18 L26,30 L46,30 L46,22 L66,22 L66,30 L82,30 L82,16 L96,16 L96,30 L100,30 L100,50 Z" fill="url(#wf-mesa-far)" />
        {/* Moonlight rim on the top edge of the back mesas — pale violet
         *  highlight where the silhouette meets the sky, suggesting the
         *  full moon catches the limestone tops. Stroke draws ONLY the
         *  upper outline (no fill, no bottom edge) by re-tracing just
         *  the tops of the path. */}
        <path
          d="M0,30 L10,30 L10,18 L26,18 L26,30 L46,30 L46,22 L66,22 L66,30 L82,30 L82,16 L96,16 L96,30 L100,30"
          fill="none"
          stroke="rgba(220,200,255,.45)"
          strokeWidth=".25"
          strokeLinejoin="round"
        />
        {/* Foreground ridge */}
        <path d="M0,50 L0,42 Q14,40 28,42 Q44,44 60,42 Q76,40 92,44 L100,42 L100,50 Z" fill="url(#wf-near)" />
        {/* Moonlight rim on foreground ridge top */}
        <path
          d="M0,42 Q14,40 28,42 Q44,44 60,42 Q76,40 92,44 L100,42"
          fill="none"
          stroke="rgba(220,200,255,.32)"
          strokeWidth=".2"
          strokeLinejoin="round"
        />
        {/* Howling wolf silhouette on the ridge — sized so it reads at
         * any reasonable viewport. Sits in the moonlight beam. Now with
         * a glowing amber eye + visible howl-arcs curving toward the moon
         * (the iconic "howling at the moon" composition). */}
        <g transform="translate(40 32) scale(2.6)">
          {/* Hindquarters */}
          <ellipse cx="-3" cy="3" rx="2.6" ry="1.6" fill="#02010a" />
          {/* Front body */}
          <ellipse cx="0" cy="2" rx="2.2" ry="1.4" fill="#02010a" />
          {/* Back ridge */}
          <path d="M -5 2.6 Q -3 1.2 0 1.5 Q 2 1 3 -1" stroke="#02010a" strokeWidth=".5" fill="none" />
          {/* Front legs */}
          <line x1="-1" y1="3" x2="-1" y2="6" stroke="#02010a" strokeWidth=".7" />
          <line x1="1" y1="3" x2="1" y2="6" stroke="#02010a" strokeWidth=".7" />
          {/* Back legs */}
          <line x1="-4" y1="3.8" x2="-4" y2="6" stroke="#02010a" strokeWidth=".7" />
          <line x1="-2.5" y1="3.8" x2="-2.5" y2="6" stroke="#02010a" strokeWidth=".7" />
          {/* Neck (raised toward the moon) */}
          <path d="M 1.5 1 L 2.6 -2.5 L 4 -2 L 3.4 1 Z" fill="#02010a" />
          {/* Snout (head pointing up & back, like a real howling pose) */}
          <path d="M 2.6 -2.5 L 4 -3.5 L 4.4 -2.8 L 3.4 -1.6 Z" fill="#02010a" />
          {/* Ear */}
          <path d="M 3 -3 L 3.4 -4.4 L 4 -3.6 Z" fill="#02010a" />
          {/* Tail (curved up) */}
          <path d="M -5 2.4 Q -7 1.5 -7 -0.4 Q -6 0.4 -5.5 1.6" stroke="#02010a" strokeWidth=".7" fill="none" strokeLinecap="round" />
          {/* Subtle moon-glow rim along back */}
          <path d="M -5 2.6 Q -3 1.2 0 1.5 Q 2 1 3 -1" stroke="rgba(220,200,255,.45)" strokeWidth=".2" fill="none" />
          {/* Glowing amber eye — small dot with halo, sits on the snout.
           *  The halo pulses subtly so the wolf looks alive watching the
           *  moon, not a dead silhouette. */}
          <circle cx="3.5" cy="-2.7" r=".18" fill="#ffd166" />
          <circle
            cx="3.5" cy="-2.7" r=".5"
            fill="rgba(255,209,102,.35)"
            style={{ animation: 'wolfEyePulse 2.4s ease-in-out infinite', transformOrigin: '3.5px -2.7px' }}
          />
          {/* Howl-arcs — two faint curved sound-waves leaving the snout
              and bending toward the moon. Quintessential howling pose. */}
          <path
            d="M 4.4 -3.5 Q 6 -5 7 -4"
            stroke="rgba(220,200,255,.55)"
            strokeWidth=".18"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 4.6 -4 Q 7 -6 8.5 -4.5"
            stroke="rgba(220,200,255,.4)"
            strokeWidth=".15"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M 4.8 -4.4 Q 8 -7 10 -4.8"
            stroke="rgba(220,200,255,.28)"
            strokeWidth=".12"
            fill="none"
            strokeLinecap="round"
          />
        </g>
      </svg>

      {/* Cool moonlight stage-light glow behind reels (violet tint) */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(167,139,250,.3) 0%, rgba(102,56,200,.16) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* Occasional shooting star streaking across the upper sky.
       * Long delay (15s cycle) makes it rare/special. */}
      <div
        className="absolute"
        style={{
          left: '8%',
          top: '12%',
          width: '60px',
          height: '2px',
          background: 'linear-gradient(90deg, transparent, #fff, #c4d4ff)',
          borderRadius: '1px',
          boxShadow: '0 0 8px rgba(255,255,255,.95), 0 0 16px rgba(167,139,250,.6)',
          animation: 'wolfShootingStar 15s linear infinite',
          willChange: 'transform, opacity',
        }}
      />

      {/* Cactus silhouettes — proper SVG saguaros instead of emoji. Pure
       * black silhouettes with a subtle moon-rim highlight on the left edge
       * (matches the moon-light direction). */}
      <CactusSilhouette
        position={{ bottom: '6%', left: '4%' }}
        size="min(54px, 12cqw)"
      />
      <CactusSilhouette
        position={{ bottom: '5%', right: '7%' }}
        size="min(40px, 9cqw)"
      />

      {/* Vignette */}
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
            'inset 0 0 0 2px rgba(167,139,250,.25), inset 0 0 22px rgba(102,56,200,.4)',
        }}
      />
    </div>
  );
}

function CactusSilhouette({
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
        aspectRatio: '1 / 1.4',
        filter: 'drop-shadow(-1px 0 2px rgba(220,200,255,.35)) drop-shadow(0 4px 6px rgba(0,0,0,.7))',
      }}
      viewBox="0 0 50 70"
    >
      {/* Saguaro silhouette — main trunk + two raised arms (asymmetric). */}
      <path
        d="M 22 70 L 22 40 Q 22 30 18 30 Q 12 30 12 36 L 12 48 Q 12 52 16 52 L 18 52
           L 18 38 Q 18 32 22 32 L 22 70 Z"
        fill="#02010a"
      />
      {/* Right arm */}
      <path
        d="M 28 70 L 28 30 Q 28 22 34 22 L 38 22 Q 42 22 42 28 L 42 38 Q 42 42 38 42
           L 36 42 L 36 32 Q 36 28 32 28 Q 28 28 28 36 L 28 70 Z"
        fill="#02010a"
      />
      {/* Spine details (faint vertical lines) */}
      <line x1="24" y1="36" x2="24" y2="68" stroke="rgba(220,200,255,.18)" strokeWidth=".4" />
      <line x1="30" y1="34" x2="30" y2="68" stroke="rgba(220,200,255,.18)" strokeWidth=".4" />
      <line x1="14" y1="38" x2="14" y2="50" stroke="rgba(220,200,255,.18)" strokeWidth=".4" />
      {/* Soft moon-rim highlight on left edge */}
      <path
        d="M 22 70 L 22 40 Q 22 30 18 30 Q 12 30 12 36 L 12 48"
        stroke="rgba(220,200,255,.35)"
        strokeWidth=".7"
        fill="none"
      />
    </svg>
  );
}
