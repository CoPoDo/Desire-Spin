import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/** Particle shower of falling gold coins + jewel-toned gems used during the
 *  Big/Huge/Mega/Epic Win celebrations. The intensity arg scales the
 *  particle count so bigger wins feel proportionally more lavish. */
export function CoinShower({
  active,
  intensity = 1,
}: {
  active: boolean;
  intensity?: number;
}) {
  type Particle = {
    id: number;
    kind: 'coin' | 'gem-red' | 'gem-purple' | 'gem-blue';
    left: number;     // % from left of viewport
    delay: number;    // s
    duration: number; // s
    size: number;     // px
    rotateFrom: number;
    rotateTo: number;
  };
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (!active) {
      setParticles([]);
      return;
    }
    const count = Math.floor(20 * intensity + 6);
    const next: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const r = Math.random();
      const kind: Particle['kind'] =
        r < 0.6 ? 'coin' : r < 0.78 ? 'gem-red' : r < 0.9 ? 'gem-blue' : 'gem-purple';
      next.push({
        id: i,
        kind,
        left: Math.random() * 100,
        delay: Math.random() * 0.8,
        duration: 1.6 + Math.random() * 1.2,
        size: 14 + Math.random() * 14,
        rotateFrom: -180 + Math.random() * 360,
        rotateTo: -180 + Math.random() * 360 + (Math.random() < 0.5 ? -360 : 360),
      });
    }
    setParticles(next);
  }, [active, intensity]);

  if (!active) return null;

  return (
    <div className="fixed inset-0 z-[125] pointer-events-none overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => (
          <motion.span
            key={p.id}
            initial={{
              y: -40,
              x: 0,
              opacity: 1,
              rotate: p.rotateFrom,
              scale: 0.4,
            }}
            animate={{
              y: '110vh',
              x: (Math.random() - 0.5) * 60,
              opacity: [1, 1, 1, 0],
              rotate: p.rotateTo,
              scale: [0.4, 1, 1, 0.9],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: [0.45, 0.1, 0.55, 1],
              times: [0, 0.15, 0.85, 1],
            }}
            style={{
              position: 'absolute',
              left: `${p.left}%`,
              top: 0,
              width: p.size,
              height: p.size,
              borderRadius: p.kind === 'coin' ? '50%' : '6px',
              transformOrigin: 'center',
              background:
                p.kind === 'coin'
                  ? 'radial-gradient(circle at 30% 28%, #fff5c4 0%, #ffd37a 30%, #c8932e 70%, #6a4410 100%)'
                  : p.kind === 'gem-red'
                    ? 'radial-gradient(circle at 30% 28%, #ffd1d6 0%, #ff5560 50%, #6a0a14 100%)'
                    : p.kind === 'gem-blue'
                      ? 'radial-gradient(circle at 30% 28%, #d1eaff 0%, #22d3ee 50%, #0a3a6a 100%)'
                      : 'radial-gradient(circle at 30% 28%, #f0d6ff 0%, #c77afa 50%, #3a106a 100%)',
              boxShadow:
                p.kind === 'coin'
                  ? '0 0 8px rgba(255,200,80,.55), inset 0 1px 0 rgba(255,255,255,.5)'
                  : '0 0 8px rgba(255,255,255,.4), inset 0 1px 0 rgba(255,255,255,.4)',
              transform: p.kind === 'coin' ? 'none' : 'rotate(45deg)',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
