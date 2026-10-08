import { ReelStrip } from '../_shared/ReelStrip';
import { useRoundPlayback } from '../_shared/useRoundPlayback';
import { useCallback, useRef, useState } from 'react';
import { SlotPageLayout } from '../../../components/layout/SlotPageLayout';
import { useReducedMotion } from 'framer-motion';
import { ArtworkGate } from '../../slots/_shared/ArtworkGate';
import { CLASSIC_ATLAS, CLASSIC_SYMBOL_NAMES, ClassicSymbol } from './Art';
import { SpinArrowIcon } from '../../../components/ui/icons';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  AutoConfigFields,
  AutoProgressDisplay,
  ManualAutoTabs,
  type AutoConfig,
  type Mode,
  useAutoBetRunner,
} from '../_shared/AutoBetController';
import { SYMBOLS, type SymbolId, spin } from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function MiniSlotGame() {
  return <SlotPageLayout title="Classic 3-Reel Slot" accent="#ead3a0" accentDeep="#977443">
    <ArtworkGate assets={[CLASSIC_ATLAS]} title="Classic 3-Reel Slot"><ClassicCabinet /></ArtworkGate>
  </SlotPageLayout>;
}

export function classicReelTiming(turbo: boolean, reducedMotion: boolean) {
  const durations = [0.76, 0.94, 1.12].map(value => reducedMotion ? 0 : turbo ? value * 0.38 : value);
  return { durations, settleMs: reducedMotion ? 0 : Math.ceil(durations[2]! * 1000) };
}

