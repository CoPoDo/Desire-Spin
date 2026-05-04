/**
 * Sweet Bonanza candy-land scene — pure CSS/SVG, no painted image.
 *
 * Layered build (back → front):
 *   1. Sky gradient: pink → lilac → deep purple at the bottom.
 *   2. Distant pastel mountains (soft polygons).
 *   3. Cloud puffs (large radial gradients with soft edges).
 *   4. Twinkling sparkle dust (animated opacity).
 *   5. Floating candy / heart sprites at top + bottom corners.
 *   6. Subtle vignette so the grid pops.
 *
 * The element fills its absolute container and uses `pointer-events-none`
 * so taps still pass through to the spin-skip handler in ImmersiveSlotView.
 */
export function BonanzaScene() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* 1. Sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, #ff9bd0 0%, #c882e0 28%, #7c4ec8 58%, #2d1144 100%)',
        }}
      />

      {/* 2. Distant pastel mountains — sit in the bottom third so the grid
       * (which spans roughly 25-65% of the stage height) has clean sky around
       * it rather than sitting on top of the mountain silhouette. */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: '0%', height: '36%', width: '100%' }}
        viewBox="0 0 100 50"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="mtn-back" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#e58cc8" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#5e2c80" stopOpacity="0.85" />
          </linearGradient>
          <linearGradient id="mtn-front" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cc5fa8" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#3a134a" stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Far mountains */}
        <path d="M0,50 L0,32 L12,18 L22,28 L36,12 L52,26 L66,16 L82,28 L100,18 L100,50 Z" fill="url(#mtn-back)" />
        {/* Near mountains */}
        <path d="M0,50 L0,40 L8,32 L18,38 L28,28 L40,40 L52,32 L66,42 L78,30 L92,40 L100,34 L100,50 Z" fill="url(#mtn-front)" />
      </svg>

      {/* 3. Cloud puffs */}
      <div
        className="absolute inset-0"
        style={{
          background: `
            radial-gradient(40% 18% at 18% 12%, rgba(255, 232, 244, 0.55) 0%, transparent 70%),
            radial-gradient(36% 14% at 78% 22%, rgba(255, 220, 240, 0.55) 0%, transparent 70%),
            radial-gradient(28% 12% at 50% 8%, rgba(255, 255, 255, 0.5) 0%, transparent 70%),
            radial-gradient(50% 20% at 30% 70%, rgba(220, 180, 240, 0.35) 0%, transparent 70%)
          `,
          mixBlendMode: 'screen',
        }}
      />

      {/* 4. Twinkling sparkle dust */}
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

      {/* 5. Floating candy sprites in corners (decorative) */}
      <div
        className="absolute"
        style={{
          top: '5%', left: '4%', width: '14%', aspectRatio: '1 / 1',
          background: 'radial-gradient(circle at 35% 30%, #fff7fb 0%, #ff5fa2 55%, #7a124d 100%)',
          borderRadius: '50%',
          boxShadow: '0 6px 18px rgba(155,29,82,.55)',
          animation: 'bonanzaFloat 6.5s ease-in-out infinite',
          opacity: 0.92,
        }}
      />
      <div
        className="absolute"
        style={{
          top: '8%', right: '6%', width: '11%', aspectRatio: '1 / 1',
          background: 'radial-gradient(circle at 35% 30%, #f6f0ff 0%, #a884ff 55%, #4a1aa3 100%)',
          borderRadius: '50%',
          boxShadow: '0 6px 18px rgba(74,26,163,.55)',
          animation: 'bonanzaFloat 8s ease-in-out infinite reverse',
          opacity: 0.9,
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '6%', left: '8%', width: '12%', aspectRatio: '1 / 1',
          background: 'radial-gradient(circle at 35% 30%, #fffaa8 0%, #ffc62a 55%, #8a5800 100%)',
          borderRadius: '50%',
          boxShadow: '0 6px 18px rgba(138,88,0,.55)',
          animation: 'bonanzaFloat 7.2s ease-in-out infinite',
          opacity: 0.88,
        }}
      />
      <div
        className="absolute"
        style={{
          bottom: '8%', right: '5%', width: '10%', aspectRatio: '1 / 1',
          background: 'radial-gradient(circle at 35% 30%, #d3f7ff 0%, #50c8ff 55%, #0e3f80 100%)',
          borderRadius: '50%',
          boxShadow: '0 6px 18px rgba(14,63,128,.55)',
          animation: 'bonanzaFloat 6.8s ease-in-out infinite reverse',
          opacity: 0.88,
        }}
      />

      {/* 6. Vignette + subtle gold-edge frame */}
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
