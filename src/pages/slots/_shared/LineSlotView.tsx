import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useHotkey } from '../../../hooks/useHotkey';
import { Modal } from '../../../components/ui/Modal';
import { BetInput } from '../../originals/_shared/BetInput';
import { playLineRound, buyLineBonusRound, WANTED_BONUSES, type WantedState, type LineSpinResult, type LineSlotProfile, type WantedBonus } from './lineEngine';
import { useSlotPlayback } from './useSlotPlayback';
import { SpinReel, type ReelConfig } from './SpinReel';
import './presentation.css';
import { WantedControls } from '../wanted-wild/Controls';
import '../wanted-wild/presentation.css';
import { CabinetControls } from './CabinetControls';
import './authored-cabinets.css';
import './line-cabinets.css';
import { MAX_STAKE } from '../../../lib/accounting';

export function LineSlotView({ profile, title, subtitle, scene, symbolMap, accent, extraControls }: {
  profile: LineSlotProfile; title: string; subtitle: string; scene: ReactNode;
  symbolMap: Record<string, ComponentType>; accent: string; extraControls?: (busy: boolean) => ReactNode;
}) {
  const { balance, fairness, history, session, sound } = useGame();
  const frontier = profile.id === 'wanted-wild';
  const reduceMotion = useReducedMotion();
  const playback = useSlotPlayback();
  const { busy, error, setError, start, finish, skip, wait, alive, skipped } = playback;
  const fallback = useMemo(() => profile.symbols.filter((entry) => entry.weight > 0).map((entry) => entry.id), [profile]);
  const [grid, setGrid] = useState(() => Array.from({ length: profile.cols * profile.rows }, (_, index) => fallback[index % fallback.length]!));
  const [bet, setBet] = usePersistedBet(`slot:${profile.id}`, 1);
  const [reelTarget, setReelTarget] = useState<LineSpinResult | null>(null);
  const visibleGrid = useRef(grid);
  visibleGrid.current = grid;
  const reelStart = useRef(grid);
  const resolveReels = useRef<(() => void) | null>(null);
  const spinToken = useRef(0);
  useEffect(() => () => { resolveReels.current?.(); resolveReels.current = null; }, []);
  const requestSkip = useCallback(() => { skip(); resolveReels.current?.(); }, [skip]);
  const reelConfig = useMemo<ReelConfig>(() => ({
    cols: profile.cols, rows: profile.rows, scatterId: profile.scatterId ?? '',
    symbols: profile.symbols.map((entry) => ({ id: entry.id, label: entry.id, tier: entry.scatter ? 'scatter' : 'low', payout: {} })),
    theme: { cellClass: 'line-slot-cell' },
  }), [profile]);
  const [winning, setWinning] = useState<number[]>([]);
  const [entering, setEntering] = useState<number[]>([]);
  const [giantSymbol, setGiantSymbol] = useState<string | null>(null);
  const [featureSwap, setFeatureSwap] = useState<LineSpinResult | null>(null);
  const [moneyValues, setMoneyValues] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [feature, setFeature] = useState('Ready to spin');
  const [freeRemaining, setFreeRemaining] = useState(0);
  const [wantedState, setWantedState] = useState<WantedState | undefined>();
  const [reelMultipliers, setReelMultipliers] = useState<number[]>([]);
  const [infoOpen, setInfoOpen] = useState(false);
  const [betOpen, setBetOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);

  const reveal = useCallback(async (result: LineSpinResult, free = false) => {
    setWinning([]); setEntering([]); setGiantSymbol(null); setFeatureSwap(null);
    setMoneyValues([]);
    setReelMultipliers([]);
    reelStart.current = visibleGrid.current;
    if (!reduceMotion && !skipped.current) {
      spinToken.current++;
      await new Promise<void>((resolve) => {
        resolveReels.current = resolve;
        setReelTarget(result);
      });
      if (!alive.current) return;
      resolveReels.current = null;
      setReelTarget(null);
      if (!skipped.current) sound.play('drop');
    }
    setGrid(result.initialGrid);
    visibleGrid.current = result.initialGrid;
    if (result.featurePositions.length) {
      setFeature(result.featureName === 'Money Respin' ? 'Expanding symbol' : result.featureName ?? 'Feature');
      setWinning(result.featurePositions);
      await wait(reduceMotion ? 0 : turbo ? 150 : 550);
      if (!alive.current) return;
      if (profile.feature === 'wanted' && !reduceMotion && !skipped.current) {
        setFeatureSwap(result);
        await wait(turbo ? 180 : 360);
        if (!alive.current) return;
      }
      setGrid(result.grid);
      setFeatureSwap(null);
      setReelMultipliers(result.reelMultipliers ?? []);
      await wait(reduceMotion ? 0 : turbo ? 100 : 350);
      if (!alive.current) return;
    }
    if (profile.feature === 'wolf' && free) setGiantSymbol(result.grid[profile.cols + 2]!);
    setWantedState(result.wantedState);
    setReelMultipliers(result.reelMultipliers ?? []);
    setMoneyValues(result.moneyValues);
    setWinning(result.winningPositions);
    if (result.wins.length) await wait(reduceMotion ? 0 : turbo ? 150 : 600);
    if (!alive.current) return;
    if (result.respinFrames.length) {
      setWinning([]);
      setGiantSymbol(null);
      let prior = result.grid;
      for (const frame of result.respinFrames) {
        if (!alive.current) return;
        setFeature(`Money Respin · ${frame.remaining} remaining`);
        setEntering(frame.grid.map((id, index) => id === "money" && prior[index] !== id ? index : -1).filter(index => index >= 0));
        setGrid(frame.grid);
        prior = frame.grid;
        setMoneyValues(frame.moneyValues);
        await wait(reduceMotion ? 0 : turbo ? 150 : 550);
      }
      setEntering([]);
      if (result.jackpotAwards?.length) {
        setFeature(result.jackpotAwards.map(award => `${award.tier.toUpperCase()} ${award.multiplier}×`).join(' · '));
        await wait(reduceMotion ? 0 : turbo ? 300 : 1000);
      }
    }
    if (alive.current && result.featureName) setFeature(result.featureName);
  }, [profile.cols, profile.rows, reduceMotion, sound, turbo, wait, alive, skipped]);

  const spin = useCallback(async (boughtBonus?: WantedBonus) => {
    const option = boughtBonus ? WANTED_BONUSES.find((entry) => entry.id === boughtBonus) : undefined;
    const cost = +(bet * (option?.costMultiplier ?? 1)).toFixed(2);
    if (infoOpen || !Number.isFinite(bet) || bet <= 0 || !balance.canAfford(cost) || !start()) return;
    const wager = bet;
    let debited = false;
    let settled = false;
    try {
      if (!balance.debit(cost)) return;
      debited = true;
      const seeds = fairness.consumeNonce();
      const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
      const result = boughtBonus ? buyLineBonusRound(rng, profile, wager, boughtBonus) : playLineRound(rng, profile, wager);
      // Resolve all financial state before presentation. Leaving this route
      // cannot abandon free spins, duplicate a payout, or change their stake.
      if (result.totalPayout > 0) balance.credit(result.totalPayout);
      settled = true;
      history.record({ game: option ? `${title} · ${option.label} Buy` : title, bet: cost, payout: result.totalPayout, multiplier: result.totalPayout / cost, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
      session.recordSpin(cost, result.totalPayout, result.freeSpinsAwarded > 0);
      setWantedState(undefined);
      setLastWin(0);
      setFeature('Reels spinning');
      sound.play('spin');
      let displayed = 0;
      for (const entry of result.spins) {
        if (!alive.current) return;
        setFreeRemaining(entry.free ? entry.remaining : 0);
        if (entry.result.wantedState?.phase === 'collect') setFeature(`Collect Wilds and multipliers · ${entry.result.wantedState.respinsRemaining} respins`);
        else if (entry.result.wantedState?.phase === 'showdown') setFeature(`Showdown · ${entry.remaining} spins remaining`);
        else if (entry.free) setFeature(`Free spins · ${entry.remaining} remaining`);
        await reveal(entry.result, entry.free);
        if (!alive.current) return;
        displayed = +(displayed + entry.result.payout).toFixed(2);
        setLastWin(displayed);
        if (entry.result.freeSpinsAwarded && !result.capped) {
          setFeature(`+${entry.result.freeSpinsAwarded} free spins`);
          await wait(reduceMotion ? 0 : 650);
        }
      }
      if (!alive.current) return;
      setFreeRemaining(0);
      setLastWin(result.totalPayout);
      setFeature(result.capped ? 'Maximum round win reached' : result.totalPayout > 0 ? `${fmtCurrency(result.totalPayout)} total win` : 'No win · ready for the next spin');
      if (result.totalPayout > 0 && !skipped.current) sound.play('win');
    } catch {
      if (debited && !settled) balance.credit(cost);
      if (alive.current) setError(settled ? 'Presentation interrupted. Your result is saved in history.' : 'The spin could not start. Your stake was returned.');
    } finally {
      if (alive.current) { setReelTarget(null); setFeatureSwap(null); setEntering([]); setFreeRemaining(0); }
      finish();
    }
  }, [infoOpen, bet, balance, start, fairness, profile, title, history, session, sound, alive, reveal, wait, reduceMotion, skipped, setError, finish]);

  useHotkey(' ', () => { if (busy) requestSkip(); else void spin(); }, !infoOpen);
  const validBet = Number.isFinite(bet) && bet > 0;
  const symbolArt = (id: string) => {
    const Symbol = symbolMap[id];
    if (Symbol) return <Symbol />;
    return id === 'wild' ? <div className="grid h-full place-items-center font-display text-[10px] font-black text-[#e9bf78] sm:text-base">WILD</div> : id === 'vs' ? <div className="grid h-full place-items-center font-display text-sm font-black text-[#e06048]">VS</div> : id === 'money' ? <div className="grid h-full place-items-center text-2xl">🪙</div> : <div className="grid h-full place-items-center text-[8px] text-white">{id}</div>;
  };

  return (
    <div className={`line-slot wanted-game line-cabinet-game line-theme-${profile.id}`} style={{ "--line-aspect": profile.cols / profile.rows } as CSSProperties}>
      <div className="wanted-world" aria-hidden="true">{scene}</div>
      <div className="wanted-layout">
        <div className="wanted-cabinet">
        <section aria-label={`${title} reels`} className="relative min-w-0 rounded-lg border border-white/15 bg-[#121317]/95 p-3 shadow-xl sm:p-5">
          <header className="mb-3 flex items-center justify-between gap-3 text-white">
            {frontier ? <h1 className="wanted-wordmark" aria-label={title}>WANTED<span>DEAD OR A WILD</span></h1> : <h1 className="line-world-wordmark" aria-label={title}>{profile.feature === 'wolf' ? <>WOLF <span>GOLD</span></> : <>PHARAOH’S <span>GOLD</span></>}<small>{profile.paylines.length} fixed lines · {profile.feature === 'wolf' ? 'Money Respin' : 'Temple treasures'}</small></h1>}
          </header>
          <div className="line-reel-window mx-auto w-full overflow-hidden rounded-md border border-white/15 bg-black/60 p-2" style={{ '--reel-aspect': profile.cols / profile.rows } as CSSProperties}>
            {reelTarget ? <SpinReel key={spinToken.current} cfg={reelConfig} initialGrid={Array.from({ length: profile.cols }, (_, col) => Array.from({ length: profile.rows }, (_, row) => ({ symbolId: reelStart.current[row * profile.cols + col]!, key: `previous-${col}-${row}` })))} finalGrid={Array.from({ length: profile.cols }, (_, col) => Array.from({ length: profile.rows }, (_, row) => ({ symbolId: reelTarget.initialGrid[row * profile.cols + col]!, key: `line-${spinToken.current}-${row * profile.cols + col}` })))} renderCell={({ symbolId }) => symbolArt(symbolId)} durationMs={turbo ? 240 : 650} staggerMs={turbo ? 70 : 140} onComplete={() => resolveReels.current?.()} /> : <div className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${profile.rows}, minmax(0, 1fr))`, aspectRatio: `${profile.cols} / ${profile.rows}` }}>
              {grid.map((id, index) => {
                const isWinner = winning.includes(index);
                return <motion.div key={index} data-slot-cell-key={`line-${spinToken.current}-${index}`} data-symbol={id} aria-label={`Reel ${index % profile.cols + 1}, row ${Math.floor(index / profile.cols) + 1}: ${id}${isWinner ? ', winning symbol' : ''}`} className="cell line-slot-cell relative min-h-0 min-w-0 overflow-hidden" style={{ outline: isWinner ? `1px solid ${accent}` : undefined, background: isWinner ? `${accent}18` : undefined }} animate={reduceMotion || skipped.current ? {} : entering.includes(index) ? { y: ["-110%", "0%"], opacity: [0, 1], scale: 1 } : { y: 0, opacity: 1, scale: isWinner ? [1, 1.04, 1] : 1 }} transition={{ duration: .35 }}>
                  {symbolArt(id)}
                  {(moneyValues[index] ?? 0) > 0 && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-sm bg-[#e4bf75] px-1.5 font-mono text-[9px] font-bold text-black sm:text-xs">{moneyValues[index]}×</span>}
                </motion.div>;
              })}
            </div>}
            {featureSwap && <div className="line-feature-transition" style={{ gridTemplateColumns: `repeat(${profile.cols},minmax(0,1fr))`, gridTemplateRows: `repeat(${profile.rows},minmax(0,1fr))` }}>{featureSwap.featurePositions.map(index => <motion.div key={`${spinToken.current}-${index}`} className="cell line-slot-cell" style={{ gridColumn: index % profile.cols + 1, gridRow: Math.floor(index / profile.cols) + 1 }} initial={{ scaleY: .05, opacity: 0 }} animate={{ scaleY: 1, opacity: 1 }} transition={{ duration: turbo ? .14 : .3, ease: [.18,.7,.25,1] }}>{symbolArt(featureSwap.grid[index]!)}</motion.div>)}</div>}
            {giantSymbol && !reelTarget && <motion.div className="wolf-giant-symbol" aria-label={`Giant ${giantSymbol}, reels 2 to 4`} initial={reduceMotion ? false : { opacity: 0, scale: .96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: reduceMotion ? 0 : .24 }}>{symbolArt(giantSymbol)}</motion.div>}
            {frontier && reelMultipliers.some((value) => value > 0) && <div className="wanted-reel-multipliers" style={{ gridTemplateColumns: `repeat(${profile.cols}, minmax(0,1fr))` }}>{reelMultipliers.map((value, index) => <span key={index}>{value > 0 && <b>{value}×</b>}</span>)}</div>}
            {frontier && reelTarget && wantedState?.bonus === 'train-robbery' && <div className="wanted-sticky-layer" style={{ gridTemplateColumns: `repeat(${profile.cols},minmax(0,1fr))`, gridTemplateRows: `repeat(${profile.rows},minmax(0,1fr))` }}>{wantedState.stickyWilds.map((index) => <div key={index} style={{ gridColumn: index % profile.cols + 1, gridRow: Math.floor(index / profile.cols) + 1 }}>{symbolArt('wild')}</div>)}</div>}
          </div>
          {!frontier && <div className="wanted-feature-hud"><span>{freeRemaining > 0 ? `${freeRemaining} free spins remaining` : subtitle}</span></div>}
          {frontier && <div className="wanted-feature-hud" role="status">{!wantedState ? <span>15 fixed paylines · Play credits</span> : wantedState.phase === 'collect' ? <><span>Respins <b>{wantedState.respinsRemaining}</b></span><span>Wilds <b>{wantedState.collectedWilds}/20</b></span><span>Multiplier <b>{wantedState.collectedMultiplier}×</b></span></> : wantedState.phase === 'showdown' ? <><span>Showdown</span><span><b>{wantedState.collectedWilds}</b> Wilds</span><span><b>{wantedState.collectedMultiplier}×</b></span></> : <span>{wantedState.bonus === 'train-robbery' ? 'Train Robbery' : 'Duel at Dawn'} · {freeRemaining} spins{wantedState.bonus === 'train-robbery' ? ` · ${wantedState.stickyWilds.length} locked` : ''}</span>}</div>}
          <p role="status" aria-live="polite" className="wanted-round-status">{feature}</p>
        </section>
        <aside className="rounded-lg border border-white/10 bg-[#101218]/95 p-4 text-white shadow-xl">
          {frontier ? <><WantedControls bet={bet} onBetChange={setBet} win={lastWin} busy={busy} canSpin={validBet && balance.balance >= bet} onSpin={() => busy ? requestSkip() : void spin()} turbo={turbo} onTurbo={() => setTurbo((value) => !value)} onRules={() => setInfoOpen(true)} onBuy={(bonus) => void spin(bonus)} />{error && <p className="wanted-error" role="alert">{error}</p>}</> : <><CabinetControls bet={bet} win={lastWin} busy={busy} spinDisabled={!busy && (!validBet || balance.balance < bet)} controlsDisabled={busy} spinLabel={busy ? "Skip to result" : `Spin · ${fmtCurrency(bet)}`} onSpin={() => busy ? requestSkip() : void spin()} onDecrease={() => setBet(Math.max(.01, +(bet / 2).toFixed(2)))} onIncrease={() => setBet(Math.min(MAX_STAKE, +(bet * 2).toFixed(2)))} onBet={() => setBetOpen(true)} toolbar={<>{extraControls?.(busy)}<button aria-pressed={turbo} disabled={busy} onClick={() => setTurbo(value => !value)}>Turbo {turbo ? 'on' : 'off'}</button><button onClick={() => setInfoOpen(true)}>Rules & pays</button></>} />{error && <p role="alert" className="wanted-error">{error}</p>}
          </>}
        </aside>
        </div>
        {frontier && <p className="wanted-scene-note" aria-hidden="true">15 fixed lines · Play money</p>}
      </div>
      <Modal open={betOpen} onClose={() => setBetOpen(false)} title="Choose your play-money bet" width="sm"><BetInput bet={bet} onBetChange={setBet} disabled={busy} /><button className="btn-primary mt-4 w-full" onClick={() => setBetOpen(false)}>Done</button></Modal>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title={`${title} · Local rules`} width="lg">
        <p className="mb-4 text-sm text-ink-dim">Wins run left to right on {profile.paylines.length} fixed lines. The best eligible symbol win is paid once per line. Values below multiply the line stake (total bet ÷ {profile.paylines.length}). The whole-round limit is {profile.maxWin.toLocaleString()}× the starting bet. Local occurrence probabilities are approximate. {profile.feature === 'wolf' ? 'These 25 paylines follow the published original diagram.' : 'Payline paths follow the displayed local layout.'}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{profile.symbols.filter((entry) => entry.pay).map((entry) => <div key={entry.id} className="rounded-xl border border-edge p-3"><>{frontier && <div className="mx-auto mb-2 h-16 w-16">{symbolArt(entry.id)}</div>}<strong className="text-sm capitalize">{entry.id}</strong></><p className="mt-1 text-xs text-ink-dim">{Object.entries(entry.pay ?? {}).map(([count, multiplier]) => `${count}: ${fmtMultiplier(multiplier)}`).join(' · ')}</p></div>)}</div>
        {profile.scatterId && profile.feature !== 'wanted' && profile.feature !== 'wolf' && <p className="mt-4 text-sm text-ink-dim">3 / 4 / 5+ scatters pay 2× / 10× / 50× the total stake.{profile.freeSpins > 0 ? ` Three or more also award ${profile.freeSpins} free spins, including retriggers. The stake stays fixed for the feature.` : ''}</p>}
        {profile.id === 'pharaoh-gold' && <p className="mt-4 text-sm text-ink-dim">The Eye of Horus is Wild. Two Cobras can pay. Your total stake is divided equally among the selected horizontal lines; three Masks pay 50× that line stake on the first two lines and 100× on the third. There are no scatter payouts or free spins. The source’s Ankh award is incomplete, so this local version provisionally pays 25× the line stake. Live progressive jackpots are unavailable.</p>}
        {profile.feature === 'wolf' && <p className="mt-3 text-sm text-ink-dim">Six Money symbols start three respins. New Money is held and resets the counter to three. Held values are collected at the end; a full board adds the 1,000× Mega jackpot. Mini and Major symbols award 30× and 100×. Five initial free spins combine the middle three reels into one giant 3×3 symbol. A scatter retrigger adds three spins.</p>}
        {profile.feature === 'wanted' && <><p className="mt-3 text-sm text-ink-dim">Three matching Train, Duel or Dead Man’s Hand bonus symbols trigger that specific feature. VS symbols expand to Wild reels; participating DuelReel multipliers are added before multiplying the line win. Wilds stay locked throughout Train Robbery. Dead Man’s Hand collects up to 20 Wilds and 31× before three Showdown spins.</p><ul className="mt-3 space-y-2 text-sm text-ink-dim">{WANTED_BONUSES.map((bonus) => <li key={bonus.id}><strong>{bonus.label} · {bonus.costMultiplier}× buy</strong><br />{bonus.description}</li>)}</ul></>}
        <details className="mt-4 text-sm"><summary className="cursor-pointer py-2">Show the {profile.paylines.length} local paylines</summary><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{profile.paylines.map((line, index) => <div key={index} className="rounded-lg bg-white/5 p-2"><span className="text-[10px] text-ink-mute">Line {index + 1}</span><svg viewBox={`0 0 ${profile.cols * 20} ${profile.rows * 14}`} role="img" aria-label={`Line ${index + 1}, rows ${line.map((row) => row + 1).join(', ')}`}><polyline points={line.map((row, col) => `${10 + col * 20},${7 + row * 14}`).join(' ')} stroke={accent} strokeWidth="2" fill="none" /></svg></div>)}</div></details>
      </Modal>
    </div>
  );
}
