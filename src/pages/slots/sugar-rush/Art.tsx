/** Lobby tile art for Sugar Rush — sweet pink gradient with floating
 *  candy emojis as a quick recognizable preview. */
export function SugarRushArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center"
      style={{
        background:
          'linear-gradient(180deg, #ffb4d8 0%, #ff7ad9 38%, #5a1c70 100%)',
      }}
    >
      <div
        className="absolute"
        style={{ top: '12%', left: '14%', fontSize: '24px' }}
      >
        🍩
      </div>
      <div
        className="absolute"
        style={{ top: '18%', right: '12%', fontSize: '22px' }}
      >
        🧁
      </div>
      <div
        className="absolute"
        style={{ bottom: '14%', left: '14%', fontSize: '22px' }}
      >
        🍭
      </div>
      <div
        className="absolute"
        style={{ bottom: '12%', right: '16%', fontSize: '22px' }}
      >
        🍬
      </div>
      <div
        className="absolute"
        style={{ top: '46%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '36px' }}
      >
        🍦
      </div>
    </div>
  );
}
