import { ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';
import { FairnessPanel } from '../fairness/FairnessPanel';
import { BetHistoryTable } from '../fairness/BetHistoryTable';

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
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6"/>
          </svg>
        </Link>

        <div className="flex-1 flex items-center justify-center">
          <div
            className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-sm border border-[#ffc62a]/35 flex items-center gap-2"
            style={{ boxShadow: '0 0 18px rgba(255,198,42,.18)' }}
          >
            <span className="text-[10px] uppercase tracking-widest text-[#ffe9a8]/70">Bal</span>
            <span className="font-mono font-semibold text-sm text-[#ffe9a8] tabular-nums">
              {fmtCurrency(balance.balance)}
            </span>
          </div>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60"
        >
          <svg viewBox="0 0 24 24" width={20} height={20} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="5"  r="1.4"/>
            <circle cx="12" cy="12" r="1.4"/>
            <circle cx="12" cy="19" r="1.4"/>
          </svg>
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
