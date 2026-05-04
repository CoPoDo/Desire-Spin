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
      {/* Big silver moon */}
      <div
        className="absolute"
        style={{
          left: '70%',
          top: '24%',
          transform: 'translate(-50%, -50%)',
          width: '32%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,255,255,.95) 0%, rgba(220,200,255,.85) 30%, rgba(167,139,250,.4) 55%, transparent 75%)',
          borderRadius: '50%',
          filter: 'blur(.4px)',
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
        {/* Foreground ridge */}
        <path d="M0,50 L0,42 Q14,40 28,42 Q44,44 60,42 Q76,40 92,44 L100,42 L100,50 Z" fill="url(#wf-near)" />
        {/* Howling wolf silhouette on the ridge — sized so it reads at
         * any reasonable viewport. Sits in the moonlight beam. */}
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
        </g>
      </svg>

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
