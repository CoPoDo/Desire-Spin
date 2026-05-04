/** Lobby tile art for Pharaoh's Gold — pyramids + sun + hieroglyphs. */
export function PharaohGoldArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #ffd166 0%, #ff8a40 30%, #c8492a 60%, #5a142e 90%, #14051a 100%)',
      }}
    >
      {/* Sun */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '34%',
          transform: 'translate(-50%, -50%)',
          width: '60%',
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle, rgba(255,250,200,.7), transparent 60%)',
          filter: 'blur(2px)',
        }}
      />
      {/* Pyramids silhouette */}
      <svg
        className="absolute inset-x-0"
        style={{ bottom: 0, height: '46%', width: '100%' }}
        viewBox="0 0 100 46"
        preserveAspectRatio="none"
      >
        <path d="M 30 46 L 50 8 L 70 46 Z" fill="#3a1a04" />
        <path d="M 50 8 L 70 46 L 60 46 Z" fill="rgba(0,0,0,.4)" />
        <path d="M 8 46 L 22 22 L 36 46 Z" fill="#5a3018" opacity=".9" />
      </svg>
      {/* Hieroglyph row */}
      <div
        className="absolute font-display"
        style={{
          top: '8%',
          color: 'rgba(255,209,102,.7)',
          fontSize: '20px',
          letterSpacing: '0.3em',
          textShadow: '0 0 8px rgba(255,200,80,.6)',
        }}
      >
        𓂀 𓋹 𓏏 𓎟
      </div>
    </div>
  );
}
