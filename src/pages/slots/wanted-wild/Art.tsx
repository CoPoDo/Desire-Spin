/** Lobby tile art for Wanted Dead or a Wild — dusty western with star + sheriff. */
export function WantedWildArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #f5b06a 0%, #d8442a 22%, #8a1818 55%, #2a0810 90%, #0a0204 100%)',
      }}
    >
      {/* Sun glow */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '38%',
          transform: 'translate(-50%, -50%)',
          width: '60%',
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle, rgba(255,200,120,.55), transparent 60%)',
          filter: 'blur(2px)',
        }}
      />
      {/* Cactus */}
      <div className="absolute" style={{ bottom: '8%', left: '10%', fontSize: '32px' }}>
        🌵
      </div>
      {/* Big sheriff star centre */}
      <div
        className="absolute font-display font-extrabold"
        style={{
          top: '46%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          fontSize: '56px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.6))',
          color: '#ffd166',
        }}
      >
        ⭐
      </div>
      {/* Subtle wood-panel border at the bottom */}
      <div
        className="absolute inset-x-0"
        style={{
          bottom: 0,
          height: '14%',
          background:
            'repeating-linear-gradient(90deg, #3a1a08 0 12%, #5a3018 12% 13%)',
          opacity: 0.85,
        }}
      />
    </div>
  );
}
