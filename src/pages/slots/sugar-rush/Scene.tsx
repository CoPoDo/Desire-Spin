/** Sugar Rush scene — strawberry-pink candyland (matches real Sugar Rush
 *  palette: cotton-candy pink top, deeper rose middle, plum at the horizon).
 *
 *  Layered build (back → front):
 *    1. Sky gradient
 *    2. Pastel candy hills with white sugar caps
 *    3. Mid-distance candy mountain / chocolate cliff silhouette
 *    4. Cloud puffs (low opacity, soft pink)
 *    5. Sparkle dust
 *    6. Foreground SVG candy decorations — donut, cupcake, candy cane,
 *       gummy bear at the corners (replacing emoji placeholders)
 *    7. Vignette + frame
 */
export function SugarRushScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Strawberry-pink sky — softer than the previous hot magenta to
       * better match the real game's pastel candyland feel. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ffd6e8 0%, #ffacc8 22%, #ff7ad9 50%, #a83adb 78%, #4a1660 100%)',
        }}
      />
      {/* Soft sun-glow centre back */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '24%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,250,252,.5) 0%, rgba(255,200,230,.18) 32%, transparent 60%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 2. Pastel candy hills with sugar-snow caps */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '38%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sr-hill-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd6f0" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#7a1c64" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="sr-hill-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffa8d8" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#3a0840" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="sr-cap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fff5fb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Back range (rounded) */}
        <path d="M0,50 L0,28 Q15,14 30,22 Q45,30 60,18 Q75,6 90,22 Q98,28 100,24 L100,50 Z" fill="url(#sr-hill-back)" />
        {/* Front range */}
        <path d="M0,50 L0,38 Q12,28 24,34 Q36,40 48,30 Q60,20 72,32 Q84,42 96,34 L100,38 L100,50 Z" fill="url(#sr-hill-front)" />
        {/* Sugar-snow drips on hill peaks */}
        <path d="M28,21 Q30,24 32,21 Q34,28 30,28 Q28,25 28,21 Z" fill="url(#sr-cap)" />
        <path d="M58,18 Q60,21 62,18 Q64,26 60,26 Q58,23 58,18 Z" fill="url(#sr-cap)" />
        <path d="M88,21 Q90,24 92,21 Q94,28 90,28 Q88,25 88,21 Z" fill="url(#sr-cap)" />
      </svg>

      {/* 3. Mid-distance candy mountain peak (centre, behind grid) */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '25%', height: '12%', width: '100%' }}
        viewBox="0 0 100 12"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="sr-peak" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffe0ec" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#7a1c4a" stopOpacity="0.65" />
          </linearGradient>
        </defs>
        <path d="M30,12 L 50,0 L 70,12 Z" fill="url(#sr-peak)" />
        {/* Vanilla-icing drip on peak */}
        <path d="M 48,1 L 52,1 L 51,4 L 49,4 Z" fill="rgba(255,255,255,.65)" />
      </svg>

      {/* Stage-light glow behind the reels — gives the grid focus and
       * matches real Sugar Rush's pink stage-light backdrop behind the
       * reels. Sized to cover the grid footprint (top:27% width:84%). */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,200,232,.34) 0%, rgba(255,140,210,.18) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 4. Cloud puffs (wispier) */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(36% 16% at 20% 14%, rgba(255, 240, 248, 0.6) 0%, transparent 70%),
            radial-gradient(32% 14% at 75% 24%, rgba(255, 220, 245, 0.6) 0%, transparent 70%),
            radial-gradient(26% 12% at 48% 8%, rgba(255, 250, 252, 0.55) 0%, transparent 70%),
            radial-gradient(40% 14% at 35% 60%, rgba(255, 200, 230, 0.32) 0%, transparent 70%),
            radial-gradient(36% 12% at 70% 65%, rgba(255, 220, 240, 0.32) 0%, transparent 70%)
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* 5. Sparkle dust */}
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

      {/* 6. Foreground SVG candy decorations */}

      {/* Top-left donut */}
      <svg
        className="absolute"
        style={{
          top: '4%', left: '3%', width: '15%', aspectRatio: '1 / 1',
          filter: 'drop-shadow(0 6px 12px rgba(155,29,82,.55))',
          animation: 'bonanzaFloat 6.8s ease-in-out infinite',
          opacity: 0.95,
        }}
        viewBox="0 0 64 64"
      >
        <defs>
          <radialGradient id="sr-dn-dough" cx="50%" cy="50%" r="55%">
            <stop offset="0%" stopColor="#fff5e0" />
            <stop offset="60%" stopColor="#d8a458" />
            <stop offset="100%" stopColor="#5a3018" />
          </radialGradient>
          <radialGradient id="sr-dn-glaze" cx="38%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="40%" stopColor="#ff7ad9" />
            <stop offset="80%" stopColor="#c042b8" />
            <stop offset="100%" stopColor="#5a124a" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="32" r="24" fill="url(#sr-dn-dough)" stroke="#5a3018" strokeWidth=".8" />
        <path
          d="M 32 12 C 18 12 10 20 10 30 C 10 28 12 24 18 22 L 22 28 L 26 20 L 32 26 L 38 18 L 42 26 L 48 20 L 54 26 C 54 20 46 12 32 12 Z"
          fill="url(#sr-dn-glaze)"
          stroke="#5a124a"
          strokeWidth=".5"
        />
        <circle cx="32" cy="32" r="9" fill="url(#sr-dn-dough)" stroke="#5a3018" strokeWidth=".7" />
        {/* Sprinkles */}
        {[
          [22, 20, '#ffd166', -20], [26, 16, '#1fff7a', 30],
          [38, 16, '#5fb8ff', -10], [44, 20, '#ff5560', 60],
          [16, 26, '#a78bfa', 80], [48, 24, '#ff5560', 75],
          [42, 30, '#5fb8ff', -25], [28, 12, '#a78bfa', 90],
        ].map(([x, y, c, rot], i) => (
          <rect key={i} x={Number(x) - 0.7} y={Number(y) - 0.3} width="3" height="0.7" rx=".3" fill={String(c)} transform={`rotate(${rot} ${x} ${y})`} />
        ))}
      </svg>

      {/* Top-right cupcake */}
      <svg
        className="absolute"
        style={{
          top: '5%', right: '3%', width: '13%', aspectRatio: '1 / 1.15',
          filter: 'drop-shadow(0 6px 12px rgba(74,26,163,.55))',
          animation: 'bonanzaFloat 7.4s ease-in-out infinite reverse',
          opacity: 0.94,
        }}
        viewBox="0 0 56 64"
      >
        <defs>
          <linearGradient id="sr-cc-wrap" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd8b8" />
            <stop offset="50%" stopColor="#c8932e" />
            <stop offset="100%" stopColor="#5a3a04" />
          </linearGradient>
          <radialGradient id="sr-cc-frost" cx="50%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="40%" stopColor="#ffaad0" />
            <stop offset="80%" stopColor="#ff5fa2" />
            <stop offset="100%" stopColor="#7a1c4a" />
          </radialGradient>
        </defs>
        <path d="M 8 36 L 14 60 L 42 60 L 48 36 Z" fill="url(#sr-cc-wrap)" stroke="#3a2204" strokeWidth=".6" />
        {[16, 22, 28, 34, 40].map((x, i) => (
          <line key={i} x1={x} y1="36" x2={x + (x - 28) * 0.18} y2="60" stroke="#3a2204" strokeWidth=".4" opacity=".55" />
        ))}
        <path d="M 10 36 Q 14 22 20 24 Q 24 14 32 18 Q 40 14 42 22 Q 48 24 46 36 Z" fill="url(#sr-cc-frost)" stroke="#7a1c4a" strokeWidth=".5" />
        <path d="M 18 32 Q 24 24 30 28 Q 36 22 40 30" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth=".7" />
        <circle cx="32" cy="14" r="3" fill="#c8102e" stroke="#5a081a" strokeWidth=".4" />
        <ellipse cx="31" cy="13" rx="1" ry=".7" fill="rgba(255,255,255,.7)" />
        <path d="M 32 11 Q 34 7 36 8" fill="none" stroke="#1aa744" strokeWidth=".8" strokeLinecap="round" />
      </svg>

      {/* Bottom-left candy cane */}
      <svg
        className="absolute"
        style={{
          bottom: '6%', left: '4%', width: '12%', aspectRatio: '1 / 1.6',
          filter: 'drop-shadow(0 6px 12px rgba(155,29,82,.5))',
          animation: 'bonanzaFloat 7.0s ease-in-out infinite',
          opacity: 0.94,
        }}
        viewBox="0 0 40 80"
      >
        <defs>
          <linearGradient id="sr-cane" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe0ec" />
            <stop offset="50%" stopColor="#fff" />
            <stop offset="100%" stopColor="#ffd6e8" />
          </linearGradient>
        </defs>
        <path d="M 8 16 Q 8 4 20 4 Q 32 4 32 16 L 32 70 Q 32 76 26 76 L 22 76 Q 16 76 16 70 L 16 20" fill="url(#sr-cane)" stroke="#a8124d" strokeWidth="1.5" strokeLinejoin="round" />
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={6 + i * 4} y1={i * 10 + 4} x2={36 - i * 4} y2={i * 10 + 12} stroke="#c8102e" strokeWidth="3" strokeLinecap="round" opacity={i < 2 ? 0.8 : 1} />
        ))}
      </svg>

      {/* Bottom-right gummy bear */}
      <svg
        className="absolute"
        style={{
          bottom: '7%', right: '4%', width: '11%', aspectRatio: '1 / 1.2',
          filter: 'drop-shadow(0 6px 12px rgba(74,26,163,.5))',
          animation: 'bonanzaFloat 6.4s ease-in-out infinite reverse',
          opacity: 0.94,
        }}
        viewBox="0 0 50 60"
      >
        <defs>
          <radialGradient id="sr-gb" cx="38%" cy="32%" r="68%">
            <stop offset="0%" stopColor="#ffe0e8" />
            <stop offset="20%" stopColor="#ffaac8" />
            <stop offset="55%" stopColor="#ff5fa2" />
            <stop offset="85%" stopColor="#a8124d" />
            <stop offset="100%" stopColor="#3a0820" />
          </radialGradient>
        </defs>
        {/* Head */}
        <ellipse cx="25" cy="14" rx="9" ry="8" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" />
        {/* Ears */}
        <circle cx="17" cy="6" r="3.5" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" />
        <circle cx="33" cy="6" r="3.5" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" />
        {/* Body */}
        <ellipse cx="25" cy="35" rx="13" ry="14" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" />
        {/* Tummy patch (lighter) */}
        <ellipse cx="25" cy="38" rx="6" ry="7" fill="rgba(255,255,255,.25)" />
        {/* Arms (raised) */}
        <ellipse cx="11" cy="26" rx="4" ry="6" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" transform="rotate(-30 11 26)" />
        <ellipse cx="39" cy="26" rx="4" ry="6" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" transform="rotate(30 39 26)" />
        {/* Legs */}
        <ellipse cx="18" cy="52" rx="4" ry="5" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" />
        <ellipse cx="32" cy="52" rx="4" ry="5" fill="url(#sr-gb)" stroke="#5a0828" strokeWidth=".6" />
        {/* Face */}
        <circle cx="22" cy="13" r="1.2" fill="#1a0a04" />
        <circle cx="28" cy="13" r="1.2" fill="#1a0a04" />
        <circle cx="22" cy="13" r=".4" fill="#fff" />
        <circle cx="28" cy="13" r=".4" fill="#fff" />
        {/* Tiny nose */}
        <circle cx="25" cy="16" r=".7" fill="#5a0828" />
        {/* Smile */}
        <path d="M 23 17 Q 25 18 27 17" stroke="#5a0828" strokeWidth=".5" fill="none" strokeLinecap="round" />
        {/* Highlight on body */}
        <ellipse cx="18" cy="28" rx="2.5" ry="3.5" fill="rgba(255,255,255,.5)" transform="rotate(-15 18 28)" />
      </svg>

      {/* Sprinkles rain — small coloured rectangles fall down across the
       * candyland (signature Sugar Rush ambient touch — real game uses
       * raining sprinkles when you trigger free spins). Ten sprinkles
       * with varied colours / sizes / speeds / delays. */}
      {[
        { left: '6%',  size: 5, dur: 9,  delay: 0,    color: '#ff5560' },
        { left: '14%', size: 3, dur: 11, delay: 2.4,  color: '#ffd166' },
        { left: '22%', size: 4, dur: 8,  delay: 4.8,  color: '#1fff7a' },
        { left: '32%', size: 5, dur: 10, delay: 1.2,  color: '#5fb8ff' },
        { left: '44%', size: 3, dur: 12, delay: 3.6,  color: '#ff7ad9' },
        { left: '56%', size: 4, dur: 9,  delay: 5.6,  color: '#a78bfa' },
        { left: '66%', size: 5, dur: 11, delay: 0.8,  color: '#ffae50' },
        { left: '78%', size: 3, dur: 8.5, delay: 2.2, color: '#ff5560' },
        { left: '88%', size: 4, dur: 10.5, delay: 4.2, color: '#1fff7a' },
        { left: '94%', size: 5, dur: 9.5, delay: 6.0, color: '#ffd166' },
      ].map((s, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: s.left,
            top: 0,
            width: `${s.size}px`,
            height: `${s.size * 1.6}px`,
            background: s.color,
            borderRadius: '1px',
            boxShadow: `0 0 4px ${s.color}aa`,
            animation: `sugarSprinkleFall ${s.dur}s linear ${s.delay}s infinite`,
            mixBlendMode: 'screen',
          }}
        />
      ))}

      {/* 7. Vignette + frame */}
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
