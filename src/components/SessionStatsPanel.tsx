import { Modal } from './ui/Modal';
import { useGame } from '../game-context';
import { fmtCurrency, fmtMultiplier } from '../lib/format';

/** Session stats viewer. Shows running totals for the current session
 *  (spins, wagered, won, biggest win, biggest multiplier, FS triggers).
 *  Real Pragmatic shows similar session-summary numbers for player awareness. */
export function SessionStatsPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { session } = useGame();
  const { stats, reset } = session;
  const sessionMs = Date.now() - stats.startedAt;
  const minutes = Math.floor(sessionMs / 60000);
  const hours = Math.floor(minutes / 60);
  const sessionLabel =
    hours > 0
      ? `${hours}h ${minutes % 60}m`
      : minutes > 0
        ? `${minutes}m`
        : 'just started';
  const netResult = stats.totalWon - stats.totalWagered;

  return (
    <Modal open={open} onClose={onClose} title="Session Stats">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Spins" value={stats.spins.toLocaleString()} />
        <Stat label="Free Spins Triggered" value={stats.freeSpinsTriggered.toLocaleString()} />
        <Stat label="Total Wagered" value={fmtCurrency(stats.totalWagered)} />
        <Stat label="Total Won" value={fmtCurrency(stats.totalWon)} highlight={stats.totalWon > 0} />
        <Stat label="Biggest Single Win" value={fmtCurrency(stats.biggestWin)} highlight={stats.biggestWin > 0} />
        <Stat label="Biggest Multiplier" value={fmtMultiplier(stats.biggestMultiplier)} highlight={stats.biggestMultiplier > 0} />
      </div>

      <div className="card bg-bg-elev/60 p-4 mt-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs uppercase tracking-widest text-ink-mute">Net Result</span>
          <span className="text-[10px] text-ink-mute">{sessionLabel}</span>
        </div>
        <div
          className="font-mono font-bold text-2xl tabular-nums"
          style={{
            color: netResult > 0 ? '#1fff7a' : netResult < 0 ? '#ff5560' : '#FFE0A8',
          }}
        >
          {netResult >= 0 ? '+' : ''}{fmtCurrency(netResult)}
        </div>
      </div>

      <p className="text-xs text-ink-mute mt-4 leading-relaxed">
        These stats accumulate across all your sessions. They persist in your browser's
        localStorage and have no impact on the game outcome — purely informational.
      </p>

      <div className="mt-4 flex gap-2">
        <button onClick={reset} className="btn-danger flex-1">
          Reset Stats
        </button>
        <button onClick={onClose} className="btn-ghost flex-1">
          Close
        </button>
      </div>
    </Modal>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="card bg-bg-elev/60 p-3">
      <div className="text-[10px] uppercase tracking-widest text-ink-mute">{label}</div>
      <div
        className={`font-mono font-bold text-base tabular-nums mt-0.5 ${
          highlight ? 'text-[#ffe9a8]' : 'text-ink'
        }`}
        style={highlight ? { textShadow: '0 0 10px rgba(255,200,40,.5)' } : undefined}
      >
        {value}
      </div>
    </div>
  );
}
