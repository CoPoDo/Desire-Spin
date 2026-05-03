import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';

export function TopBar({
  onOpenFairness,
  onOpenHistory,
  onToggleNav,
}: {
  onOpenFairness: () => void;
  onOpenHistory: () => void;
  onToggleNav: () => void;
}) {
  const { balance, sound } = useGame();
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-bg/70 border-b border-edge">
      <div className="max-w-[1400px] mx-auto h-16 px-4 md:px-6 flex items-center gap-3">
        <button
          aria-label="Toggle navigation"
          className="md:hidden btn-ghost px-2 py-1 text-lg"
          onClick={onToggleNav}
        >
          ☰
        </button>
        <Link to="/" className="md:hidden font-display font-bold">
          Desire-Spin
        </Link>

        <div className="hidden md:flex flex-1" />

        <motion.div
          className="ml-auto flex items-center gap-2 rounded-xl bg-bg-card border border-edge pl-4 pr-2 py-1.5"
          initial={false}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 0.4 }}
          key={balance.balance}
        >
          <span className="label">Balance</span>
          <span className="font-mono font-semibold text-ink tabular-nums">
            {fmtCurrency(balance.balance)}
          </span>
          <button
            className="ml-2 btn-primary py-1 px-3 text-xs"
            onClick={() => balance.credit(1000)}
            title="Add 1,000 play money"
          >
            +1,000
          </button>
        </motion.div>

        <button
          className="btn-ghost py-1.5 px-3 text-xs hidden sm:inline-flex"
          onClick={onOpenHistory}
        >
          History
        </button>
        <button className="btn-ghost py-1.5 px-3 text-xs" onClick={onOpenFairness}>
          Fairness
        </button>
        <button
          className="btn-ghost py-1.5 px-2 text-base"
          aria-label={sound.enabled ? 'Mute sound' : 'Unmute sound'}
          onClick={() => sound.setEnabled(!sound.enabled)}
        >
          {sound.enabled ? '♪' : '♪̸'}
        </button>
      </div>
    </header>
  );
}
