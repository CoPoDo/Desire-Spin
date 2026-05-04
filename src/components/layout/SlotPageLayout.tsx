import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';
import { FairnessPanel } from '../fairness/FairnessPanel';
import { BetHistoryTable } from '../fairness/BetHistoryTable';
import { BackIcon, MenuDotsIcon } from '../ui/icons';

/** Full-screen immersive layout for a slot game page. No sidebar, no footer.
 *  A compact floating top bar shows balance + back link + sound toggle.
 *  Designed for mobile-first portrait phones. */
export function SlotPageLayout({ children }: { children: ReactNode }) {
  const { balance, sound } = useGame();
  const [fairnessOpen, setFairnessOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#060311] text-ink flex flex-col">
      {/* Floating slim top bar — overlays on top of the painted scene. */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),6px)] pb-1.5 bg-gradient-to-b from-black/55 to-transparent">
        <Link
          to="/"
          aria-label="Back to lobby"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60"
        >
          <BackIcon size={20} strokeWidth={2.4} />
        </Link>

        <div className="flex-1 flex items-center justify-center gap-1">
          <div
            className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-[#ffc62a]/35 flex items-center gap-2"
            style={{ boxShadow: '0 0 18px rgba(255,198,42,.18)' }}
          >
            <span className="text-[10px] uppercase tracking-widest text-[#ffe9a8]/70">Bal</span>
            <span className="font-mono font-semibold text-sm text-[#ffe9a8] tabular-nums">
              {fmtCurrency(balance.balance)}
            </span>
          </div>
          <button
            onClick={() => balance.credit(1000)}
            aria-label="Add 1,000 play money"
            className="px-2 py-1 rounded-full bg-gradient-to-b from-[#ffc62a] to-[#c8932e] border border-[#ffe9a8]/60 text-[#1a0f00] text-[10px] font-bold uppercase tracking-wider shadow-[0_0_14px_rgba(255,198,42,.5)] active:scale-95 transition"
          >
            +1k
          </button>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60"
        >
          <MenuDotsIcon size={20} strokeWidth={2.4} />
        </button>
      </header>

      {/* Slide-out menu sheet */}
      {menuOpen && (
        <>
          <button
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div className="fixed top-16 right-3 z-50 w-56 rounded-2xl bg-bg-card border border-edge shadow-2xl overflow-hidden">
            <button
              onClick={() => { sound.setEnabled(!sound.enabled); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover"
            >
              <span>Sound</span>
              <span className="text-ink-dim">{sound.enabled ? 'On' : 'Off'}</span>
            </button>
            <button
              onClick={() => { setHistoryOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover border-t border-edge"
            >
              <span>Bet history</span>
              <span className="text-ink-dim">›</span>
            </button>
            <button
              onClick={() => { setFairnessOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover border-t border-edge"
            >
              <span>Fairness</span>
              <span className="text-ink-dim">›</span>
            </button>
            <Link
              to="/settings"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover border-t border-edge"
            >
              <span>Settings</span>
              <span className="text-ink-dim">›</span>
            </Link>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover border-t border-edge"
            >
              <span>Back to lobby</span>
              <span className="text-ink-dim">›</span>
            </Link>
          </div>
        </>
      )}

      {/* The actual game view fills the screen, after the floating top bar overlays it. */}
      <main className="flex-1 min-h-0 relative">{children}</main>

      <FairnessPanel open={fairnessOpen} onClose={() => setFairnessOpen(false)} />
      <BetHistoryTable open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
