import { fmtCurrency } from '../../../lib/format';

export type BetControlsProps = {
  bet: number;
  onBetChange: (bet: number) => void;
  presets: number[];
  ante: boolean;
  onAnteChange: (v: boolean) => void;
  busy: boolean;
  balance: number;
  onSpin: () => void;
  onBuyBonus: () => void;
  buyBonusCost: number;
  inFreeSpins: boolean;
  freeSpinsRemaining?: number;
};

export function BetControls(p: BetControlsProps) {
  const cantSpin = p.busy || p.balance < p.bet;
  const cantBuy = p.busy || p.balance < p.buyBonusCost;
  return (
    <div className="card p-4 md:p-5 space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="label mb-1">Bet</div>
          <div className="flex">
            <button
              className="btn-ghost rounded-r-none px-3"
              disabled={p.busy}
              onClick={() => p.onBetChange(prev(p.presets, p.bet))}
              aria-label="Decrease bet"
            >
              –
            </button>
            <input
              className="input rounded-none text-center font-mono"
              type="number"
              min={p.presets[0]}
              max={p.presets[p.presets.length - 1]}
              step="0.10"
              value={p.bet}
              disabled={p.busy}
              onChange={(e) => {
                const n = parseFloat(e.target.value);
                if (!Number.isFinite(n)) return;
                p.onBetChange(Math.max(0.1, n));
              }}
            />
            <button
              className="btn-ghost rounded-l-none px-3"
              disabled={p.busy}
              onClick={() => p.onBetChange(next(p.presets, p.bet))}
              aria-label="Increase bet"
            >
              +
            </button>
          </div>
        </div>
        <div>
          <div className="label mb-1">Quick</div>
          <div className="flex flex-wrap gap-1">
            {p.presets.slice(0, 5).map((v) => (
              <button
                key={v}
                className={
                  'btn px-2 py-1 text-xs ' +
                  (p.bet === v
                    ? 'bg-accent text-bg'
                    : 'bg-bg-hover text-ink-dim hover:bg-edge')
                }
                disabled={p.busy}
                onClick={() => p.onBetChange(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <label className="flex items-center justify-between rounded-lg bg-bg-elev/60 border border-edge px-3 py-2 cursor-pointer">
        <div>
          <div className="text-sm font-medium">Ante bet</div>
          <div className="text-xs text-ink-mute">+25% bet · 2× scatter chance</div>
        </div>
        <input
          type="checkbox"
          className="accent-accent"
          checked={p.ante}
          disabled={p.busy || p.inFreeSpins}
          onChange={(e) => p.onAnteChange(e.target.checked)}
        />
      </label>

      <div className="space-y-2">
        <button
          className="btn-primary w-full text-base h-12"
          disabled={cantSpin}
          onClick={p.onSpin}
        >
          {p.inFreeSpins
            ? `Free spin (${p.freeSpinsRemaining ?? 0} left)`
            : p.busy
              ? 'Spinning…'
              : `Spin · ${fmtCurrency(p.bet)}`}
        </button>
        <button
          className="btn-ghost w-full"
          disabled={cantBuy || p.inFreeSpins}
          onClick={p.onBuyBonus}
          title="Skip the base game and enter the bonus round directly."
        >
          Buy bonus · {fmtCurrency(p.buyBonusCost)}
        </button>
      </div>

      <div className="flex justify-between text-xs text-ink-mute">
        <span>Balance: <span className="font-mono">{fmtCurrency(p.balance)}</span></span>
        <span>Bet × {(p.buyBonusCost / Math.max(p.bet, 0.01)).toFixed(0)} buy</span>
      </div>
    </div>
  );
}

function nearest(arr: number[], v: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const d = Math.abs(arr[i]! - v);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
function next(arr: number[], v: number): number {
  const i = nearest(arr, v);
  return arr[Math.min(arr.length - 1, i + 1)]!;
}
function prev(arr: number[], v: number): number {
  const i = nearest(arr, v);
  return arr[Math.max(0, i - 1)]!;
}
