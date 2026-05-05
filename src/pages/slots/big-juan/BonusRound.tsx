import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createRng, type Rng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { useGame } from '../../../game-context';
import {
  type BonusCellKind,
  JACKPOTS,
  bonusCellValue,
  bonusInitialRespins,
  bonusRollOne,
  isFilled,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

/** Big Juan bonus respins mini-grid (3×3, Money-Train-style hold-and-win).
 *
 *  Flow:
 *    - Initial respin count derived from scatterCount (10/12/14)
 *    - Each round: empty cells re-roll via bonusRollOne()
 *    - If at least one cell newly fills: respins reset to max(current, 3)
 *    - If no new fill: respins -= 1
 *    - Round ends when respins === 0 OR all 9 cells filled
 *    - On end: total payout = bet × Σ(coin/jackpot values)
 */
export type BonusRoundProps = {
  bet: number;
  scatterCount: number;
  /** Seed material so the bonus is provably-fair from a single nonce. */
  seeds: { serverSeed: string; clientSeed: string; nonce: number };
  onClose: (totalPayoutMultiplier: number) => void;
};

const SIZE = 9; // 3×3 grid

export function BigJuanBonusRound({ bet, scatterCount, seeds, onClose }: BonusRoundProps) {
  const { sound } = useGame();
  const [grid, setGrid] = useState<BonusCellKind[]>(() => Array(SIZE).fill('empty') as BonusCellKind[]);
  const [respinsLeft, setRespinsLeft] = useState(() => bonusInitialRespins(scatterCount));
  const [totalMult, setTotalMult] = useState(0);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [recentlyLanded, setRecentlyLanded] = useState<Set<number>>(new Set());
  /** Empty-cell rolling phase — set true at the start of each roll and
   *  cleared once the new values are revealed. Drives the "?" flicker on
   *  empty cells so the player visibly sees them spinning before the
   *  result lands (matches real Pragmatic Hold-and-Spin). */
  const [rolling, setRolling] = useState(false);

  // Fiesta confetti shower fires once the bonus completes, scaled to
  // the size of the win. Real Pragmatic Big Juan ends the bonus with
  // a celebratory chip-shower; same here.
  useEffect(() => {
    if (!finished) return;
    const tier = totalMult >= 500 ? 'epic' : totalMult >= 100 ? 'big' : 'small';
    fireConfetti({
      count: tier === 'epic' ? 200 : tier === 'big' ? 130 : 80,
      colors: ['#ff5560', '#ffd166', '#1fff7a', '#5fb8ff', '#c042b8', '#ffae50', '#ffffff'],
    });
  }, [finished, totalMult]);

  // Single shared RNG for the whole bonus — all rolls draw from it sequentially
  // so the entire bonus is reproducible from the trigger nonce.
  const rngRef = useRef<Rng | null>(null);
  if (!rngRef.current) {
    rngRef.current = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
  }

  const roll = useCallback(() => {
    if (busy || finished) return;
    setBusy(true);
    setRolling(true);
    setRecentlyLanded(new Set()); // clear last-round highlights immediately
    // Roll-start cue: a click as the empty cells start cycling.
    sound.play('click');

    const rng = rngRef.current!;
    const newGrid = [...grid];
    const newlyLanded = new Set<number>();
    let extraRespins = 0;
    let valueGained = 0;
    let landedJackpot = false;
    for (let i = 0; i < SIZE; i++) {
      if (isFilled(newGrid[i]!)) continue;
      const rolled = bonusRollOne(rng);
      if (rolled !== 'empty') {
        newGrid[i] = rolled;
        newlyLanded.add(i);
        if (typeof rolled !== 'string' && rolled.kind === 'extra') {
          extraRespins += 1;
        } else {
          valueGained += bonusCellValue(rolled);
          // Jackpot symbols (mini/minor/major/grand) are bigger wins
          // than coin values; mark them for a louder cue on land.
          if (typeof rolled !== 'string' && rolled.kind === 'jackpot') {
            landedJackpot = true;
          }
        }
      }
    }

    // Reveal in two stages: first show the spinning ? for ~520ms, then
    // snap in the new values. Real Pragmatic Hold-and-Spin shows each
    // empty cell briefly cycling values before locking in.
    setTimeout(() => {
      setGrid(newGrid);
      setRecentlyLanded(newlyLanded);
      setRolling(false);
      setTotalMult((prev) => +(prev + valueGained).toFixed(2));
      // Land SFX — match the magnitude of what just hit. Jackpot cells
      // get a 'big-win' fanfare; multi-coin lands play 'win'; single
      // coin or extra-respin only plays 'coin'; nothing landed → drop.
      if (landedJackpot) {
        sound.play('big-win');
      } else if (newlyLanded.size > 1) {
        sound.play('win');
      } else if (newlyLanded.size === 1) {
        sound.play('coin');
      } else {
        sound.play('drop');
      }
      // Respin accounting
      let nextRespins = respinsLeft - 1 + extraRespins;
      const anyNewValueLanded = Array.from(newlyLanded).some((i) => {
        const c = newGrid[i]!;
        return c !== 'empty' && typeof c !== 'string' && c.kind !== 'extra';
      });
      if (anyNewValueLanded) {
        nextRespins = Math.max(nextRespins, 3);
      }
      setRespinsLeft(Math.max(0, nextRespins));

      // End conditions
      const allFilled = newGrid.every(isFilled);
      if (allFilled || nextRespins <= 0) {
        // Tier the bonus-end fanfare so a 5× collect feels different
        // from a 500×+ epic finish.
        setTimeout(() => {
          sound.play(
            totalMult + valueGained >= 100 ? 'mega-win' :
            totalMult + valueGained >= 20 ? 'big-win' : 'free-spins-end',
          );
          setFinished(true);
        }, 900);
      }
      setTimeout(() => setBusy(false), 480);
    }, 520);
  }, [busy, finished, grid, respinsLeft, totalMult, sound]);

  // Auto-roll if there are respins left (with breathing room between rounds)
  useEffect(() => {
    if (finished) return;
    if (busy) return;
    if (respinsLeft <= 0) return;
    // Real Pragmatic Hold-and-Spin pacing: ~1.1-1.3s between rolls so
    // each respin has a visible "spin and stop" moment (the empty cells
    // flicker with "?" markers via the rolling state below) rather than
    // popping back-to-back. Pacing matches Big Juan's bonus round in
    // the real game.
    const t = setTimeout(roll, 1150);
    return () => clearTimeout(t);
  }, [respinsLeft, busy, finished, roll]);

  const totalPayout = bet * totalMult;

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        background:
          'radial-gradient(80% 60% at 50% 38%, #c8102e 0%, #5a0810 50%, #14040a 90%, #02010a 100%)',
        backdropFilter: 'blur(4px)',
      }}
    >
      {/* Title */}
      <div
        className="font-display font-extrabold text-2xl mb-1 text-center"
        style={{
          background: 'linear-gradient(180deg, #ffd166 0%, #ff5560 80%)',
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.6)) drop-shadow(0 0 12px rgba(255,209,102,.5))',
        }}
      >
        BONUS ROUND
      </div>
      <div className="text-[10px] uppercase tracking-widest text-[#FFE0A8] mb-3">
        Hold &amp; Win · {scatterCount} 🎉 trigger
      </div>

      {/* Jackpots strip */}
      <div className="flex gap-1.5 mb-4">
        {(['mini', 'minor', 'major', 'grand'] as const).map((tier) => (
          <div
            key={tier}
            className="flex flex-col items-center px-2.5 py-1 rounded-lg border"
            style={{
              background:
                tier === 'grand'
                  ? 'linear-gradient(180deg, rgba(255,85,96,.3), rgba(0,0,0,.4))'
                  : tier === 'major'
                    ? 'linear-gradient(180deg, rgba(255,209,102,.25), rgba(0,0,0,.4))'
                    : 'rgba(0,0,0,.4)',
              borderColor:
                tier === 'grand'
                  ? '#ff5560'
                  : tier === 'major'
                    ? '#ffd166'
                    : 'rgba(255,209,102,.4)',
            }}
          >
            <span className="text-[8px] uppercase tracking-widest text-[#FFE0A8]">{tier}</span>
            <span
              className="font-mono font-bold text-xs tabular-nums"
              style={{ color: tier === 'grand' ? '#ff8a8a' : '#ffd166' }}
            >
              {JACKPOTS[tier]}×
            </span>
          </div>
        ))}
      </div>

      {/* 3×3 mini-grid */}
      <div
        className="rounded-2xl p-3"
        style={{
          background: 'linear-gradient(180deg, #2a0810 0%, #5a0810 50%, #14040a 100%)',
          border: '3px solid #c8932e',
          boxShadow: '0 0 0 1px rgba(255,209,102,.3), inset 0 1px 0 rgba(255,209,102,.4), 0 12px 30px rgba(0,0,0,.6)',
        }}
      >
        <div className="grid grid-cols-3 gap-1.5" style={{ width: 'min(280px, 80vw)' }}>
          {grid.map((cell, i) => {
            const justLanded = recentlyLanded.has(i);
            return (
              <BonusCell key={i} cell={cell} justLanded={justLanded} rolling={rolling} cellIdx={i} />
            );
          })}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex items-center gap-4 mt-4">
        <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-bg-card/80 border border-edge">
          <span className="text-[8px] uppercase tracking-widest text-ink-mute">Respins</span>
          <span className="font-mono font-bold text-lg text-[#ffd166] tabular-nums">{respinsLeft}</span>
        </div>
        <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-bg-card/80 border border-edge">
          <span className="text-[8px] uppercase tracking-widest text-ink-mute">Total</span>
          <span className="font-mono font-bold text-lg text-[#ffd166] tabular-nums">{fmtCurrency(totalPayout)}</span>
        </div>
        <div className="flex flex-col items-center px-3 py-1.5 rounded-xl bg-bg-card/80 border border-edge">
          <span className="text-[8px] uppercase tracking-widest text-ink-mute">Filled</span>
          <span className="font-mono font-bold text-lg text-ink tabular-nums">
            {grid.filter(isFilled).length}/9
          </span>
        </div>
      </div>

      {/* Finish overlay — fiesta celebration with Spanish flair.
       *  Real Pragmatic Big Juan rings out the bonus with mariachi
       *  music + a "¡VIVA!" celebration banner; we mirror that beat. */}
      <AnimatePresence>
        {finished && (
          <motion.div
            className="absolute inset-0 z-10 flex flex-col items-center justify-center p-4"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
            transition={{ duration: 0.4 }}
            style={{
              background:
                'radial-gradient(70% 50% at 50% 38%, rgba(255,209,102,.25), rgba(0,0,0,.78) 70%)',
            }}
          >
            <motion.div
              className="font-display font-extrabold text-2xl mb-1 tracking-widest"
              initial={{ scale: 0.4, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 280, damping: 14 }}
              style={{
                background: 'linear-gradient(180deg, #fff5c4 0%, #ffd166 50%, #ff5560 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 0 28px rgba(255,209,102,.95)) drop-shadow(0 0 48px rgba(255,85,96,.6)) drop-shadow(0 4px 8px rgba(0,0,0,.6))',
              }}
            >
              {totalMult >= 500 ? '¡VIVA BIG JUAN!' : totalMult >= 100 ? '¡FIESTA!' : '¡GRACIAS!'}
            </motion.div>
            <motion.div
              className="font-display font-extrabold text-lg mb-3 uppercase tracking-[0.3em]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={{
                color: '#FFE0A8',
                textShadow: '0 2px 6px rgba(0,0,0,.7)',
              }}
            >
              Bonus Complete
            </motion.div>
            <motion.div
              className="font-mono font-extrabold tabular-nums mb-6"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.35, type: 'spring', stiffness: 240, damping: 16 }}
              style={{
                fontSize: 'clamp(36px, 11vw, 64px)',
                color: '#ffd166',
                textShadow: '0 0 32px rgba(255,209,102,.95), 0 0 56px rgba(255,85,96,.6), 0 4px 8px rgba(0,0,0,.7)',
              }}
            >
              {fmtCurrency(totalPayout)}
            </motion.div>
            <motion.button
              onClick={() => onClose(totalMult)}
              className="px-8 py-3.5 rounded-2xl font-display font-extrabold text-base uppercase tracking-wider"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              style={{
                background: 'linear-gradient(180deg, #ffd166 0%, #c8932e 60%, #5a3a04 100%)',
                color: '#1a0a04',
                border: '2px solid #fff5c4',
                boxShadow: '0 0 28px rgba(255,209,102,.7), 0 4px 14px rgba(0,0,0,.55)',
              }}
            >
              Collect
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function BonusCell({
  cell,
  justLanded,
  rolling,
  cellIdx,
}: {
  cell: BonusCellKind;
  justLanded: boolean;
  rolling: boolean;
  cellIdx: number;
}) {
  const filled = isFilled(cell);
  const label = labelFor(cell);
  const color = colorFor(cell);
  // During the rolling phase, empty cells show a quick spin of "?"
  // markers so the player visibly sees them cycling. Each cell starts
  // its spin staggered by a few frames using cellIdx so the row of
  // cells doesn't flip in lockstep — matches Pragmatic Hold-and-Spin.
  const spinningEmpty = rolling && !filled;
  return (
    <motion.div
      className="aspect-square rounded-lg flex items-center justify-center font-mono font-bold text-sm select-none relative overflow-hidden"
      animate={
        justLanded
          ? { scale: [0.4, 1.15, 1], rotate: [0, -8, 0] }
          : { scale: 1 }
      }
      transition={{ duration: 0.5, ease: [0.34, 1.4, 0.5, 1] }}
      style={{
        background: filled
          ? `linear-gradient(180deg, ${color}30, rgba(0,0,0,.45))`
          : 'linear-gradient(180deg, rgba(255,255,255,.03), rgba(0,0,0,.45))',
        border: filled ? `2px solid ${color}` : '1.5px solid rgba(200,147,46,.25)',
        boxShadow: filled
          ? `0 0 14px ${color}aa, inset 0 1px 0 rgba(255,255,255,.15)`
          : 'inset 0 1px 0 rgba(255,255,255,.04)',
        color: filled ? '#fff5e0' : '#5a3a04',
        textShadow: filled ? '0 0 8px rgba(0,0,0,.6)' : 'none',
        // Filled (held) cells get a slow "locked" pulse so the player
        // can see at a glance which cells are saved. Real Hold-and-Spin
        // games highlight held cells with a subtle gold breathing glow.
        animation: filled && !justLanded ? 'bjBonusHeld 2.4s ease-in-out infinite' : undefined,
      }}
    >
      {spinningEmpty ? (
        <motion.span
          key={`spin-${cellIdx}`}
          className="text-2xl font-extrabold"
          style={{ color: '#ffd166', textShadow: '0 0 8px rgba(255,209,102,.85)' }}
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.85, 1.15, 0.85], rotate: [0, 360] }}
          transition={{
            duration: 0.32,
            repeat: Infinity,
            ease: 'linear',
            delay: (cellIdx % 3) * 0.05,
          }}
        >
          ?
        </motion.span>
      ) : (
        <span style={{ fontSize: filled ? '0.95rem' : '1.5rem' }}>{label}</span>
      )}
      {/* Just-landed flash — bright radial pulse fades out across 700ms */}
      {justLanded && filled && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0.95 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          style={{
            background: `radial-gradient(circle, ${color}aa 0%, ${color}55 35%, transparent 70%)`,
            mixBlendMode: 'screen',
          }}
        />
      )}
    </motion.div>
  );
}

function labelFor(cell: BonusCellKind): string {
  if (cell === 'empty') return '·';
  if (typeof cell === 'string') return '?';
  if (cell.kind === 'coin') return `${cell.value}×`;
  if (cell.kind === 'extra') return '+1';
  if (cell.kind === 'mini') return 'MINI';
  if (cell.kind === 'minor') return 'MINOR';
  if (cell.kind === 'major') return 'MAJOR';
  if (cell.kind === 'grand') return 'GRAND';
  return '';
}

function colorFor(cell: BonusCellKind): string {
  if (cell === 'empty') return '#5a3a04';
  if (typeof cell === 'string') return '#5a3a04';
  if (cell.kind === 'coin') return '#ffd166';
  if (cell.kind === 'extra') return '#1fff7a';
  if (cell.kind === 'mini') return '#5fb8ff';
  if (cell.kind === 'minor') return '#a78bfa';
  if (cell.kind === 'major') return '#ffae50';
  if (cell.kind === 'grand') return '#ff5560';
  return '#5a3a04';
}
