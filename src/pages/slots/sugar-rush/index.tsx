import { useCallback, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useCascadeExit } from '../_shared/Grid';
import { useGravityMotion, CASCADE_CLEAR_MS } from '../_shared/cascadeMotion';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { useSlotPlayback } from '../_shared/useSlotPlayback';
import { usePersistedBet } from '../../../hooks/usePersistedBet';
import { useHotkey } from '../../../hooks/useHotkey';
import { Modal } from '../../../components/ui/Modal';
import { BetInput } from '../../originals/_shared/BetInput';
import { ArtworkGate } from '../_shared/ArtworkGate';
import { CabinetControls } from '../_shared/CabinetControls';
import { TurboIcon, InfoIcon } from '../../../components/ui/icons';
import '../_shared/authored-cabinets.css';
import { SUGAR_SYMBOL_MAP } from './symbols';
import '../_shared/presentation.css';
import { SugarRushScene } from './Scene';
import { playSugarRound, clusterPay, SUGAR_SYMBOLS, SUGAR_SIZE, type MultiplierSpots, type SugarFrame, type SugarSymbol } from './engine';

const EMPTY_GRID: SugarSymbol[] = Array.from({ length: SUGAR_SIZE * SUGAR_SIZE }, (_, index) => SUGAR_SYMBOLS[(index * 5 + Math.floor(index / 7) * 3) % SUGAR_SYMBOLS.length]!);

