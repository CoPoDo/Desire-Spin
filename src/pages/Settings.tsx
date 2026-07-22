import { useState } from 'react';
import { useGame } from '../game-context';

export function Settings() {
  const { balance, sound, fairness, history } = useGame();
  const [confirm, setConfirm] = useState<string | null>(null);

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="font-display text-3xl font-bold">Settings</h1>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Balance</h2>
        <p className="text-sm text-ink-dim">
          Current balance: <span className="font-mono">{balance.balance.toFixed(2)}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => balance.credit(1000)}>
            Add 1,000
          </button>
          <button className="btn-ghost" onClick={() => balance.reset(1000)}>
            Reset to 1,000
          </button>
          <button className="btn-danger" onClick={() => balance.reset(0)}>
            Set to 0
          </button>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Sound</h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={sound.enabled}
            onChange={(e) => sound.setEnabled(e.target.checked)}
            className="accent-accent"
          />
          Sound effects
        </label>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Local fairness seeds</h2>
        <p className="text-sm text-ink-dim">
          Rotate the browser's local secret seed to reveal it for deterministic replay and
          start a new one. This is a local integrity tool, not a remote server commitment.
        </p>
        <div className="flex flex-wrap gap-2">
          <button className="btn-ghost" onClick={fairness.rotate}>
            Rotate local seed
          </button>
          <button className="btn-danger" onClick={fairness.resetSeeds}>
            Reset all seeds
          </button>
        </div>
      </section>

      <section className="card p-5 space-y-3">
        <h2 className="font-semibold">Bet history</h2>
        <p className="text-sm text-ink-dim">{history.history.length} bet(s) recorded.</p>
        <button className="btn-danger" onClick={() => setConfirm('history')}>
          Clear history
        </button>
        {confirm === 'history' && (
          <div className="card p-3 mt-2 border-accent-hot/40 text-sm">
            <p className="mb-2">Clear all bet history?</p>
            <div className="flex gap-2">
              <button
                className="btn-danger py-1"
                onClick={() => {
                  history.clear();
                  setConfirm(null);
                }}
              >
                Yes, clear
              </button>
              <button className="btn-ghost py-1" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      <p className="text-xs text-ink-mute">
        All data is stored in this browser's localStorage. Clearing site data will reset everything.
      </p>
    </div>
  );
}
