import { useMemo, useState, type ReactNode } from 'react';
import { GameCard } from '../components/layout/GameCard';
import { useGame } from '../game-context';
import { BonanzaArt } from './slots/sweet-bonanza/Art';
import { OlympusArt } from './slots/gates-of-olympus/Art';
import { SugarRushArt } from './slots/sugar-rush/Art';
import { JuanCantinaArt } from './slots/juan-cantina/Art';
import { WantedWildArt } from './slots/wanted-wild/Art';
import { PharaohGoldArt } from './slots/pharaoh-gold/Art';
import { WolfGoldArt } from './slots/wolf-gold/Art';
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

const GAMES: Game[] = [
  // --- Slots ---
  { to: '/slots/sweet-bonanza',    title: 'Sweet Bonanza',          subtitle: 'Tumble · 21,100× max',           badge: 'HOT', bg: 'linear-gradient(180deg, #2a1148 0%, #160628 100%)', art: <BonanzaArt />,    category: 'slot', searchTags: ['fruit', 'candy', 'pragmatic', 'tumble', 'pink'] },
  { to: '/slots/gates-of-olympus', title: 'Gates of Olympus',       subtitle: 'Tumble · 5,000× max',            badge: 'NEW', bg: 'linear-gradient(180deg, #0a1530 0%, #070d20 100%)', art: <OlympusArt />,    category: 'slot', searchTags: ['zeus', 'greek', 'pragmatic', 'tumble', 'gold', 'olympus'] },
  { to: '/slots/juan-cantina',     title: "Juan's Cantina",         subtitle: 'Tumble · Mexican fiesta',        badge: 'NEW', bg: 'linear-gradient(180deg, #ff8a40 0%, #6a142e 100%)', art: <JuanCantinaArt />, category: 'slot', searchTags: ['mexican', 'pinata', 'cantina', 'fiesta', 'tumble'] },
  { to: '/slots/sugar-rush',       title: 'Sugar Rush',             subtitle: 'Tumble · Sweet & sticky',        badge: 'NEW', bg: 'linear-gradient(180deg, #ff7ad9 0%, #5a1c70 100%)', art: <SugarRushArt />,  category: 'slot', searchTags: ['candy', 'sweet', 'sugar', 'cluster', 'pragmatic'] },
  { to: '/slots/wanted-wild',      title: 'Wanted Dead or a Wild',  subtitle: 'Tumble · Western shoot-out',     badge: 'NEW', bg: 'linear-gradient(180deg, #d8442a 0%, #2a0810 100%)', art: <WantedWildArt />, category: 'slot', searchTags: ['western', 'hacksaw', 'wanted', 'wild west'] },
  { to: '/slots/pharaoh-gold',     title: "Pharaoh's Gold",         subtitle: 'Tumble · Egyptian gold',         badge: 'NEW', bg: 'linear-gradient(180deg, #ffd166 0%, #14051a 100%)', art: <PharaohGoldArt />,category: 'slot', searchTags: ['egypt', 'pharaoh', 'gold', 'ancient'] },
  { to: '/slots/wolf-gold',        title: 'Wolf Gold',              subtitle: 'Tumble · Moonlit wilderness',    badge: 'NEW', bg: 'linear-gradient(180deg, #6638c8 0%, #02010a 100%)', art: <WolfGoldArt />,   category: 'slot', searchTags: ['wolf', 'wild', 'animal', 'pragmatic'] },
  { to: '/slots/big-juan',         title: 'Big Juan',               subtitle: 'Hold-and-spin · Fiesta jackpots',badge: 'HOT', bg: 'radial-gradient(80% 60% at 50% 45%, #ff8a55 0%, #c8102e 35%, #5a0810 70%, #14040a 100%)', art: <BigJuanArt />, category: 'slot', searchTags: ['mexican', 'pinata', 'hold and spin', 'jackpot'] },

  // --- Originals ---
  { to: '/originals/dice',          title: 'Dice',                  subtitle: '99% RTP',                   badge: 'LIVE', art: <PlaceholderArt label="🎲" tone="#102b3a" />, category: 'original', searchTags: ['stake', 'classic'] },
  { to: '/originals/limbo',         title: 'Limbo',                 subtitle: '99% RTP',                   badge: 'LIVE', art: <PlaceholderArt label="🚀" tone="#241a3a" />, category: 'original', searchTags: ['stake', 'multiplier'] },
  { to: '/originals/mines',         title: 'Mines',                 subtitle: 'Pick gems, dodge mines',    badge: 'LIVE', art: <PlaceholderArt label="💣" tone="#3a1010" />, category: 'original', searchTags: ['stake', 'gems', 'bomb'] },
  { to: '/originals/crash',         title: 'Crash',                 subtitle: 'Cash out before bust',      badge: 'LIVE', art: <PlaceholderArt label="📈" tone="#102b3a" />, category: 'original', searchTags: ['stake', 'rocket', 'multiplier'] },
  { to: '/originals/plinko',        title: 'Plinko',                subtitle: 'Drop the ball',             badge: 'LIVE', art: <PlaceholderArt label="🟣" tone="#241a3a" />, category: 'original', searchTags: ['stake', 'pegs', 'physics'] },
  { to: '/originals/wheel',         title: 'Wheel',                 subtitle: 'Spin to win',               badge: 'LIVE', art: <PlaceholderArt label="🎡" tone="#3a2010" />, category: 'original', searchTags: ['stake', 'spin', 'roulette'] },
  { to: '/originals/hilo',          title: 'Hilo',                  subtitle: 'Higher or lower',           badge: 'LIVE', art: <PlaceholderArt label="🃏" tone="#1a3a30" />, category: 'original', searchTags: ['stake', 'cards', 'higher lower'] },
  { to: '/originals/tower',         title: 'Tower',                 subtitle: 'Climb the floors',          badge: 'LIVE', art: <PlaceholderArt label="🗼" tone="#3a1010" />, category: 'original', searchTags: ['stake', 'climb'] },
  { to: '/originals/keno',          title: 'Keno',                  subtitle: 'Pick & match',              badge: 'LIVE', art: <PlaceholderArt label="🔢" tone="#1a3a3a" />, category: 'original', searchTags: ['lottery', 'numbers'] },
  { to: '/originals/roulette',      title: 'Roulette',              subtitle: 'European, single 0',        badge: 'LIVE', art: <PlaceholderArt label="🟢" tone="#1a3a1a" />, category: 'original', searchTags: ['table', 'classic'] },
  { to: '/originals/blackjack',     title: 'Blackjack',             subtitle: '3:2 BJ pays',               badge: 'LIVE', art: <PlaceholderArt label="🃏" tone="#102b3a" />, category: 'original', searchTags: ['cards', '21', 'table'] },
  { to: '/originals/baccarat',      title: 'Baccarat',              subtitle: 'Punto Banco',               badge: 'LIVE', art: <PlaceholderArt label="💎" tone="#3a1a3a" />, category: 'original', searchTags: ['cards', 'punto banco', 'table'] },
  { to: '/originals/diamonds',      title: 'Diamonds',              subtitle: '5-gem match',               badge: 'LIVE', art: <PlaceholderArt label="💎" tone="#1a3a3a" />, category: 'original', searchTags: ['gems'] },
  { to: '/originals/video-poker',   title: 'Video Poker',           subtitle: 'Jacks or Better',           badge: 'LIVE', art: <PlaceholderArt label="🃏" tone="#3a1a10" />, category: 'original', searchTags: ['cards', 'poker'] },
  { to: '/originals/coin-flip',     title: 'Coin Flip',             subtitle: 'Streak the coin',           badge: 'LIVE', art: <PlaceholderArt label="🪙" tone="#3a3010" />, category: 'original', searchTags: ['coin', 'heads tails', 'streak'] },
  { to: '/originals/pump',          title: 'Pump',                  subtitle: 'Inflate before pop',        badge: 'LIVE', art: <PlaceholderArt label="🎈" tone="#3a1a3a" />, category: 'original', searchTags: ['stake', 'balloon'] },
  { to: '/originals/cups',          title: '3 Cups',                subtitle: 'Find the ball',             badge: 'LIVE', art: <PlaceholderArt label="🥤" tone="#102b3a" />, category: 'original', searchTags: ['shell', 'guess'] },
  { to: '/originals/mini-slot',     title: 'Mini Slot',             subtitle: 'Classic 3-reel',            badge: 'LIVE', art: <PlaceholderArt label="🎰" tone="#3a2010" />, category: 'original', searchTags: ['slot', 'classic', 'fruit'] },
  { to: '/originals/race',          title: 'Race',                  subtitle: 'Pick a horse',              badge: 'LIVE', art: <PlaceholderArt label="🐎" tone="#1a3a10" />, category: 'original', searchTags: ['horse', 'race'] },
  { to: '/originals/rps',           title: 'Rock Paper Scissors',   subtitle: 'Beat the opponent',         badge: 'LIVE', art: <PlaceholderArt label="✊" tone="#3a1a3a" />, category: 'original', searchTags: ['rps', 'classic'] },
  { to: '/originals/dragon-tiger',  title: 'Dragon Tiger',          subtitle: 'High card wins',            badge: 'LIVE', art: <PlaceholderArt label="🐉" tone="#3a1010" />, category: 'original', searchTags: ['cards', 'asian', 'table'] },
  { to: '/originals/cases',         title: 'Cases',                 subtitle: 'Open the crate',            badge: 'LIVE', art: <PlaceholderArt label="📦" tone="#3a2010" />, category: 'original', searchTags: ['crate', 'csgo'] },
  { to: '/originals/sicbo',         title: 'Sic Bo',                subtitle: 'Three dice',                badge: 'LIVE', art: <PlaceholderArt label="🎲" tone="#1a3a1a" />, category: 'original', searchTags: ['dice', 'asian', 'table'] },
  { to: '/originals/mini-roulette', title: 'Mini Roulette',         subtitle: '13-pocket wheel',           badge: 'LIVE', art: <PlaceholderArt label="🎯" tone="#3a1a10" />, category: 'original', searchTags: ['table', 'spin'] },
  { to: '/originals/scratch',       title: 'Scratch Card',          subtitle: 'Match 3 to win',            badge: 'LIVE', art: <PlaceholderArt label="🎟️" tone="#2a3a10" />, category: 'original', searchTags: ['scratch', 'lottery'] },
  { to: '/originals/penalty',       title: 'Penalty Shootout',      subtitle: 'Beat the keeper',           badge: 'LIVE', art: <PlaceholderArt label="⚽" tone="#10302a" />, category: 'original', searchTags: ['sport', 'football', 'soccer'] },
  { to: '/originals/treasure',      title: 'Treasure Hunt',         subtitle: 'Variable-mult tiles',       badge: 'LIVE', art: <PlaceholderArt label="💎" tone="#10243a" />, category: 'original', searchTags: ['treasure', 'gems'] },
  { to: '/originals/big-bass',      title: 'Big Bass',              subtitle: '5-reel fishing slot',       badge: 'LIVE', art: <PlaceholderArt label="🐟" tone="#10303a" />, category: 'original', searchTags: ['fish', 'fishing', 'pragmatic'] },
  { to: '/originals/slide',         title: 'Slide',                 subtitle: 'Live multiplier slide',     badge: 'LIVE', art: <PlaceholderArt label="📈" tone="#1a3a30" />, category: 'original', searchTags: ['multiplier'] },
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
    () => GAMES.filter((g) => g.category === 'slot' && matchesQuery(g, query)),
    [query],
  );
  const originals = useMemo(
    () => GAMES.filter((g) => g.category === 'original' && matchesQuery(g, query)),
    [query],
  );

  return (
    <div className="space-y-8">
      <Hero />

      {/* Search bar — single input filters both Slots and Originals.
          Real Stake lobby has this above the games grid; with 39
          titles it's the most-used navigation feature. */}
      <SearchBar value={query} onChange={setQuery} totalCount={GAMES.length} />

      {!query && favs.length > 0 && (
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

      {!query && recent.length > 0 && (
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
            subtitle={query ? `${slots.length} match${slots.length === 1 ? '' : 'es'}` : 'High-fidelity tumble slots'}
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
            title="Originals"
            subtitle={query ? `${originals.length} match${originals.length === 1 ? '' : 'es'}` : '31 Stake-style provably-fair games'}
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
  return (
    <div
      className="w-full h-full flex items-center justify-center text-6xl relative overflow-hidden"
      style={{ background: `linear-gradient(180deg, ${tone}, #0b0f17)` }}
    >
      <span
        className="absolute pointer-events-none"
        style={{
          left: '-15%',
          top: '-10%',
          width: '70%',
          height: '70%',
          background: `radial-gradient(circle at 50% 50%, ${tone} 0%, transparent 65%)`,
          filter: 'blur(20px)',
          opacity: 0.85,
        }}
      />
      <span
        className="absolute pointer-events-none"
        style={{
          right: '-20%',
          bottom: '-15%',
          width: '80%',
          height: '70%',
          background: `radial-gradient(circle at 50% 50%, ${tone} 0%, transparent 65%)`,
          filter: 'blur(24px)',
          opacity: 0.6,
        }}
      />
      <span
        className="relative z-10 opacity-90"
        style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,.55))' }}
      >
        {label}
      </span>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden rounded-3xl border border-edge bg-gradient-to-br from-bonanza-purple/30 via-bg-card to-olympus-navy/30 p-8 md:p-12">
      <div className="relative z-10 max-w-2xl">
        <div className="pill bg-accent/15 text-accent mb-3">play money · provably fair</div>
        <h1 className="font-display text-3xl md:text-5xl font-extrabold leading-tight">
          The casino, without the cost.
        </h1>
        <p className="mt-3 text-ink-dim max-w-lg">
          A faithful emulator of modern crypto-casino slots. Every spin is deterministic
          from a server seed, client seed, and nonce — verifiable in one click.
          Zero real money, zero stakes.
        </p>
      </div>
      <div
        className="absolute -right-16 -bottom-16 w-[420px] h-[420px] rounded-full bg-accent/15 blur-3xl pointer-events-none"
        style={{ animation: 'heroBlobBreathe 7s ease-in-out infinite' }}
      />
      <div
        className="absolute -right-32 top-10 w-[260px] h-[260px] rounded-full bg-accent-violet/20 blur-3xl pointer-events-none"
        style={{ animation: 'heroBlobBreathe 9s ease-in-out -3s infinite' }}
      />
    </section>
  );
}
