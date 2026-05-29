import { useGame } from '../../../game-context';
import { fmtCurrency } from '../../../lib/format';

/** Stake-style bet-amount control.
 *
 *  A single grouped well: "Bet Amount" label with the live balance on
 *  the right, then a rounded field containing a currency-prefixed
 *  numeric input on the left and segmented ½ / 2× buttons butted against
 *  the right edge (divided by thin borders) — the exact control shape of
 *  the real Originals bet panel. */
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
  const dbl = () => onBetChange(Math.min(balance.balance || 1e9, +(bet * 2).toFixed(2)));
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-stake-muted">Bet Amount</span>
        <span className="text-xs font-mono text-stake-muted tabular-nums">{fmtCurrency(balance.balance)}</span>
      </div>
      <div
        className={`flex items-stretch rounded bg-stake-input border border-stake-border overflow-hidden transition-colors ${
          disabled ? 'opacity-60' : 'focus-within:border-stake-dim'
        }`}
      >
        <div className="flex-1 flex items-center gap-1.5 pl-3 pr-2 py-2.5 min-w-0">
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
            className="flex-1 min-w-0 bg-transparent outline-none font-mono font-semibold text-sm text-stake-text tabular-nums"
          />
          <span className="text-stake-dim text-sm font-mono flex-shrink-0">$</span>
        </div>
        <button
          onClick={half}
          disabled={disabled}
          aria-label="Halve bet"
          className="px-3.5 border-l border-stake-border text-stake-muted hover:text-stake-text hover:bg-white/5 text-xs font-bold transition active:bg-white/10 disabled:opacity-50"
        >
          ½
        </button>
        <button
          onClick={dbl}
          disabled={disabled}
          aria-label="Double bet"
          className="px-3.5 border-l border-stake-border text-stake-muted hover:text-stake-text hover:bg-white/5 text-xs font-bold transition active:bg-white/10 disabled:opacity-50"
        >
          2×
        </button>
      </div>
    </div>
  );
}
