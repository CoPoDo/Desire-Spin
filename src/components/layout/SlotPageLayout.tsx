import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';
import { FairnessPanel } from '../fairness/FairnessPanel';
import { BetHistoryTable } from '../fairness/BetHistoryTable';
import { SessionStatsPanel } from '../SessionStatsPanel';
import { BackIcon, MenuDotsIcon } from '../ui/icons';

/** Full-screen immersive layout for a slot game page. No sidebar, no footer.
 *  A compact floating top bar shows back link / game title / balance +
 *  refill / menu — matching the Originals top-bar pattern so the lobby
 *  feels unified.
 *
 *  `accent` / `accentDeep` opt the title gradient + balance pill + refill
 *  button into the slot's theme palette. Defaults preserve the original
 *  Olympus gold so the layout still works for any caller that doesn't
 *  specify an accent. */
export function SlotPageLayout({
  children,
  title,
  accent = '#ffc62a',
  accentDeep = '#c8932e',
}: {
  children: ReactNode;
  title?: string;
  accent?: string;
  accentDeep?: string;
}) {
  const { balance, sound } = useGame();
  // Pre-compute accent-derived rgba values for box-shadows / borders so we
  // don't have to inline regex-pad the accent hex everywhere.
  const accentRgba = useMemo(() => hexToRgba(accent), [accent]);
  const [fairnessOpen, setFairnessOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the slot page is mounted. Belt-and-suspenders:
  // the layout is also fixed inset-0 + overflow-hidden, but on Android Chrome
  // the URL bar collapsing while playing can transiently expose body scroll.
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
    <div className="fixed inset-0 overflow-hidden bg-[#060311] text-ink flex flex-col">
      {/* Floating slim top bar — overlays on top of the painted scene. */}
      <header className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between gap-2 px-3 pt-[max(env(safe-area-inset-top),6px)] pb-1.5 bg-gradient-to-b from-black/55 to-transparent">
        <Link
          to="/"
          aria-label="Back to lobby"
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60 transition active:scale-90"
        >
          <BackIcon size={20} strokeWidth={2.4} />
        </Link>

        <div className="flex-1 flex items-center justify-center gap-1.5">
          {title && (
            <div
              className="font-display font-extrabold text-sm sm:text-base whitespace-nowrap mr-1.5"
              style={{
                background: `linear-gradient(180deg, #fff5c4 0%, ${accent} 60%, ${accentDeep} 100%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.55))',
                letterSpacing: '0.04em',
              }}
            >
              {title}
            </div>
          )}
          <div
            className="px-3 py-1 rounded-full bg-black/45 backdrop-blur-sm flex items-center gap-2"
            style={{
              border: `1px solid ${accentRgba(0.35)}`,
              boxShadow: `0 0 18px ${accentRgba(0.18)}`,
            }}
          >
            <span className="text-[10px] uppercase tracking-widest" style={{ color: accentRgba(0.7) }}>Bal</span>
            <span className="font-mono font-semibold text-sm tabular-nums" style={{ color: accent }}>
              {fmtCurrency(balance.balance)}
            </span>
          </div>
          <button
            onClick={() => balance.credit(1000)}
            aria-label="Add 1,000 play money"
            className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider active:scale-95 transition"
            style={{
              background: `linear-gradient(180deg, ${accent}, ${accentDeep})`,
              border: `1px solid ${accentRgba(0.6)}`,
              color: '#1a0f00',
              boxShadow: `0 0 14px ${accentRgba(0.5)}`,
            }}
          >
            +1k
          </button>
        </div>

        <button
          aria-label="Menu"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60 transition active:scale-90"
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
      <SessionStatsPanel open={statsOpen} onClose={() => setStatsOpen(false)} />
    </div>
  );
}

/** Tiny hex→rgba helper. Returns a function that takes alpha and emits
 *  rgba() — lets us interpolate the accent into shadows/borders without
 *  hand-padding `${accent}55` style hex strings (which break for 4/8-char
 *  hex inputs). Memoised at the call-site for stable identity. */
function hexToRgba(hex: string): (alpha: number) => string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})/i.exec(hex);
  const r = m ? parseInt(m[1]!, 16) : 255;
  const g = m ? parseInt(m[2]!, 16) : 198;
  const b = m ? parseInt(m[3]!, 16) : 42;
  return (alpha: number) => `rgba(${r},${g},${b},${alpha})`;
}
