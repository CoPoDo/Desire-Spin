import { useRoundPlayback } from '../_shared/useRoundPlayback';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields, AutoProgressDisplay, ManualAutoTabs,
  type AutoConfig, type Mode, useAutoBetRunner,
} from '../_shared/AutoBetController';
import { playRound, slideStake, slideReturnFor, winChanceFor, SLIDE_MAX_BETS, SLIDE_MAX_TARGET, type SlideRound, type SlideWager } from './engine';
import { fireConfetti } from '../../../lib/confetti';

type Phase = 'idle' | 'sliding' | 'reveal';
const fmtMultiplier = (value: number) => `${fmtCurrency(value)}×`;
const copyBets = (bets: readonly SlideWager[]) => bets.map(({ amount, target }) => ({ amount, target }));

export function SlideGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [wagers, setWagers] = useState<SlideWager[]>([{ amount: 1, target: 2 }]);
  const [lastBets, setLastBets] = useState<SlideWager[] | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const autoRef = useRef(false);
  const { busy, busyRef, setBusy, mounted } = useRoundPlayback();
  const [result, setResult] = useState<SlideRound | null>(null);
  const [error, setError] = useState('');
  const [recent, setRecent] = useState<{ id: number; stop: number; net: number }[]>([]);
  const [liveValue, setLiveValue] = useState(1);
  const animRef = useRef<number | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const finishRef = useRef<((reveal: boolean, effects?: boolean) => void) | null>(null);
  const wagersRef = useRef(wagers);
  const recentId = useRef(0);

  // Update the authoritative draft immediately, even before React re-renders.
  const editBets = (update: (previous: SlideWager[]) => SlideWager[]) => {
    if (busyRef.current || autoRef.current) return;
    const next = update(wagersRef.current);
    wagersRef.current = next;
    setWagers(next);
    setError('');
  };
  const editBet = (index: number, value: Partial<SlideWager>) => editBets(previous =>
    previous.map((wager, i) => i === index ? { ...wager, ...value } : wager));
  const stopAuto = useCallback(() => { autoRef.current = false; setAutoActive(false); }, []);

  const playOnce = useCallback(async (): Promise<number | null> => {
    if (!mounted.current || busyRef.current) return null;
    const bets = copyBets(wagersRef.current);
    const stake = slideStake(bets);
    if (stake === null || !balance.canAfford(stake)) return null;
    setBusy(true);
    if (!balance.debit(stake)) { setBusy(false); return null; }

    // All targets share one draw and nonce. The entire accepted round is
    // accounted for before cosmetic playback; skipping/leaving cannot pay twice.
    let round: SlideRound;
    let seeds: ReturnType<typeof fairness.consumeNonce>;
    try {
      seeds = fairness.consumeNonce();
      round = playRound(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), bets);
    } catch {
      balance.credit(stake);
      setBusy(false);
      setError('The round could not start. Your credits were returned.');
      return null;
    }
    if (round.payout > 0 && balance.credit(round.payout) === false) {
      balance.credit(stake);
      setBusy(false);
      setError('The payout could not be recorded. Your wager was returned.');
      return null;
    }
    history.record({
      game: 'Slide', bet: stake, payout: round.payout, multiplier: round.multiplier,
      serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce,
    });
    session.recordSpin(stake, round.payout, false);
    setLastBets(bets);
    setError('');
    setPhase('sliding');
    setResult(null);
    setLiveValue(1);
    sound.play('click');
    visualRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });

    const duration = Math.min(2500, 350 + Math.log10(round.stop) * 700);
    const start = performance.now();
    const milestones = [1.5, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
    let lastMilestone = 0;
    return new Promise<number | null>(resolve => {
      let finished = false;
      const finish = (reveal: boolean, effects = false) => {
        if (finished) return;
        finished = true;
        if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        animRef.current = null;
        finishRef.current = null;
        if (reveal && mounted.current) {
          setLiveValue(round.stop);
          setResult(round);
          setPhase('reveal');
          const id = ++recentId.current;
          setRecent(previous => [{ id, stop: round.stop, net: round.net }, ...previous].slice(0, 12));
          if (effects) {
            if (round.net > 0) {
              sound.play(round.multiplier >= 50 ? 'mega-win' : round.multiplier >= 5 ? 'big-win' : 'win');
              if (round.multiplier >= 5) fireConfetti({ count: round.multiplier >= 50 ? 130 : 70, colors: ['#00e701', '#ffd166', '#ffffff'] });
            } else sound.play(round.net < 0 ? 'drop' : 'coin');
          }
        }
        setBusy(false);
        resolve(round.net);
      };
      finishRef.current = finish;
      const tick = (now: number) => {
        if (finished || !mounted.current) return;
        const progress = Math.max(0, Math.min(1, (now - start) / duration));
        const value = 1 + (round.stop - 1) * (1 - Math.pow(1 - progress, 2.2));
        setLiveValue(+value.toFixed(2));
        while (lastMilestone < milestones.length && value >= milestones[lastMilestone]!) {
          sound.play(lastMilestone >= 7 ? 'big-win' : lastMilestone >= 4 ? 'win' : 'coin');
          lastMilestone++;
        }
        if (progress < 1) animRef.current = requestAnimationFrame(tick);
        else finish(true, true);
      };
      animRef.current = requestAnimationFrame(tick);
    });
  }, [balance, fairness, sound, history, session, busyRef, mounted, setBusy]);

  useEffect(() => {
    const pause = () => { stopAuto(); finishRef.current?.(true); };
    const onVisibility = () => { if (document.visibilityState === 'hidden') pause(); };
    window.addEventListener('pagehide', pause);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', pause);
      document.removeEventListener('visibilitychange', onVisibility);
      // Resolve the awaited cosmetic work as well as cancelling its frame.
      finishRef.current?.(false);
    };
  }, [stopAuto]);

  const progress = useAutoBetRunner({ active: autoActive, config: autoConfig, intervalMs: 350, runOnce: playOnce, onStop: stopAuto });
  useHotkey(' ', () => { if (mode === 'manual' && !autoRef.current) void playOnce(); }, !autoActive);

  const stake = slideStake(wagers);
  const locked = busy || autoActive;
  const shownBets = result?.bets ?? wagers;
  const displayMax = Math.max(...shownBets.map(bet => Number.isFinite(bet.target) ? bet.target * 1.5 : 4), liveValue * 1.1, 4);
  // A logarithmic scale keeps lower targets visible alongside high ones.
  const position = (value: number) => Math.max(0, Math.min(1, Math.log(Math.max(1, value)) / Math.log(displayMax)));
  const sliderProgress = position(liveValue);
  const winningBets = result?.bets.filter(bet => bet.win).length ?? 0;

  return (
    <OriginalPageLayout title="Slide">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        <p className="text-xs leading-relaxed text-stake-muted">Play-money · Local single-player round. Every target shares the same stop.</p>
        <div ref={visualRef} className="rounded-lg bg-stake-card border border-stake-border p-5 flex flex-col items-center justify-center min-h-[140px]">
          <motion.div
            className={`font-mono font-extrabold tabular-nums leading-none ${result && result.net < 0 ? 'text-stake-red' : result && result.net > 0 ? 'text-stake-green' : 'text-stake-text'}`}
            style={{ fontSize: liveValue >= 10_000 ? 'clamp(1.75rem, 7vw, 3rem)' : 'clamp(2.5rem, 12vw, 4.5rem)' }}
            animate={phase === 'reveal' ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ duration: 0.45 }}
          >{fmtMultiplier(phase === 'idle' ? 1 : liveValue)}</motion.div>
          <div role="status" className="text-xs text-center text-stake-muted mt-3 leading-relaxed">
            {phase === 'idle' && 'Set your targets, then start one round'}
            {phase === 'sliding' && 'Sliding…'}
            {result && <><span>{winningBets} of {result.bets.length} targets won · Returned {fmtCurrency(result.payout)}</span><br /><span>Net {result.net > 0 ? '+' : ''}{fmtCurrency(result.net)} credits</span></>}
          </div>
          {(busy || autoActive) && <div className="flex flex-wrap justify-center gap-2 mt-3">
            {busy && <button className="min-h-11 px-4 rounded-lg bg-stake-input text-sm text-stake-text border border-stake-border" onClick={() => finishRef.current?.(true)}>Skip animation</button>}
            {autoActive && <button className="min-h-11 px-4 rounded-lg border border-stake-red/50 text-xs text-stake-red" onClick={stopAuto}>Stop after this round</button>}
          </div>}
        </div>

        <div className="rounded-lg bg-stake-card border border-stake-border p-3">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-3 px-1">Live slider · target markers</div>
          <div className="relative w-full h-7 rounded-full" style={{ background: 'linear-gradient(90deg, #1a1f29 0%, #2a3142 100%)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,.4)' }}>
            <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{
              width: `${sliderProgress * 100}%`,
              background: result && result.net < 0 ? 'linear-gradient(90deg, #c8102e, #ff5560)' : 'linear-gradient(90deg, #00e701, #ffd166)',
              boxShadow: result && result.net < 0 ? '0 0 18px rgba(255,85,96,.7)' : '0 0 16px rgba(0,231,1,.55)',
            }} transition={{ duration: 0.06 }} />
            {phase === 'sliding' && <div className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none z-20" style={{ left: `calc(${sliderProgress * 100}% - 6px)`, width: 12, height: 12, background: 'radial-gradient(circle, #ffffff 30%, #ffd166 70%, transparent 100%)', boxShadow: '0 0 8px rgba(255,209,102,.95), 0 0 16px rgba(0,231,1,.6)', transition: 'left 60ms linear' }} />}
            {shownBets.map((bet, index) => <div key={index} title={`Target ${index + 1}: ${fmtMultiplier(bet.target)}`} className="absolute top-0 bottom-0 w-0.5 z-10 bg-accent-gold" style={{ left: `${position(bet.target) * 100}%`, boxShadow: '0 0 6px rgba(255,209,102,.85)' }} />)}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {shownBets.map((bet, index) => <span key={index} className="text-[10px] font-mono text-accent-gold">#{index + 1} {fmtMultiplier(bet.target)}</span>)}
          </div>
        </div>

        {recent.length > 0 && <div className="flex items-center gap-1 overflow-x-auto py-1" aria-label="Recent Slide stops">
          <span className="text-[10px] uppercase tracking-widest text-stake-muted mr-1 flex-shrink-0">Recent</span>
          <AnimatePresence initial={false}>{recent.map(item => <motion.span key={item.id} layout initial={{ scale: 0.6, opacity: 0, x: -12 }} animate={{ scale: 1, opacity: 1, x: 0 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 360, damping: 22 }} className={`font-mono font-semibold text-[10px] tabular-nums px-1.5 py-1 rounded-md flex-shrink-0 ${item.net > 0 ? 'bg-stake-green/15 text-stake-green' : 'bg-stake-input text-stake-muted'}`}>{fmtMultiplier(item.stop)}</motion.span>)}</AnimatePresence>
        </div>}

        {result && <section aria-label="Slide round results" className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-stake-muted">Round results</h2>
          {result.bets.map((bet, index) => <div key={index} className="flex justify-between gap-3 text-xs py-2 border-b last:border-b-0 border-stake-border" aria-label={`Wager ${index + 1} result`}>
            <div className="text-stake-muted">#{index + 1} · {fmtCurrency(bet.amount)} at <span className="text-stake-text font-mono">{fmtMultiplier(bet.target)}</span></div>
            <span className={`font-mono tabular-nums ${bet.win ? 'text-stake-green' : 'text-stake-muted'}`}>{bet.win ? `Won · ${fmtCurrency(bet.payout)}` : 'Lost · 0.00'}</span>
          </div>)}
          <div className="flex justify-between text-xs text-stake-muted"><span>Total wager</span><span>{fmtCurrency(result.totalStake)} credits</span></div>
        </section>}

        <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-4 [&_button]:min-h-11 [&_input]:min-h-11">
          <ManualAutoTabs mode={mode} onChange={next => { if (!busyRef.current && !autoRef.current) setMode(next); }} disabled={locked} />
          <div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-stake-text">Your targets <span className="font-mono text-stake-muted">{wagers.length}/{SLIDE_MAX_BETS}</span></h2>
            <button onClick={() => { if (lastBets) editBets(() => copyBets(lastBets)); }} disabled={locked || !lastBets} className="text-xs px-3 rounded-lg bg-stake-input border border-stake-border text-stake-muted disabled:opacity-40">Re-add last bets</button>
          </div>
          {wagers.map((wager, index) => <fieldset key={index} aria-label={`Wager ${index + 1}`} className="min-w-0 rounded-lg border border-stake-border p-3 space-y-3">
            <legend className="px-1 text-xs text-accent-gold">Target {index + 1}</legend>
            <BetInput bet={wager.amount} onBetChange={amount => editBet(index, { amount })} disabled={locked} />
            <div>
              <label htmlFor={`slide-target-${index}`} className="block text-xs text-stake-muted mb-1.5">Target multiplier</label>
              <input id={`slide-target-${index}`} type="number" inputMode="decimal" min={1.01} max={SLIDE_MAX_TARGET} step={0.01} value={wager.target} disabled={locked}
                onChange={event => { const value = parseFloat(event.target.value); editBet(index, { target: Number.isFinite(value) ? +Math.max(0, Math.min(SLIDE_MAX_TARGET, value)).toFixed(2) : 0 }); }}
                className="w-full bg-stake-input border border-stake-border rounded-lg px-3 py-2 text-sm font-mono tabular-nums text-stake-text" />
            </div>
            <div className="grid grid-cols-4 gap-1.5">{[5, 10, 100].map(target => <button key={target} onClick={() => editBet(index, { target })} disabled={locked} className="rounded-lg bg-stake-input text-xs font-mono text-stake-muted disabled:opacity-50">{target}×</button>)}
              <button onClick={() => editBet(index, { target: 200 + Math.floor(Math.random() * 1801) })} disabled={locked} title="Random target from 200× to 2000×; does not change the round result" className="rounded-lg bg-stake-input text-xs text-stake-muted disabled:opacity-50">Shuffle</button>
            </div>
            <div className="flex justify-between gap-3 text-xs text-stake-muted"><span>Win chance</span><span className="font-mono tabular-nums">{winChanceFor(wager.target) > 0 && winChanceFor(wager.target) < 0.01 ? winChanceFor(wager.target).toPrecision(2) : winChanceFor(wager.target).toFixed(2)}%</span></div>
            <div className="flex justify-between gap-3 text-xs text-stake-muted"><span>Return if this target wins</span><span className="font-mono tabular-nums text-stake-green">{fmtCurrency(slideReturnFor(wager.amount, wager.target))}</span></div>
            {wagers.length > 1 && <button onClick={() => editBets(previous => previous.filter((_, i) => i !== index))} disabled={locked} aria-label={`Remove target ${index + 1}`} className="w-full rounded-lg border border-stake-border text-xs text-stake-muted hover:text-stake-red disabled:opacity-50">Remove target</button>}
          </fieldset>)}
          <button onClick={() => editBets(previous => previous.length >= SLIDE_MAX_BETS ? previous : [...previous, { amount: previous[0]!.amount, target: [2, 5, 10, 100][previous.length] ?? 2 }])} disabled={locked || wagers.length >= SLIDE_MAX_BETS} className="w-full rounded-lg border border-dashed border-stake-border text-sm text-accent-gold disabled:opacity-40">Add target</button>
          <div className="flex justify-between text-sm font-semibold text-stake-text"><span>Total wager</span><span className="font-mono tabular-nums">{fmtCurrency(wagers.reduce((sum, bet) => sum + Math.round(bet.amount * 100), 0) / 100)} credits</span></div>
          <p className="text-[11px] leading-relaxed text-stake-muted">Local limits: {SLIDE_MAX_BETS} targets, 10,000 total credits, 1,000,000× maximum. One 2% edge. No shared multiplayer server.</p>
          {stake === null && <p role="alert" className="text-xs text-stake-red">Use a positive wager, targets from 1.01× to 1,000,000×, and at most 10,000 total credits.</p>}
          {stake !== null && !balance.canAfford(stake) && <p className="text-xs text-stake-red">Not enough available credits for the complete setup.</p>}
          {error && <p role="alert" className="text-xs text-stake-red">{error}</p>}
          {mode === 'auto' && <>
            <p className="text-xs text-stake-muted">Autobet repeats this entire setup. Stop limits use the combined net result.</p>
            <AutoConfigFields config={autoConfig} onChange={next => { if (!busyRef.current && !autoRef.current) setAutoConfig(next); }} disabled={locked} />
            {(autoActive || progress.stopReason) && <AutoProgressDisplay progress={progress} config={autoConfig} />}
          </>}
          {mode === 'manual' ? <button onClick={() => void playOnce()} disabled={busy || stake === null || !balance.canAfford(stake)} className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]">{busy ? 'Sliding…' : `Slide · ${fmtCurrency(stake ?? 0)}`}</button>
            : <button onClick={() => { if (autoRef.current) stopAuto(); else if (!busyRef.current) { autoRef.current = true; setAutoActive(true); } }} disabled={!autoActive && (busy || stake === null || !balance.canAfford(stake))} className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] ${autoActive ? 'bg-stake-red text-white' : 'bg-stake-green text-stake-bg'}`}>{autoActive ? 'Stop Autobet' : 'Start Autobet'}</button>}
        </div>
      </div>
    </OriginalPageLayout>
  );
}
