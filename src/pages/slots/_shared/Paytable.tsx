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
            className="px-3 py-2 text-sm font-medium capitalize transition border-b-2"
            style={
              tab === t
                ? {
                    // Active tab — was hardcoded Olympus gold. Now derives
                    // from the slot's accent so each game's paytable has
                    // its own colour identity.
                    color: cfg.theme.accent,
                    borderBottomColor: cfg.theme.accent,
                  }
                : { color: 'var(--ink-dim, #9aa3b2)', borderBottomColor: 'transparent' }
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
        <strong className="text-ink-dim">Local paytable:</strong> {cfg.payAnywhereThreshold} or more matching symbols
        anywhere on the {cfg.cols}×{cfg.rows} grid pay.
        Scatters pay independently in the base game for 4 or more. All values multiply the base stake, before ante or bonus-buy costs. Local probabilities and payouts are approximations, not provider-certified odds.
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
                      <td className="font-mono text-right">{fmtMultiplier(mult * (s.tier === 'scatter' ? 1 : cfg.payoutScaleBase ?? 1))}{s.tier !== 'scatter' && (cfg.payoutScaleBase ?? 1) !== (cfg.payoutScaleFree ?? 1) && <span className="block text-[10px] text-ink-mute">FS {fmtMultiplier(mult * (cfg.payoutScaleFree ?? 1))}</span>}</td>
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
  // Lightning-Strike is unique to Gates of Olympus. Other tumble slots in
  // the lobby (Bonanza, Sugar Rush, Cantina, Wanted, Pharaoh, Wolf) don't
  // have that feature, so the section was misleading there.
  const isOlympus = cfg.id === 'gates-of-olympus';
  const accent = cfg.theme.accent;
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <Section title="Pay Anywhere" accent={accent}>
        Wins are awarded for {cfg.payAnywhereThreshold}+ matching symbols anywhere on the
        {' '}{cfg.cols}×{cfg.rows} grid — no paylines required.
        Higher symbol counts (10+ and 12+) pay larger multipliers of the bet.
      </Section>
      <Section title="Tumble Feature" accent={accent}>
        After every win, the winning symbols disappear and new symbols drop in from above
        to fill the gaps. Tumbles continue as long as new wins keep forming, building bigger
        chains.
      </Section>
      <Section title="Multiplier Symbols" accent={accent}>
        {cfg.multiplierBaseMode === 'disabled' ? 'Multiplier symbols appear only during free spins in this game. ' : 'Multiplier symbols can appear in base play; their final sum multiplies the complete winning tumble sequence. '}
        {cfg.multiplierFreeMode === 'accumulate-on-win' ? 'During free spins, multiplier symbols on winning spins add to a running feature total. That total applies only when a new multiplier lands on a winning spin.' : 'In free spins, multiplier symbols remain for the tumble sequence; their final sum multiplies that spin’s total win.'}
      </Section>
      {isOlympus && (
        <Section title="Lightning Strike" accent={accent}>
          Multiplier symbols land as part of the normal tumble sequence. There is no separate
          lightning-strike outcome in the reference game's rules.
        </Section>
      )}
      <Section title="Bet" accent={accent}>
        Adjust your bet with the −/+ buttons or tap the bet amount for a preset menu.
      </Section>
      <Section title="Local Fairness Replay" accent={accent}>
        Every spin is deterministic from a locally stored secret seed, your client seed,
        and a per-bet nonce. Open the Fairness panel to replay past outcomes. Because this
        app has no server, the hash is not an independent server commitment.
      </Section>
    </div>
  );
}

function FeaturesTab({ cfg }: { cfg: SlotConfig }) {
  // Per-slot accent — was hardcoded Olympus gold throughout the FeaturesTab
  // headlines, stat values, and inline emphasis. Now each slot's paytable
  // info screen lights up in its own colour.
  const accent = cfg.theme.accent;
  const glow = cfg.theme.glow;
  const accentStyle = { color: accent } as const;
  const glowStyle = { color: accent, textShadow: `0 0 6px ${glow}` } as const;
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <div className="card bg-bg-elev/60 p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Odds model</div>
            <div className="font-mono font-bold text-base mt-0.5" style={accentStyle}>Local</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Play mode</div>
            <div className="mt-1 font-mono text-base font-bold" style={accentStyle}>Credits</div>
            <div className="text-[9px] text-ink-mute mt-0.5">No cash value</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-ink-mute">Max Win</div>
            {/* Was hardcoded "5,000×". Now reads cfg.maxWinMultiplier so
             *  Bonanza shows 21,100×, Wolf Gold 9,500×, Wanted 12,500×, etc. */}
            <div className="font-mono font-bold text-base mt-0.5" style={accentStyle}>
              {(cfg.maxWinMultiplier ?? 5000).toLocaleString()}×
            </div>
          </div>
        </div>
      </div>
      <Section title="Free Spins" accent={accent}>
        Land {cfg.scatterTriggerCount}+ scatters anywhere to trigger {' '}
        <strong style={glowStyle}>{cfg.freeSpinsAwardOnTrigger} free spins</strong>.
        {cfg.multiplierFreeMode === 'accumulate-on-win' ? ' Winning multiplier symbols add to a feature total. It applies to a spin only when a new multiplier lands with a win.' : ' Multiplier symbols stay for the tumble sequence and their sum multiplies that spin’s total win.'}
      </Section>
      <Section title="Retrigger" accent={accent}>
        {cfg.scatterRetriggerCount}+ scatters during free spins awards an additional {' '}
        <strong style={glowStyle}>+{cfg.freeSpinsAwardOnRetrigger}</strong> spins.
      </Section>
      <Section title="Ante Bet" accent={accent}>
        Toggle the Ante checkbox to increase your bet by {' '}
        <strong>{Math.round((cfg.ante.betMultiplier - 1) * 100)}%</strong>{' '}
        and multiply the local scatter symbol weight by {cfg.ante.scatterWeightBoost.toFixed(1)}. This does not mean the feature chance rises by the same factor.
      </Section>
      <Section title="Buy Bonus" accent={accent}>
        Tap "Buy {cfg.buyBonusCost}×" to skip the wait and enter the bonus round directly,
        for a cost of <strong>{cfg.buyBonusCost}× your current bet</strong> (about
        {' '}{fmtCurrency(cfg.buyBonusCost)} per unit bet).
      </Section>
      <Section title="Auto-play / Turbo" accent={accent}>
        Tap the ⚡ button to enable turbo (faster spins). Tap the ↻ button to start
        auto-play with a configurable spin count. Auto-play pauses if your balance falls
        below the bet or you leave the tab. Opening game menus pauses autoplay.
      </Section>
      <Section title="Tap to Skip" accent={accent}>
        Tap anywhere on the painted scene during a spin to fast-forward animations to
        the end, or press Space/the spin button again. The complete round is saved to your play balance and history before animation, so leaving or refreshing does not lose awarded free-spin wins.
      </Section>
    </div>
  );
}

function Section({ title, children, accent }: { title: string; children: React.ReactNode; accent: string }) {
  return (
    <div>
      <h3 className="font-semibold mb-1.5" style={{ color: accent }}>{title}</h3>
      <p className="text-ink-dim">{children}</p>
    </div>
  );
}
