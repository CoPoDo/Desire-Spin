import { useMemo, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { InstantGameArt } from '../components/layout/InstantGameArt';
import { GameCard } from '../components/layout/GameCard';
import { useGame } from '../game-context';
import { BonanzaArt } from './slots/sweet-bonanza/Art';
import { OlympusArt } from './slots/gates-of-olympus/Art';
import { SugarRushArt } from './slots/sugar-rush/Art';
import { WantedWildArt } from './slots/wanted-wild/Art';
import { PharaohGoldArt } from './slots/pharaoh-gold/Art';
import { WolfGoldArt } from './slots/wolf-gold/Art';
import { BigBassArt } from './originals/big-bass/Art';
import { ClassicSlotArt } from './originals/mini-slot/Art';
import { BigJuanArt } from './slots/big-juan/Art';

type Game = {
  to: string;
  title: string;
  subtitle: string;
  badge?: string;
  bg?: string;
  art: ReactNode;
  category: 'slot' | 'original';
  /** Lowercase tokens for search matching. Title is auto-added. */
  searchTags?: string[];
};

export const GAMES: Game[] = [
  // --- Slots ---
  { to: '/slots/sweet-bonanza',    title: 'Sweet Bonanza',          subtitle: '6×5 tumble · 21,100× max',        badge: 'HOT', bg: 'linear-gradient(180deg, #2a1148 0%, #160628 100%)', art: <BonanzaArt />,    category: 'slot', searchTags: ['fruit', 'candy', 'pragmatic', 'tumble', 'pink'] },
  { to: '/slots/gates-of-olympus', title: 'Gates of Olympus',       subtitle: 'Tumble · 5,000× max',            badge: 'NEW', bg: 'linear-gradient(180deg, #0a1530 0%, #070d20 100%)', art: <OlympusArt />,    category: 'slot', searchTags: ['zeus', 'greek', 'pragmatic', 'tumble', 'gold', 'olympus'] },
  { to: '/slots/sugar-rush',       title: 'Sugar Rush',             subtitle: '7×7 clusters · multiplier spots',badge: 'NEW', bg: 'linear-gradient(180deg, #ff7ad9 0%, #5a1c70 100%)', art: <SugarRushArt />,  category: 'slot', searchTags: ['candy', 'sweet', 'sugar', 'cluster', 'pragmatic'] },
  { to: '/slots/wanted-wild',      title: 'Wanted Dead or a Wild',  subtitle: '5×5 · 15 paylines · DuelReels',  badge: 'NEW', bg: 'linear-gradient(180deg, #d8442a 0%, #2a0810 100%)', art: <WantedWildArt />, category: 'slot', searchTags: ['western', 'hacksaw', 'wanted', 'wild west'] },
  { to: '/slots/pharaoh-gold',     title: "Pharaoh's Gold",         subtitle: '3×3 · classic 3-line reels',      badge: 'NEW', bg: 'linear-gradient(180deg, #ffd166 0%, #14051a 100%)', art: <PharaohGoldArt />,category: 'slot', searchTags: ['egypt', 'pharaoh', 'gold', 'ancient'] },
  { to: '/slots/wolf-gold',        title: 'Wolf Gold',              subtitle: '5×3 · Money Respin',              badge: 'NEW', bg: 'linear-gradient(180deg, #6638c8 0%, #02010a 100%)', art: <WolfGoldArt />,   category: 'slot', searchTags: ['wolf', 'wild', 'animal', 'pragmatic'] },
  { to: '/slots/big-juan',         title: 'Big Juan',               subtitle: 'Hold-and-spin · Fiesta jackpots',badge: 'HOT', bg: 'radial-gradient(80% 60% at 50% 45%, #ff8a55 0%, #c8102e 35%, #5a0810 70%, #14040a 100%)', art: <BigJuanArt />, category: 'slot', searchTags: ['mexican', 'pinata', 'hold and spin', 'jackpot'] },

  // --- Originals ---
  { to: '/originals/dice',          title: 'Dice',                  subtitle: '99% RTP',                   badge: 'LIVE', art: <PlaceholderArt label="🎲" tone="#102b3a" />, category: 'original', searchTags: ['stake', 'classic'] },
  { to: '/originals/limbo',         title: 'Limbo',                 subtitle: '99% RTP',                   badge: 'LIVE', art: <PlaceholderArt label="🚀" tone="#241a3a" />, category: 'original', searchTags: ['stake', 'multiplier'] },
  { to: '/originals/mines',         title: 'Mines',                 subtitle: 'Pick gems, dodge mines',    badge: 'LIVE', art: <PlaceholderArt label="💣" tone="#3a1010" />, category: 'original', searchTags: ['stake', 'gems', 'bomb'] },
  { to: '/originals/crash',         title: 'Crash',                 subtitle: 'Cash out before bust',      badge: 'LIVE', art: <PlaceholderArt label="📈" tone="#102b3a" />, category: 'original', searchTags: ['stake', 'rocket', 'multiplier'] },
  { to: '/originals/plinko',        title: 'Plinko',                subtitle: 'Drop the ball',             badge: 'LIVE', art: <PlaceholderArt label="🟣" tone="#241a3a" />, category: 'original', searchTags: ['stake', 'pegs', 'physics'] },
  { to: '/originals/wheel',         title: 'Wheel',                 subtitle: 'Spin to win',               badge: 'LIVE', art: <PlaceholderArt label="🎡" tone="#3a2010" />, category: 'original', searchTags: ['stake', 'spin', 'roulette'] },
  { to: '/originals/hilo',          title: 'Hilo',                  subtitle: 'Higher or lower',           badge: 'LIVE', art: <PlaceholderArt label="🃏" tone="#1a3a30" />, category: 'original', searchTags: ['stake', 'cards', 'higher lower'] },
  { to: '/originals/dragon-tower',  title: 'Dragon Tower',          subtitle: 'Climb the floors',          badge: 'LIVE', art: <PlaceholderArt label="🗼" tone="#3a1010" />, category: 'original', searchTags: ['stake', 'dragon', 'tower', 'climb'] },
  { to: '/originals/keno',          title: 'Keno',                  subtitle: 'Pick & match',              badge: 'LIVE', art: <PlaceholderArt label="🔢" tone="#1a3a3a" />, category: 'original', searchTags: ['lottery', 'numbers'] },
  { to: '/originals/roulette',      title: 'Roulette',              subtitle: 'European, single 0',        badge: 'LIVE', art: <PlaceholderArt label="🟢" tone="#1a3a1a" />, category: 'original', searchTags: ['table', 'classic'] },
  { to: '/originals/blackjack',     title: 'Blackjack',             subtitle: '3:2 BJ pays',               badge: 'LIVE', art: <PlaceholderArt label="🃏" tone="#102b3a" />, category: 'original', searchTags: ['cards', '21', 'table'] },
  { to: '/originals/baccarat',      title: 'Baccarat',              subtitle: 'Punto Banco',               badge: 'LIVE', art: <PlaceholderArt label="💎" tone="#3a1a3a" />, category: 'original', searchTags: ['cards', 'punto banco', 'table'] },
  { to: '/originals/diamonds',      title: 'Diamonds',              subtitle: '5-gem match',               badge: 'LIVE', art: <PlaceholderArt label="💎" tone="#1a3a3a" />, category: 'original', searchTags: ['gems'] },
  { to: '/originals/video-poker',   title: 'Video Poker',           subtitle: 'Jacks or Better',           badge: 'LIVE', art: <PlaceholderArt label="🃏" tone="#3a1a10" />, category: 'original', searchTags: ['cards', 'poker'] },
  { to: '/originals/flip',          title: 'Flip',                  subtitle: 'Streak the coin',           badge: 'LIVE', art: <PlaceholderArt label="🪙" tone="#3a3010" />, category: 'original', searchTags: ['coin', 'heads tails', 'streak'] },
  { to: '/originals/pump',          title: 'Pump',                  subtitle: 'Inflate before pop',        badge: 'LIVE', art: <PlaceholderArt label="🎈" tone="#3a1a3a" />, category: 'original', searchTags: ['stake', 'balloon'] },
  { to: '/originals/three-cups',    title: 'Three Cups',            subtitle: 'Find the ball',             badge: 'LIVE', art: <PlaceholderArt label="🥤" tone="#102b3a" />, category: 'original', searchTags: ['shell', 'guess'] },
  { to: '/originals/classic-slot',  title: 'Classic 3-Reel Slot',   subtitle: 'Single-line fruit machine', badge: 'LIVE', art: <ClassicSlotArt />, category: 'original', searchTags: ['slot', 'classic', 'fruit'] },
  { to: '/originals/rps',           title: 'Rock Paper Scissors',   subtitle: 'Beat the opponent',         badge: 'LIVE', art: <PlaceholderArt label="✊" tone="#3a1a3a" />, category: 'original', searchTags: ['rps', 'classic'] },
  { to: '/originals/dragon-tiger',  title: 'Dragon Tiger',          subtitle: 'High card wins',            badge: 'LIVE', art: <PlaceholderArt label="🐉" tone="#3a1010" />, category: 'original', searchTags: ['cards', 'asian', 'table'] },
  { to: '/originals/cases',         title: 'Cases',                 subtitle: 'Open the crate',            badge: 'LIVE', art: <PlaceholderArt label="📦" tone="#3a2010" />, category: 'original', searchTags: ['crate', 'csgo'] },
  { to: '/originals/sicbo',         title: 'Sic Bo',                subtitle: 'Three dice',                badge: 'LIVE', art: <PlaceholderArt label="🎲" tone="#1a3a1a" />, category: 'original', searchTags: ['dice', 'asian', 'table'] },
  { to: '/originals/scratch',       title: 'Scratch Card',          subtitle: 'Match 3 to win',            badge: 'LIVE', art: <PlaceholderArt label="🎟️" tone="#2a3a10" />, category: 'original', searchTags: ['scratch', 'lottery'] },
  { to: '/slots/big-bass-bonanza',  title: 'Big Bass Bonanza',      subtitle: '5×3 · fisherman collects',  badge: 'NEW', art: <BigBassArt />, category: 'slot', searchTags: ['fish', 'fishing', 'pragmatic', 'slot'] },
  { to: '/originals/slide',         title: 'Slide',                 subtitle: 'Local multiplier slide',     badge: 'LIVE', art: <PlaceholderArt label="📈" tone="#1a3a30" />, category: 'original', searchTags: ['multiplier'] },
  { to: '/originals/bingo',         title: 'Bingo',                 subtitle: '5×5 lines + draws',         badge: 'LIVE', art: <PlaceholderArt label="🎱" tone="#3a1030" />, category: 'original', searchTags: ['bingo', 'numbers', 'lines'] },
  { to: '/originals/aviator',       title: 'Aviator',               subtitle: 'Plane crashes when?',       badge: 'LIVE', art: <PlaceholderArt label="✈️" tone="#1a3a5a" />, category: 'original', searchTags: ['plane', 'crash', 'spribe'] },
];

function matchesQuery(game: Game, q: string): boolean {
  if (!q) return true;
  const needle = q.toLowerCase().trim();
  if (!needle) return true;
  if (game.title.toLowerCase().includes(needle)) return true;
  if (game.subtitle.toLowerCase().includes(needle)) return true;
  if (game.searchTags?.some((t) => t.toLowerCase().includes(needle))) return true;
  return false;
}

export function Home() {
  const { history, favorites } = useGame();
  const [query, setQuery] = useState('');
  const [params, setParams] = useSearchParams();
  const category = params.get('category') === 'slot' ? 'slot' : params.get('category') === 'original' ? 'original' : 'all';

  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: Game[] = [];
    for (const h of history.history) {
      const base = h.game.replace(/\s+(FS|Buy FS|·.*)$/i, '').replace(/\s+\(B\)$/, '').trim();
      if (seen.has(base)) continue;
      const g = GAMES.find((x) => x.title === base);
      if (g) {
        seen.add(base);
        out.push(g);
        if (out.length >= 5) break;
      }
    }
    return out;
  }, [history.history]);

  const favs = useMemo(
    () =>
      favorites.list
        .map((to) => GAMES.find((g) => g.to === to))
        .filter((g): g is Game => Boolean(g)),
    [favorites.list],
  );

  const slots = useMemo(
    () => GAMES.filter((g) => g.category === 'slot' && category !== 'original' && matchesQuery(g, query)),
    [query, category],
  );
  const originals = useMemo(
    () => GAMES.filter((g) => g.category === 'original' && category !== 'slot' && matchesQuery(g, query)),
    [query, category],
  );

  return (
    <div className="space-y-8">
      <Hero />

      {/* Search bar — single input filters both Slots and Originals.
          Real Stake lobby has this above the games grid; with 39
          titles it's the most-used navigation feature. */}
      <div className="space-y-4">
        <SearchBar value={query} onChange={setQuery} totalCount={GAMES.length} />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter games">
          {([['all', 'All games'], ['slot', 'Slots'], ['original', 'Table & instant']] as const).map(([value, label]) => <button key={value} aria-pressed={category === value} onClick={() => setParams(value === 'all' ? {} : { category: value }, { replace: true })} className={`rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors ${category === value ? 'bg-accent text-bg border-accent' : 'bg-bg-card text-ink-dim border-edge hover:text-ink'}`}>{label}</button>)}
          <span className="ml-auto self-center text-xs text-ink-mute" role="status">{slots.length + originals.length} games</span>
        </div>
      </div>

      {!query && category === 'all' && favs.length > 0 && (
        <section>
          <SectionHeader
            title="Favorites"
            subtitle={`${favs.length} starred game${favs.length === 1 ? '' : 's'}`}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {favs.map((g) => (
              <GameCard key={g.to} {...g} />
            ))}
          </div>
        </section>
      )}

      {!query && category === 'all' && recent.length > 0 && (
        <section>
          <SectionHeader title="Recently Played" subtitle={`${recent.length} game${recent.length === 1 ? '' : 's'} in your history`} />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {recent.map((g) => (
              <GameCard key={g.to} {...g} />
            ))}
          </div>
        </section>
      )}

      {slots.length > 0 && (
        <section>
          <SectionHeader
            title="Slots"
            subtitle={query ? `${slots.length} match${slots.length === 1 ? '' : 'es'}` : 'Reels, tumbles and bonus rounds'}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {slots.map((g) => (
              <GameCard key={g.to} {...g} />
            ))}
          </div>
        </section>
      )}

      {originals.length > 0 && (
        <section>
          <SectionHeader
            title="Table & instant"
            subtitle={query ? `${originals.length} match${originals.length === 1 ? '' : 'es'}` : 'Cards, strategy and quick-play classics'}
          />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
            {originals.map((g) => (
              <GameCard key={g.to} {...g} />
            ))}
          </div>
        </section>
      )}

      {query && slots.length === 0 && originals.length === 0 && (
        <div className="rounded-2xl border border-edge bg-bg-card p-10 text-center">
          <div className="text-5xl mb-3 opacity-50">🔍</div>
          <div className="font-display font-bold text-lg mb-1">No games match "{query}"</div>
          <div className="text-ink-dim text-sm">Try a category like "dice", "slot", or a name.</div>
          <button
            onClick={() => setQuery('')}
            className="mt-4 px-4 py-2 rounded-xl bg-accent text-bg font-bold text-xs uppercase tracking-wider"
          >
            Clear search
          </button>
        </div>
      )}
    </div>
  );
}

