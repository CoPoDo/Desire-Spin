import { NavLink } from 'react-router-dom';
import { Modal } from '../ui/Modal';

const sections = [
  { label: 'Explore', items: [{ to: '/casino', label: 'All games', icon: '◈' }, { to: '/casino?category=slot', label: 'Slots', icon: '▥' }, { to: '/casino?category=original', label: 'Table & instant', icon: '♠' }] },
  { label: 'Your lounge', items: [{ to: '/settings', label: 'Settings', icon: '⚙' }] },
];

function Navigation({ onClose }: { onClose: () => void }) {
  return <nav aria-label="Main navigation" className="px-3 py-4 space-y-7">{sections.map((section) => <div key={section.label}><p className="label px-3 mb-2">{section.label}</p><ul className="space-y-1">{section.items.map((item) => <li key={item.to}><NavLink to={item.to} onClick={onClose} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-ink-dim hover:bg-bg-hover hover:text-ink transition-colors"><span aria-hidden="true" className="w-5 text-center text-lg text-accent">{item.icon}</span>{item.label}</NavLink></li>)}</ul></div>)}</nav>;
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return <>
    <aside id="lobby-navigation" className="hidden md:flex flex-col border-r border-edge bg-bg-elev/80 backdrop-blur-sm w-56 shrink-0 sticky top-0 h-screen">
      <div className="flex items-center gap-2 px-5 h-16 border-b border-edge shrink-0"><span aria-hidden="true" className="grid place-items-center w-8 h-8 rounded-xl bg-accent text-bg font-black text-xl">D</span><span className="font-display font-bold text-lg tracking-tight">Desire-Spin</span></div>
      <Navigation onClose={onClose} />
      <div className="mt-auto px-5 py-6 border-t border-edge"><p className="text-xs text-ink">All the play. No real money.</p><p className="mt-2 text-[11px] leading-relaxed text-ink-mute">34 games, free credits and outcomes generated on your device.</p></div>
    </aside>
    <Modal open={open} onClose={onClose} title="Desire-Spin" width="sm"><Navigation onClose={onClose} /></Modal>
  </>;
}
