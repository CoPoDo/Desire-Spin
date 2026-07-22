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
    <div className="fixed inset-0 overflow-hidden bg-stake-bg text-stake-text flex flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),8px)] pb-2 border-b border-stake-border bg-stake-card flex-shrink-0">
        <Link
          to="/"
          aria-label="Back to lobby"
          className="flex items-center justify-center w-9 h-9 rounded bg-stake-panel border border-stake-border text-stake-muted hover:text-stake-text transition active:scale-90"
        >
          <BackIcon size={18} strokeWidth={2.4} />
        </Link>

        <div className="flex-1 text-center font-display font-semibold text-sm truncate text-stake-text">
          {title}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1.5 rounded bg-stake-bg border border-stake-border flex items-center gap-1.5">
            <span className="font-mono font-semibold text-xs text-stake-text tabular-nums">
              {fmtCurrency(balance.balance)}
            </span>
            <span className="text-stake-dim text-xs font-mono">$</span>
          </div>
          <button
            onClick={() => balance.credit(1000)}
            aria-label="Add 1,000"
            className="px-2.5 py-1.5 rounded bg-stake-green text-stake-bg text-[11px] font-bold transition active:scale-95 hover:bg-stake-green-hi"
          >
            +1k
          </button>
          <button
            aria-label="Menu"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center w-9 h-9 rounded bg-stake-panel border border-stake-border text-stake-muted hover:text-stake-text transition active:scale-90"
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
              className="fixed top-14 right-3 z-50 w-56 rounded-lg bg-stake-card border border-stake-border shadow-2xl overflow-hidden"
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            >
            <button
              onClick={() => sound.setEnabled(!sound.enabled)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-stake-text hover:bg-stake-panel"
            >
              <span className="flex items-center gap-2">
                {sound.enabled ? <SoundIcon size={16} /> : <SoundMutedIcon size={16} />}
                Sound
              </span>
              <span className="text-stake-dim">{sound.enabled ? 'On' : 'Off'}</span>
            </button>
            <button
              onClick={() => { setStatsOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-stake-text hover:bg-stake-panel border-t border-stake-border"
            >
              <span>Session stats</span>
              <span className="text-stake-dim">›</span>
            </button>
            <button
              onClick={() => { setHistoryOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-stake-text hover:bg-stake-panel border-t border-stake-border"
            >
              <span>Bet history</span>
              <span className="text-stake-dim">›</span>
            </button>
            <button
              onClick={() => { setFairnessOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-3 text-sm text-stake-text hover:bg-stake-panel border-t border-stake-border"
            >
              <span>Fairness</span>
              <span className="text-stake-dim">›</span>
            </button>
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="block w-full px-4 py-3 text-sm text-stake-text hover:bg-stake-panel border-t border-stake-border"
            >
              <span>Back to lobby</span>
            </Link>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Content area — safe-area-inset-bottom padding so action buttons
          (Cash Out, Bet, Deal, Roll) on phones with a home indicator
          don't sit under the gesture bar. Each game's own bottom
          padding stacks on top of this. */}
      <main className="original-game-main flex-1 min-h-0 overflow-auto pb-[max(env(safe-area-inset-bottom),0px)]">{children}</main>

      <FairnessPanel open={fairnessOpen} onClose={() => setFairnessOpen(false)} />
      <BetHistoryTable open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <SessionStatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
    </div>
  );
}
