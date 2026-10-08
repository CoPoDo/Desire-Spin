import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';

/** The outcome is the tail of the moving reel itself. Nothing substitutes
 * the symbols after the reel stops. Percentage travel follows cell geometry
 * at every responsive width, without measuring or replacing the board. */
export function ReelStrip({ symbols, pool, roundId, reel, duration, renderSymbol }: {
  symbols: readonly string[];
  pool: readonly string[];
  roundId: number;
  reel: number;
  duration: number;
  renderSymbol: (symbol: string, resultRow: number | null) => ReactNode;
}) {
  const previous = useRef<readonly string[]>(symbols);
  const strip = useMemo(() => {
    if (!roundId) return { symbols: [...symbols], landing: 0 };
    const fillers = Array.from({ length: 12 + reel * 3 }, (_, index) =>
      pool[(roundId * 7 + reel * 11 + index * 3) % pool.length] ?? pool[0]!);
    const start = [...previous.current, ...fillers];
    return { symbols: [...start, ...symbols], landing: start.length };
    // A visual strip is immutable for the entire round. Settlement highlights
    // must not reconstruct it while it is coming to a stop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId, reel]);
  useEffect(() => { previous.current = [...symbols]; }, [roundId, symbols]);

  return (
    <div className="relative overflow-hidden rounded-lg bg-black/25" style={{ aspectRatio: `1 / ${symbols.length}` }}
      role="img" aria-label={`Reel ${reel + 1}: ${symbols.join(', ')}`} data-reel-outcome={symbols.join(',')}>
      <motion.div key={roundId} initial={{ y: 0 }}
        animate={{ y: `${-100 * strip.landing / strip.symbols.length}%` }}
        transition={{ duration: roundId ? duration : 0, ease: [0.12, 0.62, 0.14, 1] }}>
        {strip.symbols.map((symbol, index) => (
          <div key={`${roundId}-${index}`} className="aspect-square p-0.5">
            {renderSymbol(symbol, index >= strip.landing ? index - strip.landing : null)}
          </div>
        ))}
      </motion.div>
      <div className="absolute inset-0 pointer-events-none rounded-lg shadow-[inset_0_10px_12px_-10px_rgba(0,0,0,.8),inset_0_-10px_12px_-10px_rgba(0,0,0,.8)]" />
    </div>
  );
}
