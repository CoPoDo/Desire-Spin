import { useEffect, useRef, useState } from 'react';
import { fmtCurrency } from '../../../lib/format';

/** Manual / Auto tab toggle for Stake-style originals.
 *
 *  In Auto mode:
 *  - Number of bets (∞ or 1..1000)
 *  - Stop on profit (optional total profit threshold)
 *  - Stop on loss (optional total loss threshold)
 *
 *  Caller provides a `runOnce` function that returns the net result
 *  (+payout − bet) of one round. The controller runs them in sequence
 *  until exhausted / stopped / a stop condition fires.
 */

export type Mode = 'manual' | 'auto';

export type AutoConfig = {
  count: number; // 0 = infinite
  stopOnProfit: number; // 0 = no stop
  stopOnLoss: number; // 0 = no stop
};

export function ManualAutoTabs({
  mode,
  onChange,
  disabled,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
  disabled?: boolean;
}) {
  // Stake's segmented pill: a rounded dark well, the active half raised
  // in the lighter panel tone with white text.
  return (
    <div className="flex bg-stake-bg rounded-full p-1 gap-1">
      {(['manual', 'auto'] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          disabled={disabled}
          className={`flex-1 py-2 rounded-full text-sm font-semibold capitalize transition ${
            mode === m
              ? 'bg-stake-panel text-stake-text shadow-[0_1px_2px_rgba(0,0,0,.3)]'
              : 'text-stake-muted hover:text-stake-text'
          } disabled:opacity-60`}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

export function AutoConfigFields({
  config,
  onChange,
  disabled,
}: {
  config: AutoConfig;
  onChange: (c: AutoConfig) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      <Field label="Number of Bets">
        <div className="flex items-stretch rounded bg-stake-input border border-stake-border overflow-hidden focus-within:border-stake-dim">
          <input
            type="number"
            min={0}
            max={1000}
            aria-label="Number of bets"
            inputMode="numeric"
            value={config.count || ''}
            disabled={disabled}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChange({ ...config, count: Number.isFinite(v) ? Math.min(1000, Math.max(0, v)) : 0 });
            }}
            className="flex-1 min-w-0 bg-transparent px-3 py-2.5 font-mono text-sm text-stake-text tabular-nums outline-none"
            placeholder="∞"
          />
          <button
            onClick={() => onChange({ ...config, count: 0 })}
            disabled={disabled}
            className="px-3.5 border-l border-stake-border text-stake-muted hover:text-stake-text hover:bg-white/5 text-sm font-bold transition disabled:opacity-50"
          >
            ∞
          </button>
        </div>
      </Field>
      <Field label="Stop on Profit">
        <div className="flex items-center gap-1.5 rounded bg-stake-input border border-stake-border px-3 py-2.5 focus-within:border-stake-dim">
          <input
            type="number"
            min={0}
            step={0.1}
            value={config.stopOnProfit || ''}
            disabled={disabled}
            placeholder="0.00"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ ...config, stopOnProfit: Number.isFinite(v) ? Math.max(0, v) : 0 });
            }}
            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-sm text-stake-text tabular-nums"
          />
          <span className="text-stake-dim text-sm font-mono">$</span>
        </div>
      </Field>
      <Field label="Stop on Loss">
        <div className="flex items-center gap-1.5 rounded bg-stake-input border border-stake-border px-3 py-2.5 focus-within:border-stake-dim">
          <input
            type="number"
            min={0}
            step={0.1}
            value={config.stopOnLoss || ''}
            disabled={disabled}
            placeholder="0.00"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ ...config, stopOnLoss: Number.isFinite(v) ? Math.max(0, v) : 0 });
            }}
            className="flex-1 min-w-0 bg-transparent outline-none font-mono text-sm text-stake-text tabular-nums"
          />
          <span className="text-stake-dim text-sm font-mono">$</span>
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-stake-muted mb-1.5">{label}</div>
      {children}
    </div>
  );
}

