import { GameCard } from '../components/layout/GameCard';
import { BonanzaArt } from './slots/sweet-bonanza/Art';
import { OlympusArt } from './slots/gates-of-olympus/Art';

export function Home() {
  return (
    <div className="space-y-10">
      <Hero />

      <section>
        <SectionHeader title="Slots" subtitle="High-fidelity tumble slots" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <GameCard
            to="/slots/sweet-bonanza"
            title="Sweet Bonanza"
            subtitle="Tumble · 21,100× max"
            badge="HOT"
            bg="linear-gradient(180deg, #2a1148 0%, #160628 100%)"
            art={<BonanzaArt />}
          />
          <GameCard
            to="/slots/gates-of-olympus"
            title="Gates of Olympus"
            subtitle="Tumble · 5,000× max"
            badge="NEW"
            bg="linear-gradient(180deg, #0a1530 0%, #070d20 100%)"
            art={<OlympusArt />}
          />
          <GameCard
            title="Big Bass Bonanza"
            subtitle="Coming soon"
            disabled
            art={<PlaceholderArt label="🎣" tone="#10334a" />}
          />
          <GameCard
            title="Sugar Rush"
            subtitle="Coming soon"
            disabled
            art={<PlaceholderArt label="🍭" tone="#3a124a" />}
          />
          <GameCard
            title="Wanted Dead or a Wild"
            subtitle="Coming soon"
            disabled
            art={<PlaceholderArt label="🤠" tone="#3a2010" />}
          />
        </div>
      </section>

      <section>
        <SectionHeader title="Originals" subtitle="23 Stake-style provably-fair games" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          <GameCard
            to="/originals/dice"
            title="Dice"
            subtitle="99% RTP"
            badge="LIVE"
            art={<PlaceholderArt label="🎲" tone="#102b3a" />}
          />
          <GameCard
            to="/originals/limbo"
            title="Limbo"
            subtitle="99% RTP"
            badge="LIVE"
            art={<PlaceholderArt label="🚀" tone="#241a3a" />}
          />
          <GameCard
            to="/originals/mines"
            title="Mines"
            subtitle="Pick gems, dodge mines"
            badge="LIVE"
            art={<PlaceholderArt label="💣" tone="#3a1010" />}
          />
          <GameCard
            to="/originals/crash"
            title="Crash"
            subtitle="Cash out before bust"
            badge="LIVE"
            art={<PlaceholderArt label="📈" tone="#102b3a" />}
          />
          <GameCard
            to="/originals/plinko"
            title="Plinko"
            subtitle="Drop the ball"
            badge="LIVE"
            art={<PlaceholderArt label="🟣" tone="#241a3a" />}
          />
          <GameCard
            to="/originals/wheel"
            title="Wheel"
            subtitle="Spin to win"
            badge="LIVE"
            art={<PlaceholderArt label="🎡" tone="#3a2010" />}
          />
          <GameCard
            to="/originals/hilo"
            title="Hilo"
            subtitle="Higher or lower"
            badge="LIVE"
            art={<PlaceholderArt label="🃏" tone="#1a3a30" />}
          />
          <GameCard
            to="/originals/tower"
            title="Tower"
            subtitle="Climb the floors"
            badge="LIVE"
            art={<PlaceholderArt label="🗼" tone="#3a1010" />}
          />
          <GameCard
            to="/originals/keno"
            title="Keno"
            subtitle="Pick & match"
            badge="LIVE"
            art={<PlaceholderArt label="🔢" tone="#1a3a3a" />}
          />
          <GameCard
            to="/originals/roulette"
            title="Roulette"
            subtitle="European, single 0"
            badge="LIVE"
            art={<PlaceholderArt label="🟢" tone="#1a3a1a" />}
          />
          <GameCard
            to="/originals/blackjack"
            title="Blackjack"
            subtitle="3:2 BJ pays"
            badge="LIVE"
            art={<PlaceholderArt label="🃏" tone="#102b3a" />}
          />
          <GameCard
            to="/originals/baccarat"
            title="Baccarat"
            subtitle="Punto Banco"
            badge="LIVE"
            art={<PlaceholderArt label="💎" tone="#3a1a3a" />}
          />
          <GameCard
            to="/originals/diamonds"
            title="Diamonds"
            subtitle="5-gem match"
            badge="LIVE"
            art={<PlaceholderArt label="💎" tone="#1a3a3a" />}
          />
          <GameCard
            to="/originals/video-poker"
            title="Video Poker"
            subtitle="Jacks or Better"
            badge="LIVE"
            art={<PlaceholderArt label="🃏" tone="#3a1a10" />}
          />
          <GameCard
            to="/originals/coin-flip"
            title="Coin Flip"
            subtitle="Streak the coin"
            badge="LIVE"
            art={<PlaceholderArt label="🪙" tone="#3a3010" />}
          />
          <GameCard
            to="/originals/pump"
            title="Pump"
            subtitle="Inflate before pop"
            badge="LIVE"
            art={<PlaceholderArt label="🎈" tone="#3a1a3a" />}
          />
          <GameCard
            to="/originals/cups"
            title="3 Cups"
            subtitle="Find the ball"
            badge="LIVE"
            art={<PlaceholderArt label="🥤" tone="#102b3a" />}
          />
          <GameCard
            to="/originals/mini-slot"
            title="Mini Slot"
            subtitle="Classic 3-reel"
            badge="LIVE"
            art={<PlaceholderArt label="🎰" tone="#3a2010" />}
          />
          <GameCard
            to="/originals/race"
            title="Race"
            subtitle="Pick a horse"
            badge="LIVE"
            art={<PlaceholderArt label="🐎" tone="#1a3a10" />}
          />
          <GameCard
            to="/originals/rps"
            title="Rock Paper Scissors"
            subtitle="Beat the opponent"
            badge="LIVE"
            art={<PlaceholderArt label="✊" tone="#3a1a3a" />}
          />
          <GameCard
            to="/originals/dragon-tiger"
            title="Dragon Tiger"
            subtitle="High card wins"
            badge="LIVE"
            art={<PlaceholderArt label="🐉" tone="#3a1010" />}
          />
          <GameCard
            to="/originals/cases"
            title="Cases"
            subtitle="Open the crate"
            badge="LIVE"
            art={<PlaceholderArt label="📦" tone="#3a2010" />}
          />
          <GameCard
            to="/originals/sicbo"
            title="Sic Bo"
            subtitle="Three dice"
            badge="LIVE"
            art={<PlaceholderArt label="🎲" tone="#1a3a1a" />}
          />
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        {subtitle && <p className="text-sm text-ink-dim">{subtitle}</p>}
      </div>
    </div>
  );
}

function PlaceholderArt({ label, tone }: { label: string; tone: string }) {
  return (
    <div
      className="w-full h-full flex items-center justify-center text-6xl"
      style={{ background: `linear-gradient(180deg, ${tone}, #0b0f17)` }}
    >
      <span className="opacity-70">{label}</span>
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
      <div className="absolute -right-16 -bottom-16 w-[420px] h-[420px] rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute -right-32 top-10 w-[260px] h-[260px] rounded-full bg-accent-violet/20 blur-3xl pointer-events-none" />
    </section>
  );
}
