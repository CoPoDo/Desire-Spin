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

      {/* 2. Distant mesa silhouettes */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '34%', width: '100%' }}
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
        </defs>
        {/* Far flat-topped mesas */}
        <path d="M0,50 L0,30 L8,30 L8,18 L24,18 L24,30 L42,30 L42,22 L62,22 L62,30 L82,30 L82,16 L96,16 L96,30 L100,30 L100,50 Z" fill="url(#jc-mesa-far)" />
        {/* Near desert ground line */}
        <path d="M0,50 L0,40 Q12,38 24,40 Q40,42 56,40 Q72,38 88,42 Q96,44 100,42 L100,50 Z" fill="url(#jc-mesa-near)" />
      </svg>

      {/* 3. Cactus silhouettes left + right */}
      <div
        className="absolute select-none"
        style={{
          bottom: '6%',
          left: '4%',
          fontSize: 'min(64px, 14cqw)',
          opacity: 0.85,
          filter: 'drop-shadow(0 0 8px rgba(0,0,0,.6))',
          color: '#1a0610',
          // Use emoji silhouette via filter — fallback to actual color if filter unsupported
        }}
      >
        🌵
      </div>
      <div
        className="absolute select-none"
        style={{
          bottom: '5%',
          right: '6%',
          fontSize: 'min(58px, 13cqw)',
          opacity: 0.85,
          filter: 'drop-shadow(0 0 8px rgba(0,0,0,.6))',
        }}
      >
        🌵
      </div>

      {/* 4. Papel picado bunting + lanterns */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '6%',
          height: '6%',
          backgroundImage: `
            repeating-linear-gradient(
              90deg,
              #ff5560 0 6%,
              transparent 6% 8%,
              #1fff7a 8% 14%,
              transparent 14% 16%,
              #5fb8ff 16% 22%,
              transparent 22% 24%,
              #ffd166 24% 30%,
              transparent 30% 32%,
              #c042b8 32% 38%,
              transparent 38% 40%
            )`,
          maskImage:
            'repeating-linear-gradient(90deg, #000 0 6%, transparent 6% 8%, #000 8% 14%, transparent 14% 16%, #000 16% 22%, transparent 22% 24%, #000 24% 30%, transparent 30% 32%, #000 32% 38%, transparent 38% 40%)',
          WebkitMaskImage:
            'repeating-linear-gradient(90deg, #000 0 6%, transparent 6% 8%, #000 8% 14%, transparent 14% 16%, #000 16% 22%, transparent 22% 24%, #000 24% 30%, transparent 30% 32%, #000 32% 38%, transparent 38% 40%)',
          opacity: 0.9,
          filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.4))',
        }}
      />
      {/* Bunting string */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '5%',
          height: '1px',
          background: 'rgba(0,0,0,.6)',
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
