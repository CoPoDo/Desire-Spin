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
        {/* Great Sphinx silhouette — sits between the small left pyramid
         * and the big back pyramid. Properly sized + detailed so the iconic
         * silhouette reads cleanly: lion body crouched on plinth, raised
         * head with nemes headdress + face. */}
        <g transform="translate(36 30)">
          {/* Plinth / paws line */}
          <rect x="-12" y="14" width="32" height="3" fill="#2a1404" />
          {/* Lion body (crouched, paws extended) */}
          <path
            d="M -10 14 L -10 10 Q -10 6 -6 6 L 12 6 L 14 4 L 14 10 L 16 12 L 16 14 Z"
            fill="#3a1a04"
            stroke="#1a0a02"
            strokeWidth=".2"
          />
          {/* Front paws */}
          <rect x="-10" y="13" width="3" height="2" fill="#1a0a02" />
          <rect x="-5" y="13" width="3" height="2" fill="#1a0a02" />
          {/* Neck / chin */}
          <path d="M 12 6 L 12 2 L 18 2 L 18 4 L 14 4 Z" fill="#3a1a04" />
          {/* Nemes headdress (striped) */}
          <path d="M 12 -4 L 22 -4 L 24 2 L 18 2 L 12 2 Z" fill="#5a3a0a" stroke="#1a0a02" strokeWidth=".2" />
          {/* Stripe on headdress */}
          <line x1="14" y1="-2" x2="22" y2="-2" stroke="#7a4a0a" strokeWidth=".25" />
          <line x1="13" y1="0" x2="23" y2="0" stroke="#7a4a0a" strokeWidth=".25" />
          {/* Face cavity (lit by sun) */}
          <rect x="14" y="-2" width="6" height="4" fill="#a87042" />
          {/* Eye + nose hint */}
          <circle cx="16.5" cy="-0.5" r=".3" fill="#1a0a04" />
          <circle cx="18.5" cy="-0.5" r=".3" fill="#1a0a04" />
          <line x1="17.5" y1="0.5" x2="17.5" y2="1.4" stroke="#1a0a04" strokeWidth=".18" />
          {/* Cobra uraeus on forehead */}
          <ellipse cx="17.5" cy="-3.5" rx=".7" ry=".4" fill="#ffd166" />
          {/* Ceremonial false beard */}
          <rect x="16.5" y="2" width="2" height="2.5" fill="#5a3a0a" />
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

      {/* 3. Palm tree silhouettes — proper SVG. Curved trunk + 6 fronds
       * radiating out, plus a small cluster of dates. Silhouetted against
       * the sunset glow with subtle warm rim-lighting. */}
      <PalmTree
        position={{ bottom: '4%', left: '3%' }}
        size="min(64px, 13cqw)"
        scaleX={1}
      />
      <PalmTree
        position={{ bottom: '3%', right: '4%' }}
        size="min(56px, 11cqw)"
        scaleX={-1}
      />

      {/* Obelisk silhouette mid-distance left — adds Egyptian verticality
       * that the pyramid+Sphinx group was lacking. */}
      <svg
        className="absolute"
        style={{
          bottom: '32%',
          left: '12%',
          width: '5%',
          aspectRatio: '1 / 6',
          opacity: 0.78,
          filter: 'drop-shadow(2px 0 4px rgba(255,140,40,.35))',
        }}
        viewBox="0 0 10 60"
      >
        <defs>
          <linearGradient id="ph-obelisk" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3a0a" />
            <stop offset="100%" stopColor="#1a0a04" />
          </linearGradient>
        </defs>
        {/* Obelisk shaft (slight taper) */}
        <path d="M 4 55 L 4 8 L 5 6 L 6 8 L 6 55 Z" fill="url(#ph-obelisk)" />
        {/* Pyramidion (small pyramid cap) */}
        <path d="M 4 8 L 5 4 L 6 8 Z" fill="#7a4a04" />
        {/* Hieroglyph hint marks */}
        {[20, 28, 36, 44].map((y, i) => (
          <rect key={i} x="4.4" y={y} width="1.2" height="2" fill="rgba(255,209,102,.4)" />
        ))}
        {/* Base */}
        <rect x="3" y="55" width="4" height="3" fill="#3a1a04" />
      </svg>

      {/* Stage-light glow behind reels */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,232,168,.32) 0%, rgba(255,180,80,.15) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

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

      {/* Drifting sand particles — small warm-amber specks blowing across
       * the desert from right to left. Adds wind / atmosphere to a scene
       * that was static otherwise. */}
      {[
        { top: '52%', size: 2,   dur: 18, delay: 0,    color: '#ffd166' },
        { top: '58%', size: 1.4, dur: 22, delay: 2.4,  color: '#ffae50' },
        { top: '65%', size: 2.2, dur: 16, delay: 4.8,  color: '#fff5c4' },
        { top: '72%', size: 1.6, dur: 20, delay: 1.2,  color: '#ffd166' },
        { top: '78%', size: 2,   dur: 24, delay: 3.6,  color: '#c8932e' },
        { top: '84%', size: 1.4, dur: 18, delay: 5.6,  color: '#fff5c4' },
      ].map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            top: p.top,
            right: 0,
            width: `${p.size}px`,
            height: `${p.size}px`,
            background: p.color,
            boxShadow: `0 0 4px ${p.color}aa`,
            animation: `pharaohSandDrift ${p.dur}s linear ${p.delay}s infinite`,
            mixBlendMode: 'screen',
          }}
        />
      ))}

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

