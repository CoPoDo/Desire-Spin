import { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { fmtCurrency, fmtMultiplier } from '../../../lib/format';
import type { SlotConfig } from './types';
import type { CellRenderer } from './Grid';

type Tab = 'paytable' | 'rules' | 'features';

/** Game Info modal — paytable + rules + features. Mirrors the real Pragmatic
 *  in-game info screens (tabbed view, scrollable). */
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
  const [tab, setTab] = useState<Tab>('paytable');
  return (
    <Modal open={open} onClose={onClose} title={`${cfg.name} · Game Info`} width="lg">
      <div className="flex gap-1 border-b border-edge mb-4 -mx-1 px-1">
        {(['paytable', 'rules', 'features'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              'px-3 py-2 text-sm font-medium capitalize transition border-b-2 ' +
              (tab === t
                ? 'text-[#ffe9a8] border-[#ffc62a]'
                : 'text-ink-dim border-transparent hover:text-ink')
            }
          >
            {t === 'paytable' ? 'Paytable' : t === 'rules' ? 'How to Play' : 'Features'}
          </button>
        ))}
      </div>

      {tab === 'paytable' && <PaytableTab cfg={cfg} renderCell={renderCell} />}
      {tab === 'rules' && <RulesTab cfg={cfg} />}
      {tab === 'features' && <FeaturesTab cfg={cfg} />}
    </Modal>
  );
}

function PaytableTab({ cfg, renderCell }: { cfg: SlotConfig; renderCell: CellRenderer }) {
  const paying = cfg.symbols.filter(
    (s) => s.tier !== 'multiplier' && Object.keys(s.payout).length > 0,
  );
  // Tier order: top → high → mid → low → scatter
  const tierOrder: Record<string, number> = { top: 0, high: 1, mid: 2, low: 3, scatter: 4 };
  paying.sort((a, b) => (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9));
  return (
    <>
      <p className="text-xs text-ink-mute mb-4">
        <strong className="text-ink-dim">Pay-anywhere:</strong> 8 or more matching symbols
        anywhere on the {cfg.cols}×{cfg.rows} grid pay.
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
    </>
  );
}

function RulesTab({ cfg }: { cfg: SlotConfig }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <Section title="Pay Anywhere">
        Wins are awarded for {cfg.payAnywhereThreshold}+ matching symbols anywhere on the
        {' '}{cfg.cols}×{cfg.rows} grid — no paylines required.
        Higher symbol counts (10+ and 12+) pay larger multipliers of the bet.
      </Section>
      <Section title="Tumble Feature">
        After every win, the winning symbols disappear and new symbols drop in from above
        to fill the gaps. Tumbles continue as long as new wins keep forming, building bigger
        chains.
      </Section>
      <Section title="Multiplier Symbols">
        Random multiplier orbs (2× to 500×) can land on any spin or tumble. In the base
        game, the multiplier applies to the chain it lands in. In free spins, every
        multiplier that lands sticks on the grid; at the end of each spin, all multiplier
        values sum together and apply to that spin's total win.
      </Section>
      <Section title="Lightning Strike">
        Occasionally before the first win check, Zeus will appear and strike the board
        with 2–6 multiplier orbs at once. A dramatic full-screen moment that can lead to
        massive cascades.
      </Section>
      <Section title="Bet">
        Adjust your bet with the −/+ buttons or tap the bet amount for a preset menu.
      </Section>
      <Section title="Provably Fair">
        Every spin is deterministic from the server seed (committed before each bet via
        SHA-256 hash), your client seed, and a per-bet nonce. Open the Fairness panel
        from the menu to verify any past bet.
      </Section>
    </div>
  );
}

function FeaturesTab({ cfg }: { cfg: SlotConfig }) {
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="card bg-bg-elev/60 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">RTP</div>
            <div className="font-mono font-bold text-base text-[#ffe9a8] mt-0.5">~96.5%</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Volatility</div>
            <div className="text-[#ffc62a] mt-0.5 leading-none flex justify-center gap-0.5">
              {/* 5/5 stars matching real game's high-volatility rating */}
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i}
                      style={{ filter: 'drop-shadow(0 0 6px rgba(255,200,40,.7))' }}>★</span>
              ))}
            </div>
            <div className="text-[9px] text-ink-mute mt-0.5">High</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Max Win</div>
            <div className="font-mono font-bold text-base text-[#ffe9a8] mt-0.5">5,000×</div>
          </div>
        </div>
      </div>
      <Section title="Free Spins">
        Land {cfg.scatterTriggerCount}+ scatters anywhere to trigger {' '}
        <strong className="text-[#ffe9a8]">{cfg.freeSpinsAwardOnTrigger} free spins</strong>.
        During free spins, multiplier orbs persist on the grid and sum together to multiply
        the spin's total win.
      </Section>
      <Section title="Retrigger">
        {cfg.scatterRetriggerCount}+ scatters during free spins awards an additional {' '}
        <strong className="text-[#ffe9a8]">+{cfg.freeSpinsAwardOnRetrigger}</strong> spins.
      </Section>
      <Section title="Ante Bet">
        Toggle the Ante checkbox to increase your bet by {' '}
        <strong>{Math.round((cfg.ante.betMultiplier - 1) * 100)}%</strong>{' '}
        and roughly {cfg.ante.scatterWeightBoost.toFixed(1)}× your scatter chance — more
        frequent free-spin triggers.
      </Section>
      <Section title="Buy Bonus">
        Tap "Buy {cfg.buyBonusCost}×" to skip the wait and enter the bonus round directly,
        for a cost of <strong>{cfg.buyBonusCost}× your current bet</strong> (about
        {' '}{fmtCurrency(cfg.buyBonusCost)} per unit bet).
      </Section>
      <Section title="Auto-play / Turbo">
        Tap the ⚡ button to enable turbo (faster spins). Tap the ↻ button to start
        auto-play with a configurable spin count. Auto-play pauses if your balance falls
        below the bet.
      </Section>
      <Section title="Tap to Skip">
        Tap anywhere on the painted scene during a spin to fast-forward animations to
        the end. The reels still resolve to the same outcome — only the timing changes.
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="font-semibold text-[#ffe9a8] mb-1.5">{title}</h3>
      <p className="text-ink-dim">{children}</p>
    </div>
  );
}