/** Hook that runs `runOnce` repeatedly when active=true, respecting count
 *  + stop conditions. runOnce returns a Promise resolving to the net
 *  delta of the round (positive = profit). */
export function useAutoBetRunner({
  active,
  config,
  intervalMs,
  runOnce,
  onStop,
}: {
  active: boolean;
  config: AutoConfig;
  intervalMs: number;
  runOnce: () => Promise<number | null>;
  onStop: () => void;
}) {
  const [progress, setProgress] = useState({ completed: 0, netProfit: 0, stopReason: '' });
  const runRef = useRef(runOnce);
  const stopRef = useRef(onStop);
  runRef.current = runOnce;
  stopRef.current = onStop;

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let hidden = document.visibilityState === 'hidden';
    // A run keeps the limits the player approved when pressing Start.
    const cfg = { ...config };
    let completed = 0;
    let netProfit = 0;
    let pause: ReturnType<typeof setTimeout> | undefined;
    let wake: (() => void) | undefined;
    setProgress({ completed: 0, netProfit: 0, stopReason: '' });
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        hidden = true;
        if (pause) clearTimeout(pause);
        wake?.();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);

    const loop = async () => {
      let stopReason = '';
      try {
        while (!cancelled) {
          if (hidden) { stopReason = 'Paused because this tab was hidden.'; break; }
          if (cfg.count > 0 && completed >= cfg.count) { stopReason = 'Bet count reached.'; break; }
          if (cfg.stopOnProfit > 0 && netProfit >= cfg.stopOnProfit) { stopReason = 'Profit limit reached.'; break; }
          if (cfg.stopOnLoss > 0 && -netProfit >= cfg.stopOnLoss) { stopReason = 'Loss limit reached.'; break; }
          const delta = await runRef.current();
          if (cancelled) return;
          // null means no wager was accepted; a zero-profit push is a real bet.
          if (delta === null || !Number.isFinite(delta)) {
            stopReason = 'Stopped: no bet was placed. Check your balance and bet settings.';
            break;
          }
          completed += 1;
          netProfit = Math.round((netProfit + delta) * 100) / 100;
          setProgress({ completed, netProfit, stopReason: '' });
          if (intervalMs > 0) {
            await new Promise<void>((resolve) => { wake = resolve; pause = setTimeout(resolve, intervalMs); });
          }
        }
      } catch {
        stopReason = 'Stopped after an unexpected round error.';
      }
      if (!cancelled) {
        setProgress({ completed, netProfit, stopReason });
        stopRef.current();
      }
    };
    void loop();
    return () => {
      cancelled = true;
      if (pause) clearTimeout(pause);
      wake?.();
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // Limits are captured once; callbacks are kept current through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return progress;
}

export function AutoProgressDisplay({
  progress,
  config,
}: {
  progress: { completed: number; netProfit: number; stopReason?: string };
  config: AutoConfig;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {progress.stopReason && <p role="status" className="col-span-2 text-xs text-stake-muted">{progress.stopReason}</p>}
      <div className="rounded bg-stake-input border border-stake-border p-2.5 text-center">
        <div className="text-xs text-stake-muted">Bets</div>
        <div className="font-mono font-bold text-base text-stake-text mt-0.5 tabular-nums">
          {progress.completed}
          {config.count > 0 && (
            <span className="text-stake-dim"> / {config.count}</span>
          )}
        </div>
      </div>
      <div className="rounded bg-stake-input border border-stake-border p-2.5 text-center">
        <div className="text-xs text-stake-muted">Profit</div>
        <div
          className="font-mono font-bold text-base mt-0.5 tabular-nums"
          style={{
            color: progress.netProfit > 0 ? '#00e701' : progress.netProfit < 0 ? '#ed4163' : '#ffffff',
          }}
        >
          {progress.netProfit >= 0 ? '+' : ''}{fmtCurrency(progress.netProfit)}
        </div>
      </div>
    </div>
  );
}
