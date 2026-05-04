/** Lobby tile art for Big Juan — luchador wrestler hero. */
export function BigJuanArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 50%, #ff5560 0%, #5a0810 50%, #14040a 100%)',
      }}
    >
      {/* Spotlight glow */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,232,168,.5), rgba(255,209,102,.15) 50%, transparent 75%)',
          filter: 'blur(2px)',
        }}
      />
      {/* Wrestler emoji centre */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '60px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.7))',
        }}
      >
        🤼
      </div>
      {/* Chilli (wild) bottom-left */}
      <div className="absolute" style={{ bottom: '14%', left: '14%', fontSize: '24px' }}>
        🌶️
      </div>
      {/* Piñata (scatter) bottom-right */}
      <div className="absolute" style={{ bottom: '12%', right: '14%', fontSize: '24px' }}>
        🎉
      </div>
      {/* Bunting */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '8%',
          height: '8%',
          backgroundImage: `repeating-linear-gradient(90deg, #ff5560 0 6%, transparent 6% 9%, #1fff7a 9% 15%, transparent 15% 18%, #5fb8ff 18% 24%, transparent 24% 27%, #ffd166 27% 33%, transparent 33% 36%)`,
          maskImage: 'repeating-linear-gradient(90deg, #000 0 6%, transparent 6% 9%, #000 9% 15%, transparent 15% 18%, #000 18% 24%, transparent 24% 27%, #000 27% 33%, transparent 33% 36%)',
          WebkitMaskImage: 'repeating-linear-gradient(90deg, #000 0 6%, transparent 6% 9%, #000 9% 15%, transparent 15% 18%, #000 18% 24%, transparent 24% 27%, #000 27% 33%, transparent 33% 36%)',
        }}
      />
    </div>
  );
}
