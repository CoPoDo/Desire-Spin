import { Modal } from '../../../components/ui/Modal';
import { fmtMultiplier } from '../../../lib/format';
import type { SlotConfig } from './types';
import type { CellRenderer } from './Grid';

export function Paytable({
  open,
  onClose,
  cfg,
  renderCell,
}: {
  open: boolean;
  onClose: () => void;
  cfg: SlotConfig;
  renderCell: CellRenderer;
}) {
  const paying = cfg.symbols.filter(
    (s) => s.tier !== 'multiplier' && Object.keys(s.payout).length > 0,
  );
  return (
    <Modal open={open} onClose={onClose} title={`${cfg.name} · paytable`} width="lg">
      <p className="text-xs text-ink-mute mb-4">
        Pay-anywhere: 8 or more matching symbols anywhere on the {cfg.cols}×{cfg.rows} grid pay.
        Scatters pay independently for 4 or more anywhere on screen.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {paying.map((s) => (
          <div key={s.id} className="card bg-bg-elev/60 p-3">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-12 h-12 rounded-md flex items-center justify-center cell">
                {renderCell({ symbolId: s.id, winning: false, cellKey: `pt-${s.id}` })}
              </div>
              <div>
                <div className="text-sm font-semibold capitalize">{s.label}</div>
                <div className="text-[11px] text-ink-mute uppercase tracking-wide">
                  {s.tier === 'scatter' ? 'scatter' : s.tier}
                </div>
              </div>
            </div>
            <table className="w-full text-xs">
              <tbody>
                {Object.entries(s.payout)
                  .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                  .map(([n, mult]) => (
                    <tr key={n}>
                      <td className="text-ink-dim">{n}+</td>
                      <td className="font-mono text-right">{fmtMultiplier(mult)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </Modal>
  );
}
