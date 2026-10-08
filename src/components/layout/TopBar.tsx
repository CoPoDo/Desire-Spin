import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';

export function TopBar({ onOpenFairness, onOpenHistory, onToggleNav, navOpen }: {
  onOpenFairness: () => void;
  onOpenHistory: () => void;
  onToggleNav: () => void;
  navOpen: boolean;
}) {
  const { balance, sound } = useGame();
  return <header className="sticky top-0 z-20 backdrop-blur-xl bg-bg/90 border-b border-edge">
    <div className="max-w-[1400px] mx-auto min-h-16 px-3 md:px-6 py-2 flex flex-wrap items-center gap-2">
      <button aria-label="Toggle navigation" aria-expanded={navOpen} aria-controls="lobby-navigation" className="md:hidden btn-ghost w-11 h-11 p-0 text-lg shrink-0" onClick={onToggleNav}>☰</button>
      <Link to="/" className="md:hidden font-display font-bold text-sm min-w-0">Desire-Spin</Link>
      <span className="hidden md:flex flex-1 items-center gap-2 text-xs uppercase tracking-[.18em] text-ink-dim"><span className="w-1.5 h-1.5 rounded-full bg-accent" />Play-money lounge</span>
      <div className="ml-auto flex items-center gap-2 rounded-xl bg-bg-card border border-edge pl-3 pr-1.5 py-1.5">
        <div><span className="block text-[9px] uppercase tracking-widest text-ink-dim">Play credits</span><span className="font-mono text-sm font-semibold text-ink tabular-nums">{fmtCurrency(balance.balance)}</span></div>
        <button className="btn-primary min-h-10 px-2 text-xs" onClick={() => balance.credit(1000)} aria-label="Add 1,000 play-money credits">+1k</button>
      </div>
      <div className="flex items-center justify-end w-full sm:w-auto gap-1">
        <button className="btn-ghost min-h-10 px-3 text-xs" onClick={onOpenHistory}>History</button>
        <button className="btn-ghost min-h-10 px-3 text-xs" onClick={onOpenFairness}>Fairness</button>
        <button className="btn-ghost w-10 h-10 p-0 text-base" aria-label={sound.enabled ? 'Mute sound' : 'Unmute sound'} aria-pressed={sound.enabled} onClick={() => sound.setEnabled(!sound.enabled)}>{sound.enabled ? '♪' : '♪̸'}</button>
      </div>
    </div>
  </header>;
}
