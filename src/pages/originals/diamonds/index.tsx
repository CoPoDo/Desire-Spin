import { useCallback, useRef, useState } from 'react';
import { useHotkey } from '../../../hooks/useHotkey';
import { motion, AnimatePresence } from 'framer-motion';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
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
import { DIAMOND_CATEGORY_LABEL, DIAMOND_PAYTABLE, type DiamondsResult, gemMeta, play } from './engine';
import { fireConfetti } from '../../../lib/confetti';

export function DiamondsGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [mode, setMode] = useState<Mode>('manual');
  const [autoConfig, setAutoConfig] = useState<AutoConfig>({ count: 10, stopOnProfit: 0, stopOnLoss: 0 });
  const [autoActive, setAutoActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DiamondsResult | null>(null);
  const [revealing, setRevealing] = useState<number>(0);
  const stateRef = useRef({ bet });
  stateRef.current = { bet };

  const playOnce = useCallback(async (): Promise<number> => {
    const { bet: b } = stateRef.current;
    if (balance.balance < b || b <= 0) return 0;
    setBusy(true);
    sound.play('click');
    balance.debit(b);
    setRevealing(0);
    setResult(null);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const r = play(rng, b);
    // Reveal cards one by one for drama. Per-gem 'tick' keeps the
    // sequence audibly paced — silent reveal felt clinical for what's
    // meant to be a "diamond hunt" game. Increase the cadence on the
    // final gem so it lands with a tiny crescendo.
    for (let i = 0; i < 5; i++) {
      await new Promise<void>((res) => setTimeout(res, 220));
      sound.play('tick');
      setRevealing(i + 1);
    }
    setResult(r);
    if (r.payout > 0) {
      balance.credit(r.payout);
      sound.play(r.multiplier >= 50 ? 'mega-win' : r.multiplier >= 5 ? 'big-win' : 'win');
      if (r.multiplier >= 5) {
        fireConfetti({
          count: r.multiplier >= 50 ? 130 : 70,
        });
      }
    } else {
      sound.play('drop');
    }
    history.record({
      game: 'Diamonds',
      bet: b,
      payout: r.payout,
      multiplier: r.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(b, r.payout, false);
    setBusy(false);
    return r.payout - b;
  }, [balance, fairness, sound, history, session]);

  const progress = useAutoBetRunner({
    active: autoActive,
    config: autoConfig,
    intervalMs: 200,
    runOnce: playOnce,
    onStop: () => setAutoActive(false),
  });

  useHotkey(' ', () => { if (mode === 'manual') void playOnce(); }, !autoActive);

  return (
    <OriginalPageLayout title="Diamonds">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Result */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 text-center min-h-[80px]">
          {result ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-stake-muted">
                {DIAMOND_CATEGORY_LABEL[result.category]}
              </div>
              <div
                className={`font-mono font-bold text-2xl mt-0.5 tabular-nums ${
                  result.multiplier >= 50 ? 'text-accent-gold' :
                  result.multiplier >= 5 ? 'text-stake-green' :
                  result.multiplier > 0 ? 'text-accent-cyan' : 'text-stake-red'
                }`}
              >
                {result.multiplier > 0 ? `${result.multiplier}× = ${fmtCurrency(result.payout)}` : '— no win —'}
              </div>
            </>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-stake-muted">
              {busy ? 'Drawing…' : 'Place your bet'}
            </div>
          )}
        </div>

        {/* Gems row */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4">
          <div className="flex items-center justify-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const revealed = i < revealing;
              const gem = revealed && result ? result.gems[i] : null;
              const isWinning = Boolean(result && revealed && gem && result.winningGems.includes(gem));
              const meta = gem ? gemMeta(gem) : null;
              return (
                <motion.div
                  key={i}
                  initial={false}
                  animate={isWinning ? { scale: [1, 1.15, 1], y: [0, -4, 0] } : { scale: 1, y: 0 }}
                  transition={{ duration: 0.6, repeat: isWinning ? Infinity : 0, ease: 'easeInOut' }}
                  className="aspect-square w-[18%] rounded-xl flex items-center justify-center text-3xl"
                  style={{
                    background: meta
                      ? `radial-gradient(circle at 35% 28%, #fff 0%, ${meta.color} 50%, rgba(0,0,0,.3) 100%)`
                      : 'linear-gradient(180deg, #1a1f29, #15191f)',
                    border: meta ? `2px solid ${meta.color}` : '1px solid #2a3142',
                    boxShadow: meta
                      ? isWinning
                        ? `0 0 20px ${meta.color}, inset 0 1px 0 rgba(255,255,255,.5)`
                        : `0 0 10px ${meta.color}66, inset 0 1px 0 rgba(255,255,255,.4)`
                      : 'inset 0 1px 0 rgba(255,255,255,.04)',
                  }}
                >
                  <AnimatePresence>
                    {meta && (
                      <motion.span
                        className="block"
                        style={{
                          width: '54%',
                          aspectRatio: '1 / 1.15',
                          // Gem-cut diamond silhouette via clip-path so the
                          // shape itself communicates "gemstone" instead of
                          // every gem reusing the 💎 emoji glyph. Background
                          // gradient varies per gem colour.
                          clipPath:
                            'polygon(50% 0%, 90% 35%, 75% 100%, 25% 100%, 10% 35%)',
                          background: `linear-gradient(180deg, #ffffff 0%, ${meta.color} 50%, rgba(0,0,0,.55) 100%)`,
                          filter: `drop-shadow(0 0 6px ${meta.color}aa)`,
                        }}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: 'spring', stiffness: 280, damping: 16 }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-1.5 rounded-lg bg-stake-card border border-stake-border p-3">
          {Object.entries(DIAMOND_PAYTABLE).filter(([category]) => category !== 'no-match').map(([category, multiplier]) => (
            <div key={category} className="rounded-md bg-stake-input px-2 py-1.5 text-center">
              <div className="text-[8px] uppercase tracking-wide text-stake-muted">{DIAMOND_CATEGORY_LABEL[category as keyof typeof DIAMOND_CATEGORY_LABEL]}</div>
              <div className="font-mono text-xs font-bold text-stake-text">{multiplier}×</div>
            </div>
          ))}
        </div>

        {/* Bet panel */}
        <div className="rounded-lg bg-stake-card border border-stake-border p-4 space-y-3">
          <ManualAutoTabs mode={mode} onChange={setMode} disabled={autoActive || busy} />
          <BetInput bet={bet} onBetChange={setBet} disabled={autoActive || busy} />
          {mode === 'auto' && (
            <>
              <AutoConfigFields config={autoConfig} onChange={setAutoConfig} disabled={autoActive} />
              {autoActive && <AutoProgressDisplay progress={progress} config={autoConfig} />}
            </>
          )}
          {mode === 'manual' ? (
            <button
              onClick={() => void playOnce()}
              disabled={busy || balance.balance < bet || bet <= 0}
              className="w-full py-3.5 rounded-xl bg-stake-green text-stake-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
            >
              {busy ? 'Drawing…' : `Bet · ${fmtCurrency(bet)}`}
            </button>
          ) : (
            <button
              onClick={() => setAutoActive((a) => !a)}
              disabled={!autoActive && (balance.balance < bet || bet <= 0)}
              className={`w-full py-3.5 rounded-xl font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99] ${
                autoActive ? 'bg-stake-red text-white' : 'bg-stake-green text-stake-bg'
              }`}
            >
              {autoActive ? 'Stop Autobet' : 'Start Autobet'}
            </button>
          )}
        </div>

        {/* Pay table preview */}
        <div className="rounded-xl bg-stake-card border border-stake-border p-2.5">
          <div className="text-[10px] uppercase tracking-widest text-stake-muted mb-1.5 px-1">5 of a kind pays</div>
          <div className="grid grid-cols-7 gap-1">
            {[
              { id: 'red', mult: 35 },
              { id: 'blue', mult: 50 },
              { id: 'green', mult: 70 },
              { id: 'purple', mult: 100 },
              { id: 'yellow', mult: 250 },
              { id: 'orange', mult: 500 },
              { id: 'white', mult: 1000 },
            ].map((p) => {
              const m = gemMeta(p.id as 'red' | 'blue' | 'green' | 'purple' | 'yellow' | 'orange' | 'white');
              return (
                <div key={p.id} className="text-center">
                  <div
                    className="aspect-square rounded-md flex items-center justify-center text-base"
                    style={{
                      background: `radial-gradient(circle at 35% 28%, #fff 0%, ${m.color} 50%, rgba(0,0,0,.3) 100%)`,
                      border: `1px solid ${m.color}`,
                    }}
                  >
                    {m.emoji}
                  </div>
                  <div className="text-[9px] font-mono font-bold mt-0.5" style={{ color: m.color }}>
                    {p.mult}×
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </OriginalPageLayout>
  );
}
