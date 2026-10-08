import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode, type CSSProperties } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useHotkey } from '../../../hooks/useHotkey';
import { Modal } from '../../../components/ui/Modal';
import { BetInput } from '../../originals/_shared/BetInput';
import { playLineRound, type LineSpinResult, type LineSlotProfile, type WantedBonus } from './lineEngine';
import { useSlotPlayback } from './useSlotPlayback';
import { SpinReel, type ReelConfig } from './SpinReel';
import './presentation.css';

export function LineSlotView({ profile, title, subtitle, scene, symbolMap, accent }: {
  profile: LineSlotProfile; title: string; subtitle: string; scene: ReactNode;
  symbolMap: Record<string, ComponentType>; accent: string;
}) {
  const { balance, fairness, history, session, sound } = useGame();
  const reduceMotion = useReducedMotion();
  const playback = useSlotPlayback();
  const { busy, error, setError, start, finish, skip, wait, alive, skipped } = playback;
  const fallback = useMemo(() => profile.symbols.filter((entry) => entry.weight > 0).map((entry) => entry.id), [profile]);
  const [grid, setGrid] = useState(() => Array.from({ length: profile.cols * profile.rows }, (_, index) => fallback[index % fallback.length]!));
  const [bet, setBet] = usePersistedBet(`slot:${profile.id}`, 1);
  const [reelTarget, setReelTarget] = useState<LineSpinResult | null>(null);
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
  const [moneyValues, setMoneyValues] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [feature, setFeature] = useState('Ready to spin');
  const [freeRemaining, setFreeRemaining] = useState(0);
  const [wantedBonus, setWantedBonus] = useState<WantedBonus>('duel-at-dawn');
  const [infoOpen, setInfoOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);

  const reveal = useCallback(async (result: LineSpinResult) => {
    setWinning([]);
    setMoneyValues([]);
    setGrid(result.initialGrid);
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
    if (result.featurePositions.length) {
      setFeature(result.featureName === 'Money Respin' ? 'Expanding symbol' : result.featureName ?? 'Feature');
      setWinning(result.featurePositions);
      await wait(reduceMotion ? 0 : turbo ? 150 : 550);
      if (!alive.current) return;
      setGrid(result.grid);
      await wait(reduceMotion ? 0 : turbo ? 100 : 350);
      if (!alive.current) return;
    }
    setMoneyValues(result.moneyValues);
    setWinning(result.winningPositions);
    if (result.wins.length) await wait(reduceMotion ? 0 : turbo ? 150 : 600);
    if (!alive.current) return;
    if (result.respinFrames.length) {
      setWinning([]);
      for (const frame of result.respinFrames) {
        if (!alive.current) return;
        setFeature(`Money Respin · ${frame.remaining} remaining`);
        setGrid(frame.grid);
        setMoneyValues(frame.moneyValues);
        await wait(reduceMotion ? 0 : turbo ? 150 : 550);
      }
    }
    if (alive.current && result.featureName) setFeature(result.featureName);
  }, [profile.cols, profile.rows, reduceMotion, sound, turbo, wait, alive, skipped]);

  const spin = useCallback(async () => {
    if (infoOpen || !Number.isFinite(bet) || bet <= 0 || !balance.canAfford(bet) || !start()) return;
    const wager = bet;
    let debited = false;
    let settled = false;
    try {
      if (!balance.debit(wager)) return;
      debited = true;
      const seeds = fairness.consumeNonce();
      const result = playLineRound(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), profile, wager, wantedBonus);
      // Resolve all financial state before presentation. Leaving this route
      // cannot abandon free spins, duplicate a payout, or change their stake.
      if (result.totalPayout > 0) balance.credit(result.totalPayout);
      settled = true;
      history.record({ game: title, bet: wager, payout: result.totalPayout, multiplier: result.totalPayout / wager, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
      session.recordSpin(wager, result.totalPayout, result.freeSpinsAwarded > 0);
      setLastWin(0);
      setFeature('Reels spinning');
      sound.play('spin');
      let displayed = 0;
      for (const entry of result.spins) {
        if (!alive.current) return;
        setFreeRemaining(entry.free ? entry.remaining : 0);
        if (entry.free) setFeature(`Free spins · ${entry.remaining} remaining`);
        await reveal(entry.result);
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
      if (debited && !settled) balance.credit(wager);
      if (alive.current) setError(settled ? 'Presentation interrupted. Your result is saved in history.' : 'The spin could not start. Your stake was returned.');
    } finally {
      if (alive.current) { setReelTarget(null); setFreeRemaining(0); }
      finish();
    }
  }, [infoOpen, bet, balance, start, fairness, profile, wantedBonus, title, history, session, sound, alive, reveal, wait, reduceMotion, skipped, setError, finish]);

  useHotkey(' ', () => { if (busy) requestSkip(); else void spin(); }, !infoOpen);
  const validBet = Number.isFinite(bet) && bet > 0;
  const symbolArt = (id: string) => {
    const Symbol = symbolMap[id];
    return id === 'wild' ? <div className="grid h-full place-items-center font-display text-[10px] font-black text-[#e9bf78] sm:text-base">WILD</div> : id === 'vs' ? <div className="grid h-full place-items-center font-display text-sm font-black text-[#e06048]">VS</div> : id === 'money' ? <div className="grid h-full place-items-center text-2xl">🪙</div> : Symbol ? <Symbol /> : <div className="grid h-full place-items-center text-[8px] text-white">{id}</div>;
  };

  return (
    <div className="line-slot relative min-h-[calc(100dvh-56px)] overflow-hidden bg-black px-3 pb-6 pt-14 sm:px-6 sm:pb-5 sm:pt-16">
      <div className="pointer-events-none absolute inset-0 opacity-45" aria-hidden="true">{scene}</div>
      <div className="relative z-10 mx-auto grid w-full max-w-6xl items-center gap-4 lg:min-h-[calc(100dvh-132px)] lg:grid-cols-[minmax(0,1fr)_300px]">
        <section aria-label={`${title} reels`} className="relative min-w-0 rounded-lg border border-white/15 bg-[#121317]/95 p-3 shadow-xl sm:p-5">
          <header className="mb-3 flex items-center justify-between gap-3 text-white">
            <div className="min-w-0"><h1 className="font-display text-lg font-bold sm:text-2xl">{title}</h1><p className="mt-1 text-[9px] tracking-wide text-white/65 sm:text-[10px]">{subtitle}</p></div>
            <div className="shrink-0 text-right"><div className="text-[9px] uppercase tracking-widest text-white/60">Round win</div><div className="font-mono text-lg font-black sm:text-2xl" style={{ color: accent }}>{fmtCurrency(lastWin)}</div></div>
          </header>
          <div className="line-reel-window mx-auto w-full overflow-hidden rounded-md border border-white/15 bg-black/60 p-2" style={{ '--reel-aspect': profile.cols / profile.rows } as CSSProperties}>
            {reelTarget ? <SpinReel key={spinToken.current} cfg={reelConfig} finalGrid={Array.from({ length: profile.cols }, (_, col) => Array.from({ length: profile.rows }, (_, row) => ({ symbolId: reelTarget.initialGrid[row * profile.cols + col]!, key: `line-${spinToken.current}-${row * profile.cols + col}` })))} renderCell={({ symbolId }) => symbolArt(symbolId)} durationMs={turbo ? 240 : 650} staggerMs={turbo ? 70 : 140} onComplete={() => resolveReels.current?.()} /> : <div className="grid gap-[6px]" style={{ gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${profile.rows}, minmax(0, 1fr))`, aspectRatio: `${profile.cols} / ${profile.rows}` }}>
              {grid.map((id, index) => {
                const isWinner = winning.includes(index);
                return <motion.div key={index} data-slot-cell-key={`line-${spinToken.current}-${index}`} data-symbol={id} aria-label={`Reel ${index % profile.cols + 1}, row ${Math.floor(index / profile.cols) + 1}: ${id}${isWinner ? ', winning symbol' : ''}`} className="cell line-slot-cell relative min-h-0 min-w-0 overflow-hidden" style={{ outline: isWinner ? `1px solid ${accent}` : undefined, background: isWinner ? `${accent}18` : undefined }} animate={reduceMotion ? {} : { scale: isWinner ? [1, 1.04, 1] : 1 }} transition={{ duration: .35 }}>
                  {symbolArt(id)}
                  {(moneyValues[index] ?? 0) > 0 && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-sm bg-[#e4bf75] px-1.5 font-mono text-[9px] font-bold text-black sm:text-xs">{moneyValues[index]}×</span>}
                </motion.div>;
              })}
            </div>}
          </div>
          <p role="status" aria-live="polite" className="mt-3 min-h-6 text-center font-mono text-xs font-bold sm:text-sm" style={{ color: accent }}>{feature}</p>
        </section>
        <aside className="rounded-lg border border-white/10 bg-[#101218]/95 p-4 text-white shadow-xl">
          <div className="mb-3 flex items-center justify-between border-b border-white/10 px-1 pb-3"><span className="text-[10px] uppercase tracking-widest text-white/60">Free spins</span><strong className="font-mono text-xl">{freeRemaining}</strong></div>
          {profile.feature === 'wanted' && <label className="mb-3 block text-xs text-white/70">Bonus style<select value={wantedBonus} onChange={(event) => setWantedBonus(event.target.value as WantedBonus)} disabled={busy} className="mt-1 w-full rounded-lg border border-white/15 bg-[#181818] p-2.5 text-xs text-white"><option value="train-robbery">Great Train Robbery</option><option value="duel-at-dawn">Duel at Dawn</option><option value="dead-mans-hand">Dead Man's Hand</option></select></label>}
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <button onClick={() => busy ? requestSkip() : void spin()} disabled={!busy && (!validBet || balance.balance < bet)} className="mt-3 min-h-12 w-full rounded-md px-3 py-3 text-sm font-bold text-black disabled:opacity-50" style={{ background: accent }}>{busy ? 'Skip to result' : `Spin · ${fmtCurrency(bet)}`}</button>
          <div className="mt-3 flex gap-2"><button aria-pressed={turbo} onClick={() => setTurbo((value) => !value)} className="min-h-11 flex-1 rounded-md border border-white/15 px-2 text-xs">Turbo {turbo ? 'on' : 'off'}</button><button onClick={() => setInfoOpen(true)} className="min-h-11 flex-1 rounded-md border border-white/15 px-2 text-xs">Rules & pays</button></div>
          {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
          <p className="mt-3 text-[10px] leading-relaxed text-white/55">Play-money interpretation with local odds and artwork. Each complete round, including free spins, is saved before its animation. Space spins or skips.</p>
        </aside>
      </div>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title={`${title} · Local rules`} width="lg">
        <p className="mb-4 text-sm text-ink-dim">Wins run left to right on {profile.paylines.length} fixed lines. The best eligible symbol win is paid once per line. Values below multiply the line stake (total bet ÷ {profile.paylines.length}). The whole-round limit is {profile.maxWin.toLocaleString()}× the starting bet. Local probabilities and paylines are approximations.</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{profile.symbols.filter((entry) => entry.pay).map((entry) => <div key={entry.id} className="rounded-xl border border-edge p-3"><strong className="text-sm capitalize">{entry.id}</strong><p className="mt-1 text-xs text-ink-dim">{Object.entries(entry.pay ?? {}).map(([count, multiplier]) => `${count}: ${fmtMultiplier(multiplier)}`).join(' · ')}</p></div>)}</div>
        <p className="mt-4 text-sm text-ink-dim">3 / 4 / 5+ scatters pay 2× / 10× / 50× the total stake.{profile.freeSpins > 0 ? ` Three or more also award ${profile.freeSpins} free spins, including retriggers. The stake and bonus style stay fixed for the feature.` : ''}</p>
        {profile.feature === 'wolf' && <p className="mt-3 text-sm text-ink-dim">Six Money symbols start three respins. New Money is held and resets the counter to three. All held values are collected when respins end; a full board pays at least 1,000×. Free spins can expand a regular symbol on the middle reels.</p>}
        {profile.feature === 'wanted' && <p className="mt-3 text-sm text-ink-dim">VS symbols expand their reels into Wilds. Train Robbery adds a middle Wild reel in free spins; Duel at Dawn increases VS frequency; Dead Man’s Hand applies a random 1–10× multiplier to free-spin line wins.</p>}
        <details className="mt-4 text-sm"><summary className="cursor-pointer py-2">Show the {profile.paylines.length} local paylines</summary><div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">{profile.paylines.map((line, index) => <div key={index} className="rounded-lg bg-white/5 p-2"><span className="text-[10px] text-ink-mute">Line {index + 1}</span><svg viewBox={`0 0 ${profile.cols * 20} ${profile.rows * 14}`} role="img" aria-label={`Line ${index + 1}, rows ${line.map((row) => row + 1).join(', ')}`}><polyline points={line.map((row, col) => `${10 + col * 20},${7 + row * 14}`).join(' ')} stroke={accent} strokeWidth="2" fill="none" /></svg></div>)}</div></details>
      </Modal>
    </div>
  );
}
