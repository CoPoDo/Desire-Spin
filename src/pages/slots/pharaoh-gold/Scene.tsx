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
      {/* Sun — slow heat-haze pulse, matching the desert-shimmer effect
       *  on Wanted's dusk sun. Long 5.5s cycle so it reads as ambient
       *  heat distortion over the dunes. */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '34%',
          width: '50%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,250,200,.78) 0%, rgba(255,200,80,.4) 30%, transparent 65%)',
          filter: 'blur(2px)',
          transform: 'translate(-50%, -50%)',
          animation: 'pharaohSunHaze 5.5s ease-in-out infinite',
        }}
      />

      {/* Eye of Horus — sacred watcher floating in the sky behind the
       *  sun. Real Egyptian-themed slots use the Eye as a watermark
       *  symbol of divine watchfulness over the play area. Drawn very
       *  faintly so it doesn't compete with the reels but reads as
       *  "something divine is watching" the moment the player notices it. */}
      <svg
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '20%',
          transform: 'translate(-50%, -50%)',
          width: '36%',
          aspectRatio: '2 / 1',
          opacity: 0.32,
          mixBlendMode: 'screen',
          filter: 'drop-shadow(0 0 12px rgba(255,209,102,.6))',
          animation: 'pharaohEyeWatch 8s ease-in-out infinite',
        }}
        viewBox="0 0 100 50"
      >
        {/* Almond-shaped eye outline */}
        <path
          d="M 8 25 Q 50 5 92 25 Q 50 45 8 25 Z"
          fill="none"
          stroke="rgba(255,209,102,.85)"
          strokeWidth="1.4"
        />
        {/* Iris */}
        <circle cx="50" cy="25" r="9" fill="rgba(40,60,160,.45)" stroke="rgba(255,209,102,.7)" strokeWidth="0.6" />
        {/* Pupil */}
        <circle cx="50" cy="25" r="3.6" fill="rgba(20,8,4,.85)" />
        {/* Eyebrow / brow ridge */}
        <path d="M 12 18 Q 50 -2 88 18" fill="none" stroke="rgba(255,209,102,.7)" strokeWidth="1.1" />
        {/* Falcon-marking tear-line below eye */}
        <path d="M 38 32 L 32 42" stroke="rgba(255,209,102,.7)" strokeWidth="1.1" strokeLinecap="round" />
        {/* Side cheek-curl marking */}
        <path d="M 70 32 Q 80 36 78 44" fill="none" stroke="rgba(255,209,102,.7)" strokeWidth="1.1" strokeLinecap="round" />
      </svg>

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
          {/* Eye + nose hint — Sphinx eyes briefly glow gold every ~7s
           *  as if a sacred power awakens for an instant. Reads as a
           *  mythic detail on closer inspection without distracting
           *  from gameplay. */}
          <circle
            cx="16.5" cy="-0.5" r=".3"
            fill="#1a0a04"
            style={{ animation: 'pharaohSphinxEye 7s ease-in-out infinite' }}
          />
          <circle
            cx="18.5" cy="-0.5" r=".3"
            fill="#1a0a04"
            style={{ animation: 'pharaohSphinxEye 7s ease-in-out infinite' }}
          />
          <line x1="17.5" y1="0.5" x2="17.5" y2="1.4" stroke="#1a0a04" strokeWidth=".18" />
          {/* Cobra uraeus on forehead */}
          <ellipse cx="17.5" cy="-3.5" rx=".7" ry=".4" fill="#ffd166" />
          {/* Ceremonial false beard */}
          <rect x="16.5" y="2" width="2" height="2.5" fill="#5a3a0a" />
        </g>
        {/* Sand foreground */}
        <path d="M0,50 L0,42 Q14,40 28,42 Q44,44 60,42 Q76,40 92,44 Q98,46 100,44 L100,50 Z" fill="url(#ph-sand)" />
        {/* Tiny gold pebbles in the sand — the previous version used U+13000
         *  range hieroglyphs which render as missing-glyph boxes without a
         *  specialised Egyptian font. Keeping the warm pebble flecks gives
         *  the same scale-marker effect with consistent rendering. */}
        {[10, 22, 50, 70, 88].map((x, i) => (
          <circle key={i} cx={x} cy="47.5" r=".35" fill="rgba(255,209,102,.45)" />
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

      {/* 5. Hieroglyph border at top — real SVG glyphs (eye, ankh, scarab,
       *    ka, lotus) instead of Unicode hieroglyphs. The Unicode block
       *    (U+13000-U+1342F) renders as missing-glyph boxes on every system
       *    without a specialised Egyptian font, which we can't ship in a
       *    static SPA. SVG renders consistently everywhere. */}
      <svg
        className="absolute inset-x-0"
        style={{
          top: '2%',
          height: '6%',
          width: '100%',
          opacity: 0.7,
          filter: 'drop-shadow(0 0 6px rgba(255,200,80,.55))',
        }}
        viewBox="0 0 100 6"
        preserveAspectRatio="none"
      >
        {Array.from({ length: 10 }).map((_, i) => {
          const cx = 5 + i * 10;
          const glyph = i % 5;
          return (
            <g key={i} transform={`translate(${cx} 3)`} fill="rgba(255,209,102,.85)" stroke="rgba(255,180,40,.6)" strokeWidth=".08">
              {glyph === 0 && (
                /* Eye of Horus — eye + brow + tear-line + cheek-curl */
                <g>
                  <path d="M -2.4 0 Q 0 -1.4 2.4 0 Q 0 1.2 -2.4 0 Z" />
                  <circle cx="0" cy="0" r=".55" fill="rgba(60,30,0,.95)" />
                  <path d="M -2.4 -.6 Q 0 -1.8 2.4 -.6" stroke="rgba(255,209,102,.85)" strokeWidth=".25" fill="none" />
                  <path d="M -.4 .6 L -.7 1.4" stroke="rgba(255,209,102,.85)" strokeWidth=".22" fill="none" strokeLinecap="round" />
                  <path d="M 1.7 .4 Q 2.6 1 2 1.6" stroke="rgba(255,209,102,.85)" strokeWidth=".22" fill="none" strokeLinecap="round" />
                </g>
              )}
              {glyph === 1 && (
                /* Ankh — looped cross (life) */
                <g>
                  <ellipse cx="0" cy="-1" rx=".75" ry=".95" fill="none" strokeWidth=".25" />
                  <line x1="0" y1="0" x2="0" y2="1.8" strokeWidth=".3" />
                  <line x1="-1" y1=".5" x2="1" y2=".5" strokeWidth=".3" />
                </g>
              )}
              {glyph === 2 && (
                /* Scarab beetle — domed body + 6 legs */
                <g>
                  <ellipse cx="0" cy="0" rx="1.2" ry="1.4" />
                  <line x1="0" y1="-1.4" x2="0" y2="1.4" stroke="rgba(60,30,0,.6)" strokeWidth=".15" />
                  <ellipse cx="0" cy="-1.3" rx=".5" ry=".4" fill="rgba(60,30,0,.6)" />
                  {[-1, 0, 1].map((y) => (
                    <g key={y}>
                      <line x1="-1.1" y1={y * 0.7} x2="-1.9" y2={y * 0.7 - .2} strokeWidth=".18" strokeLinecap="round" />
                      <line x1="1.1" y1={y * 0.7} x2="1.9" y2={y * 0.7 - .2} strokeWidth=".18" strokeLinecap="round" />
                    </g>
                  ))}
                </g>
              )}
              {glyph === 3 && (
                /* Feather of Ma'at — single tall feather */
                <g>
                  <path d="M 0 -2 Q -.6 -1 -.6 1 L 0 1.6 L .6 1 Q .6 -1 0 -2 Z" />
                  <path d="M 0 -1.6 L 0 1.4" stroke="rgba(60,30,0,.5)" strokeWidth=".1" />
                  {[-1.2, -.6, 0, .6].map((y) => (
                    <g key={y}>
                      <line x1="-.55" y1={y} x2="-.15" y2={y + .1} stroke="rgba(60,30,0,.5)" strokeWidth=".08" />
                      <line x1=".55" y1={y} x2=".15" y2={y + .1} stroke="rgba(60,30,0,.5)" strokeWidth=".08" />
                    </g>
                  ))}
                </g>
              )}
              {glyph === 4 && (
                /* Lotus flower — 3 stylised petals with a stem */
                <g>
                  <path d="M -1.4 .5 L 0 -1.6 L 1.4 .5 Q 0 1.2 -1.4 .5 Z" />
                  <path d="M -.7 .6 L 0 -.8 L .7 .6 Z" fill="rgba(60,30,0,.45)" />
                  <line x1="0" y1=".8" x2="0" y2="1.7" strokeWidth=".22" />
                </g>
              )}
            </g>
          );
        })}
      </svg>

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
