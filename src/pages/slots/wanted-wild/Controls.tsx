import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { fmtCurrency } from '../../../lib/format';
import { MAX_STAKE } from '../../../lib/accounting';
import { BetInput } from '../../originals/_shared/BetInput';
import { WANTED_BONUSES, type WantedBonus } from '../_shared/lineEngine';
import { useGame } from '../../../game-context';



export function WantedControls({ bet, onBetChange, win, busy, canSpin, onSpin, turbo, onTurbo, onRules, onBuy }: {
  bet: number; onBetChange: (bet: number) => void; win: number; busy: boolean; canSpin: boolean;
  onSpin: () => void; turbo: boolean; onTurbo: () => void; onRules: () => void;
  onBuy: (bonus: WantedBonus) => void;
}) {
  const { balance } = useGame();
  const [selectedBonus, setSelectedBonus] = useState<WantedBonus | null>(null);
  const [betOpen, setBetOpen] = useState(false);
  const [bonusOpen, setBonusOpen] = useState(false);
  const change = (factor: number) => onBetChange(Math.max(.01, Math.min(MAX_STAKE, +(bet * factor).toFixed(2))));
  return <>
    <div className="wanted-console">
      <div className="wanted-bet-block">
        <span className="wanted-console-label">Total bet</span>
        <div className="wanted-bet-adjust">
          <button aria-label="Halve bet" onClick={() => change(.5)} disabled={busy}>−</button>
          <button className="wanted-bet-value" aria-label={`Bet amount ${fmtCurrency(bet)} credits`} onClick={() => setBetOpen(true)} disabled={busy}>{fmtCurrency(bet)}</button>
          <button aria-label="Double bet" onClick={() => change(2)} disabled={busy}>+</button>
        </div>
      </div>
      <div className="wanted-win-block"><span className="wanted-console-label">Round win</span><strong aria-live="polite">{fmtCurrency(win)}</strong></div>
      <button className={`wanted-spin-button ${busy ? 'is-spinning' : ''}`} aria-label={busy ? 'Skip to result' : `Spin · ${fmtCurrency(bet)}`} onClick={onSpin} disabled={!busy && !canSpin}>
        {busy ? <svg viewBox="0 0 32 32" aria-hidden="true"><path d="m7 7 12 9L7 25V7Zm15 0h3v18h-3z" fill="currentColor" /></svg> : <svg viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M25 13a10 10 0 1 0-1 10M25 4v9h-9" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        <span>{busy ? 'Skip' : 'Spin'}</span>
      </button>
    </div>
    <div className="wanted-toolrail">
      <button onClick={onTurbo} aria-pressed={turbo} disabled={busy}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m9 1-6 8h5l-1 6 6-9H8z" fill="currentColor" /></svg>Turbo{turbo ? ' on' : ''}</button>
      <button onClick={() => { setSelectedBonus(null); setBonusOpen(true); }} disabled={busy} className="wanted-buy-trigger">Buy bonus <span aria-hidden="true">+</span></button>
      <button onClick={onRules} aria-label="Rules & pays"><svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4"><circle cx="8" cy="8" r="6" /><path d="M8 7v5M8 4v1" /></svg>Pays</button>
    </div>
    <Modal open={betOpen} onClose={() => setBetOpen(false)} title="Choose your play-money bet" width="sm"><BetInput bet={bet} onBetChange={onBetChange} disabled={busy} /><p className="my-4 text-xs text-ink-dim">Credits have no cash value. Your stake stays fixed throughout a round and any free spins.</p><button className="btn-primary w-full" onClick={() => setBetOpen(false)}>Done</button></Modal>
    <Modal open={bonusOpen} onClose={() => { setBonusOpen(false); setSelectedBonus(null); }} title={selectedBonus ? 'Confirm bonus purchase' : 'Buy a bonus · play credits'} width="md">
      {selectedBonus ? (() => {
        const option = WANTED_BONUSES.find((entry) => entry.id === selectedBonus)!;
        const cost = +(bet * option.costMultiplier).toFixed(2);
        return <div className="space-y-4"><h3 className="font-serif text-2xl text-[#e1c796]">{option.label}</h3><p className="text-sm text-ink-dim">{option.description}</p><div className="rounded-lg border border-edge p-4"><div className="flex justify-between text-sm"><span>Base bet</span><strong>{fmtCurrency(bet)}</strong></div><div className="mt-3 flex justify-between text-base"><span>Total cost · {option.costMultiplier}×</span><strong>{fmtCurrency(cost)} credits</strong></div></div><p className="text-xs text-ink-dim">Play-money credits only. The full cost is deducted once when you confirm. The outcome is random; a bonus may return less than its cost.</p><div className="flex gap-3"><button className="btn-ghost flex-1 min-h-11" onClick={() => setSelectedBonus(null)}>Back</button><button className="btn-primary flex-1 min-h-11" disabled={busy || !balance.canAfford(cost)} onClick={() => { setBonusOpen(false); setSelectedBonus(null); onBuy(option.id); }}>Buy · {fmtCurrency(cost)}</button></div>{!balance.canAfford(cost) && <p role="status" className="text-sm text-red-300">Not enough play credits. Refill or lower the base bet.</p>}</div>;
      })() : <><p className="mb-4 text-sm text-ink-dim">Buy direct entry at your current {fmtCurrency(bet)} base bet. Natural bonuses are triggered by their matching scatter symbols.</p><div className="space-y-3">{WANTED_BONUSES.map((entry) => { const cost = +(bet * entry.costMultiplier).toFixed(2); return <button key={entry.id} disabled={busy} onClick={() => setSelectedBonus(entry.id)} className="wanted-bonus-choice"><span><strong>{entry.label}</strong><small>{entry.description}</small></span><span className="wanted-bonus-price">{entry.costMultiplier}×<small>{fmtCurrency(cost)} credits</small></span></button>; })}</div></>}
    </Modal>
  </>;
}
