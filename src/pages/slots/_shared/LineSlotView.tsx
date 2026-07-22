import { useCallback, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../../originals/_shared/BetInput';
import { spinLineSlot, type LineSlotProfile, type WantedBonus } from './lineEngine';

export function LineSlotView({ profile, title, subtitle, scene, symbolMap, accent }: {
  profile: LineSlotProfile;
  title: string;
  subtitle: string;
  scene: ReactNode;
  symbolMap: Record<string, ComponentType>;
  accent: string;
}) {
  const { balance, fairness, history, session, sound } = useGame();
  const reduceMotion = useReducedMotion();
  const fallback = useMemo(() => profile.symbols.filter((entry) => entry.weight > 0).map((entry) => entry.id), [profile]);
  const [grid, setGrid] = useState(() => Array.from({ length: profile.cols * profile.rows }, (_, index) => fallback[index % fallback.length]!));
  const [bet, setBet] = useState(1);
  const [busy, setBusy] = useState(false);
  const [spinningReel, setSpinningReel] = useState<number | null>(null);
  const [winning, setWinning] = useState<number[]>([]);
  const [moneyValues, setMoneyValues] = useState<number[]>([]);
  const [lastWin, setLastWin] = useState(0);
  const [feature, setFeature] = useState<string | null>(null);
  const [freeRemaining, setFreeRemaining] = useState(0);
  const [wantedBonus, setWantedBonus] = useState<WantedBonus>('duel-at-dawn');

  const reveal = useCallback(async (result: ReturnType<typeof spinLineSlot>) => {
    setWinning([]);
    setFeature(null);
    for (let reel = 0; reel < profile.cols; reel++) {
      setSpinningReel(reel);
      await new Promise<void>((resolve) => window.setTimeout(resolve, reduceMotion ? 30 : 160 + reel * 25));
      setGrid((previous) => {
        const next = [...previous];
        for (let row = 0; row < profile.rows; row++) next[row * profile.cols + reel] = result.grid[row * profile.cols + reel]!;
        return next;
      });
      sound.play('drop');
    }
    setSpinningReel(null);
    setMoneyValues(result.moneyValues);
    setWinning(result.winningPositions);
    setFeature(result.featureName ?? (result.freeSpinsAwarded ? `${result.freeSpinsAwarded} Free Spins` : null));
    setLastWin(result.payout);
  }, [profile.cols, profile.rows, reduceMotion, sound]);

  const runFreeSpins = useCallback(async (count: number, wager: number) => {
    let remaining = count;
    while (remaining > 0) {
      setFreeRemaining(remaining);
      const seeds = fairness.consumeNonce();
      const result = spinLineSlot(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), profile, wager, 'free', wantedBonus);
      await reveal(result);
      if (result.payout > 0) balance.credit(result.payout);
      history.record({ game: `${title} FS`, bet: 0, payout: result.payout, multiplier: result.multiplier, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
      session.recordSpin(0, result.payout, true);
      remaining--;
      if (result.freeSpinsAwarded) remaining += result.freeSpinsAwarded;
    }
    setFreeRemaining(0);
  }, [balance, fairness, history, profile, reveal, session, title, wantedBonus]);

  const spin = useCallback(async () => {
    if (busy || bet <= 0 || balance.balance < bet) return;
    setBusy(true);
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const result = spinLineSlot(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), profile, bet, 'base', wantedBonus);
    await reveal(result);
    if (result.payout > 0) balance.credit(result.payout);
    history.record({ game: title, bet, payout: result.payout, multiplier: result.multiplier, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
    session.recordSpin(bet, result.payout, false);
    if (result.freeSpinsAwarded) await runFreeSpins(result.freeSpinsAwarded, bet);
    setBusy(false);
  }, [balance, bet, busy, fairness, history, profile, reveal, runFreeSpins, session, title, wantedBonus]);

  return (
    <div className="relative min-h-[calc(100dvh-56px)] overflow-hidden bg-black px-3 pb-4 pt-14 sm:px-6 sm:py-4">
      <div className="absolute inset-0 pointer-events-none opacity-80">{scene}</div>
      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-88px)] w-full max-w-6xl items-center gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="rounded-[26px] border border-white/20 bg-black/55 p-3 shadow-2xl backdrop-blur-sm sm:p-5">
          <header className="mb-3 flex items-end justify-between text-white">
            <div className="hidden sm:block"><h1 className="font-display text-2xl font-black sm:text-4xl">{title}</h1><p className="text-[10px] uppercase tracking-[0.22em] text-white/60">{subtitle}</p></div>
            <div className="text-right"><div className="text-[9px] uppercase tracking-widest text-white/50">Win</div><div className="font-mono text-xl font-black" style={{ color: accent }}>{fmtCurrency(lastWin)}</div></div>
          </header>
          <div className="grid gap-1.5 rounded-2xl border border-white/20 bg-black/55 p-2 sm:gap-2 sm:p-3" style={{ gridTemplateColumns: `repeat(${profile.cols}, minmax(0, 1fr))` }}>
            {grid.map((id, index) => {
              const Symbol = symbolMap[id];
              const reel = index % profile.cols;
              const isWinner = winning.includes(index);
              return (
                <motion.div key={index} className="relative aspect-square overflow-hidden rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-black/35 p-1" animate={reel === spinningReel ? { y: [-16, 16, -10], filter: 'blur(3px)' } : isWinner ? { scale: [1, 1.1, 1], filter: `drop-shadow(0 0 10px ${accent})` } : { y: 0, scale: 1, filter: 'blur(0px)' }} transition={{ duration: reel === spinningReel ? 0.18 : 0.55, repeat: isWinner ? Infinity : 0 }}>
                  {id === 'wild' ? <div className="grid h-full place-items-center font-display text-[10px] font-black text-[#ffd166] sm:text-base">WILD</div> : id === 'vs' ? <div className="grid h-full place-items-center font-display text-sm font-black text-red-500">VS</div> : id === 'money' ? <div className="grid h-full place-items-center text-2xl">🪙</div> : Symbol ? <Symbol /> : <div className="grid h-full place-items-center text-[8px] text-white">{id}</div>}
                  {(moneyValues[index] ?? 0) > 0 && <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 rounded-full bg-[#ffd166] px-1 font-mono text-[8px] font-black text-black">{moneyValues[index]}×</span>}
                </motion.div>
              );
            })}
          </div>
          <AnimatePresence>{feature && <motion.div key={feature} initial={{ opacity: 0, scale: .8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="pointer-events-none absolute inset-0 grid place-items-center"><div className="rounded-2xl border-2 bg-black/85 px-6 py-4 font-display text-2xl font-black uppercase text-white shadow-2xl" style={{ borderColor: accent, textShadow: `0 0 18px ${accent}` }}>{feature}</div></motion.div>}</AnimatePresence>
        </section>
        <aside className="rounded-2xl border border-white/15 bg-[#101218]/92 p-4 text-white shadow-2xl backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between rounded-xl bg-white/5 p-3"><span className="text-[10px] uppercase tracking-widest text-white/50">Free spins</span><strong className="font-mono text-xl">{freeRemaining}</strong></div>
          {profile.feature === 'wanted' && <div className="mb-3"><div className="mb-1 text-[10px] uppercase tracking-wider text-white/50">Bonus target</div><select value={wantedBonus} onChange={(event) => setWantedBonus(event.target.value as WantedBonus)} disabled={busy} className="w-full rounded-lg border border-white/10 bg-black/40 p-2 text-xs"><option value="train-robbery">Great Train Robbery</option><option value="duel-at-dawn">Duel at Dawn</option><option value="dead-mans-hand">Dead Man's Hand</option></select></div>}
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <button onClick={() => void spin()} disabled={busy || bet <= 0 || balance.balance < bet} className="mt-3 w-full rounded-xl py-3.5 text-sm font-black uppercase tracking-widest text-black disabled:opacity-50" style={{ background: accent, boxShadow: `0 0 20px ${accent}66` }}>{busy ? 'Reels spinning…' : `Spin · ${fmtCurrency(bet)}`}</button>
        </aside>
      </div>
    </div>
  );
}