function ClassicCabinet() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [turbo, setTurbo] = useState(false);
  const reducedMotion = !!useReducedMotion();
  const [reelTiming, setReelTiming] = useState(() => classicReelTiming(false, reducedMotion));
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const { busy, busyRef, setBusy, wait } = useRoundPlayback();
  const [reels, setReels] = useState<SymbolId[]>(['cherry', 'lemon', 'grape']);
  const [winning, setWinning] = useState<boolean[]>([false, false, false]);
  const [reelRound, setReelRound] = useState(0);
  const [lastOutcome, setLastOutcome] = useState<{ outcome: string; payout: number; mult: number } | null>(null);
  const stateRef = useRef({ bet, turbo, reducedMotion });
  stateRef.current = { bet, turbo, reducedMotion };

  const playOnce = useCallback(async (): Promise<number | null> => {
    const { bet: b, turbo: roundTurbo, reducedMotion: roundReduced } = stateRef.current;
    const timing = classicReelTiming(roundTurbo, roundReduced);
    if (!balance.canAfford(b)) return null;
    if (busyRef.current || !balance.debit(b)) return null;
    setBusy(true);
    sound.play('click');

    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = spin(rng, b);
    if (r.payout > 0) balance.credit(r.payout);
    history.record({
      game: 'Classic 3-Reel Slot',
      bet: b,
      payout: r.payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(b, r.payout, false);


    setWinning([false, false, false]); setLastOutcome(null);
    setReelTiming(timing); setReels(r.reels); setReelRound((id) => id + 1);
    // The last symbol is physically part of each moving strip.
    if (!(await wait(timing.settleMs))) return null;
    sound.play('drop');
    // Highlight winning cells
    if (r.multiplier > 0) {
      const win =
        r.reels[0] === r.reels[1] && r.reels[1] === r.reels[2]
          ? [true, true, true]
          : r.reels.map((s) => s === 'cherry');
      setWinning(win);
      sound.play(r.multiplier >= 100 ? 'mega-win' : r.multiplier >= 10 ? 'big-win' : 'win');
      // Confetti shower for 3-of-a-kind wins (audit's signature
      // big-win flourish, ported from House Edge in lib/confetti).
      if (r.multiplier >= 10 && !roundReduced) {
        fireConfetti({ count: r.multiplier >= 100 ? 120 : 70 });
      }
    } else {
      sound.play('drop');
    }
    const outcome = r.multiplier > 0 ? r.reels.every(id => id === r.reels[0]) ? `Three ${CLASSIC_SYMBOL_NAMES[r.reels[0]!]}` : 'Two Cherries' : 'No win';
    setLastOutcome({ outcome, payout: r.payout, mult: r.multiplier });

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

  useHotkey(' ', () => { if (mode === 'manual') void playOnce(); }, !autoActive);

  return (
    <div className="classic-stage">
      <section className="classic-cabinet" aria-label="Classic three-reel cabinet" data-turbo={turbo} data-reduced-motion={reducedMotion}>
        <header className="classic-marquee">
          <span className="classic-eyebrow">THE ORIGINAL FRUIT MACHINE</span>
          <h1>CLASSIC <span>3 REEL</span></h1>
          <div className="classic-marquee-rule"><i /> ONE LINE. TIMELESS PLAY. <i /></div>
        </header>

        <div className="classic-paytable" aria-label="Three-of-a-kind payouts">
          {SYMBOLS.map(symbol => <div key={symbol.id} className="classic-paytable-item" aria-label={`Three ${CLASSIC_SYMBOL_NAMES[symbol.id]} pays ${symbol.mult} times your bet`}>
            <div className="classic-paytable-symbol"><ClassicSymbol id={symbol.id} /></div>
            <strong>{symbol.mult}<small>×</small></strong>
          </div>)}
        </div>

        <div className="classic-reel-bezel">
          <span className="classic-line-arrow classic-line-arrow-left" aria-hidden="true" />
          <div className="classic-reel-grid">
            {reels.map((symbol, reel) => (
              <ReelStrip key={reel} reel={reel} roundId={reelRound} symbols={[symbol]}
                pool={SYMBOLS.map(item => item.id)} duration={reelTiming.durations[reel]!}
                renderSymbol={(id, row) => (
                  <div className={`classic-reel-cell${row !== null && winning[reel] ? ' classic-reel-cell-winning' : ''}`} data-result-symbol={row !== null ? id : undefined}>
                    <ClassicSymbol id={id as SymbolId} />
                  </div>
                )} />
            ))}
          </div>
          <span className="classic-line-arrow classic-line-arrow-right" aria-hidden="true" />
          <div className="classic-reel-glass" aria-hidden="true" />
        </div>

        <div className="classic-result" role="status" aria-live="polite" aria-atomic="true">
          {lastOutcome ? <><span>{lastOutcome.outcome}</span><strong className={lastOutcome.mult > 0 ? 'classic-win-value' : ''}>{lastOutcome.mult > 0 ? `${lastOutcome.mult}× = ${fmtCurrency(lastOutcome.payout)}` : 'Spin again'}</strong></>
            : <><span>{busy ? 'REELS IN MOTION' : 'SINGLE PAYLINE'}</span><strong>{busy ? 'Good luck' : 'Match three to win'}</strong></>}
        </div>

        <div className="classic-control-rail">
          <div className="classic-mode-row">
            <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
            <button className="classic-turbo" aria-label="Turbo" aria-pressed={turbo} onClick={() => setTurbo(value => !value)} disabled={autoActive || busy}>Turbo</button>
          </div>
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          {mode === 'auto' && (
            <div className="classic-auto-fields">
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {(autoActive || progress.stopReason) && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </div>
          )}
          {mode === 'manual' ? (
            <button onClick={() => void playOnce()} disabled={busy || !balance.canAfford(bet)} className="classic-spin-button">
              <SpinArrowIcon size={22} /><span>{busy ? 'Spinning…' : `Spin · ${fmtCurrency(bet)}`}</span>
            </button>
          ) : (
            <button onClick={() => setAutoActive(value => !value)} disabled={!autoActive && (busy || !balance.canAfford(bet))} className={`classic-spin-button${autoActive ? ' classic-stop-button' : ''}`}>
              <span>{autoActive ? 'Stop Autobet' : 'Start Autobet'}</span>
            </button>
          )}
        </div>
        <footer className="classic-footer"><span>Any two cherries pay 2×</span><span>PLAY CREDITS</span></footer>
      </section>
    </div>
  );
}
