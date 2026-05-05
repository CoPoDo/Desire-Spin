import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  type Zone,
  ZONES,
  ZONE_LABELS,
  play,
  zonePayoutMultiplier,
} from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'shot' | 'reveal';

// Zone positions inside the goal frame, as % from left/top of the goal.
const ZONE_POS: Record<Zone, { x: number; y: number }> = {
  'top-left':  { x: 18, y: 22 },
  'top-right': { x: 82, y: 22 },
  'center':    { x: 50, y: 38 },
  'bot-left':  { x: 22, y: 70 },
  'bot-right': { x: 78, y: 70 },
};

export function PenaltyGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [zone, setZone] = useState<Zone>('center');
  const [phase, setPhase] = useState<Phase>('idle');
  const [keeperZone, setKeeperZone] = useState<Zone | null>(null);
  const [goal, setGoal] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);
  const [busy, setBusy] = useState(false);

  const start = useCallback(() => {
    if (busy) return;
    if (balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    setPhase('shot');
    setKeeperZone(null);
    setGoal(null);
    setPayout(0);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, bet, zone);
    // Ball travels for ~700ms; keeper dives in parallel (~600ms).
    setTimeout(() => {
      setKeeperZone(r.keeper);
    }, 250);
    setTimeout(() => {
      setGoal(r.goal);
      setPayout(r.payout);
      setPhase('reveal');
      if (r.goal) {
        balance.credit(r.payout);
        // Tier SFX with the goal-zone multiplier — corner risk shots
        // can hit ≥10× while wide-zone shots pay ~1.5×; flat 'big-win'
        // sounded the same for both.
        sound.play(r.multiplier >= 10 ? 'mega-win' : r.multiplier >= 4 ? 'big-win' : 'win');
        fireConfetti({
          count: r.multiplier >= 6 ? 130 : 80,
          colors: ['#1fff7a', '#ffffff', '#ffd166'],
        });
      } else {
        sound.play('drop');
      }
      history.record({
        game: 'Penalty',
        bet,
        payout: r.payout,
        multiplier: r.multiplier,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(bet, r.payout, false);
      setBusy(false);
    }, 800);
  }, [busy, bet, balance, zone, fairness, sound, history, session]);

  const reset = useCallback(() => {
    setPhase('idle');
    setKeeperZone(null);
    setGoal(null);
    setPayout(0);
  }, []);

  const profitOnWin = +(bet * zonePayoutMultiplier(zone) - bet).toFixed(2);
  const ballPos = phase === 'idle' ? { x: 50, y: 95 } : ZONE_POS[zone];
  const keeperPos = keeperZone ? ZONE_POS[keeperZone] : { x: 50, y: 50 };

  return (
    <OriginalPageLayout title="Penalty Shootout">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {phase === 'idle' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Pick a zone · {zonePayoutMultiplier(zone)}× on goal
            </div>
          )}
          {phase === 'shot' && (
            <div className="text-[10px] uppercase tracking-widest text-ink-dim">Shooting…</div>
          )}
          {phase === 'reveal' && goal !== null && (
            <div
              className={`font-mono font-bold text-lg ${
                goal ? 'text-accent' : 'text-accent-hot'
              }`}
            >
              {goal
                ? `GOAL · +${fmtCurrency(payout - bet)}`
                : `Saved · -${fmtCurrency(bet)}`}
            </div>
          )}
        </div>

        {/* Goal frame — pitch shakes when a goal scores so the net
         *  ripple + crowd-cheer feel lands kinetically. */}
        <div
          className={`rounded-2xl bg-bg-card border border-edge p-3 overflow-hidden ${phase === 'reveal' && goal === true ? 'shake-medium' : ''}`}
        >
          <div
            className="relative w-full"
            style={{
              aspectRatio: '5 / 3',
              background:
                'linear-gradient(180deg, #4a8a4a 0%, #2a6630 70%, #1a4a20 100%)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            {/* Pitch lines (top of goal area) */}
            <div
              className="absolute inset-x-0 bottom-0 pointer-events-none"
              style={{
                height: '40%',
                background:
                  'repeating-linear-gradient(90deg, transparent 0 8px, rgba(255,255,255,.04) 8px 12px)',
              }}
            />
            {/* Goal frame */}
            <div
              className="absolute"
              style={{
                left: '8%',
                right: '8%',
                top: '8%',
                height: '70%',
                border: '4px solid #f5f5f0',
                borderBottom: 'none',
                borderRadius: '4px 4px 0 0',
                boxShadow: '0 4px 12px rgba(0,0,0,.4)',
                background: 'linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.6))',
              }}
            >
              {/* Net pattern */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  backgroundImage: `
                    repeating-linear-gradient(0deg, rgba(255,255,255,.18) 0 1px, transparent 1px 14px),
                    repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 14px)
                  `,
                  opacity: 0.6,
                }}
              />
              {/* Net-ripple — radial pulse centered on the goal-zone the
               *  ball hit. Real penalty kicks visibly bulge the back of
               *  the net on impact; without this the goal felt silent. */}
              <AnimatePresence>
                {phase === 'reveal' && goal === true && (
                  <motion.div
                    key="net-ripple"
                    className="absolute pointer-events-none rounded-full"
                    style={{
                      left: `${ZONE_POS[zone].x}%`,
                      top: `${ZONE_POS[zone].y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: '40%',
                      aspectRatio: '1 / 1',
                      background:
                        'radial-gradient(circle, rgba(255,255,255,.55) 0%, rgba(255,255,255,.18) 35%, transparent 70%)',
                      mixBlendMode: 'screen',
                    }}
                    initial={{ scale: 0.3, opacity: 0 }}
                    animate={{ scale: [0.3, 1.4, 1.0], opacity: [0, 0.95, 0] }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.55, times: [0, 0.35, 1] }}
                  />
                )}
              </AnimatePresence>
              {/* Zone targets — clickable in idle phase */}
              {ZONES.map((z) => {
                const pos = ZONE_POS[z];
                const isPicked = zone === z;
                const mult = zonePayoutMultiplier(z);
                return (
                  <button
                    key={z}
                    onClick={() => phase === 'idle' && setZone(z)}
                    disabled={phase !== 'idle'}
                    className="absolute -translate-x-1/2 -translate-y-1/2 rounded-lg flex flex-col items-center justify-center transition active:scale-95"
                    style={{
                      left: `${pos.x}%`,
                      top: `${pos.y}%`,
                      width: '20%',
                      aspectRatio: '1 / 1',
                      background: isPicked
                        ? 'rgba(31, 255, 122, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: isPicked
                        ? '2px solid rgba(31, 255, 122, .9)'
                        : '1.5px solid rgba(255,255,255,.18)',
                      boxShadow: isPicked
                        ? '0 0 18px rgba(31,255,122,.55)'
                        : 'none',
                      pointerEvents: phase === 'idle' ? 'auto' : 'none',
                    }}
                  >
                    <span
                      className="text-[9px] font-bold uppercase tracking-wider text-white/85"
                    >
                      {ZONE_LABELS[z]}
                    </span>
                    <span
                      className="text-[10px] font-mono font-bold tabular-nums"
                      style={{ color: isPicked ? '#1fff7a' : '#ffe9a8' }}
                    >
                      {mult}×
                    </span>
                  </button>
                );
              })}
              {/* Keeper */}
              <motion.div
                className="absolute pointer-events-none text-3xl select-none"
                style={{ left: '50%', top: '50%', x: '-50%', y: '-50%' }}
                animate={{
                  left: `${keeperPos.x}%`,
                  top: `${keeperPos.y}%`,
                }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                🧤
              </motion.div>
            </div>
            {/* Ball */}
            <motion.div
              className="absolute pointer-events-none text-2xl select-none"
              initial={false}
              animate={{
                left: `${ballPos.x}%`,
                top:
                  phase === 'idle'
                    ? '95%'
                    : phase === 'shot'
                      ? `${ballPos.y * 0.78 + 8}%`
                      : `${ballPos.y * 0.78 + 8}%`,
              }}
              style={{ transform: 'translate(-50%, -50%)' }}
              transition={{ duration: 0.7, ease: [0.34, 0.6, 0.35, 1] }}
            >
              ⚽
            </motion.div>
          </div>
        </div>

        {/* Controls */}
        {phase !== 'shot' ? (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
            <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
            <div className="flex justify-between text-xs">
              <span className="text-ink-mute">Profit on Goal</span>
              <span className="font-mono font-semibold text-accent tabular-nums">
                {fmtCurrency(profitOnWin)}
              </span>
            </div>
            <button
              onClick={phase === 'reveal' ? () => { reset(); start(); } : start}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {phase === 'reveal' ? 'Shoot Again' : `Shoot · ${fmtCurrency(bet)}`}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl bg-bg-card border border-edge p-4 text-center text-xs text-ink-dim">
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
              >
                Ball flying toward the {ZONE_LABELS[zone]} corner…
              </motion.div>
            </AnimatePresence>
          </div>
        )}
      </div>
    </OriginalPageLayout>
  );
}
