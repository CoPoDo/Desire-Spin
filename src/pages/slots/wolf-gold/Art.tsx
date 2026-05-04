/** Lobby tile art for Wolf Gold — moon + wolf silhouette + violet sky. */
export function WolfGoldArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #6638c8 0%, #2a1268 30%, #0a0418 65%, #02010a 100%)',
      }}
    >
      {/* Moon */}
      <div
        className="absolute"
        style={{
          right: '20%',
          top: '30%',
          transform: 'translate(50%, -50%)',
          width: '40%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, #fff5e0 0%, #dde4f0 55%, transparent 75%)',
          borderRadius: '50%',
          filter: 'blur(.4px)',
        }}
      />
      {/* Wolf silhouette */}
      <div
        className="absolute font-bold"
        style={{
          bottom: '14%',
          left: '50%',
          transform: 'translate(-50%, 0)',
          fontSize: '54px',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,.6))',
        }}
      >
        🐺
      </div>
    </div>
  );
}
