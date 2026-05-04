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
      {/* Big sun (low) */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, -50%)',
          width: '52%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,200,120,.55) 0%, rgba(220,80,60,.4) 30%, transparent 65%)',
          filter: 'blur(2px)',
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
        {/* Saloon — main building, slightly left of centre */}
        <g transform="translate(40 20)">
          {/* Main facade */}
          <rect x="0" y="2" width="22" height="14" fill="url(#ww-saloon)" />
          {/* False front (taller centre) */}
          <rect x="6" y="-2" width="10" height="6" fill="url(#ww-saloon)" />
          {/* SALOON sign on false front */}
          <rect x="5.5" y="-1" width="11" height="3.5" fill="#3a1a08" />
          <text
            x="11"
            y="1.4"
            textAnchor="middle"
            fontSize="2"
            fontFamily="serif"
            fontWeight="800"
            fill="#ffd166"
          >
            SALOON
          </text>
          {/* Door (lit warmly inside) */}
          <rect x="9" y="9" width="4" height="7" fill="rgba(255,200,80,.55)" />
          {/* Windows */}
          <rect x="2" y="6" width="3" height="2.5" fill="rgba(255,200,80,.4)" />
          <rect x="17" y="6" width="3" height="2.5" fill="rgba(255,200,80,.4)" />
          {/* Porch posts */}
          <rect x="-1" y="8" width=".7" height="8" fill="#1a0a04" />
          <rect x="22.5" y="8" width=".7" height="8" fill="#1a0a04" />
          {/* Awning */}
          <rect x="-2" y="7" width="26" height="1.2" fill="#1a0a04" />
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

      {/* 3. Cactus silhouettes far left + a tumbleweed */}
      <div
        className="absolute select-none"
        style={{
          bottom: '8%',
          left: '5%',
          fontSize: 'min(48px, 11cqw)',
          opacity: 0.8,
          filter: 'drop-shadow(0 0 8px rgba(0,0,0,.5))',
        }}
      >
        🌵
      </div>
      <div
        className="absolute select-none"
        style={{
          bottom: '7%',
          right: '12%',
          fontSize: 'min(28px, 6cqw)',
          opacity: 0.7,
          filter: 'drop-shadow(0 0 6px rgba(0,0,0,.4)) sepia(.5) saturate(2)',
          color: '#a0703a',
        }}
      >
        🌾
      </div>

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
