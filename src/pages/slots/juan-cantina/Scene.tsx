/** Juan's Cantina scene — sun-baked Mexican desert at dusk.
 *
 *  Layered build:
 *    1. Sky: gold-orange → magenta sunset → dark dusk
 *    2. Distant mesa silhouettes
 *    3. Cactus silhouettes mid-ground (left + right)
 *    4. Glowing cantina lanterns / paper-flag bunting overhead
 *    5. Sparkle dust + fireflies
 *    6. Vignette + papel picado-style frame trim
 */
export function JuanScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Sky gradient — sunset */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ffd166 0%, #ff8a40 22%, #d8442a 48%, #6a142e 78%, #1a0610 100%)',
        }}
      />
      {/* Big sun glow */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '32%',
          transform: 'translate(-50%, -50%)',
          width: '60%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,232,168,.7) 0%, rgba(255,174,80,.45) 25%, transparent 60%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 2. Distant mesa silhouettes + cantina building */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '38%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="jc-mesa-far" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#7a2818" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#2a0810" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="jc-mesa-near" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3a0810" stopOpacity="1" />
            <stop offset="100%" stopColor="#0a0204" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="jc-cantina" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5a3018" stopOpacity="1" />
            <stop offset="100%" stopColor="#1a0a04" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Far flat-topped mesas */}
        <path d="M0,50 L0,30 L8,30 L8,18 L24,18 L24,30 L42,30 L42,22 L62,22 L62,30 L82,30 L82,16 L96,16 L96,30 L100,30 L100,50 Z" fill="url(#jc-mesa-far)" />
        {/* Cantina building silhouette mid-distance, off-centre right.
         * Adobe-style flat roof + porch + neon "CANTINA" sign + warmly-lit
         * door & windows + clay-tile awning + railing posts. */}
        <g transform="translate(52 22)">
          {/* Adobe body (flat-topped, slightly trapezoidal for that
           * stucco/adobe silhouette) */}
          <path d="M 0 4 L 24 4 L 22 20 L 2 20 Z" fill="url(#jc-cantina)" />
          {/* Adobe parapet wall on top (raised front edge) */}
          <rect x="-1" y="3" width="26" height="2" fill="url(#jc-cantina)" />
          {/* Roof beams poking out (vigas) — classic adobe detail */}
          {[2, 6, 10, 14, 18, 22].map((x, i) => (
            <rect key={i} x={x - 0.4} y="5" width="0.8" height="1" fill="#0a0204" />
          ))}
          {/* Clay-tile awning (curved orange terracotta strip) */}
          <path d="M -2 7 L 26 7 L 25 9 L -1 9 Z" fill="#a83a14" stroke="#5a1a04" strokeWidth=".15" />
          <path d="M -1 7 L 25 7" stroke="rgba(255,180,80,.5)" strokeWidth=".25" />
          {/* CANTINA sign (gold rectangle on facade) — gold lettering
           *  catches the dusk sun in slow waves, matching Wanted's
           *  SALOON sign treatment. */}
          <rect x="6" y="10" width="12" height="2.5" fill="#3a1a04" stroke="#ffd166" strokeWidth=".25" />
          <text
            x="12" y="11.9" textAnchor="middle" fontSize="1.7"
            fontFamily="serif" fontWeight="800" fill="#ffd166"
            style={{ animation: 'cantinaSignGlow 4.6s ease-in-out infinite' }}
          >
            CANTINA
          </text>
          {/* Door (warmly lit from inside, double-doors centred). The
           *  warm amber spill from the doorway flickers like the candles
           *  inside catching air through the open frame. */}
          <rect
            x="10" y="13.5" width="4" height="6.5"
            fill="rgba(255,200,80,.6)" stroke="#0a0204" strokeWidth=".15"
            style={{ animation: 'cantinaWindowFlicker 2.2s ease-in-out infinite' }}
          />
          <line x1="12" y1="13.5" x2="12" y2="20" stroke="#0a0204" strokeWidth=".2" />
          {/* Door window panels */}
          <rect x="10.4" y="14" width="1.2" height="1.8" fill="rgba(255,232,168,.7)" />
          <rect x="12.4" y="14" width="1.2" height="1.8" fill="rgba(255,232,168,.7)" />
          {/* Side windows (tall, lit) — flicker independently with
           *  different cycles so the candles inside seem distinct. */}
          <rect
            x="3" y="13" width="3" height="4"
            fill="rgba(255,200,80,.5)" stroke="#0a0204" strokeWidth=".15"
            style={{ animation: 'cantinaWindowFlicker 1.9s ease-in-out -0.4s infinite' }}
          />
          <line x1="4.5" y1="13" x2="4.5" y2="17" stroke="#0a0204" strokeWidth=".15" />
          <line x1="3" y1="15" x2="6" y2="15" stroke="#0a0204" strokeWidth=".15" />
          <rect
            x="18" y="13" width="3" height="4"
            fill="rgba(255,200,80,.5)" stroke="#0a0204" strokeWidth=".15"
            style={{ animation: 'cantinaWindowFlicker 2.5s ease-in-out -1.1s infinite' }}
          />
          <line x1="19.5" y1="13" x2="19.5" y2="17" stroke="#0a0204" strokeWidth=".15" />
          <line x1="18" y1="15" x2="21" y2="15" stroke="#0a0204" strokeWidth=".15" />
          {/* Porch railing posts */}
          <rect x="0" y="17" width=".5" height="3" fill="#0a0204" />
          <rect x="23.5" y="17" width=".5" height="3" fill="#0a0204" />
          {/* Hanging lantern at the door — oil-lamp flicker. The flame
           *  catches subtle drafts so the lantern "lives" instead of
           *  glowing as a flat dot. */}
          <circle
            cx="12" cy="9.5" r=".5"
            fill="rgba(255,209,102,.85)"
            style={{ animation: 'cantinaLanternFlicker 1.6s ease-in-out infinite' }}
          />
          <line x1="12" y1="9" x2="12" y2="7" stroke="#0a0204" strokeWidth=".15" />
        </g>
        {/* Near desert ground line with some texture */}
        <path d="M0,50 L0,40 Q12,38 24,40 Q40,42 56,40 Q72,38 88,42 Q96,44 100,42 L100,50 Z" fill="url(#jc-mesa-near)" />
        {/* Tumbleweed line (small dots) */}
        <circle cx="14" cy="46" r=".4" fill="rgba(255,209,102,.6)" />
        <circle cx="58" cy="48" r=".4" fill="rgba(255,209,102,.5)" />
        <circle cx="86" cy="46" r=".5" fill="rgba(255,209,102,.6)" />
      </svg>

      {/* 3. Cactus silhouettes left + right */}
      {/* Cactus silhouettes (SVG) — left + right, asymmetric so they
       * don't look mirrored. Catch a touch of warm-orange rim from the
       * sunset. */}
      <CantinaCactus position={{ bottom: '4%', left: '3%' }} size="min(72px, 15cqw)" />
      <CantinaCactus position={{ bottom: '3%', right: '5%' }} size="min(60px, 13cqw)" />

      {/* 4a. String of warm fairy lights below the bunting */}
      <svg
        className="absolute inset-x-0"
        style={{ top: '13%', height: '4%', width: '100%' }}
        viewBox="0 0 100 4"
        preserveAspectRatio="none"
      >
        {/* Sagging string */}
        <path
          d="M 0 1 Q 25 3 50 1 T 100 1"
          fill="none"
          stroke="rgba(0,0,0,.6)"
          strokeWidth=".15"
        />
        {/* Bulbs along the string — each twinkles independently with a
         *  staggered animation-delay so the string flickers like real
         *  fairy lights catching slight power fluctuations rather than
         *  glowing all-on. */}
        {Array.from({ length: 18 }).map((_, i) => {
          const x = (i + 0.5) * (100 / 18);
          // Mimic the string sag (matches Q curves above)
          const y =
            x < 50
              ? 1 + 1.6 * (1 - Math.abs(x - 25) / 25)
              : 1 + 1.6 * (1 - Math.abs(x - 75) / 25);
          const colors = ['#ffd166', '#ff5560', '#1fff7a', '#5fb8ff', '#ffae50'];
          const color = colors[i % colors.length]!;
          // Pseudo-random delay so the twinkle is uncorrelated bulb-to-bulb.
          const delay = ((i * 7) % 23) / 10;
          return (
            <g key={i} style={{
              animation: 'cantinaFairyLightTwinkle 2.6s ease-in-out infinite',
              animationDelay: `${delay}s`,
              transformOrigin: `${x}% ${y}%`,
            }}>
              <circle
                cx={x}
                cy={y}
                r=".5"
                fill={color}
                stroke="rgba(0,0,0,.5)"
                strokeWidth=".05"
              />
              <circle cx={x} cy={y} r="1.2" fill={color} opacity=".25" />
            </g>
          );
        })}
      </svg>

      {/* 4. Papel picado bunting — triangular pennants on a sagging string,
       *    rendered as proper SVG flags rather than rectangular blocks.
       *    Each flag has a small cut-paper diamond in the centre to nod to
       *    real papel picado's pierced patterns. The whole row sways
       *    gently as if a desert breeze is catching the paper. */}
      <svg
        className="absolute inset-x-0"
        style={{
          top: '4%',
          height: '8%',
          width: '100%',
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))',
          animation: 'cantinaBuntingSway 6s ease-in-out infinite',
          transformOrigin: '50% 0%',
        }}
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
      >
        {/* Sagging string */}
        <path
          d="M 0 1.2 Q 25 2.6 50 1.6 T 100 1.2"
          fill="none"
          stroke="rgba(0,0,0,.65)"
          strokeWidth=".15"
        />
        {(() => {
          const colors = ['#ff5560', '#1fff7a', '#5fb8ff', '#ffd166', '#c042b8', '#ffae50'];
          const N = 16;
          return Array.from({ length: N }).map((_, i) => {
            const x = (i + 0.5) * (100 / N);
            const yTop =
              x < 50
                ? 1.2 + 1.4 * (1 - Math.abs(x - 25) / 25)
                : 1.2 + 1.4 * (1 - Math.abs(x - 75) / 25);
            const w = 100 / N - 0.6;
            const color = colors[i % colors.length]!;
            const tipY = yTop + 4.4;
            const cx = x;
            const cy = yTop + 2.2;
            return (
              <g key={i}>
                {/* Triangular pennant */}
                <path
                  d={`M ${cx - w / 2} ${yTop} L ${cx + w / 2} ${yTop} L ${cx} ${tipY} Z`}
                  fill={color}
                  stroke="rgba(0,0,0,.45)"
                  strokeWidth=".08"
                  opacity=".92"
                />
                {/* Cut-paper diamond hole (real papel picado is pierced) */}
                <path
                  d={`M ${cx} ${cy - 0.6} L ${cx + 0.5} ${cy} L ${cx} ${cy + 0.6} L ${cx - 0.5} ${cy} Z`}
                  fill="rgba(0,0,0,.35)"
                />
                {/* Tiny side cuts */}
                <circle cx={cx - 0.9} cy={cy + 0.2} r=".18" fill="rgba(0,0,0,.3)" />
                <circle cx={cx + 0.9} cy={cy + 0.2} r=".18" fill="rgba(0,0,0,.3)" />
                {/* Highlight along the lit edge */}
                <path
                  d={`M ${cx - w / 2 + 0.1} ${yTop + 0.15} L ${cx} ${tipY - 0.2}`}
                  stroke="rgba(255,255,255,.35)"
                  strokeWidth=".1"
                />
              </g>
            );
          });
        })()}
      </svg>

      {/* Stage-light glow behind the reels — warm sunset glow centred on
       * the grid area so the reels feel anchored to the cantina stage. */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,180,80,.32) 0%, rgba(255,140,40,.16) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 5. Sparkle dust + fireflies (reuses bonanzaSparkle keyframe) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 14% 22%, rgba(255,232,168,.95), transparent 60%),
            radial-gradient(1.5px 1.5px at 78% 18%, rgba(255,200,80,.85), transparent 60%),
            radial-gradient(1.5px 1.5px at 38% 32%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 88% 42%, rgba(255,210,140,.85), transparent 60%),
            radial-gradient(1.4px 1.4px at 22% 48%, rgba(255,232,168,.7), transparent 60%),
            radial-gradient(1.4px 1.4px at 64% 52%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 8% 64%, rgba(255,200,80,.6), transparent 60%),
            radial-gradient(1.4px 1.4px at 92% 70%, rgba(255,210,140,.65), transparent 60%)
          `,
          mixBlendMode: 'screen',
          animation: 'bonanzaSparkle 5s ease-in-out infinite',
        }}
      />

      {/* 6. Vignette + frame */}
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
            'inset 0 0 0 2px rgba(255,209,102,.25), inset 0 0 22px rgba(255,140,40,.3)',
        }}
      />
    </div>
  );
}

function CantinaCactus({
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
          'drop-shadow(2px 0 4px rgba(255,140,40,.35)) drop-shadow(0 4px 6px rgba(0,0,0,.65))',
      }}
      viewBox="0 0 50 75"
    >
      {/* Saguaro silhouette — main trunk + asymmetric arms (one short, one
       * tall) for natural look. Pure dark fill catches sunset rim only. */}
      <path
        d="M 22 75 L 22 38 Q 22 28 18 28 Q 12 28 12 34 L 12 48 Q 12 52 16 52
           L 18 52 L 18 36 Q 18 30 22 30 Z"
        fill="#1a0610"
      />
      <path
        d="M 28 75 L 28 28 Q 28 18 34 18 L 38 18 Q 42 18 42 24 L 42 36
           Q 42 40 38 40 L 36 40 L 36 30 Q 36 26 32 26 Q 28 26 28 32 Z"
        fill="#1a0610"
      />
      {/* Small flower bloom on top of one arm (Mexican fiesta flair).
       *  Gentle pulse so the pink bloom catches attention on closer
       *  inspection — like a real cactus flower opening in the dusk. */}
      <circle
        cx="38" cy="17" r="1.2" fill="#ff5fa2" opacity=".75"
        style={{ animation: 'cantinaCactusBloom 4s ease-in-out infinite' }}
      />
      <circle cx="38" cy="17" r=".4" fill="#ffd166" />
      {/* Faint ribbed-spine lines down the trunk */}
      {[24, 30].map((x) => (
        <line key={x} x1={x} y1="34" x2={x} y2="72" stroke="rgba(255,150,80,.18)" strokeWidth=".4" />
      ))}
    </svg>
  );
}
