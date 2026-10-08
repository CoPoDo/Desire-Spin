import { ReactNode, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame } from '../../game-context';
import { fmtCurrency } from '../../lib/format';
import { GameMenu } from './GameMenu';
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
  const { balance } = useGame();
  const integratedCabinet = ['Wanted Dead or a Wild', 'Gates of Olympus', 'Sweet Bonanza', 'Sugar Rush', 'Big Juan', 'Big Bass Bonanza', 'Classic 3-Reel Slot', 'Wolf Gold', "Pharaoh's Gold"].includes(title ?? '');
  const containedChrome = true;
  // Pre-compute accent-derived rgba values for box-shadows / borders so we
  // don't have to inline regex-pad the accent hex everywhere.
  const accentRgba = useMemo(() => hexToRgba(accent), [accent]);
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
      <header className={`${containedChrome ? `relative shrink-0 bg-[#0b1018] border-b border-white/10 ${integratedCabinet ? 'frontier-app-header' : 'contained-game-header'}` : 'absolute top-0 left-0 right-0 bg-gradient-to-b from-black/55 to-transparent'} z-30 flex items-center justify-between game-topbar gap-2 px-3 pt-[max(env(safe-area-inset-top),6px)] pb-1.5`}>
        <Link
          to="/"
          aria-label="Back to lobby"
          className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60 transition active:scale-90"
        >
          <BackIcon size={20} strokeWidth={2.4} />
        </Link>

        <div className="min-w-0 flex-1 flex items-center justify-center gap-1.5">
          {title && !integratedCabinet && (
            <div
              className="game-chrome-title font-display font-extrabold text-xs sm:text-base truncate min-w-0 mr-1.5"
              title={title}
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
            className="shrink-0 px-2 sm:px-3 py-1 rounded-full bg-black/45 backdrop-blur-sm flex items-center gap-2"
            style={{
              border: `1px solid ${accentRgba(0.35)}`,
              boxShadow: `0 0 18px ${accentRgba(0.18)}`,
            }}
          >
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest" style={{ color: accentRgba(0.7) }}>Bal</span>
            <span className="font-mono font-semibold text-xs sm:text-sm tabular-nums" style={{ color: accent }}>
              {fmtCurrency(balance.balance)}
            </span>
          </div>
          <button
            onClick={() => balance.credit(1000)}
            aria-label="Add 1,000 play money"
            className="shrink-0 min-w-11 min-h-11 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider active:scale-95 transition"
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
          aria-label="Game menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center justify-center w-11 h-11 shrink-0 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 text-white/90 hover:bg-black/60 transition active:scale-90"
        >
          <MenuDotsIcon size={20} strokeWidth={2.4} />
        </button>
      </header>

      {/* Slide-out menu sheet — fades + drops in for tactile open / close. */}


      {/* The actual game view fills the screen, after the floating top bar overlays it. */}
      <main className="flex-1 min-h-0 relative overflow-auto overscroll-contain">{children}</main>

      <GameMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
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
