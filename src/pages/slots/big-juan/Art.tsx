import { BigJuanSvg } from './symbols';

/** Lobby tile art for Big Juan — fiesta cantina with the portly
 *  mariachi mascot front-and-centre. Replaces the earlier wrestler
 *  variant which didn't match the real Pragmatic Big Juan. */
export function BigJuanArt() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{
        background:
          'radial-gradient(80% 60% at 50% 45%, #ff8a55 0%, #c8102e 35%, #5a0810 70%, #14040a 100%)',
      }}
    >
      {/* Sunset glow */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '46%',
          transform: 'translate(-50%, -50%)',
          width: '70%',
          aspectRatio: '1 / 1',
          background:
            'radial-gradient(circle, rgba(255,232,168,.6), rgba(255,180,100,.2) 50%, transparent 75%)',
          filter: 'blur(2px)',
        }}
      />
      {/* Mariachi mascot (full SVG, centered) */}
      <div
        className="absolute"
        style={{
          left: '50%',
          top: '52%',
          transform: 'translate(-50%, -50%)',
          width: '64%',
          height: '64%',
          filter: 'drop-shadow(0 4px 10px rgba(0,0,0,.7))',
        }}
      >
        <BigJuanSvg />
      </div>
      {/* Chilli (wild) bottom-left */}
      <div className="absolute" style={{ bottom: '14%', left: '14%', fontSize: '24px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.6))' }}>
        🌶️
      </div>
      {/* Piñata (scatter) bottom-right */}
      <div className="absolute" style={{ bottom: '12%', right: '14%', fontSize: '24px', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.6))' }}>
        🎉
      </div>
      {/* String-lights along the top — fiesta verbenas */}
      <div
        className="absolute inset-x-0"
        style={{
          top: '8%',
          height: '6%',
          backgroundImage: `repeating-linear-gradient(90deg, #ff5560 0 5%, transparent 5% 8%, #1fff7a 8% 13%, transparent 13% 16%, #5fb8ff 16% 21%, transparent 21% 24%, #ffd166 24% 29%, transparent 29% 32%, #c042b8 32% 37%, transparent 37% 40%)`,
          maskImage: 'repeating-linear-gradient(90deg, #000 0 5%, transparent 5% 8%, #000 8% 13%, transparent 13% 16%, #000 16% 21%, transparent 21% 24%, #000 24% 29%, transparent 29% 32%, #000 32% 37%, transparent 37% 40%)',
          WebkitMaskImage: 'repeating-linear-gradient(90deg, #000 0 5%, transparent 5% 8%, #000 8% 13%, transparent 13% 16%, #000 16% 21%, transparent 21% 24%, #000 24% 29%, transparent 29% 32%, #000 32% 37%, transparent 37% 40%)',
          filter: 'drop-shadow(0 0 4px rgba(255,209,102,.7))',
        }}
      />
    </div>
  );
}
