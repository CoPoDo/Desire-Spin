import { useCallback, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { SlotPageLayout } from '../../../components/layout/SlotPageLayout';
import { Modal } from '../../../components/ui/Modal';
import { CountUp } from '../../../components/ui/CountUp';
import { useGame } from '../../../game-context';
import { useHotkey } from '../../../hooks/useHotkey';
import { MAX_STAKE } from '../../../lib/accounting';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { fireConfetti } from '../../../lib/confetti';
import { BetInput } from '../_shared/BetInput';
import { ReelStrip } from '../_shared/ReelStrip';
import { useRoundPlayback } from '../_shared/useRoundPlayback';
import { AutoConfigFields, AutoProgressDisplay, type AutoConfig, useAutoBetRunner } from '../_shared/AutoBetController';
import { ArtworkGate } from '../../slots/_shared/ArtworkGate';
import { CabinetControls } from '../../slots/_shared/CabinetControls';
import { SYMBOLS, PAYLINES, MAX_WIN_MULTIPLIER, type BassResult, planRound } from './engine';
import { BASS_ASSETS, BASS_LABELS, BASS_WORLD, BassSymbol } from './Art';
import '../../slots/_shared/authored-cabinets.css';
import './presentation.css';

const BUY_BONUS_MULT = 100;
const REEL_POOL = SYMBOLS.filter((symbol) => !symbol.isWild).map((symbol) => symbol.id);

export function BigBassGame() {
  return <SlotPageLayout title="Big Bass Bonanza" accent="#d6b76e" accentDeep="#95763c">
    <ArtworkGate assets={BASS_ASSETS} title="Big Bass Bonanza"><BassCabinet /></ArtworkGate>
  </SlotPageLayout>;
}

function BassCabinet() {
  const { balance, fairness, sound, history, session } = useGame();
  const reduceMotion = useReducedMotion();
  const [bet, setBet] = useState(1);
  const [turbo, setTurbo] = useState(false);
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [sheet, setSheet] = useState<'bet' | 'auto' | 'info' | 'buy' | null>(null);
  const { busy, busyRef, setBusy, wait } = useRoundPlayback();
  const skipRef = useRef(false);
  const wakePlayback = useRef<(() => void) | null>(null);
  const [reelRound, setReelRound] = useState(0);
  const [fastReveal, setFastReveal] = useState(false);
  const [reels, setReels] = useState<string[]>([
    'floater', 'rod', 'ace', 'king', 'queen',
    'jack', 'ten', 'bigbass', 'tacklebox', 'dragonfly',
    'queen', 'king', 'rod', 'ace', 'jack',
  ]);
  const [landingResult, setLandingResult] = useState<BassResult | null>(null);
  const [lastResult, setLastResult] = useState<BassResult | null>(null);
  const [roundWin, setRoundWin] = useState(0);
  const [freeSpinsRemaining, setFreeSpinsRemaining] = useState(0);
  const [freeSpinsWon, setFreeSpinsWon] = useState(0);
  const [collectorMultiplier, setCollectorMultiplier] = useState(1);
  const [collectedWilds, setCollectedWilds] = useState(0);
  const [showFsBanner, setShowFsBanner] = useState<{ count: number } | null>(null);
  const [fsTotalReveal, setFsTotalReveal] = useState<{ amount: number; bet: number } | null>(null);
  const stateRef = useRef({ bet });
  stateRef.current = { bet };
  const buyBonusCost = +(bet * BUY_BONUS_MULT).toFixed(2);

  // A skip wakes cosmetic playback only. The prepared round is already settled.
  const pause = useCallback((ms: number) => new Promise<boolean>((resolve) => {
    const wake = () => resolve(true);
    wakePlayback.current = wake;
    void wait(skipRef.current || reduceMotion ? 0 : turbo ? ms * 0.34 : ms).then((alive) => {
      if (wakePlayback.current === wake) wakePlayback.current = null;
      resolve(alive);
    });
  }), [wait, reduceMotion, turbo]);
  const requestSkip = useCallback(() => {
    skipRef.current = true;
    setFastReveal(true);
    wakePlayback.current?.();
    wakePlayback.current = null;
  }, []);

  const revealReels = useCallback(async (result: BassResult) => {
    setLastResult(null);
    setLandingResult(result);
    setReels(result.reels);
    setReelRound((id) => id + 1);
    // Both the symbols and money values are in the actual landing cells before
    // the strip starts. Only the win highlight is added after stopping.
    if (!(await pause(1320))) return false;
    setLastResult(result);
    if (result.extraFish?.length) {
      // The random fish arrive only after the actual reel landing. They collect
      // money without re-evaluating or fabricating new payline wins.
      if (!(await pause(300))) return false;
      const finalReels = [...result.reels];
      const finalMoney = [...result.moneyValues];
      for (const fish of result.extraFish) { finalReels[fish.position] = 'bigbass'; finalMoney[fish.position] = fish.value; }
      setReels(finalReels);
      setLandingResult({ ...result, moneyValues: finalMoney });
      if (!(await pause(500))) return false;
    }
    if (!skipRef.current) sound.play('drop');
    return pause(150);
  }, [sound, pause]);

  const runRound = useCallback(async (buy: boolean): Promise<number | null> => {
    const b = stateRef.current.bet;
    const cost = +(b * (buy ? BUY_BONUS_MULT : 1)).toFixed(2);
    if (busyRef.current || !balance.debit(cost)) return null;
    setBusy(true); skipRef.current = false; setFastReveal(false); setSheet(null);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const planned = planRound(rng, b, buy);
    if (planned.totalPayout > 0) balance.credit(planned.totalPayout);
    history.record({ game: buy ? 'Big Bass · Demo Bonus' : 'Big Bass Bonanza', bet: cost,
      payout: planned.totalPayout, multiplier: planned.totalPayout / cost,
      serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
    session.recordSpin(cost, planned.totalPayout, planned.bonusAward > 0, planned.totalPayout / b);
    sound.play('click');
    setRoundWin(0); setFreeSpinsWon(0); setCollectorMultiplier(1); setCollectedWilds(0); setFreeSpinsRemaining(planned.bonusAward);
    if (planned.base && !(await revealReels(planned.base))) return planned.totalPayout - cost;
    if (planned.bonusAward > 0) {
      setShowFsBanner({ count: planned.bonusAward }); sound.play('free-spins-trigger');
      if (!(await pause(1400))) return planned.totalPayout - cost;
      setShowFsBanner(null);
      for (const frame of planned.feature) {
        setCollectorMultiplier(frame.collectorMultiplier);
        if (!(await revealReels(frame.result))) return planned.totalPayout - cost;
        setFreeSpinsRemaining(frame.remaining); setFreeSpinsWon(frame.runningWin); setCollectedWilds(frame.collectedWilds ?? 0);
        if (!skipRef.current) sound.play(frame.result.collectedMultiplier > 0 ? 'big-win' : frame.result.payout > 0 ? 'win' : 'drop');
        if (frame.addedSpins > 0) {
          setShowFsBanner({ count: frame.addedSpins });
          if (!(await pause(1000))) return planned.totalPayout - cost;
          setShowFsBanner(null);
        }
        if (!(await pause(250))) return planned.totalPayout - cost;
      }
      const featureWin = planned.feature[planned.feature.length - 1]?.runningWin ?? 0;
      if (!skipRef.current) {
        setFsTotalReveal({ amount: featureWin, bet: b });
        if (!(await pause(2400))) return planned.totalPayout - cost;
        setFsTotalReveal(null);
      }
    }
    // Keep the last prepared strip visible through its shortened final stop.
    if (skipRef.current && !reduceMotion && !(await wait(100))) return planned.totalPayout - cost;
    if (planned.totalPayout > 0) {
      sound.play(planned.totalPayout >= b * 100 ? 'mega-win' : planned.totalPayout >= b * 10 ? 'big-win' : 'win');
      if (planned.totalPayout >= b * 10 && !reduceMotion && !skipRef.current) fireConfetti({ count: 80 });
    } else sound.play('drop');
    setRoundWin(planned.totalPayout); setFreeSpinsRemaining(0); setBusy(false);
    return +(planned.totalPayout - cost).toFixed(2);
  }, [balance, fairness, history, session, sound, busyRef, setBusy, revealReels, pause, reduceMotion, wait]);

  const playOnce = useCallback(() => runRound(false), [runRound]);
  const progress = useAutoBetRunner({ active: autoActive, config: autoConfig, intervalMs: 350, runOnce: playOnce, onStop: () => setAutoActive(false) });
  const spinHotkey = () => {
    if (busyRef.current) { requestSkip(); return; }
    if (balance.balance >= bet && bet > 0) void playOnce();
  };
  useHotkey(' ', spinHotkey, !autoActive && sheet === null);
  useHotkey('Enter', spinHotkey, !autoActive && sheet === null);

  const inFs = freeSpinsRemaining > 0;
  const controlsDisabled = busy || autoActive;
  const status = showFsBanner ? `+${showFsBanner.count} free spins awarded`
    : lastResult?.capped ? `${MAX_WIN_MULTIPLIER.toLocaleString()}× round limit reached · remaining spins forfeited`
    : busy && !lastResult ? inFs ? 'Fishing the bonus waters…' : 'Casting the reels…'
    : !busy && freeSpinsWon > 0 ? `Fishing trip complete · ${fmtCurrency(freeSpinsWon)} won`
    : lastResult?.collectedMultiplier ? `Fisherman collects ${fmtMultiplier(lastResult.collectedMultiplier)}`
    : lastResult?.payout ? lastResult.winningLines.length > 0
      ? `${lastResult.winningLines.length} winning ${lastResult.winningLines.length === 1 ? 'line' : 'lines'} · ${fmtCurrency(lastResult.payout)}`
      : `${lastResult.scatterCount} boat scatters · ${fmtCurrency(lastResult.payout)}`
    : lastResult ? 'No catch this time. Cast again.' : '3 boat scatters open the fishing bonus';

  return <div className={`authored-game authored-bass ${inFs ? 'is-free' : ''}`} data-reduced-motion={!!reduceMotion}>
    <div className="authored-world bass-world" aria-hidden="true"><img src={BASS_WORLD} alt="" /></div>
    <div className="authored-layout bass-layout">
      <section className="authored-cabinet bass-cabinet" aria-label="Big Bass Bonanza cabinet">
        <h1 className="authored-wordmark bass-wordmark"><small>CAST A LITTLE · CATCH A LOT</small><strong>BIG BASS</strong><span>B O N A N Z A</span></h1>
        <div className="bass-feature-rail" aria-live="polite">
          {inFs ? <><span>Free spins <strong>{freeSpinsRemaining}</strong></span><span>Collector <strong>{collectorMultiplier}×</strong> · {Math.min(collectedWilds, 12)}/12 wilds</span><span>Bonus win <strong>{fmtCurrency(freeSpinsWon)}</strong></span></>
            : <><span>5 REELS · 10 LINES</span><span>THE LAKE IS CALLING</span></>}
        </div>
        <div className="bass-reels-frame">
          <div className="bass-reels">
            {Array.from({ length: 5 }, (_, reel) => <ReelStrip key={reel} reel={reel} roundId={reelRound}
              symbols={[reels[reel]!, reels[5 + reel]!, reels[10 + reel]!]}
              pool={REEL_POOL} duration={reduceMotion ? 0 : fastReveal ? 0.08 : (0.8 + reel * 0.13) * (turbo ? 0.34 : 1)}
              renderSymbol={(symbol, row) => {
                const index = row === null ? -1 : row * 5 + reel;
                // A documented end-of-spin fish event can transform a landing
                // cell after the immutable reel strip has finished travelling.
                const displayedSymbol = index >= 0 ? reels[index]! : symbol;
                const highlight = !!lastResult && index >= 0 && (lastResult.winningPositions.includes(index) || (displayedSymbol === 'scatter' && lastResult.scatterCount >= 3));
                const money = index >= 0 ? landingResult?.moneyValues[index] ?? 0 : 0;
                return <div className={`bass-cell ${highlight ? 'bass-cell-win' : ''}`} data-bass-symbol={displayedSymbol} data-landing={row === null ? undefined : row}>
                  <BassSymbol id={displayedSymbol} money={money} />
                </div>;
              }} />)}
          </div>
          <AnimatePresence>{showFsBanner && !fastReveal && <motion.div className="bass-feature-banner" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .18 }}>
            <span>BACK ON THE WATER</span><strong>+{showFsBanner.count}</strong><span>FREE SPINS</span>
          </motion.div>}</AnimatePresence>
        </div>
        <p className="authored-status bass-status" role="status">{status}</p>
        <CabinetControls bet={bet} win={inFs ? freeSpinsWon : roundWin} busy={busy}
          controlsDisabled={controlsDisabled} spinDisabled={!busy && !autoActive && (bet <= 0 || balance.balance < bet)}
          onSpin={() => { if (autoActive) setAutoActive(false); else if (busyRef.current) requestSkip(); else void playOnce(); }}
          spinLabel={autoActive ? 'Stop autoplay' : busy ? 'Skip reveal' : 'Cast reels'}
          onDecrease={() => setBet((value) => Math.max(.01, +(value / 2).toFixed(2)))}
          onIncrease={() => setBet((value) => Math.min(MAX_STAKE, balance.balance, +(value * 2).toFixed(2)))}
          decreaseDisabled={bet <= .01} increaseDisabled={bet >= MAX_STAKE || bet >= balance.balance}
          onBet={() => setSheet('bet')}
          toolbar={<>
            <button disabled={controlsDisabled || bet <= 0 || balance.balance < buyBonusCost} className="cabinet-bonus" onClick={() => setSheet('buy')} aria-label="Buy Free Spins"><span>DEMO BONUS</span><strong>{fmtCurrency(buyBonusCost)}</strong></button>
            <button aria-label="Autoplay settings" aria-pressed={autoActive} disabled={busy && !autoActive} onClick={() => { if (autoActive) setAutoActive(false); else setSheet('auto'); }}>{autoActive ? `Stop · ${progress.completed}` : 'Autoplay'}</button>
            <button aria-label="Turbo" aria-pressed={turbo} disabled={controlsDisabled} onClick={() => setTurbo((value) => !value)}>Turbo {turbo ? 'on' : 'off'}</button>
            <button aria-label="Paytable and rules" disabled={controlsDisabled} onClick={() => setSheet('info')}>Paytable</button>
          </>} />
      </section>
    </div>
    <p className="authored-footnote bass-footnote">Original artwork · Local reel weights · Play money</p>

    <Modal open={sheet === 'bet'} onClose={() => setSheet(null)} title="Bet settings" width="sm"><div className="bass-sheet"><BetInput bet={bet} onBetChange={setBet} disabled={controlsDisabled} /><button className="bass-sheet-primary" onClick={() => setSheet(null)}>Done</button></div></Modal>
    <Modal open={sheet === 'auto'} onClose={() => setSheet(null)} title="Autoplay settings" width="sm"><div className="bass-sheet">
      <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
      {(progress.completed > 0 || progress.stopReason) && <AutoProgressDisplay progress={progress} config={autoConfig} />}
      <button className="bass-sheet-primary" disabled={busy || bet <= 0 || balance.balance < bet} onClick={() => { setSheet(null); setAutoActive(true); }}>Start Autobet</button>
    </div></Modal>
    <Modal open={sheet === 'buy'} onClose={() => setSheet(null)} title="Buy Free Spins" width="sm"><div className="bass-sheet bass-buy-sheet">
      <div className="bass-bonus-portrait"><BassSymbol id="fisherman" /></div>
      <p className="bass-buy-award">10 free spins</p><p>Fish carry money values. A fisherman collects the fish on the screen.</p>
      <dl><div><dt>Current bet</dt><dd>{fmtCurrency(bet)}</dd></div><div><dt>Total cost · {BUY_BONUS_MULT}× bet</dt><dd>{fmtCurrency(buyBonusCost)}</dd></div></dl>
      <p className="bass-sheet-note">Local demo shortcut, using local reel weights. The original game has no bonus buy. Play-money credits only.</p>
      <div className="bass-sheet-actions"><button onClick={() => setSheet(null)}>Cancel</button><button className="bass-sheet-primary" disabled={busy || autoActive || bet <= 0 || balance.balance < buyBonusCost} onClick={() => void runRound(true)}>Confirm · {fmtCurrency(buyBonusCost)}</button></div>
    </div></Modal>
    <Modal open={sheet === 'info'} onClose={() => setSheet(null)} title="Paytable and rules" width="lg"><div className="bass-sheet">
      <p>Five reels, three rows and ten fixed paylines. Matching symbols pay left to right from the first reel. The fisherman is wild during free spins. Space or Enter casts or skips the reveal.</p>
      <div className="bass-paytable"><div className="bass-paytable-heading"><span>Symbol</span><span>2</span><span>3</span><span>4</span><span>5</span></div>
        {SYMBOLS.filter((symbol) => symbol.pay).map((symbol) => <div className="bass-paytable-row" key={symbol.id}><span className="bass-paytable-symbol"><span className="bass-paytable-art"><BassSymbol id={symbol.id} /></span><span>{BASS_LABELS[symbol.id]}</span></span>{([2, 3, 4, 5] as const).map((count) => <span key={count}>{symbol.pay?.[count] ? `${(symbol.pay[count]! / PAYLINES.length).toFixed(2)}×` : '–'}</span>)}</div>)}
      </div>
      <p>Returns shown are per winning line as a multiple of the total bet. The published paytable is used unchanged; reel weights, fish-value frequencies and random extra-fish frequency are local approximations.</p>
      <p>3, 4 or 5 boat scatters award 10, 15 or 20 free spins, with no separate scatter payout. Every fish carries a 2×–2,000× money value. Each fisherman collects every fish in free spins. The 4th, 8th and 12th fishermen queue ten more spins at 2×, 3× and 10×; each new multiplier starts after the preceding batch ends. With exactly one fisherman, extra fish can randomly appear after the reels stop.</p>
      <p>The whole round is capped at {MAX_WIN_MULTIPLIER.toLocaleString()}× the bet. Reaching the cap ends the feature and forfeits remaining spins.</p>
      <p className="bass-sheet-note">All winnings for a prepared round settle before animation, including if you leave. Turbo and Skip change playback only. Bonus Buy is a local 100× demo shortcut.</p>
      <button className="bass-sheet-primary" onClick={() => setSheet(null)}>Back to the lake</button>
    </div></Modal>
    <AnimatePresence>{fsTotalReveal && <motion.div className="bass-total-overlay" role="status" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : .2 }}>
      <div className="bass-total-card"><span>FISHING TRIP COMPLETE</span><h2>Total win</h2><strong><CountUp value={fsTotalReveal.amount} duration={reduceMotion || turbo ? 0 : 1800} format={fmtCurrency} /></strong><p>{fmtMultiplier(fsTotalReveal.amount / fsTotalReveal.bet)} your bet</p><button onClick={requestSkip}>Continue</button></div>
    </motion.div>}</AnimatePresence>
  </div>;
}
