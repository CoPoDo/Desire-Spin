import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const sections: { label: string; items: { to: string; label: string; icon: string; live?: boolean }[] }[] = [
  {
    label: 'Casino',
    items: [
      { to: '/casino', label: 'Lobby', icon: '⌂' },
      { to: '/slots/sweet-bonanza', label: 'Slots', icon: '🎰', live: true },
      { to: '/live', label: 'Live Casino', icon: '◉' },
    ],
  },
  {
    label: 'More',
    items: [
      { to: '/sports', label: 'Sports', icon: '⚽' },
      { to: '/promotions', label: 'Promotions', icon: '★' },
      { to: '/settings', label: 'Settings', icon: '⚙' },
    ],
  },
];

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {open && (
          <motion.button
            aria-label="Close navigation"
            className="fixed inset-0 bg-black/60 z-30 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <aside
        className={
          'border-r border-edge bg-bg-elev/80 backdrop-blur-sm w-60 shrink-0 z-40 ' +
          'md:sticky md:top-0 md:h-screen md:translate-x-0 ' +
          'fixed inset-y-0 left-0 transition-transform ' +
          (open ? 'translate-x-0' : '-translate-x-full md:translate-x-0')
        }
      >
        <div className="flex items-center gap-2 px-5 h-16 border-b border-edge">
          <Logo />
          <span className="font-display font-bold text-lg tracking-tight">Desire-Spin</span>
        </div>
        <nav className="px-3 py-4 space-y-6">
          {sections.map((s) => (
            <div key={s.label}>
              <div className="label px-2 mb-1.5">{s.label}</div>
              <ul className="space-y-0.5">
                {s.items.map((it) => (
                  <li key={it.to}>
                    <NavLink
                      to={it.to}
                      onClick={onClose}
                      className={({ isActive }) =>
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ' +
                        (isActive
                          ? 'bg-bg-hover text-ink shadow-inner'
                          : 'text-ink-dim hover:bg-bg-hover hover:text-ink')
                      }
                    >
                      <span className="w-5 text-center text-base">{it.icon}</span>
                      <span className="flex-1">{it.label}</span>
                      {it.live && (
                        <span className="pill bg-accent/15 text-accent">live</span>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 absolute bottom-0 left-0 right-0 text-[11px] text-ink-mute border-t border-edge">
          v0.1 · play money only
        </div>
      </aside>
    </>
  );
}

function Logo() {
  return (
    <svg width={28} height={28} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1fff7a" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="#0f1419" />
      <path d="M20 40 Q32 14 44 40 Q32 50 20 40 Z" fill="url(#lg)" />
      <circle cx="32" cy="34" r="4" fill="#0f1419" />
    </svg>
  );
}