function PalmTree({
  position,
  size,
  scaleX = 1,
}: {
  position: { bottom?: string; left?: string; right?: string };
  size: string;
  scaleX?: 1 | -1;
}) {
  return (
    <svg
      className="absolute"
      style={{
        ...position,
        width: size,
        aspectRatio: '1 / 1.6',
        filter: 'drop-shadow(0 0 8px rgba(0,0,0,.6)) drop-shadow(2px 0 4px rgba(255,140,40,.35))',
        transform: `scaleX(${scaleX})`,
      }}
      viewBox="0 0 50 80"
    >
      <defs>
        <linearGradient id="ph-trunk" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a1a04" />
          <stop offset="100%" stopColor="#0a0204" />
        </linearGradient>
        <linearGradient id="ph-frond" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a3a04" />
          <stop offset="100%" stopColor="#02100a" />
        </linearGradient>
      </defs>
      {/* Curved trunk */}
      <path
        d="M 24 78 Q 22 50 26 28 Q 28 14 24 4"
        stroke="url(#ph-trunk)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Trunk segments (texture) */}
      {[20, 30, 40, 50, 60, 70].map((y, i) => (
        <line
          key={i}
          x1="22"
          y1={y}
          x2="27"
          y2={y - 1}
          stroke="#0a0204"
          strokeWidth=".4"
          opacity=".6"
        />
      ))}
      {/* Fronds — 6 leaves radiating from the top */}
      <path d="M 24 4 Q 8 2 0 12" stroke="url(#ph-frond)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 24 4 Q 6 8 -2 22" stroke="url(#ph-frond)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 24 4 Q 14 -4 6 -6" stroke="url(#ph-frond)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 24 4 Q 36 -2 44 -6" stroke="url(#ph-frond)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 24 4 Q 42 2 50 12" stroke="url(#ph-frond)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M 24 4 Q 44 8 52 22" stroke="url(#ph-frond)" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      {/* Frond tip leaves (small triangles giving the spiky-leaf feel) */}
      {[
        [3, 11], [-1, 21], [7, -5], [43, -5], [47, 11], [51, 21],
      ].map(([x, y], i) => (
        <ellipse
          key={i}
          cx={x}
          cy={y}
          rx="1.2"
          ry="0.4"
          fill="#0a1a02"
          opacity=".75"
        />
      ))}
      {/* Dates cluster (small dark dots near the crown) */}
      <circle cx="22" cy="6" r=".7" fill="#5a3a04" />
      <circle cx="26" cy="6" r=".7" fill="#5a3a04" />
      <circle cx="24" cy="8" r=".6" fill="#5a3a04" />
    </svg>
  );
}
