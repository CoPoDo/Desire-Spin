import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields,
  AutoProgressDisplay,
  ManualAutoTabs,
  type AutoConfig,
  type Mode,
  useAutoBetRunner,
} from '../_shared/AutoBetController';
import { SYMBOLS, type BassResult, spin, symbolById } from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function BigBassGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reels, setReels] = useState<string[]>(['anchor', 'rod', 'blue', 'green', 'orange']);
  const [lastResult, setLastResult] = useState<BassResult | null>(null);
  const stateRef = useRef({ bet });
  stateRef.current = { bet };

  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b } = stateRef.current;
    if (balance.balance < b || b <= 0) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = spin(rng, b);

    // Reveal reels left-to-right with stagger
    setLastResult(null);
    for (let i = 0; i < 5; i++) {
      await new Promise<void>((res) => setTimeout(res, 230));
      setReels((prev) => {
        const next = [...prev];
        next[i] = r.reels[i]!;
        return next;
      });
      sound.play('drop');
    }
    // Settle / pay
    await new Promise<void>((res) => setTimeout(res, 220));
    setLastResult(r);
    if (r.payout > 0) {
      balance.credit(r.payout);
      sound.play(
        r.multiplier >= 100 ? 'mega-win' :
        r.multiplier >= 10 ? 'big-win' : 'win',
      );
      // Splash of "fishing" colours on a notable win
      if (r.multiplier >= 10) {
        fireConfetti({
          count: r.multiplier >= 100 ? 130 : 70,
          colors: ['#5fb8ff', '#22d3ee', '#1fff7a', '#ffd166', '#ffffff'],
        });
      }
    } else {
      sound.play('drop');
    }
    history.record({
      game: 'Big Bass',
      bet: b,
      payout: r.payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(b, r.payout, false);
    setBusy(false);
    return r.payout - b;
  }, [balance, fairness, history, session, sound]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 350,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  return (
    <OriginalPageLayout title="Big Bass">
      <div
        className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full"
      >
        {/* Reels — 5×1 grid with water-blue gradient backdrop */}
        <div
          className="rounded-2xl border border-edge p-3 sm:p-4"
          style={{
            background:
              'linear-gradient(180deg, #0a3a5e 0%, #062236 60%, #02101e 100%), radial-gradient(60% 100% at 50% 0%, rgba(95,184,255,.12), transparent 70%)',
            boxShadow:
              'inset 0 1px 0 rgba(95,184,255,.15), inset 0 -8px 18px rgba(0,0,0,.5), 0 6px 18px rgba(0,0,0,.4)',
          }}
        >
          <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
            {reels.map((s, i) => {
              const meta = symbolById(s);
              const inWin =
                lastResult?.lineSymbol &&
                i < (lastResult.lineLength) &&
                lastResult.lineSymbol === s;
              const isScatter = s === 'scatter';
              const scatterWin = isScatter && (lastResult?.scatterCount ?? 0) >= 3;
              const highlight = inWin || scatterWin;
              return (
                <motion.div
                  key={i}
                  className="aspect-[2/3] rounded-lg flex items-center justify-center select-none"
                  animate={
                    highlight
                      ? { scale: [1, 1.12, 1], rotate: [0, -3, 3, 0] }
                      : busy
                        ? { y: [0, -3, 0] }
                        : { scale: 1, rotate: 0, y: 0 }
                  }
                  transition={{
                    duration: highlight ? 0.7 : 0.32,
                    repeat: highlight ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                  style={{
                    background: highlight
                      ? `linear-gradient(180deg, ${meta?.color}30, rgba(0,0,0,.4))`
                      : 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(0,0,0,.45))',
                    border: highlight
                      ? `2px solid ${meta?.color}`
                      : '1px solid rgba(255,255,255,.08)',
                    boxShadow: highlight
                      ? `0 0 16px ${meta?.color}aa, inset 0 1px 0 rgba(255,255,255,.15)`
                      : 'inset 0 1px 0 rgba(255,255,255,.04)',
                  }}
                >
                  <span
                    className="text-3xl sm:text-4xl"
                    style={{
                      filter: highlight
                        ? `drop-shadow(0 0 10px ${meta?.color})`
                        : 'drop-shadow(0 2px 4px rgba(0,0,0,.6))',
                    }}
                  >
                    {meta?.emoji ?? s}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Outcome */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center min-h-[60px] flex flex-col items-center justify-center">
          {lastResult ? (
            <>
              {lastResult.lineSymbol ? (
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                  {lastResult.lineLength}× {symbolById(lastResult.lineSymbol)?.emoji} · line
                  {lastResult.scatterCount >= 3
                    ? ` + ${lastResult.scatterCount}× 🦞`
                    : ''}
                </div>
              ) : lastResult.scatterCount >= 3 ? (
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                  {lastResult.scatterCount}× scatter 🦞
                </div>
              ) : (
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                  No catch
                </div>
              )}
              <div
                className={`font-mono font-bold text-lg mt-0.5 tabular-nums ${
                  lastResult.multiplier >= 100
                    ? 'text-accent-gold'
                    : lastResult.multiplier >= 10
                      ? 'text-accent'
                      : lastResult.multiplier > 0
                        ? 'text-accent-cyan'
                        : 'text-ink-mute'
                }`}
              >
                {lastResult.multiplier > 0
                  ? `${fmtMultiplier(lastResult.multiplier)} = ${fmtCurrency(lastResult.payout)}`
                  : '— no win —'}
              </div>
            </>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              Cast & spin
            </div>
          )}
        </div>

        {/* Paytable summary */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">
            Top pays · 5-of-a-kind
          </div>
          <div className="grid grid-cols-5 gap-1">
            {SYMBOLS.filter((s) => !s.isScatter && s.pay && s.pay[5] >= 50).map((s) => (
              <div key={s.id} className="text-center">
                <div className="text-2xl">{s.emoji}</div>
                <div
                  className="text-[10px] font-mono font-bold tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.pay![5]}×
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Controls */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={() => void playOnce()}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Reeling…' : `Cast · ${fmtCurrency(bet)}`}
            </button>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < bet || bet <= 0)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] ${
                autoActive ? 'bg-accent-hot text-white' : 'bg-accent text-bg'
              }`}
            >
              {autoActive ? 'Stop Autobet' : 'Start Autobet'}
            </button>
          )}
        </div>
      </div>
    </OriginalPageLayout>
  );
}
