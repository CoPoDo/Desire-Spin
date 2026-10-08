import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { useSlotPlayback } from '../_shared/useSlotPlayback';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useHotkey } from '../../../hooks/useHotkey';
import { Modal } from '../../../components/ui/Modal';
import { BetInput } from '../../originals/_shared/BetInput';
import { SUGAR_SYMBOL_MAP } from './symbols';
import '../_shared/presentation.css';
import { SugarRushScene } from './Scene';
import { playSugarRound, clusterPay, SUGAR_SYMBOLS, SUGAR_SIZE, type MultiplierSpots, type SugarFrame, type SugarSymbol } from './engine';

const EMPTY_GRID: SugarSymbol[] = Array.from({ length: SUGAR_SIZE * SUGAR_SIZE }, (_, index) => ['candy-blue', 'candy-pink', 'mint', 'gum'][index % 4] as SugarSymbol);

export function SugarRush() {
  const { balance, fairness, history, session, sound } = useGame();
  const reduceMotion = useReducedMotion();
  const [bet, setBet] = usePersistedBet('slot:sugar-rush', 1);
  const { busy, error, setError, start, finish, skip, wait, alive, skipped } = useSlotPlayback();
  const [buyOpen, setBuyOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [incoming, setIncoming] = useState<number[]>([]);
  const [status, setStatus] = useState('Five or more connected candies win');
  const [cellKeys, setCellKeys] = useState(EMPTY_GRID.map((_, index) => `initial-${index}`));
  const [grid, setGrid] = useState<SugarSymbol[]>(EMPTY_GRID);
  const [spots, setSpots] = useState<MultiplierSpots>(new Array(49).fill(0));
  const [winning, setWinning] = useState<number[]>([]);
  const [win, setWin] = useState(0);
  const [freeRemaining, setFreeRemaining] = useState(0);

  const playFrames = useCallback(async (frames: readonly SugarFrame[]) => {
    for (const frame of frames) {
      if (!alive.current) return;
      setGrid(frame.grid);
      setCellKeys(frame.cellKeys);
      setSpots(frame.spots);
      setWinning(frame.winningPositions);
      setIncoming(frame.incomingPositions ?? []);
      if (frame.winningPositions.length && !skipped.current) sound.play('win');
      await wait(reduceMotion ? 0 : turbo ? 110 : frame.winningPositions.length ? 520 : 380);
    }
    if (alive.current) { setWinning([]); setIncoming([]); }
  }, [reduceMotion, sound, alive, skipped, turbo, wait]);

  const run = useCallback(async (buy = false) => {
    const wager = bet;
    const cost = +(wager * (buy ? 100 : 1)).toFixed(2);
    if (!Number.isFinite(wager) || wager <= 0 || !balance.canAfford(cost) || !start()) return;
    let debited = false;
    let settled = false;
    try {
      if (!balance.debit(cost)) return;
      debited = true;
      const seeds = fairness.consumeNonce();
      const round = playSugarRound(createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce), wager, buy);
      if (round.totalPayout > 0) balance.credit(round.totalPayout);
      settled = true;
      history.record({ game: buy ? 'Sugar Rush · Bonus Buy' : 'Sugar Rush', bet: cost, payout: round.totalPayout, multiplier: round.totalPayout / cost, serverSeedHash: fairness.hash, clientSeed: seeds.clientSeed, nonce: seeds.nonce });
      session.recordSpin(cost, round.totalPayout, round.freeSpinsAwarded > 0);
      setWin(0);
      setSpots(new Array(49).fill(0));
      let displayed = 0;
      for (const entry of round.spins) {
        if (!alive.current) return;
        setFreeRemaining(entry.free ? entry.remaining : 0);
        setStatus(entry.free ? `Free spins · ${entry.remaining} remaining` : 'Candies tumbling');
        await playFrames(entry.result.frames);
        if (!alive.current) return;
        displayed = +(displayed + entry.result.totalPayout).toFixed(2);
        setWin(displayed);
        if (entry.result.freeSpinsAwarded && !round.capped) {
          setStatus(`+${entry.result.freeSpinsAwarded} free spins`);
          await wait(reduceMotion ? 0 : 650);
        }
      }
      if (alive.current) {
        setWin(round.totalPayout);
        setStatus(round.capped ? 'Maximum round win reached · 5,000×' : round.totalPayout > 0 ? `${fmtCurrency(round.totalPayout)} total win` : 'No win · ready for the next spin');
      }
    } catch {
      if (debited && !settled) balance.credit(cost);
      if (alive.current) setError(settled ? 'Presentation interrupted. Your result is saved in history.' : 'The spin could not start. Your stake was returned.');
    } finally {
      if (alive.current) setFreeRemaining(0);
      finish();
    }
  }, [bet, balance, start, fairness, history, session, alive, playFrames, wait, reduceMotion, setError, finish]);
  useHotkey(' ', () => { if (busy) skip(); else void run(); }, !buyOpen && !infoOpen);

  const activeMultiplierCount = useMemo(() => spots.filter(Boolean).length, [spots]);

  return (
    <div className="sugar-slot relative min-h-[calc(100dvh-56px)] overflow-hidden bg-[#201225] px-3 pb-4 pt-14 sm:px-6 sm:pb-5 sm:pt-16">
      <div className="absolute inset-0 opacity-40 pointer-events-none"><SugarRushScene /></div>
      <div className="relative z-10 mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(0,580px)_320px] lg:items-center lg:justify-center">
        <section className="rounded-xl border border-[#d88ba8]/40 bg-[#3e174b]/95 p-3 shadow-xl sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 text-white sm:flex">
            <div>
              <h1 className="font-display text-xl font-black tracking-tight sm:text-4xl">SUGAR RUSH</h1>
              <div className="mt-1 text-[10px] tracking-wide text-white/60">7 × 7 cluster pays · multiplier spots</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="text-[9px] uppercase tracking-widest text-white/60">Win</div>
              <div className="font-mono text-xl font-black text-[#fff36e]">{fmtCurrency(win)}</div>
            </div>
          </div>
          <div className="sugar-candy-board relative mx-auto w-full overflow-hidden rounded-lg border border-[#c77c9a]/35 bg-[#26112e] p-2 sm:p-3">
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5" aria-hidden="true">
              {spots.map((multiplier, index) => <div key={index} className="relative aspect-square rounded-md" style={{ background: multiplier ? '#95456655' : '#ffffff08', boxShadow: multiplier ? 'inset 0 0 0 1px #d7789c55' : undefined }}>
                {multiplier > 0 && <span className="absolute right-0 top-0 z-10 rounded-bl-md bg-[#9c345a] px-1 py-0.5 font-mono text-[8px] font-bold text-white sm:text-[10px]">{multiplier}×</span>}
              </div>)}
            </div>
            <div className="absolute inset-2 grid grid-cols-7 gap-1 sm:inset-3 sm:gap-1.5">
              <AnimatePresence mode="popLayout" initial={false}>
                {grid.map((symbolId, index) => {
                  const Symbol = SUGAR_SYMBOL_MAP[symbolId];
                  const isWinner = winning.includes(index);
                  const fresh = incoming.includes(index);
                  return <motion.div key={cellKeys[index]} data-slot-cell-key={cellKeys[index]} data-symbol={symbolId} data-position={index} layout={reduceMotion ? false : 'position'} className="relative aspect-square min-h-0 min-w-0 p-1" aria-label={`Row ${Math.floor(index / 7) + 1}, column ${index % 7 + 1}: ${symbolId}`} initial={reduceMotion ? false : { y: -90, opacity: 0 }} animate={reduceMotion ? { opacity: isWinner ? .6 : 1 } : { y: 0, scale: isWinner ? [1, 1.08, .75] : 1, opacity: isWinner ? [1, 1, .25] : 1 }} exit={{ opacity: 0, scale: .65, transition: { duration: reduceMotion ? 0 : .12 } }} transition={{ duration: reduceMotion ? 0 : turbo ? .1 : .3, delay: fresh && !turbo && !reduceMotion ? (index % 7) * .025 : 0, layout: { duration: turbo ? .1 : .32, ease: [.25, .75, .35, 1] } }}>
                    {Symbol ? <Symbol /> : <span className="text-[8px]">{symbolId}</span>}
                  </motion.div>;
                })}
              </AnimatePresence>
            </div>
          </div>
          <p role="status" aria-live="polite" className="mt-3 min-h-5 text-center text-xs font-bold text-[#fff36e]">{status}</p>
        </section>

        <aside className="rounded-xl border border-white/10 bg-[#170e1b]/95 p-4 text-white shadow-2xl backdrop-blur-md">
          <div className="mb-3 grid grid-cols-2 divide-x divide-white/10">
            <div className="px-3 py-2"><div className="text-[9px] uppercase tracking-widest text-white/50">Free spins</div><div className="font-mono text-xl font-bold">{freeRemaining}</div></div>
            <div className="px-3 py-2"><div className="text-[9px] uppercase tracking-widest text-white/50">Hot spots</div><div className="font-mono text-xl font-bold">{activeMultiplierCount}</div></div>
          </div>
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <button onClick={() => busy ? skip() : void run()} disabled={!busy && (bet <= 0 || balance.balance < bet)} className="mt-3 w-full rounded-xl bg-[#ff3fa4] py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,63,164,.45)] disabled:opacity-50">
            {busy ? 'Skip to result' : `Spin · ${fmtCurrency(bet)}`}
          </button>
          <button onClick={() => setBuyOpen(true)} disabled={busy || bet <= 0 || balance.balance < bet * 100} className="mt-2 w-full rounded-xl border border-[#fff36e]/50 bg-[#fff36e]/10 py-2.5 text-xs font-bold uppercase tracking-wider text-[#fff36e] disabled:opacity-50">
            Buy 10 free spins · {fmtCurrency(bet * 100)}
          </button>
          <button aria-pressed={turbo} onClick={() => setTurbo((value) => !value)} className="mt-2 min-h-11 w-full rounded-xl border border-white/20 text-xs">Turbo {turbo ? 'on' : 'off'}</button>
          <button onClick={() => setInfoOpen(true)} className="mt-2 min-h-11 w-full rounded-xl border border-white/20 text-xs">Rules & pays</button>
          {error && <p role="alert" className="mt-3 text-xs text-red-300">{error}</p>}
          <p className="mt-3 text-[10px] leading-relaxed text-white/50">Five or more connected candies win. Winning positions become 2× spots and double on every later hit, up to 128×. Spots persist throughout free spins. Maximum round win: 5,000×.</p>
          <p className="mt-2 text-[10px] leading-relaxed text-white/50">Local play-money interpretation with approximate odds. The full round is saved before its animation; leaving does not lose free-spin wins.</p>
        </aside>
      </div>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Sugar Rush · Local paytable" width="lg">
        <p className="mb-4 text-sm text-ink-dim">Five or more identical candies connected horizontally or vertically form a cluster. Values multiply the starting stake. A winning position becomes 2× after its first hit, doubling after each later hit up to 128×. Existing multipliers in a winning cluster are added together. Spots reset for a paid spin and persist through its free-spin feature.</p>
        <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">Local cluster payout multipliers by candy and cluster size</caption><thead><tr><th className="p-2 text-left">Candy</th>{[5, 6, 8, 10, 12, 15].map((size) => <th className="p-2" key={size}>{size}+</th>)}</tr></thead><tbody>{SUGAR_SYMBOLS.map((symbol) => <tr className="border-t border-edge" key={symbol}><th className="p-2 text-left font-normal capitalize">{symbol.replace('candy-', '')}</th>{[5, 6, 8, 10, 12, 15].map((size) => <td className="p-2 text-right font-mono" key={size}>{clusterPay(symbol, size).toFixed(2)}×</td>)}</tr>)}</tbody></table></div>
        <p className="mt-4 text-sm text-ink-dim">3 / 4 / 5 / 6 / 7+ lollipops award 10 / 12 / 15 / 20 / 30 free spins. This also applies to retriggers. All base and free-spin wins share one 5,000× round limit. These are local play-money rules and approximate odds.</p>
      </Modal>
      <Modal open={buyOpen} onClose={() => setBuyOpen(false)} title="Buy free spins?" width="sm">
        <p className="text-sm text-ink-dim">Spend {fmtCurrency(bet * 100)} play credits for 10 free spins at a locked {fmtCurrency(bet)} stake. Wins are random and can be less than the cost.</p>
        <div className="mt-5 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setBuyOpen(false)}>Cancel</button><button disabled={busy || !balance.canAfford(bet * 100)} className="btn-primary flex-1" onClick={() => { setBuyOpen(false); void run(true); }}>Buy · {fmtCurrency(bet * 100)}</button></div>
      </Modal>
    </div>
  );
}
