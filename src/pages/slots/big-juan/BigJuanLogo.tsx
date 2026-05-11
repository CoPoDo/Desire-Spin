/** "BIG JUAN" stylized logo — chunky red letters with thick gold trim,
 *  drop shadow, and a slight tilt for cartoony energy. Mounts next to
 *  the Juan character to fill the empty space above the reels. */
export function BigJuanLogo({ size = 160 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 200 100"
      width={size}
      height={(size * 100) / 200}
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <defs>
        <linearGradient id="bjl-red" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ff8080" />
          <stop offset="45%"  stopColor="#e02030" />
          <stop offset="100%" stopColor="#5a0810" />
        </linearGradient>
        <linearGradient id="bjl-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#fff5c4" />
          <stop offset="50%"  stopColor="#ffd166" />
          <stop offset="100%" stopColor="#8a6010" />
        </linearGradient>
      </defs>
      {/* BIG — top line, slight upward tilt */}
      <g transform="rotate(-3 100 25)">
        <text x="100" y="42" textAnchor="middle"
          fontSize="42" fontWeight="900"
          fontFamily="'Fraunces','Georgia',serif"
          fill="rgba(0,0,0,.55)"
          style={{ filter: 'blur(1.5px)' }}>BIG</text>
        <text x="100" y="40" textAnchor="middle"
          fontSize="42" fontWeight="900"
          fontFamily="'Fraunces','Georgia',serif"
          fill="url(#bjl-red)"
          stroke="url(#bjl-gold)" strokeWidth="3"
          paintOrder="stroke fill">BIG</text>
      </g>
      {/* JUAN — bottom line, larger and slight downward tilt */}
      <g transform="rotate(2 100 75)">
        <text x="100" y="92" textAnchor="middle"
          fontSize="54" fontWeight="900"
          fontFamily="'Fraunces','Georgia',serif"
          fill="rgba(0,0,0,.55)"
          style={{ filter: 'blur(1.5px)' }}>JUAN</text>
        <text x="100" y="90" textAnchor="middle"
          fontSize="54" fontWeight="900"
          fontFamily="'Fraunces','Georgia',serif"
          fill="url(#bjl-red)"
          stroke="url(#bjl-gold)" strokeWidth="3"
          paintOrder="stroke fill">JUAN</text>
      </g>
    </svg>
  );
}
