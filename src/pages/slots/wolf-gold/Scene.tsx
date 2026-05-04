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
        {/* Howling wolf silhouette on ridge (left of centre) */}
        <g transform="translate(28 38)">
          {/* Body */}
          <ellipse cx="0" cy="3" rx="3" ry="1.6" fill="#02010a" />
          {/* Legs */}
          <line x1="-2" y1="4" x2="-2" y2="6" stroke="#02010a" strokeWidth=".8" />
          <line x1="2" y1="4" x2="2" y2="6" stroke="#02010a" strokeWidth=".8" />
          {/* Head + neck (raised, howling) */}
          <path d="M2 2 L 4 -3 L 5.5 -2 L 6 0 L 4 1 L 3 3 Z" fill="#02010a" />
          {/* Ear */}
          <path d="M3 -2 L 4 -4 L 5 -3 Z" fill="#02010a" />
          {/* Tail */}
          <path d="M-3 2 Q -4 0 -5 1" stroke="#02010a" strokeWidth=".8" fill="none" />
        </g>
      </svg>

      {/* Cactus silhouettes */}
      <div
        className="absolute select-none"
        style={{
          bottom: '8%',
          left: '5%',
          fontSize: 'min(48px, 11cqw)',
          opacity: 0.7,
          filter: 'drop-shadow(0 0 8px rgba(0,0,0,.5)) brightness(0.4)',
        }}
      >
        🌵
      </div>
      <div
        className="absolute select-none"
        style={{
          bottom: '7%',
          right: '8%',
          fontSize: 'min(38px, 8cqw)',
          opacity: 0.65,
          filter: 'drop-shadow(0 0 6px rgba(0,0,0,.5)) brightness(0.4)',
        }}
      >
        🌵
      </div>

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
