import { useCallback, useState } from 'react';
import { OriginalPageLayout } from '../../../components/layout/OriginalPageLayout';
import { useGame } from '../../../game-context';
import { createRng } from '../../../lib/fairness';
import { fmtCurrency } from '../../../lib/format';
import { BetInput } from '../_shared/BetInput';
import {
  MAX_PICKS,
  type KenoDraw,
  type Risk,
  TOTAL,
  play,
  tableFor,
} from './engine';

const RISKS: Risk[] = ['classic', 'low', 'medium', 'high'];

export function KenoGame() {
  const { balance, fairness, sound, history, session } = useGame();
  const [bet, setBet] = useState(1);
  const [risk, setRisk] = useState<Risk>('classic');
  const [picks, setPicks] = useState<number[]>([]);
  const [draw, setDraw] = useState<KenoDraw | null>(null);
  const [revealing, setRevealing] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const togglePick = useCallback(
    (n: number) => {
      if (busy) return;
      if (draw) {
        // Reset to allow new picks
        setDraw(null);
        setRevealing(new Set());
      }
      setPicks((prev) => {
        if (prev.includes(n)) return prev.filter((x) => x !== n);
        if (prev.length >= MAX_PICKS) return prev;
        return [...prev, n].sort((a, b) => a - b);
      });
    },
    [busy, draw],
  );

  const clearPicks = useCallback(() => {
    if (busy) return;
    setPicks([]);
    setDraw(null);
    setRevealing(new Set());
  }, [busy]);

  const autoPick = useCallback(() => {
    if (busy) return;
    const all = Array.from({ length: TOTAL }, (_, i) => i + 1);
    // Fisher-Yates pick 10
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j]!, all[i]!];
    }
    setPicks(all.slice(0, 10).sort((a, b) => a - b));
    setDraw(null);
    setRevealing(new Set());
  }, [busy]);

  const playRound = useCallback(async () => {
    if (busy || picks.length === 0 || balance.balance < bet || bet <= 0) return;
    setBusy(true);
    sound.play('click');
    balance.debit(bet);
    const seeds = fairness.consumeNonce();
    const rng = createRng(seeds.serverSeed, seeds.clientSeed, seeds.nonce);
    const result = play(rng, bet, picks, risk);

    // Reveal one by one
    setRevealing(new Set());
    for (let i = 0; i < result.drawn.length; i++) {
      await new Promise<void>((res) => setTimeout(res, 220));
      setRevealing((prev) => new Set([...prev, result.drawn[i]!]));
      const isHit = picks.includes(result.drawn[i]!);
      sound.play(isHit ? 'win' : 'click');
    }
    setDraw(result);
    if (result.payout > 0) {
      balance.credit(result.payout);
      sound.play(
        result.multiplier >= 50 ? 'mega-win' :
        result.multiplier >= 5 ? 'big-win' : 'win',
      );
    } else {
      sound.play('drop');
    }
    history.record({
      game: 'Keno',
      bet,
      payout: result.payout,
      multiplier: result.multiplier,
      serverSeedHash: fairness.hash,
      clientSeed: seeds.clientSeed,
      nonce: seeds.nonce,
    });
    session.recordSpin(bet, result.payout, false);
    setBusy(false);
  }, [busy, picks, balance, bet, risk, fairness, history, session, sound]);

  const ladder = tableFor(risk, picks.length);

  return (
    <OriginalPageLayout title="Keno">
      <div className="flex flex-col p-4 gap-4 max-w-md mx-auto w-full">
        {/* Top: status */}
        <div className="rounded-xl bg-bg-card border border-edge p-3 text-center">
          {draw ? (
            <>
              <div className="text-[10px] uppercase tracking-widest text-ink-mute">Result</div>
              <div className={`font-mono font-bold text-2xl mt-0.5 tabular-nums ${
                draw.multiplier >= 5 ? 'text-accent' : draw.multiplier > 0 ? 'text-accent-cyan' : 'text-accent-hot'
              }`}>
                {draw.hits} hits · {draw.multiplier > 0 ? `${draw.multiplier}× = ${fmtCurrency(draw.payout)}` : 'no win'}
              </div>
            </>
          ) : (
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">
              {picks.length === 0 ? 'Pick 1-10 numbers' : `${picks.length} picked · choose more or play`}
            </div>
          )}
        </div>

        {/* 8x5 number grid */}
        <div className="rounded-2xl bg-bg-card border border-edge p-2 sm:p-3">
          <div className="grid grid-cols-8 gap-1 sm:gap-1.5">
            {Array.from({ length: TOTAL }).map((_, i) => {
              const n = i + 1;
              const picked = picks.includes(n);
              const drawn = revealing.has(n);
              const isHit = picked && drawn;
              const isMiss = !picked && drawn;
              return (
                <button
                  key={n}
                  onClick={() => togglePick(n)}
                  disabled={busy}
                  className="aspect-square rounded-md flex items-center justify-center font-mono font-bold text-xs sm:text-sm transition-all active:scale-95 relative"
                  style={{
                    background: isHit
                      ? 'linear-gradient(180deg, #1fff7a, #0a7a3a)'
                      : isMiss
                        ? 'linear-gradient(180deg, #2a3142, #15191f)'
                        : picked
                          ? 'linear-gradient(180deg, #ffc62a, #c8932e)'
                          : 'linear-gradient(180deg, #1a1f29, #15191f)',
                    color: isHit ? '#0a3a14' : isMiss ? '#9aa3b2' : picked ? '#1a0f00' : '#e5e9f0',
                    border: isHit ? '1px solid rgba(31,255,122,.6)' : picked ? '1px solid rgba(255,233,168,.6)' : '1px solid #2a3142',
                    boxShadow:
                      isHit ? '0 0 8px rgba(31,255,122,.55)' :
                      picked ? 'inset 0 1px 0 rgba(255,255,255,.4), 0 0 6px rgba(255,198,42,.4)' :
                      'inset 0 1px 0 rgba(255,255,255,.04)',
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* Risk selector */}
        <div className="rounded-xl bg-bg-card border border-edge p-3">
          <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1.5">Risk</div>
          <div className="flex gap-1.5">
            {RISKS.map((r) => (
              <button
                key={r}
                onClick={() => setRisk(r)}
                disabled={busy}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition disabled:opacity-50 ${
                  risk === r ? 'bg-accent text-bg' : 'bg-bg-elev border border-edge text-ink-dim hover:text-ink'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Payout ladder for current pick count */}
        {ladder.length > 0 && (
          <div className="rounded-xl bg-bg-card border border-edge p-2.5">
            <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${ladder.length}, minmax(0, 1fr))` }}>
              {ladder.map((m, i) => {
                const isCurrent = draw && draw.hits === i;
                return (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center text-[8px] sm:text-[10px] font-mono py-1 rounded"
                    style={{
                      background: isCurrent
                        ? m > 0 ? 'rgba(31,255,122,.18)' : 'rgba(255,61,139,.15)'
                        : 'rgba(42,49,66,.4)',
                      color: m >= 50 ? '#ffc62a' : m >= 5 ? '#1fff7a' : m > 0 ? '#22d3ee' : '#9aa3b2',
                      border: isCurrent
                        ? m > 0 ? '1px solid rgba(31,255,122,.5)' : '1px solid rgba(255,61,139,.4)'
                        : '1px solid transparent',
                    }}
                  >
                    <span className="opacity-60">{i}×</span>
                    <span className="font-bold">{m === 0 ? '0' : m < 1 ? m.toFixed(1) : m}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bet panel */}
        <div className="rounded-2xl bg-bg-card border border-edge p-4 space-y-3">
          <BetInput bet={bet} onBetChange={setBet} disabled={busy} />
          <div className="flex gap-1.5">
            <button
              onClick={clearPicks}
              disabled={busy || picks.length === 0}
              className="flex-1 py-2 rounded-lg bg-bg-elev border border-edge text-ink-dim font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Clear
            </button>
            <button
              onClick={autoPick}
              disabled={busy}
              className="flex-1 py-2 rounded-lg bg-bg-elev border border-edge text-ink-dim font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            >
              Auto Pick
            </button>
          </div>
          <button
            onClick={playRound}
            disabled={busy || picks.length === 0 || balance.balance < bet || bet <= 0}
            className="w-full py-3.5 rounded-xl bg-accent text-bg font-bold text-sm uppercase tracking-wider disabled:opacity-50 transition active:scale-[0.99]"
          >
            {busy ? 'Drawing…' : `Play · ${fmtCurrency(bet)}`}
          </button>
        </div>
      </div>
    </OriginalPageLayout>
  );
}
