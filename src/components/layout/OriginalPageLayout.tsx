import { ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';
import { GameMenu } from './GameMenu';
import { BackIcon, MenuDotsIcon } from '../ui/icons';

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
  const { balance } = useGame();
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
          className="flex items-center justify-center w-11 h-11 shrink-0 rounded bg-stake-panel border border-stake-border text-stake-muted hover:text-stake-text transition active:scale-90"
        >
          <BackIcon size={18} strokeWidth={2.4} />
        </Link>

        <div className="flex-1 text-center font-display font-semibold text-sm truncate min-w-0 text-stake-text">
          {title}
        </div>

        <div className="flex items-center gap-1.5">
          <div className="px-2.5 py-1.5 rounded bg-stake-bg border border-stake-border flex items-center gap-1.5">
            <span className="font-mono font-semibold text-xs text-stake-text tabular-nums">
              {fmtCurrency(balance.balance)}
            </span>
            <span className="text-stake-dim text-[9px] font-mono">CR</span>
          </div>
          <button
            onClick={() => balance.credit(1000)}
            aria-label="Add 1,000 play-money credits"
            className="min-h-11 px-2.5 py-1.5 rounded bg-stake-green text-stake-bg text-[11px] font-bold transition active:scale-95 hover:bg-stake-green-hi"
          >
            +1k
          </button>
          <button
            aria-label="Game menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center justify-center w-11 h-11 shrink-0 rounded bg-stake-panel border border-stake-border text-stake-muted hover:text-stake-text transition active:scale-90"
          >
            <MenuDotsIcon size={18} strokeWidth={2.4} />
          </button>
        </div>
      </header>



      {/* Content area — safe-area-inset-bottom padding so action buttons
          (Cash Out, Bet, Deal, Roll) on phones with a home indicator
          don't sit under the gesture bar. Each game's own bottom
          padding stacks on top of this. */}
      <main className="original-game-main flex-1 min-h-0 overflow-auto pb-[max(env(safe-area-inset-bottom),0px)]">{children}</main>

      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
