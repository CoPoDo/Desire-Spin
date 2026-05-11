import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
import { FREE_SPIN_AWARDS, SYMBOLS, type BassResult, spin, spinFreeRound, symbolById } from './engine';
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
  /** Free-spins state. Triggered by 3+ scatters on the main spin.
   *  Real Pragmatic Big Bass: 3 = 10 FS, 4 = 15, 5 = 20. During FS,
   *  bass symbols carry money values that the fisherman scatter
   *  COLLECTS when he appears — the iconic mechanic. */
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [freeSpinsWon, setFreeSpinsWon] = useState(0);
  const [showFsBanner, setShowFsBanner] = useState<{ count: number } | null>(null);
  const [showBuyConfirm, setShowBuyConfirm] = useState(false);
  const stateRef = useRef({ bet });
  stateRef.current = { bet };

  /** Buy-bonus cost — matches the typical 100× bet that real Pragmatic
   *  Big Bass Bonanza charges to skip directly into free spins with
   *  the medium (3-scatter / 10-spin) entry tier. */
  const BUY_BONUS_MULT = 100;
  const buyBonusCost = +(bet * BUY_BONUS_MULT).toFixed(2);

  /** Run one regular spin. Returns net delta. */
  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b } = stateRef.current;
    if (balance.balance < b || b <= 0) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = spin(rng, b);
    await revealReels(r);
    setLastResult(r);
    if (r.payout > 0) {
      balance.credit(r.payout);
      sound.play(r.multiplier >= 100 ? 'mega-win' : r.multiplier >= 10 ? 'big-win' : 'win');
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

    // 3+ scatters → free spins!
    if (r.scatterCount >= 3) {
      const award = FREE_SPIN_AWARDS[r.scatterCount] ?? 10;
      setShowFsBanner({ count: award });
      sound.play('free-spins-trigger');
      // Pause on the banner so the player reads it
      await new Promise<void>((res) => setTimeout(res, 2000));
      setShowFsBanner(null);
      // Run free spins
      const totalFsWin = await runFreeSpins(award, b);
      setBusy(false);
      return r.payout - b + totalFsWin;
    }
    setBusy(false);
    return r.payout - b;
  }, [balance, fairness, history, session, sound]);

  /** Buy directly into a 10-spin free-spins round (matches the medium
   *  scatter entry tier in the real game). Costs 100× bet, no main spin. */
  const buyFreeSpins = useCallback(async () => {
    const b = stateRef.current.bet;
    const cost = +(b * BUY_BONUS_MULT).toFixed(2);
    if (busy || balance.balance < cost) return;
    setShowBuyConfirm(false);
    setBusy(true);
    sound.play('click');
    balance.debit(cost);
    history.record({
      game: 'Big Bass · Buy FS',
      bet: cost,
      payout: 0, // recorded again per-FS-spin below
      multiplier: 0,
      serverSeedHash: fairness.hash,
      clientSeed: '',
      nonce: 0,
    });
    session.recordSpin(cost, 0, false);
    // Show the trigger banner before launching FS
    setShowFsBanner({ count: 10 });
    sound.play('free-spins-trigger');
    await new Promise<void>((res) => setTimeout(res, 2000));
    setShowFsBanner(null);
    await runFreeSpins(10, b);
    setBusy(false);
  }, [busy, balance, sound, history, fairness, session]);
  // runFreeSpins is hoisted via useCallback below; mutual-ref needs to be
  // declared before this function in the file. (Order matters with
  // TypeScript strict mode — see Blackjack.) The runFreeSpins ref is set
  // by useEffect below to allow buyFreeSpins to call it without circular
  // declaration issues.

  /** Animate revealing 5 reels left-to-right with a stagger. */
  const revealReels = useCallback(async (r: BassResult) => {
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
    await new Promise<void>((res) => setTimeout(res, 220));
  }, [sound]);

  /** Run N free spins. Each spin doesn't debit the bet. Money values
   *  accumulate. Returns total money won across all FS. */
  const runFreeSpins = useCallback(async (count: number, b: number): Promise<number> => {
    let totalWin = 0;
    let remaining = count;
    setFreeSpinsRemaining(remaining);
    setFreeSpinsWon(0);
    while (remaining > 0) {
      // Brief pause between spins
      await new Promise<void>((res) => setTimeout(res, 350));
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const r = spinFreeRound(rng, b);
      await revealReels(r);
      setLastResult(r);
      remaining -= 1;
      setFreeSpinsRemaining(remaining);
      if (r.payout > 0) {
        balance.credit(r.payout);
        totalWin += r.payout;
        setFreeSpinsWon((w) => +(w + r.payout).toFixed(2));
        // Collector beat — when fisherman collected money this spin,
        // play a more dramatic SFX and a quick particle splash.
        if (r.collectedMultiplier > 0) {
          sound.play('mega-win');
          fireConfetti({
            count: 90,
            colors: ['#5fb8ff', '#ffd166', '#22d3ee', '#ffffff'],
          });
        } else if (r.multiplier >= 10) {
          sound.play('big-win');
        } else {
          sound.play('win');
        }
      } else {
        sound.play('drop');
      }
      // Retrigger: 3+ scatters during FS add the same award
      if (r.scatterCount >= 3) {
        const extra = FREE_SPIN_AWARDS[r.scatterCount] ?? 10;
        remaining += extra;
        setFreeSpinsRemaining(remaining);
        setShowFsBanner({ count: extra });
        sound.play('free-spins-trigger');
        await new Promise<void>((res) => setTimeout(res, 1500));
        setShowFsBanner(null);
      }
      history.record({
        game: 'Big Bass FS',
        bet: 0, // free spin
        payout: r.payout,
        multiplier: r.multiplier,
        serverSeedHash: fairness.hash,
        clientSeed: seeds.clientSeed,
        nonce: seeds.nonce,
      });
      session.recordSpin(0, r.payout, true);
    }
    // FS complete — outro celebration if won big
    if (totalWin > b * 20) {
      fireConfetti({
        count: 200,
        colors: ['#5fb8ff', '#ffd166', '#22d3ee', '#1fff7a', '#ffffff'],
      });
      sound.play('mega-win');
    }
    setFreeSpinsRemaining(0);
    return totalWin;
  }, [balance, fairness, history, session, sound, revealReels]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 350,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  const inFs = freeSpinsRemaining > 0;

  return (
    <OriginalPageLayout title="Big Bass">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Buy Free Spins confirmation dialog */}
        <AnimatePresence>
          {showBuyConfirm && (
            <>
              <motion.button
                aria-label="Cancel buy bonus"
                onClick={() => setShowBuyConfirm(false)}
                className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
              <motion.div
                role="dialog"
                aria-modal="true"
                className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-[145] max-w-sm mx-auto rounded-3xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto p-5"
                style={{
                  background:
                    'radial-gradient(ellipse at 50% 0%, rgba(95,184,255,.4), rgba(15,40,70,.96) 70%), linear-gradient(180deg, rgba(95,184,255,.2) 0%, rgba(8,20,40,.95) 60%, rgba(4,12,24,1) 100%)',
                  border: '2px solid #ffd166',
                  boxShadow: 'inset 0 1px 0 rgba(255,209,102,.55), 0 0 60px rgba(95,184,255,.4), 0 24px 80px rgba(0,0,0,.7)',
                }}
                initial={{ opacity: 0, scale: 0.7, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              >
                <div
                  className="font-serif italic font-bold text-center mb-1"
                  style={{
                    fontSize: 'clamp(22px, 6vw, 32px)',
                    background: 'linear-gradient(180deg, #ffffff 0%, #fff5dc 30%, #ffd166 65%, rgba(0,0,0,.55) 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                    filter: 'drop-shadow(0 0 18px rgba(255,209,102,.7)) drop-shadow(0 4px 6px rgba(0,0,0,.6))',
                  }}
                >
                  Buy Free Spins
                </div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-center mb-4" style={{ color: '#fff5dc' }}>
                  Skip the wait. Enter the bonus.
                </div>
                <div className="rounded-xl bg-black/40 border border-[#ffd166]/40 p-4 mb-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-dim uppercase tracking-wider">You Get</span>
                    <span className="font-serif italic font-bold text-2xl text-[#ffd166]" style={{ textShadow: '0 0 12px rgba(255,209,102,.7)' }}>
                      10 Free Spins
                    </span>
                  </div>
                  <div className="border-t border-[#ffd166]/20" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ink-dim uppercase tracking-wider">Cost</span>
                    <span className="font-mono font-bold text-2xl text-ink">{fmtCurrency(buyBonusCost)}</span>
                  </div>
                  <div className="text-[10px] text-ink-mute">
                    {BUY_BONUS_MULT}× your current bet ({fmtCurrency(bet)})
                  </div>
                </div>
                <p className="text-[11px] text-ink-mute mb-4 leading-relaxed">
                  Free spins feature money symbols collected by the fisherman 🦞.
                  Big variance — average return ≈ {fmtCurrency(buyBonusCost * 0.95)}.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBuyConfirm(false)}
                    className="flex-1 py-3 rounded-xl bg-bg-hover border border-edge text-ink-dim font-semibold transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={balance.balance < buyBonusCost}
                    onClick={() => void buyFreeSpins()}
                    className="flex-1 py-3 rounded-xl font-bold disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(180deg, #ffd166 0%, #c89832 60%, #6a4410 100%)',
                      color: '#0a1018',
                      border: '1.5px solid #fff5c4',
                      boxShadow: '0 0 14px rgba(255,209,102,.5), inset 0 1px 0 rgba(255,255,255,.25)',
                      textShadow: '0 1px 0 rgba(255,255,255,.4)',
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Free-spins banner (overlay during trigger / retrigger) */}
        <AnimatePresence>
          {showFsBanner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: 'spring', stiffness: 240, damping: 18 }}
              className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
            >
              <div
                className="px-6 py-4 rounded-2xl text-center"
                style={{
                  background: 'radial-gradient(ellipse at center, rgba(95,184,255,.95), rgba(10,58,94,.95))',
                  border: '2px solid #ffd166',
                  boxShadow: '0 0 48px rgba(255,209,102,.7), 0 16px 32px rgba(0,0,0,.6)',
                }}
              >
                <div className="text-[10px] uppercase tracking-[0.4em] text-[#fff5dc] mb-1">
                  Free Spins
                </div>
                <div
                  className="font-display font-extrabold text-5xl text-white"
                  style={{ textShadow: '0 0 24px rgba(255,209,102,.9), 0 4px 8px rgba(0,0,0,.6)' }}
                >
                  +{showFsBanner.count}
                </div>
                <div className="text-xs text-[#fff5dc] mt-1">🦞 Fisherman triggered</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FS counter (shown while FS active) */}
        {inFs && (
          <div
            className="rounded-xl border p-3 flex items-center justify-between"
            style={{
              background: 'linear-gradient(180deg, rgba(95,184,255,.18), rgba(10,58,94,.4))',
              borderColor: 'rgba(255,209,102,.5)',
              boxShadow: '0 0 18px rgba(255,209,102,.25), inset 0 1px 0 rgba(255,255,255,.08)',
            }}
          >
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#fff5dc]">Free Spins</div>
              <div className="font-mono font-bold text-2xl text-[#ffd166] tabular-nums leading-none mt-0.5">
                {freeSpinsRemaining}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-widest text-[#fff5dc]">FS Won</div>
              <div className="font-mono font-bold text-lg text-accent tabular-nums leading-none mt-0.5">
                {fmtCurrency(freeSpinsWon)}
              </div>
            </div>
          </div>
        )}

        {/* Reels */}
        <div
          className="rounded-2xl border border-edge p-3 sm:p-4 relative"
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
              const inWin = !!lastResult?.winningPositions?.includes(i);
              const isScatter = s === 'scatter';
              const scatterWin = isScatter && (lastResult?.scatterCount ?? 0) >= 3;
              const highlight = inWin || scatterWin;
              const moneyValue = lastResult?.moneyValues?.[i] ?? 0;
              return (
                <motion.div
                  key={i}
                  className="aspect-[2/3] rounded-lg flex items-center justify-center select-none relative"
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
                  {/* Money-value badge on bass symbols during FS */}
                  {moneyValue > 0 && (
                    <motion.span
                      className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold tabular-nums"
                      initial={{ scale: 0, y: 4 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: 'spring', stiffness: 360, damping: 18 }}
                      style={{
                        background: 'linear-gradient(180deg, #ffd166, #c8932e)',
                        color: '#0a1018',
                        boxShadow: '0 0 10px rgba(255,209,102,.7), 0 2px 4px rgba(0,0,0,.5)',
                        border: '1px solid #fff5c4',
                      }}
                    >
                      {moneyValue}×
                    </motion.span>
                  )}
                </motion.div>
              );
            })}
          </div>
          {/* "COLLECT!" overlay when fisherman snags money on a FS round */}
          <AnimatePresence>
            {lastResult && lastResult.collectedMultiplier > 0 && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 0] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.4, times: [0, 0.15, 0.7, 1] }}
              >
                <div
                  className="font-display font-extrabold text-3xl px-4 py-2 rounded-xl"
                  style={{
                    color: '#fff',
                    background: 'rgba(255,209,102,.35)',
                    border: '2px solid #ffd166',
                    textShadow: '0 0 16px rgba(255,209,102,.95), 0 2px 6px rgba(0,0,0,.7)',
                    boxShadow: '0 0 24px rgba(255,209,102,.65)',
                  }}
                >
                  COLLECT · +{lastResult.collectedMultiplier}×
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
                  {lastResult.collectedMultiplier > 0 ? ` · COLLECT +${lastResult.collectedMultiplier}×` : ''}
                </div>
              ) : lastResult.scatterCount >= 3 ? (
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                  {lastResult.scatterCount}× scatter 🦞
                  {lastResult.collectedMultiplier > 0 ? ` · COLLECT +${lastResult.collectedMultiplier}×` : ''}
                </div>
              ) : lastResult.collectedMultiplier > 0 ? (
                <div className="text-[10px] uppercase tracking-widest text-ink-mute">
                  Fisherman snagged +{lastResult.collectedMultiplier}×
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
              Cast & spin · 3+ 🦞 triggers free spins
            </div>
          )}
        </div>

        {/* Paytable summary */}
        <div className="rounded-xl bg-bg-card border border-edge p-2">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5 px-1">
            Top pays · 5-of-a-kind · 3+ 🦞 = free spins
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
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy || inFs} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy || inFs} />
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <>
              <button
                onClick={() => void playOnce()}
                disabled={busy || inFs || balance.balance < bet || bet <= 0}
                className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
              >
                {inFs ? 'Free spins running…' : busy ? 'Reeling…' : `Cast · ${fmtCurrency(bet)}`}
              </button>
              {/* Buy Free Spins — pay 100× bet to skip directly into the
                  10-FS round. Real Pragmatic Big Bass Bonanza ships this
                  shortcut. Confirmation modal to prevent accidental
                  hundred-stake fat-finger taps. */}
              <button
                onClick={() => setShowBuyConfirm(true)}
                disabled={busy || inFs || balance.balance < buyBonusCost}
                className="w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
                style={{
                  background: 'linear-gradient(180deg, #ffd166 0%, #c89832 60%, #6a4410 100%)',
                  color: '#0a1018',
                  border: '1px solid #fff5c4',
                  boxShadow: '0 0 14px rgba(255,209,102,.4)',
                }}
              >
                Buy Free Spins · {fmtCurrency(buyBonusCost)}
              </button>
            </>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < bet || bet <= 0 || inFs)}
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
