import { ReactNode, useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';
import { FairnessPanel } from '../fairness/FairnessPanel';
import { BetHistoryTable } from '../fairness/BetHistoryTable';
import { SessionStatsPanel } from '../SessionStatsPanel';
import { BackIcon, MenuDotsIcon, SoundIcon, SoundMutedIcon } from '../ui/icons';

/** Layout for Stake-style "Originals" (Dice, Limbo, Crash, Mines, etc).
 *
 * Mobile-first single-screen view, like SlotPageLayout but simpler — no
 * painted backdrop. The game content area gets a flat dark theme to keep
 * focus on the numbers + controls (Stake's aesthetic).
 *
 * Top: back / title / balance pill / menu dots.
 * Bottom: nothing (each game owns its bet controls).
 */
export function OriginalPageLayout({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { balance, sound } = useGame();
  const [fairnessOpen, setFairnessOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const prevHtml = document.documentElement.style.overflow;
    const prevBody = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = prevHtml;
      document.body.style.overflow = prevBody;
    };
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-bg text-ink flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 border-b border-edge bg-bg-elev/60 backdrop-blur-sm flex-shrink-0">
        <Link
          to="/"
          aria-label="Back to lobby"
          className="flex items-center justify-center w-9 h-9 rounded-full bg-bg-card border border-edge text-ink-dim hover:text-ink transition active:scale-90"
        >
          <BackIcon size={18} strokeWidth={2.4} />
        </Link>

        <div className="flex-1 text-center font-display font-semibold text-sm truncate">
          {title}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1 rounded-full bg-bg-card border border-accent/30 flex items-center gap-1.5">
            <span className="text-[9px] uppercase tracking-widest text-ink-mute">Bal</span>
            <span className="font-mono font-semibold text-xs text-ink tabular-nums">
              {fmtCurrency(balance.balance)}
            </span>
          </div>
          <button
            onClick={() => balance.credit(1000)}
            aria-label="Add 1,000"
            className="px-2 py-1 rounded-full bg-accent text-bg text-[10px] font-bold uppercase tracking-wider"
          >
            +1k
          </button>
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-bg-card border border-edge text-ink-dim hover:text-ink transition active:scale-90"
          >
            <MenuDotsIcon size={18} strokeWidth={2.4} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.button
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            />
            <motion.div
              className="fixed top-14 right-3 z-50 w-56 rounded-2xl bg-bg-card border border-edge shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            >
            <button
              onClick={() => sound.setEnabled(!sound.enabled)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover"
            >
              <span className="flex items-center gap-2">
                {sound.enabled ? <SoundIcon size={16} /> : <SoundMutedIcon size={16} />}
                Sound
              </span>
              <span className="text-ink-dim">{sound.enabled ? 'On' : 'Off'}</span>
            </button>
            <button
              onClick={() => { setStatsOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-bg-hover border-t border-edge"
            >
              <span>Session stats</span>
              <span className="text-ink-dim">›</span>
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
              to="/"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-3 text-sm hover:bg-bg-hover border-t border-edge"
            >
              <span>Back to lobby</span>
            </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="flex-1 min-h-0 overflow-auto">{children}</main>

      <FairnessPanel open={fairnessOpen} onClose={() => setFairnessOpen(false)} />
      <BetHistoryTable open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <SessionStatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
    </div>
  );
}
