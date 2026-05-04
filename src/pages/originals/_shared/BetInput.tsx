import { useGame } from '../../../game-context';
import { fmtCurrency } from '../../../lib/format';

/** Stake-style bet input row: dollar amount on left, ½ / 2× / Max on right. */
export function BetInput({
  bet,
  onBetChange,
  disabled,
}: {
  bet: number;
  onBetChange: (b: number) => void;
  disabled?: boolean;
}) {
  const { balance } = useGame();
  const half = () => onBetChange(Math.max(0.01, +(bet / 2).toFixed(2)));
  const dbl = () => onBetChange(Math.min(balance.balance || 1000, +(bet * 2).toFixed(2)));
  const max = () => onBetChange(Math.max(0.01, +balance.balance.toFixed(2)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] uppercase tracking-widest text-ink-mute">Bet Amount</span>
        <span className="text-[10px] font-mono text-ink-mute tabular-nums">{fmtCurrency(balance.balance)}</span>
      </div>
      <div className="flex items-stretch gap-1.5">
        <div className="flex-1 flex items-center gap-2 bg-bg-elev border border-edge rounded-lg px-3 py-2">
          <span className="text-ink-mute text-sm">$</span>
          <input
            type="number"
            inputMode="decimal"
            min={0.01}
            step={0.1}
            value={Number.isFinite(bet) ? bet : 0}
            disabled={disabled}
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onBetChange(Number.isFinite(v) ? Math.max(0, v) : 0);
            }}
            className="flex-1 bg-transparent outline-none font-mono font-semibold text-sm tabular-nums w-full"
          />
        </div>
        <button onClick={half} disabled={disabled} className="px-3 rounded-lg bg-bg-elev border border-edge text-ink-dim hover:text-ink text-xs font-semibold disabled:opacity-50">½</button>
        <button onClick={dbl} disabled={disabled} className="px-3 rounded-lg bg-bg-elev border border-edge text-ink-dim hover:text-ink text-xs font-semibold disabled:opacity-50">2×</button>
        <button onClick={max} disabled={disabled} className="px-3 rounded-lg bg-bg-elev border border-edge text-ink-dim hover:text-ink text-xs font-semibold disabled:opacity-50">Max</button>
      </div>
    </div>
  );
}
