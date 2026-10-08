import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/** A feature cell always rolls onto its already-prepared outcome. The target
 * node stays mounted after the stop; there is no random-loop-to-result swap. */
export function FeatureReel({ target, fillers, durationMs, label }: {
  target: ReactNode;
  fillers: ReactNode[];
  durationMs: number;
  label: string;
}) {
  const reducedMotion = useReducedMotion();
  return (
    <motion.div
      className="bj-feature-reel-strip absolute inset-0 flex flex-col"
      initial={reducedMotion ? false : { y: `${-fillers.length * 100}%` }}
      animate={{ y: '0%' }}
      transition={{ duration: reducedMotion ? 0 : durationMs / 1000, ease: [0.16, 0.7, 0.26, 1] }}
      aria-label={label}
    >
      <div className="relative flex h-full w-full shrink-0 items-center justify-center" data-feature-landing="true">
        {target}
      </div>
      {fillers.map((filler, index) => (
        <div key={index} className="relative flex h-full w-full shrink-0 items-center justify-center" aria-hidden="true">
          {filler}
        </div>
      ))}
    </motion.div>
  );
}
