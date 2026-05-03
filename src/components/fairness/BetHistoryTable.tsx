import { Modal } from '../ui/Modal';
import { useGame } from '../../game-context';
import { fmtCurrency, fmtMultiplier, shortHash } from '../../lib/format';

export function BetHistoryTable({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { history } = useGame();
  return (
    <Modal open={open} onClose={onClose} title="Bet history" width="lg">
      {history.history.length === 0 ? (
        <p className="text-ink-dim text-sm py-6 text-center">No bets yet.</p>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-ink-mute text-xs uppercase tracking-wide">
                <th className="px-2 py-2">Game</th>
                <th className="px-2 py-2 text-right">Bet</th>
                <th className="px-2 py-2 text-right">Multi</th>
                <th className="px-2 py-2 text-right">Payout</th>
                <th className="px-2 py-2">Nonce</th>
                <th className="px-2 py-2">Hash</th>
              </tr>
            </thead>
            <tbody>
              {history.history.map((b) => (
                <tr key={b.id} className="border-t border-edge">
                  <td className="px-2 py-2">{b.game}</td>
                  <td className="px-2 py-2 text-right font-mono">{fmtCurrency(b.bet)}</td>
                  <td
                    className={
                      'px-2 py-2 text-right font-mono ' +
                      (b.multiplier > 0 ? 'text-accent' : 'text-ink-mute')
                    }
                  >
                    {fmtMultiplier(b.multiplier)}
                  </td>
                  <td
                    className={
                      'px-2 py-2 text-right font-mono ' +
                      (b.payout > 0 ? 'text-accent' : 'text-ink-mute')
                    }
                  >
                    {fmtCurrency(b.payout)}
                  </td>
                  <td className="px-2 py-2 font-mono">{b.nonce}</td>
                  <td className="px-2 py-2 font-mono text-xs text-ink-dim">
                    {shortHash(b.serverSeedHash, 6, 4)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {history.history.length > 0 && (
        <div className="pt-4">
          <button className="btn-ghost text-xs" onClick={history.clear}>
            Clear history
          </button>
        </div>
      )}
    </Modal>
  );
}
