/** Sugar Rush scene — pinker, sweeter, more "candy land" than Bonanza's
 *  dusk-purple sky. Hotter rose+strawberry palette with floating cupcake/
 *  donut sprites in the corners. */
export function SugarRushScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Sky gradient — strawberry → magenta → grape */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ffb4d8 0%, #ff7ad9 30%, #c042b8 60%, #5a1c70 100%)',
        }}
      />

      {/* 2. Pastel candy hills */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '34%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sr-hill-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd6f0" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#7a1c64" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="sr-hill-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa8d8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3a0840" stopOpacity="1" />
          </linearGradient>
        </defs>
        <path d="M0,50 L0,28 Q15,14 30,22 Q45,30 60,18 Q75,6 90,22 Q98,28 100,24 L100,50 Z" fill="url(#sr-hill-back)" />
        <path d="M0,50 L0,38 Q12,28 24,34 Q36,40 48,30 Q60,20 72,32 Q84,42 96,34 L100,38 L100,50 Z" fill="url(#sr-hill-front)" />
      </svg>

      {/* 3. Cloud puffs */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(36% 16% at 20% 14%, rgba(255, 240, 248, 0.55) 0%, transparent 70%),
            radial-gradient(32% 14% at 75% 24%, rgba(255, 220, 245, 0.55) 0%, transparent 70%),
            radial-gradient(26% 12% at 48% 8%, rgba(255, 250, 252, 0.5) 0%, transparent 70%)
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* 4. Sparkle dust (reuses Bonanza's keyframe) */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 14% 18%, rgba(255,255,255,.95), transparent 60%),
            radial-gradient(1.5px 1.5px at 78% 14%, rgba(255,232,255,.85), transparent 60%),
            radial-gradient(1.5px 1.5px at 38% 28%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 88% 32%, rgba(255,210,236,.85), transparent 60%),
            radial-gradient(1.2px 1.2px at 22% 38%, rgba(255,232,250,.7), transparent 60%),
            radial-gradient(1.4px 1.4px at 64% 40%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 8% 52%, rgba(255,232,250,.6), transparent 60%),
            radial-gradient(1.4px 1.4px at 92% 56%, rgba(255,200,236,.65), transparent 60%)
          `,
          mixBlendMode: 'screen',
          animation: 'bonanzaSparkle 5s ease-in-out infinite',
        }}
      />

      {/* 5. Floating dessert sprites (decorative) */}
      <div
        className="absolute"
        style={{
          top: '4%', left: '4%', width: '15%', aspectRatio: '1 / 1',
          fontSize: 'min(48px, 10cqw)',
          animation: 'bonanzaFloat 6.8s ease-in-out infinite',
        }}
      >
        🍩
      </div>
      <div
        className="absolute"
        style={{
          top: '6%', right: '5%', width: '13%', aspectRatio: '1 / 1',
          fontSize: 'min(42px, 9cqw)',
          animation: 'bonanzaFloat 7.4s ease-in-out infinite reverse',
        }}
      >
        🧁
      </div>
      <div
        className="absolute"
        style={{
          bottom: '7%', left: '6%', width: '13%', aspectRatio: '1 / 1',
          fontSize: 'min(42px, 9cqw)',
          animation: 'bonanzaFloat 7.0s ease-in-out infinite',
        }}
      >
        🍭
      </div>
      <div
        className="absolute"
        style={{
          bottom: '8%', right: '5%', width: '12%', aspectRatio: '1 / 1',
          fontSize: 'min(38px, 8cqw)',
          animation: 'bonanzaFloat 6.4s ease-in-out infinite reverse',
        }}
      >
        🍬
      </div>

      {/* 6. Vignette + frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(72% 72% at 50% 50%, transparent 50%, rgba(0,0,0,.35) 100%)',
        }}
      />
      <div
        className="absolute inset-0 rounded-[14px] pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 0 2px rgba(255,255,255,.18), inset 0 0 22px rgba(255,148,210,.3)',
        }}
      />
    </div>
  );
}
