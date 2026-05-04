import { ReactNode, useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { FairnessPanel } from '../fairness/FairnessPanel';
import { BetHistoryTable } from '../fairness/BetHistoryTable';

export function Layout({ children }: { children: ReactNode }) {
  const [fairnessOpen, setFairnessOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onOpenFairness={() => setFairnessOpen(true)}
          onOpenHistory={() => setHistoryOpen(true)}
          onToggleNav={() => setNavOpen((v) => !v)}
        />
        <main className="flex-1 px-4 md:px-8 pb-24 pt-6 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
        <footer className="border-t border-edge bg-bg-elev/60">
          <div className="max-w-[1400px] mx-auto px-6 py-6 text-xs text-ink-mute leading-relaxed">
            Desire-Spin is a play-money emulator for entertainment and educational use.
            No real wagering, no real currency, no real winnings. All game art is original;
            names referenced are trademarks of their respective owners and are not affiliated
            with this project.
          </div>
        </footer>
      </div>

      <FairnessPanel open={fairnessOpen} onClose={() => setFairnessOpen(false)} />
      <BetHistoryTable open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
