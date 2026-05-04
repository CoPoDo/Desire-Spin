/**
 * Sweet Bonanza candy-land scene — pure CSS/SVG, no painted image.
 *
 * Layered build (back → front):
 *   1. Sky gradient: cotton-candy pink → lilac → deep magenta horizon
 *   2. Distant pastel mountains (two layers, real-game candy-pink palette)
 *   3. Mid-distance candy castle silhouette (centred behind the grid)
 *   4. Soft cloud puffs (wispy, low opacity)
 *   5. Twinkling sparkle dust
 *   6. Foreground candy decorations — proper SVG lollipop / candy-cane /
 *      ice-cream / gummy-bear in each corner instead of plain coloured discs
 *   7. Drifting heart particles (Sweet Bonanza's signature ambient touch)
 *   8. Vignette + soft pink-edge frame
 *
 * The element fills its absolute container and uses `pointer-events-none`
 * so taps still pass through to the spin-skip handler in ImmersiveSlotView.
 */
export function BonanzaScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Sky — cotton-candy pink to lilac to magenta horizon. Real Sweet
       * Bonanza uses a softer pastel-leaning palette than my earlier values;
       * tuned closer to that here. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ffd6ec 0%, #ffa8d8 18%, #d68aea 42%, #8a4ec8 70%, #3a1660 100%)',
        }}
      />
      {/* Soft sun-glow lit centre-back of the sky (like the real game's
       * dreamy back-light behind the cloud layer) */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '22%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,240,250,.45) 0%, rgba(255,200,230,.18) 30%, transparent 60%)',
          filter: 'blur(2px)',
        }}
      />

      {/* 2. Distant pastel candy-pink mountains. Two layers, the front darker
       * and pinker than the back. */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '40%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="mtn-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffaad0" stopOpacity="0.62" />
            <stop offset="100%" stopColor="#7a3a98" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="mtn-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e2589a" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#3a1660" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="mtn-snow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fff5fb" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#fff5fb" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Back range (smaller, softer) */}
        <path d="M0,50 L0,30 L12,16 L22,26 L36,10 L52,24 L66,14 L82,26 L100,16 L100,50 Z" fill="url(#mtn-back)" />
        {/* Front range (bigger silhouette) */}
        <path d="M0,50 L0,38 L8,30 L18,36 L28,26 L40,38 L52,30 L66,40 L78,28 L92,38 L100,32 L100,50 Z" fill="url(#mtn-front)" />
        {/* Snow caps on a few peaks (cotton-candy white) */}
        <path d="M28,26 L24,30 L32,30 Z" fill="url(#mtn-snow)" />
        <path d="M52,30 L48,34 L56,34 Z" fill="url(#mtn-snow)" />
        <path d="M78,28 L74,32 L82,32 Z" fill="url(#mtn-snow)" />
      </svg>

      {/* 3. Mid-distance candy castle — sits right in the middle behind the
       * grid. Pink+purple turrets with conical caps. Subtle so the grid is
       * still the focal point. */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '24%', height: '14%', width: '100%' }}
        viewBox="0 0 100 14"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="cstl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff8ac0" stopOpacity="0.42" />
            <stop offset="100%" stopColor="#5a2080" stopOpacity="0.62" />
          </linearGradient>
          <linearGradient id="cstl-roof" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd6ec" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#a83adb" stopOpacity="0.75" />
          </linearGradient>
        </defs>
        {/* Castle body (centred) */}
        <rect x="38" y="6" width="24" height="8" fill="url(#cstl)" />
        {/* Outer turrets (left + right) */}
        <rect x="34" y="4" width="6" height="10" fill="url(#cstl)" />
        <rect x="60" y="4" width="6" height="10" fill="url(#cstl)" />
        {/* Centre tower (taller) */}
        <rect x="46" y="2" width="8" height="12" fill="url(#cstl)" />
        {/* Conical roofs */}
        <path d="M34 4 L 37 0 L 40 4 Z" fill="url(#cstl-roof)" />
        <path d="M46 2 L 50 -2 L 54 2 Z" fill="url(#cstl-roof)" />
        <path d="M60 4 L 63 0 L 66 4 Z" fill="url(#cstl-roof)" />
        {/* Tiny flag pennants */}
        <path d="M50 -2 L 50 -4 L 53 -3 Z" fill="#ffd166" opacity=".7" />
        <path d="M37 0 L 37 -2 L 39 -1 Z" fill="#ff5fa2" opacity=".65" />
        <path d="M63 0 L 63 -2 L 65 -1 Z" fill="#ff5fa2" opacity=".65" />
        {/* Lit windows (warm orange dots) */}
        {[40, 44, 50, 56, 62].map((x, i) => (
          <rect key={i} x={x - 0.5} y="9" width="1" height="1.4" fill="rgba(255,200,80,.55)" />
        ))}
      </svg>

      {/* Soft candy-spotlight glow behind the reel area — gives the grid
       * visual focus + matches real Sweet Bonanza's pink "stage light"
       * behind the reels. The grid sits at top:27% width:84% so this
       * radial centre is positioned over that footprint. */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '92%',
          height: '50%',
          background:
            'radial-gradient(ellipse at center, rgba(255,200,232,.32) 0%, rgba(255,140,200,.18) 40%, transparent 75%)',
          filter: 'blur(8px)',
          mixBlendMode: 'screen',
        }}
      />

      {/* 4. Cloud puffs — wispier than before, layered for depth. */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(46% 14% at 16% 10%, rgba(255, 240, 250, 0.55) 0%, transparent 60%),
            radial-gradient(36% 12% at 82% 18%, rgba(255, 220, 240, 0.6) 0%, transparent 60%),
            radial-gradient(26% 10% at 50% 6%, rgba(255, 250, 254, 0.55) 0%, transparent 60%),
            radial-gradient(58% 18% at 28% 64%, rgba(220, 180, 240, 0.32) 0%, transparent 70%),
            radial-gradient(40% 14% at 72% 70%, rgba(255, 200, 230, 0.32) 0%, transparent 70%)
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* 5. Sparkle dust — fine pastel highlights */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            radial-gradient(2px 2px at 12% 18%, rgba(255,255,255,.9), transparent 60%),
            radial-gradient(1.5px 1.5px at 78% 14%, rgba(255,232,255,.85), transparent 60%),
            radial-gradient(1.5px 1.5px at 38% 26%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 88% 32%, rgba(255,200,230,.85), transparent 60%),
            radial-gradient(1.2px 1.2px at 22% 36%, rgba(255,232,244,.7), transparent 60%),
            radial-gradient(1.4px 1.4px at 64% 38%, rgba(255,255,255,.7), transparent 60%),
            radial-gradient(2px 2px at 8% 50%, rgba(255,232,244,.6), transparent 60%),
            radial-gradient(1.4px 1.4px at 92% 56%, rgba(255,200,230,.65), transparent 60%)
          `,
          mixBlendMode: 'screen',
          animation: 'bonanzaSparkle 5s ease-in-out infinite',
        }}
      />

      {/* 6. Foreground candy decorations — proper SVG art. Top corners get
       * lollipops; bottom corners get a candy cane and an ice-cream cone.
       * Replaces the previous 4 plain colour discs. */}
      <svg
        className="absolute"
        style={{
          top: '4%', left: '3%', width: '15%', aspectRatio: '1 / 1',
          filter: 'drop-shadow(0 6px 12px rgba(155,29,82,.55))',
          animation: 'bonanzaFloat 6.5s ease-in-out infinite',
          opacity: 0.94,
        }}
        viewBox="0 0 64 80"
      >
        <defs>
          <radialGradient id="lp1" cx="38%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="20%" stopColor="#ffd1e2" />
            <stop offset="55%" stopColor="#ff5fa2" />
            <stop offset="85%" stopColor="#a8124d" />
            <stop offset="100%" stopColor="#4a0824" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="28" r="22" fill="url(#lp1)" stroke="#5a0828" strokeWidth="1.2" />
        {/* Spiral pattern */}
        <path d="M32 12 A 16 16 0 0 1 48 28 A 16 16 0 0 1 32 44 A 16 16 0 0 1 16 28 A 16 16 0 0 1 32 12 Z" fill="none" stroke="#fff" strokeWidth=".9" opacity=".55" />
        <path d="M32 18 A 10 10 0 0 1 42 28 A 10 10 0 0 1 32 38 A 10 10 0 0 1 22 28 A 10 10 0 0 1 32 18 Z" fill="none" stroke="#fff" strokeWidth="1.1" opacity=".75" />
        <path d="M32 22 A 6 6 0 0 1 38 28 A 6 6 0 0 1 32 34 A 6 6 0 0 1 26 28 A 6 6 0 0 1 32 22 Z" fill="none" stroke="#fff" strokeWidth="1.2" opacity=".9" />
        <ellipse cx="24" cy="22" rx="5" ry="3" fill="rgba(255,255,255,.7)" />
        <rect x="30" y="50" width="4" height="28" rx="1.5" fill="#fff5fb" stroke="#a8a29e" strokeWidth=".6" />
      </svg>

      <svg
        className="absolute"
        style={{
          top: '6%', right: '3%', width: '13%', aspectRatio: '1 / 1',
          filter: 'drop-shadow(0 6px 12px rgba(74,26,163,.55))',
          animation: 'bonanzaFloat 8s ease-in-out infinite reverse',
          opacity: 0.92,
        }}
        viewBox="0 0 64 80"
      >
        <defs>
          <radialGradient id="lp2" cx="38%" cy="36%" r="65%">
            <stop offset="0%" stopColor="#f6f0ff" />
            <stop offset="20%" stopColor="#dac4ff" />
            <stop offset="55%" stopColor="#a884ff" />
            <stop offset="85%" stopColor="#5a1ec0" />
            <stop offset="100%" stopColor="#240850" />
          </radialGradient>
        </defs>
        <circle cx="32" cy="28" r="22" fill="url(#lp2)" stroke="#240850" strokeWidth="1.2" />
        <path d="M32 12 A 16 16 0 0 1 48 28 A 16 16 0 0 1 32 44 A 16 16 0 0 1 16 28 A 16 16 0 0 1 32 12 Z" fill="none" stroke="#fff" strokeWidth=".9" opacity=".55" />
        <path d="M32 18 A 10 10 0 0 1 42 28 A 10 10 0 0 1 32 38 A 10 10 0 0 1 22 28 A 10 10 0 0 1 32 18 Z" fill="none" stroke="#fff" strokeWidth="1.1" opacity=".75" />
        <ellipse cx="24" cy="22" rx="4.5" ry="2.6" fill="rgba(255,255,255,.6)" />
        <rect x="30" y="50" width="4" height="28" rx="1.5" fill="#fff5fb" stroke="#a8a29e" strokeWidth=".6" />
      </svg>

      {/* Bottom-left candy cane */}
      <svg
        className="absolute"
        style={{
          bottom: '5%', left: '4%', width: '12%', aspectRatio: '1 / 1.6',
          filter: 'drop-shadow(0 6px 12px rgba(155,29,82,.5))',
          animation: 'bonanzaFloat 7.2s ease-in-out infinite',
          opacity: 0.92,
        }}
        viewBox="0 0 40 80"
      >
        <defs>
          <linearGradient id="cane" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffe0ec" />
            <stop offset="50%" stopColor="#fff" />
            <stop offset="100%" stopColor="#ffd6e8" />
          </linearGradient>
        </defs>
        {/* Curved hook + stem */}
        <path
          d="M 8 16 Q 8 4 20 4 Q 32 4 32 16 L 32 70 Q 32 76 26 76 L 22 76 Q 16 76 16 70 L 16 20"
          fill="url(#cane)"
          stroke="#a8124d"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        {/* Red diagonal stripes */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line
            key={i}
            x1={6 + i * 4}
            y1={i * 10 + 4}
            x2={36 - i * 4}
            y2={i * 10 + 12}
            stroke="#c8102e"
            strokeWidth="3"
            strokeLinecap="round"
            opacity={i < 2 ? 0.8 : 1}
          />
        ))}
      </svg>

      {/* Bottom-right ice-cream cone */}
      <svg
        className="absolute"
        style={{
          bottom: '6%', right: '4%', width: '11%', aspectRatio: '1 / 1.6',
          filter: 'drop-shadow(0 6px 12px rgba(74,26,163,.5))',
          animation: 'bonanzaFloat 6.8s ease-in-out infinite reverse',
          opacity: 0.94,
        }}
        viewBox="0 0 40 80"
      >
        <defs>
          <radialGradient id="ic-scoop1" cx="40%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#fff5fb" />
            <stop offset="50%" stopColor="#ffaad0" />
            <stop offset="100%" stopColor="#9b1d52" />
          </radialGradient>
          <radialGradient id="ic-scoop2" cx="40%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#fffae0" />
            <stop offset="50%" stopColor="#a3d4ff" />
            <stop offset="100%" stopColor="#1a72c4" />
          </radialGradient>
          <linearGradient id="ic-cone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffd166" />
            <stop offset="100%" stopColor="#7a4a04" />
          </linearGradient>
        </defs>
        {/* Cone (waffle pattern via lines) */}
        <path d="M 10 38 L 30 38 L 22 78 L 18 78 Z" fill="url(#ic-cone)" stroke="#3a2a04" strokeWidth=".8" />
        {[10, 14, 18, 22].map((x, i) => (
          <line key={i} x1={x} y1={38 + i * 2} x2={30 - x + 10} y2={38 + i * 2} stroke="#5a3a04" strokeWidth=".3" opacity=".6" />
        ))}
        <line x1="14" y1="40" x2="22" y2="76" stroke="#5a3a04" strokeWidth=".3" opacity=".5" />
        <line x1="26" y1="40" x2="18" y2="76" stroke="#5a3a04" strokeWidth=".3" opacity=".5" />
        {/* Scoop 1 (pink) */}
        <circle cx="20" cy="32" r="11" fill="url(#ic-scoop1)" stroke="#5a0828" strokeWidth=".7" />
        {/* Scoop 2 (blue) on top, slightly offset */}
        <circle cx="20" cy="20" r="9" fill="url(#ic-scoop2)" stroke="#0a3a6a" strokeWidth=".7" />
        {/* Cherry on top */}
        <circle cx="20" cy="10" r="2.4" fill="#c8102e" stroke="#5a081a" strokeWidth=".4" />
        <path d="M 20 8 Q 22 4 24 5" fill="none" stroke="#1aa744" strokeWidth=".7" strokeLinecap="round" />
        {/* Highlights */}
        <ellipse cx="16" cy="28" rx="2.2" ry="1.4" fill="rgba(255,255,255,.55)" />
        <ellipse cx="16" cy="16" rx="1.8" ry="1.2" fill="rgba(255,255,255,.55)" />
      </svg>

      {/* 7. Drifting heart particles — Sweet Bonanza signature ambient */}
      {[
        { left: '12%', size: 14, dur: 9, delay: 0,    color: '#ff7ad9' },
        { left: '24%', size: 10, dur: 11, delay: 2.4, color: '#ffaad0' },
        { left: '38%', size: 18, dur: 10, delay: 4.8, color: '#ff5fa2' },
        { left: '52%', size: 12, dur: 8.5, delay: 1.2, color: '#ffd1e2' },
        { left: '68%', size: 16, dur: 12, delay: 3.6, color: '#c042b8' },
        { left: '82%', size: 11, dur: 10.5, delay: 5.6, color: '#ff7ad9' },
        { left: '92%', size: 13, dur: 9.5, delay: 0.8, color: '#ffaad0' },
      ].map((h, i) => (
        <div
          key={i}
          className="absolute select-none"
          style={{
            left: h.left,
            bottom: '-10%',
            fontSize: `${h.size}px`,
            color: h.color,
            filter: `drop-shadow(0 0 6px ${h.color}aa)`,
            animation: `bonanzaHeartDrift ${h.dur}s linear ${h.delay}s infinite`,
            mixBlendMode: 'screen',
            willChange: 'transform, opacity',
          }}
        >
          ❤
        </div>
      ))}

      {/* 8. Vignette + soft pink-edge frame */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(72% 72% at 50% 50%, transparent 50%, rgba(0,0,0,.32) 100%)',
        }}
      />
      <div
        className="absolute inset-0 rounded-[14px] pointer-events-none"
        style={{
          boxShadow:
            'inset 0 0 0 2px rgba(255,255,255,.15), inset 0 0 22px rgba(255,148,200,.25)',
        }}
      />
    </div>
  );
}