function SearchBar({
  value,
  onChange,
  totalCount,
}: {
  value: string;
  onChange: (v: string) => void;
  totalCount: number;
}) {
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-mute pointer-events-none text-base">
        🔍
      </div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Search ${totalCount} games…`}
        className="w-full pl-11 pr-12 py-3 rounded-2xl bg-bg-card border border-edge text-ink text-sm font-medium outline-none focus:border-accent/60 focus:bg-bg-elev transition-colors"
        aria-label="Search games"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-bg-elev border border-edge text-ink-dim hover:text-ink text-xs font-bold flex items-center justify-center transition active:scale-90"
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div className="flex items-center gap-3">
        <span
          className="block w-[3px] h-7 rounded-full bg-accent"
          style={{ boxShadow: '0 0 10px rgba(255,198,42,.55)' }}
          aria-hidden="true"
        />
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-sm text-ink-dim leading-tight">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}

function PlaceholderArt({ label, tone }: { label: string; tone: string }) {
  return <InstantGameArt label={label} tone={tone} />;
}

function Hero() {
  return <section>
    <div className="flex items-end justify-between gap-4 mb-5">
      <div><h1 className="font-display text-3xl font-bold tracking-tight">Casino</h1><p className="mt-1 text-sm text-ink-dim">Slots, table games and originals. All for play.</p></div>
      <span className="hidden sm:inline text-xs text-ink-mute">34 games · free credits</span>
    </div>
    <div className="grid gap-3 sm:grid-cols-[1.35fr_1fr] lg:grid-cols-[1.35fr_1fr_1fr]">
      <Link to="/slots/big-juan" className="feature-game relative isolate h-56 sm:h-64 overflow-hidden rounded-xl bg-[#431c16] border border-[#9a65413d] group">
        <div className="absolute inset-y-0 right-0 w-[62%] opacity-95 transition-transform duration-500 group-hover:scale-105"><BigJuanArt /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#321916] via-[#321916]/75 to-transparent" />
        <div className="absolute inset-y-0 left-0 flex flex-col items-start justify-center p-6"><span className="text-[10px] uppercase tracking-[.18em] text-[#d0a477]">Featured slot</span><h2 className="mt-3 font-display text-4xl font-black leading-[.9] text-[#ffe5ad]">BIG<br />JUAN</h2><p className="mt-3 max-w-[160px] text-xs text-[#ddc1a4]">40 lines. Wild switches.<br />A full-on fiesta.</p><span className="mt-5 inline-flex rounded-md bg-[#f5c87c] px-4 py-2 text-xs font-bold text-[#321916]">Play now <LaunchArrow /></span></div>
      </Link>
      <Link to="/slots/gates-of-olympus" className="feature-game relative isolate h-44 sm:h-64 overflow-hidden rounded-xl border border-[#72628a55] bg-[#1a1834] group">
        <div className="absolute -right-9 -top-5 h-[110%] w-[70%] opacity-85 transition-transform duration-500 group-hover:scale-105"><OlympusArt /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#18162d] via-[#18162d]/75 to-transparent" />
        <div className="absolute left-5 bottom-6"><span className="text-[10px] uppercase tracking-[.18em] text-[#b0a5c9]">Tumble reels</span><h2 className="mt-2 font-display text-2xl font-bold leading-tight text-[#f2deb1]">Gates of<br />Olympus</h2><span className="mt-4 block text-xs font-semibold text-[#d6c6a2]">Enter the temple <LaunchArrow /></span></div>
      </Link>
      <Link to="/originals/blackjack" className="feature-game relative isolate hidden lg:block h-64 overflow-hidden rounded-xl border border-[#427a6544] bg-[#122a24] group">
        <div className="absolute -right-5 -top-3 h-full w-[75%] opacity-85 transition-transform duration-500 group-hover:rotate-3"><InstantGameArt label="🃏" tone="#144c3c" /></div>
        <div className="absolute inset-0 bg-gradient-to-r from-[#132921] via-[#132921]/70 to-transparent" />
        <div className="absolute left-5 bottom-6"><span className="text-[10px] uppercase tracking-[.18em] text-[#8eb7a7]">The classics</span><h2 className="mt-2 font-display text-2xl font-bold text-[#e1ede5]">Blackjack</h2><p className="mt-2 text-xs text-[#9cb6aa]">Dealer stands on soft 17.</p><span className="mt-4 block text-xs font-semibold text-[#bfe7d5]">Take a seat <LaunchArrow /></span></div>
      </Link>
    </div>
  </section>;
}

function LaunchArrow() {
  return <svg aria-hidden="true" viewBox="0 0 16 16" fill="none" className="inline-block w-3.5 h-3.5 ml-1 align-[-2px]" stroke="currentColor" strokeWidth="1.6"><path d="M4 12 12 4M4 4h8v8" /></svg>;
}