const SUGAR_ASSETS = ['/art-v2/sugar/bakery-world.webp', '/art-v2/sugar/symbols-atlas.webp'];
const BET_PRESETS = [0.2, 0.5, 1, 2, 5, 10, 20, 50, 100];
export function SugarRush() { return <ArtworkGate assets={SUGAR_ASSETS} title="Sugar Rush" color="#cda7b1"><SugarRushGame /></ArtworkGate>; }
function SugarRushGame() {
  const { balance, fairness, history, session, sound } = useGame();
  const reduceMotion = useReducedMotion();
  const [bet, setBet] = usePersistedBet('slot:sugar-rush', 1);
  const { busy, error, setError, start, finish, skip, wait, alive, skipped } = useSlotPlayback();
  const [buyOpen, setBuyOpen] = useState(false);
  const [betOpen, setBetOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [turbo, setTurbo] = useState(false);
  const [incoming, setIncoming] = useState<number[]>([]);
  const roundKey = useRef(0);
  const [status, setStatus] = useState('Five or more connected candies win');
  const [cellKeys, setCellKeys] = useState(EMPTY_GRID.map((_, index) => `initial-${index}`));
  const [grid, setGrid] = useState<SugarSymbol[]>(EMPTY_GRID);
  const [spots, setSpots] = useState<MultiplierSpots>(new Array(49).fill(0));
  const [marked, setMarked] = useState<boolean[]>(new Array(49).fill(false));
  const [winning, setWinning] = useState<number[]>([]);
  const [win, setWin] = useState(0);
  const [inFree, setInFree] = useState(false);
  const [freeRemaining, setFreeRemaining] = useState(0);
  const cells = useMemo(() => grid.map((symbolId, index) => ({ key: cellKeys[index]!, symbolId, index, col: index % 7, row: Math.floor(index / 7) })), [grid, cellKeys]);
  const motionSpeed = reduceMotion || skipped.current ? 0 : turbo ? .5 : 1;
  const freshKeys = useMemo(() => new Set(incoming.map(index => cellKeys[index]!)), [incoming, cellKeys]);
  const leaving = useCascadeExit(cells, CASCADE_CLEAR_MS * motionSpeed);
  const bindCell = useGravityMotion(cells, freshKeys, motionSpeed, 3, phase => { if (!skipped.current) sound.play(`cascade-${phase}`); });

  const playFrames = useCallback(async (frames: readonly SugarFrame[]) => {
    for (const frame of frames) {
      if (!alive.current) return;
      setGrid(frame.grid);
      setCellKeys(frame.cellKeys.map((key) => `${roundKey.current}-${key}`));
      setWinning([]);
      const arrivals = frame.incomingPositions ?? (frame.cascade === 0 ? frame.grid.map((_, index) => index) : []);
      setIncoming(skipped.current || reduceMotion ? [] : arrivals);
      // Show each complete fall before announcing the next winning cluster.
      // The same keyed gravity clock drives both survivors and arrivals.
      await wait(reduceMotion ? 0 : turbo ? 370 : 740);
      if (!alive.current) return;
      setSpots(frame.spots);
      setMarked(frame.marked);
      setWinning(frame.winningPositions);
      if (frame.winningPositions.length && !skipped.current) sound.play('win');
      await wait(reduceMotion ? 0 : turbo ? 160 : frame.winningPositions.length ? 450 : 120);
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
      roundKey.current++;
      setWin(0);
      setSpots(new Array(49).fill(0));
      setMarked(new Array(49).fill(false));
      let displayed = 0;
      for (const entry of round.spins) {
        if (!alive.current) return;
        setInFree(entry.free);
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
      if (alive.current) { setFreeRemaining(0); setInFree(false); }
      finish();
    }
  }, [bet, balance, start, fairness, history, session, alive, playFrames, wait, reduceMotion, setError, finish]);
  useHotkey(' ', () => { if (busy) skip(); else void run(); }, !buyOpen && !infoOpen && !betOpen);

  const markedSpotCount = useMemo(() => marked.filter(Boolean).length, [marked]);

  return (
    <div className={`authored-game authored-sugar ${inFree ? 'is-free' : ''}`}>
      <div className="authored-world" aria-hidden="true"><SugarRushScene /></div>
      <div className="authored-layout"><div className="authored-cabinet">
        <h1 className="authored-wordmark"><strong>Sugar Rush</strong><small>THE SWEETEST LITTLE BAKERY</small></h1>
        {inFree && <div className="authored-free-hud"><span>Free spins<strong>{freeRemaining}</strong></span><span>Marked spots<strong>{markedSpotCount}</strong></span></div>}
          <div className="sugar-candy-board">
            <div className="sugar-spots" aria-hidden="true">
              {spots.map((multiplier, index) => <div key={index} className="sugar-spot" data-state={multiplier > 0 ? 'active' : marked[index] ? 'marked' : 'empty'}>
                {multiplier > 0 && <span>{multiplier}×</span>}
              </div>)}
            </div>
            <div className="sugar-candies">
                {grid.map((symbolId, index) => {
                  const Symbol = SUGAR_SYMBOL_MAP[symbolId];
                  const isWinner = winning.includes(index);
                  return <div ref={bindCell(cellKeys[index]!)} key={cellKeys[index]} data-slot-cell-key={cellKeys[index]} data-symbol={symbolId} data-position={index} className={`sugar-candy relative aspect-square min-h-0 min-w-0 ${isWinner ? 'is-winner' : ''}`} aria-label={`Row ${Math.floor(index / 7) + 1}, column ${index % 7 + 1}: ${symbolId}`} style={{ gridColumn: index % 7 + 1, gridRow: Math.floor(index / 7) + 1 }}>
                    {Symbol ? <Symbol /> : <span className="text-[8px]">{symbolId}</span>}
                  </div>;
                })}
              {leaving.map((cell) => {
                const Symbol = SUGAR_SYMBOL_MAP[cell.symbolId];
                return <motion.div key={`exit-${cell.key}`} data-slot-exiting={cell.key} aria-hidden="true" className="sugar-candy relative aspect-square min-h-0 min-w-0" initial={{ opacity: 1, scale: 1 }} animate={{ opacity: 0, scale: .85 }} transition={{ duration: CASCADE_CLEAR_MS / 1000 * motionSpeed, ease: 'easeOut' }} style={{ gridColumn: cell.index % 7 + 1, gridRow: Math.floor(cell.index / 7) + 1, pointerEvents: 'none', zIndex: 1 }}>{Symbol && <Symbol />}</motion.div>;
              })}
            </div>
          </div>
          <p role="status" aria-live="polite" className="authored-status">{status}</p>
          <CabinetControls spinLabel={busy ? 'Skip to result' : `Spin · ${fmtCurrency(bet)}`} bet={bet} win={win} busy={busy} controlsDisabled={busy} spinDisabled={!busy && (bet <= 0 || balance.balance < bet)}
            onSpin={() => busy ? skip() : void run()} onBet={() => setBetOpen(true)}
            decreaseDisabled={bet <= BET_PRESETS[0]!} increaseDisabled={bet >= BET_PRESETS[BET_PRESETS.length - 1]!}
            onDecrease={() => setBet([...BET_PRESETS].reverse().find((value) => value < bet) ?? BET_PRESETS[0]!)}
            onIncrease={() => setBet(BET_PRESETS.find((value) => value > bet) ?? BET_PRESETS[BET_PRESETS.length - 1]!)}
            toolbar={<>
              <button disabled={busy} aria-label={turbo ? 'Turbo on' : 'Turbo off'} aria-pressed={turbo} onClick={() => setTurbo((value) => !value)}><TurboIcon size={14} />Turbo</button>
              <button aria-label={`Buy free spins · ${fmtCurrency(bet * 100)}`} className="cabinet-bonus" onClick={() => setBuyOpen(true)} disabled={busy || bet <= 0 || balance.balance < bet * 100}><span>Buy free spins</span><strong>{fmtCurrency(bet * 100)}</strong></button>
              <button onClick={() => setInfoOpen(true)}><InfoIcon size={14} />Rules & pays</button>
            </>}
          />
          {error && <p role="alert" className="authored-status">{error}</p>}
      </div></div>
      <div className="authored-footnote">5+ connected pays · First win marks · Next win 2× · Play money</div>
      <Modal open={betOpen} onClose={() => setBetOpen(false)} title="Choose your stake" width="sm">
        <BetInput bet={bet} onBetChange={setBet} disabled={busy} /><button className="btn-primary mt-4 w-full" onClick={() => setBetOpen(false)}>Done</button>
      </Modal>
      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title="Sugar Rush · Local paytable" width="lg">
        <p className="mb-4 text-sm text-ink-dim">Five or more identical candies connected horizontally or vertically form a cluster. Values multiply the starting stake. A first win marks its position without a multiplier. A second win there starts 2×, doubling on each later win up to 128×. The upgraded multipliers apply to that win and are added together for the cluster. Marks and multipliers reset for a paid spin and at the start of a new free-spin feature, then persist throughout the feature.</p>
        <div className="overflow-x-auto"><table className="w-full text-xs"><caption className="sr-only">Local cluster payout multipliers by candy and cluster size</caption><thead><tr><th className="p-2 text-left">Candy</th>{[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((size) => <th className="p-2" key={size}>{size}{size === 15 ? "+" : ""}</th>)}</tr></thead><tbody>{SUGAR_SYMBOLS.map((symbol) => <tr className="border-t border-edge" key={symbol}><th className="p-2 text-left font-normal capitalize">{symbol.replace('candy-', '')}</th>{[5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((size) => <td className="p-2 text-right font-mono" key={size}>{clusterPay(symbol, size).toFixed(2)}×</td>)}</tr>)}</tbody></table></div>
        <p className="mt-4 text-sm text-ink-dim">3 / 4 / 5 / 6 / 7+ lollipops award 10 / 12 / 15 / 20 / 30 free spins. This also applies to retriggers. All base and free-spin wins share one 5,000× round limit. These are local play-money rules and approximate odds.</p>
      </Modal>
      <Modal open={buyOpen} onClose={() => setBuyOpen(false)} title="Buy free spins?" width="sm">
        <p className="text-sm text-ink-dim">Spend {fmtCurrency(bet * 100)} play credits for a 3–7-scatter entry awarding 10–30 free spins at a locked {fmtCurrency(bet)} stake. Wins are random and can be less than the cost.</p>
        <div className="mt-5 flex gap-2"><button className="btn-ghost flex-1" onClick={() => setBuyOpen(false)}>Cancel</button><button disabled={busy || !balance.canAfford(bet * 100)} className="btn-primary flex-1" onClick={() => { setBuyOpen(false); void run(true); }}>Buy · {fmtCurrency(bet * 100)}</button></div>
      </Modal>
    </div>
  );
}
