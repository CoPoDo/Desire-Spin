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
  return (
    <div className="flex bg-bg-elev rounded-xl p-1 gap-1">
      {(['manual', 'auto'] as Mode[]).map((m) => (
        <button
          key={m}
          onClick={() => onChange(m)}
          disabled={disabled}
          className={`flex-1 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition ${
            mode === m
              ? 'bg-bg-card text-ink shadow-[0_1px_0_rgba(255,255,255,.05)_inset]'
              : 'text-ink-mute hover:text-ink-dim'
          }`}
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
        <div className="flex gap-1.5">
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={config.count}
            disabled={disabled}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              onChange({ ...config, count: Number.isFinite(v) ? Math.max(0, v) : 0 });
            }}
            className="flex-1 bg-bg-elev border border-edge rounded-lg px-3 py-2 font-mono text-sm tabular-nums outline-none focus:border-accent/60"
            placeholder="∞ for unlimited"
          />
          <button
            onClick={() => onChange({ ...config, count: 0 })}
            disabled={disabled}
            className="px-3 rounded-lg bg-bg-elev border border-edge text-ink-dim text-xs font-bold"
          >
            ∞
          </button>
        </div>
      </Field>
      <Field label="Stop on Profit">
        <div className="flex items-center gap-2 bg-bg-elev border border-edge rounded-lg px-3 py-2">
          <span className="text-ink-mute text-sm">$</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={config.stopOnProfit || ''}
            disabled={disabled}
            placeholder="0 = none"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ ...config, stopOnProfit: Number.isFinite(v) ? Math.max(0, v) : 0 });
            }}
            className="flex-1 bg-transparent outline-none font-mono text-sm tabular-nums"
          />
        </div>
      </Field>
      <Field label="Stop on Loss">
        <div className="flex items-center gap-2 bg-bg-elev border border-edge rounded-lg px-3 py-2">
          <span className="text-ink-mute text-sm">$</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={config.stopOnLoss || ''}
            disabled={disabled}
            placeholder="0 = none"
            onChange={(e) => {
              const v = parseFloat(e.target.value);
              onChange({ ...config, stopOnLoss: Number.isFinite(v) ? Math.max(0, v) : 0 });
            }}
            className="flex-1 bg-transparent outline-none font-mono text-sm tabular-nums"
          />
        </div>
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-ink-mute mb-1">{label}</div>
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
  runOnce: () => Promise<number>;
  onStop: () => void;
}) {
  const [progress, setProgress] = useState({
    completed: 0,
    netProfit: 0,
  });

  // Latest values via refs so the loop reads fresh state.
  const activeRef = useRef(active);
  const configRef = useRef(config);
  const runRef = useRef(runOnce);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => { runRef.current = runOnce; }, [runOnce]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setProgress({ completed: 0, netProfit: 0 });
    let completed = 0;
    let netProfit = 0;

    const loop = async () => {
      while (!cancelled && activeRef.current) {
        const cfg = configRef.current;
        if (cfg.count > 0 && completed >= cfg.count) break;
        if (cfg.stopOnProfit > 0 && netProfit >= cfg.stopOnProfit) break;
        if (cfg.stopOnLoss > 0 && -netProfit >= cfg.stopOnLoss) break;

        const delta = await runRef.current();
        if (cancelled) return;
        completed += 1;
        netProfit += delta;
        setProgress({ completed, netProfit });

        if (intervalMs > 0) {
          await new Promise<void>((res) => setTimeout(res, intervalMs));
        }
      }
      if (!cancelled) onStop();
    };
    loop();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return progress;
}

export function AutoProgressDisplay({
  progress,
  config,
}: {
  progress: { completed: number; netProfit: number };
  config: AutoConfig;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-lg bg-bg-elev border border-edge p-2.5 text-center">
        <div className="text-[10px] uppercase tracking-widest text-ink-mute">Bets</div>
        <div className="font-mono font-bold text-base text-ink mt-0.5 tabular-nums">
          {progress.completed}
          {config.count > 0 && (
            <span className="text-ink-mute"> / {config.count}</span>
          )}
        </div>
      </div>
      <div className="rounded-lg bg-bg-elev border border-edge p-2.5 text-center">
        <div className="text-[10px] uppercase tracking-widest text-ink-mute">Profit</div>
        <div
          className="font-mono font-bold text-base mt-0.5 tabular-nums"
          style={{
            color: progress.netProfit > 0 ? '#1fff7a' : progress.netProfit < 0 ? '#ff5560' : '#e5e9f0',
          }}
        >
          {progress.netProfit >= 0 ? '+' : ''}{fmtCurrency(progress.netProfit)}
        </div>
      </div>
    </div>
  );
}
