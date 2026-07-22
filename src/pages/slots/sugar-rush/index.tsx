import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../../originals/_shared/BetInput';
import { SUGAR_SYMBOL_MAP } from './symbols';
import { SugarRushScene } from './Scene';
import { playSugarSpin, SUGAR_SIZE, type MultiplierSpots, type SugarFrame, type SugarSymbol } from './engine';

const EMPTY_GRID: SugarSymbol[] = Array.from({ length: SUGAR_SIZE * SUGAR_SIZE }, (_, index) => ['candy-blue', 'candy-pink', 'mint', 'gum'][index % 4] as SugarSymbol);

export function SugarRush() {
  const { balance, fairness, history, session, sound } = useGame();
  const reduceMotion = useReducedMotion();
  const [bet, setBet] = useState(1);
  const [grid, setGrid] = useState<SugarSymbol[]>(EMPTY_GRID);
  const [spots, setSpots] = useState<MultiplierSpots>(new Array(49).fill(0));
  const [winning, setWinning] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [win, setWin] = useState(0);
  const [freeRemaining, setFreeRemaining] = useState(0);

  const playFrames = useCallback(async (frames: readonly SugarFrame[]) => {
    for (const frame of frames) {
      setGrid(frame.grid);
      setSpots(frame.spots);
      setWinning(frame.winningPositions);
      if (frame.winningPositions.length) sound.play('win');
      await new Promise<void>((resolve) => window.setTimeout(resolve, reduceMotion ? 80 : frame.winningPositions.length ? 520 : 300));
    }
    setWinning([]);
  }, [reduceMotion, sound]);

  const runFeature = useCallback(async (count: number, wager: number) => {
    let remaining = count;
    let persistent = new Array(49).fill(0);
    while (remaining > 0) {
      setFreeRemaining(remaining);
      const seeds = fairness.consumeNonce();
      const result = playSugarSpin(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), wager, persistent);
      persistent = result.spots;
      await playFrames(result.frames);
      if (result.totalPayout > 0) balance.credit(result.totalPayout);
      setWin((value) => +(value + result.totalPayout).toFixed(2));
      remaining--;
      if (result.freeSpinsAwarded > 0) remaining += result.freeSpinsAwarded;
      history.record({ game: 'Sugar Rush FS', bet: 0, payout: result.totalPayout, multiplier: result.totalPayout / wager, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
      session.recordSpin(0, result.totalPayout, true);
    }
    setFreeRemaining(0);
    setSpots(new Array(49).fill(0));
  }, [balance, fairness, history, playFrames, session]);

  const spin = useCallback(async () => {
    if (busy || bet <= 0 || balance.balance < bet) return;
    setBusy(true);
    setWin(0);
    setSpots(new Array(49).fill(0));
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const result = playSugarSpin(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), bet);
    await playFrames(result.frames);
    if (result.totalPayout > 0) balance.credit(result.totalPayout);
    setWin(result.totalPayout);
    history.record({ game: 'Sugar Rush', bet, payout: result.totalPayout, multiplier: result.totalPayout / bet, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
    session.recordSpin(bet, result.totalPayout, false);
    if (result.freeSpinsAwarded) await runFeature(result.freeSpinsAwarded, bet);
    setBusy(false);
  }, [balance, bet, busy, fairness, history, playFrames, runFeature, session]);

  const buyFeature = useCallback(async () => {
    const cost = bet * 100;
    if (busy || bet <= 0 || balance.balance < cost) return;
    setBusy(true);
    setWin(0);
    balance.debit(cost);
    session.recordSpin(cost, 0, false);
    await runFeature(10, bet);
    setBusy(false);
  }, [balance, bet, busy, runFeature, session]);

  const activeMultiplierCount = useMemo(() => spots.filter(Boolean).length, [spots]);

  return (
    <div className="relative min-h-[calc(100dvh-56px)] overflow-hidden bg-[#4c176b] px-3 pb-4 pt-14 sm:px-6 sm:py-4">
      <div className="absolute inset-0 opacity-70 pointer-events-none"><SugarRushScene /></div>
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,580px)_320px] lg:items-center lg:justify-center">
        <section className="rounded-[28px] border border-white/30 bg-[#9c3db3]/75 p-3 shadow-[0_24px_80px_rgba(30,5,45,.55)] backdrop-blur-sm sm:p-5">
          <div className="mb-3 hidden items-center justify-between gap-3 text-white sm:flex">
            <div>
              <div className="font-display text-2xl font-black tracking-tight sm:text-4xl">SUGAR RUSH</div>
              <div className="text-[10px] font-bold uppercase tracking-[0.24em] text-white/70">7×7 cluster pays · multiplier spots double to 128×</div>
            </div>
            <div className="text-right">
              <div className="text-[9px] uppercase tracking-widest text-white/60">Win</div>
              <div className="font-mono text-xl font-black text-[#fff36e]">{fmtCurrency(win)}</div>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 rounded-2xl border border-white/25 bg-[#5a1c70]/85 p-2 sm:gap-1.5 sm:p-3">
            {grid.map((symbolId, index) => {
              const Symbol = SUGAR_SYMBOL_MAP[symbolId];
              const multiplier = spots[index] ?? 0;
              const isWinner = winning.includes(index);
              return (
                <motion.div
                  key={index}
                  className="relative aspect-square rounded-[22%] border border-white/20 bg-gradient-to-b from-white/25 to-white/5 p-1 shadow-inner"
                  animate={isWinner ? { scale: [1, 1.12, 0.78], opacity: [1, 1, 0.35] } : { scale: 1, opacity: 1 }}
                  transition={{ duration: reduceMotion ? 0.05 : 0.45 }}
                >
                  {Symbol ? <Symbol /> : <span className="text-[8px]">{symbolId}</span>}
                  <AnimatePresence>
                    {multiplier > 0 && (
                      <motion.span
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="absolute -right-1 -top-1 z-10 rounded-full border border-white bg-[#ff3fa4] px-1 py-0.5 font-mono text-[8px] font-black text-white shadow-[0_0_9px_#ff3fa4] sm:text-[10px]"
                      >
                        {multiplier}×
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </section>

        <aside className="rounded-2xl border border-white/15 bg-[#170720]/90 p-4 text-white shadow-2xl backdrop-blur-md">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-white/5 p-3"><div className="text-[9px] uppercase tracking-widest text-white/50">Free spins</div><div className="font-mono text-xl font-bold">{freeRemaining}</div></div>
            <div className="rounded-xl bg-white/5 p-3"><div className="text-[9px] uppercase tracking-widest text-white/50">Hot spots</div><div className="font-mono text-xl font-bold">{activeMultiplierCount}</div></div>
          </div>
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <button onClick={() => void spin()} disabled={busy || bet <= 0 || balance.balance < bet} className="mt-3 w-full rounded-xl bg-[#ff3fa4] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,63,164,.45)] disabled:opacity-50">
            {busy ? 'Tumbling…' : `Spin · ${fmtCurrency(bet)}`}
          </button>
          <button onClick={() => void buyFeature()} disabled={busy || bet <= 0 || balance.balance < bet * 100} className="mt-2 w-full rounded-xl border border-[#fff36e]/50 bg-[#fff36e]/10 py-2.5 text-xs font-bold uppercase tracking-wider text-[#fff36e] disabled:opacity-50">
            Buy 10 free spins · {fmtCurrency(bet * 100)}
          </button>
          <p className="mt-3 text-[10px] leading-relaxed text-white/50">Five or more connected candies win. Winning positions become 2× spots and double on every later hit, up to 128×. Spots persist throughout free spins.</p>
        </aside>
      </div>
    </div>
  );
}
