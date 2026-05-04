/** Pharaoh's Gold scene — desert at golden hour with pyramids + Sphinx +
 *  hieroglyph border. Hot palette: gold sky, lapis-blue Nile, pyramid
 *  silhouettes, palm trees foreground. */
export function PharaohScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Sky — golden hour */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ffd166 0%, #ff8a40 26%, #c8492a 52%, #5a142e 78%, #14051a 100%)',
        }}
      />
      {/* Sun */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '34%',
          transform: 'translate(-50%, -50%)',
          width: '50%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,250,200,.78) 0%, rgba(255,200,80,.4) 30%, transparent 65%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 2. Pyramids + sphinx silhouettes */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '40%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="ph-pyramid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a8761a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#3a1a04" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="ph-pyramid-shade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(0,0,0,.42)" />
            <stop offset="100%" stopColor="rgba(0,0,0,.0)" />
          </linearGradient>
          <linearGradient id="ph-sand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a4a18" stopOpacity="1" />
            <stop offset="100%" stopColor="#1a0a04" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Big back pyramid */}
        <path d="M 30 50 L 50 14 L 70 50 Z" fill="url(#ph-pyramid)" />
        <path d="M 50 14 L 70 50 L 60 50 Z" fill="url(#ph-pyramid-shade)" />
        {/* Mid-size pyramid right */}
        <path d="M 64 50 L 78 22 L 92 50 Z" fill="url(#ph-pyramid)" />
        <path d="M 78 22 L 92 50 L 84 50 Z" fill="url(#ph-pyramid-shade)" />
        {/* Small pyramid left */}
        <path d="M 8 50 L 22 28 L 36 50 Z" fill="url(#ph-pyramid)" opacity=".9" />
        <path d="M 22 28 L 36 50 L 30 50 Z" fill="url(#ph-pyramid-shade)" />
        {/* Sphinx silhouette (small, left of centre) */}
        <g transform="translate(40 38)">
          {/* Body */}
          <path d="M0 12 L 0 8 L 4 4 L 16 4 L 16 12 Z" fill="#3a1a04" />
          {/* Headdress */}
          <path d="M-2 4 L 4 -4 L 8 -4 L 8 4 Z" fill="#5a3a0a" stroke="#1a0a02" strokeWidth=".2" />
          {/* Face */}
          <rect x="4" y="-2" width="6" height="6" fill="#a8761a" />
          <circle cx="6" cy="0" r=".4" fill="#1a0a04" />
        </g>
        {/* Sand foreground */}
        <path d="M0,50 L0,42 Q14,40 28,42 Q44,44 60,42 Q76,40 92,44 Q98,46 100,44 L100,50 Z" fill="url(#ph-sand)" />
        {/* Hieroglyph dots in the sand */}
        {[10, 22, 50, 70, 88].map((x, i) => (
          <text key={i} x={x} y="48" fontSize="2" fill="rgba(255,209,102,.4)">
            {['𓂀', '𓋹', '𓏏', '𓎟', '𓊃'][i]}
          </text>
        ))}
      </svg>

      {/* 3. Palm tree foreground left */}
      <div
        className="absolute select-none"
        style={{
          bottom: '7%',
          left: '4%',
          fontSize: 'min(56px, 12cqw)',
          opacity: 0.85,
          filter: 'drop-shadow(0 0 8px rgba(0,0,0,.6))',
        }}
      >
        🌴
      </div>
      <div
        className="absolute select-none"
        style={{
          bottom: '6%',
          right: '6%',
          fontSize: 'min(48px, 10cqw)',
          opacity: 0.8,
          filter: 'drop-shadow(0 0 8px rgba(0,0,0,.6))',
        }}
      >
        🌴
      </div>

      {/* 4. Floating glyph particles */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 14% 22%, rgba(255,209,102,.85), transparent 60%),
            radial-gradient(1.5px 1.5px at 78% 18%, rgba(255,232,168,.85), transparent 60%),
            radial-gradient(1.5px 1.5px at 38% 32%, rgba(255,255,200,.7), transparent 60%),
            radial-gradient(2px 2px at 88% 36%, rgba(255,200,80,.85), transparent 60%),
            radial-gradient(1.4px 1.4px at 22% 48%, rgba(255,232,168,.7), transparent 60%),
            radial-gradient(1.4px 1.4px at 64% 50%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 8% 62%, rgba(255,200,80,.6), transparent 60%),
            radial-gradient(1.4px 1.4px at 92% 64%, rgba(255,210,140,.65), transparent 60%)
          `,
          mixBlendMode: 'screen',
          animation: 'bonanzaSparkle 5s ease-in-out infinite',
        }}
      />

      {/* 5. Hieroglyph border bands at top */}
      <div
        className="absolute inset-x-0 select-none flex items-center justify-around"
        style={{
          top: '3%',
          height: '5%',
          color: 'rgba(255,209,102,.55)',
          fontSize: 'min(20px, 5cqw)',
          letterSpacing: '0.2em',
          textShadow: '0 0 6px rgba(255,200,80,.7)',
        }}
      >
        𓂀 𓋹 𓏏 𓎟 𓊃 𓋹 𓂀 𓏏 𓎟 𓊃
      </div>

      {/* 6. Vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(72% 72% at 50% 50%, transparent 50%, rgba(0,0,0,.42) 100%)',
        }}
      />
      <div
        className="absolute inset-0 rounded-[14px] pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 0 2px rgba(255,209,102,.3), inset 0 0 22px rgba(200,147,46,.4)',
        }}
      />
    </div>
  );
}
