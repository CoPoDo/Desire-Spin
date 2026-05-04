/** Lobby tile art for Juan's Cantina — sunset gradient + emoji preview. */
export function JuanCantinaArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #ffd166 0%, #ff8a40 22%, #d8442a 55%, #6a142e 90%, #1a0610 100%)',
      }}
    >
      {/* Sun */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '32%',
          transform: 'translate(-50%, -50%)',
          width: '60%',
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle, rgba(255,232,168,.65), transparent 60%)',
          filter: 'blur(2px)',
        }}
      />
      {/* Cactus left */}
      <div className="absolute" style={{ bottom: '8%', left: '8%', fontSize: '32px' }}>
        🌵
      </div>
      {/* Cactus right */}
      <div className="absolute" style={{ bottom: '8%', right: '8%', fontSize: '32px' }}>
        🌵
      </div>
      {/* Sombrero center */}
      <div
        className="absolute"
        style={{
          top: '46%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '54px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.5))',
        }}
      >
        🪇
      </div>
      {/* Decorative bunting up top */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '8%',
          height: '8%',
          backgroundImage: `repeating-linear-gradient(90deg, #ff5560 0 8%, transparent 8% 12%, #1fff7a 12% 20%, transparent 20% 24%, #ffd166 24% 32%, transparent 32% 36%)`,
          maskImage: 'repeating-linear-gradient(90deg, #000 0 8%, transparent 8% 12%, #000 12% 20%, transparent 20% 24%, #000 24% 32%, transparent 32% 36%)',
          WebkitMaskImage: 'repeating-linear-gradient(90deg, #000 0 8%, transparent 8% 12%, #000 12% 20%, transparent 20% 24%, #000 24% 32%, transparent 32% 36%)',
        }}
      />
    </div>
  );
}
