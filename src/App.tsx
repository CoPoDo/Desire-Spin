import { lazy, Suspense, type ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ComingSoon } from './components/layout/ComingSoon';
import { GameProvider } from './components/layout/GameProvider';
import { Layout } from './components/layout/Layout';
import { SlotPageLayout } from './components/layout/SlotPageLayout';
import { Home } from './pages/Home';

const Settings = lazy(() => import('./pages/Settings').then((m) => ({ default: m.Settings })));

const SweetBonanza = lazy(() => import('./pages/slots/sweet-bonanza').then((m) => ({ default: m.SweetBonanza })));
const GatesOfOlympus = lazy(() => import('./pages/slots/gates-of-olympus').then((m) => ({ default: m.GatesOfOlympus })));
const SugarRush = lazy(() => import('./pages/slots/sugar-rush').then((m) => ({ default: m.SugarRush })));
const WantedWild = lazy(() => import('./pages/slots/wanted-wild').then((m) => ({ default: m.WantedWild })));
const PharaohGold = lazy(() => import('./pages/slots/pharaoh-gold').then((m) => ({ default: m.PharaohGold })));
const WolfGold = lazy(() => import('./pages/slots/wolf-gold').then((m) => ({ default: m.WolfGold })));
const BigJuan = lazy(() => import('./pages/slots/big-juan').then((m) => ({ default: m.BigJuan })));
const BigBassGame = lazy(() => import('./pages/originals/big-bass').then((m) => ({ default: m.BigBassGame })));

const DiceGame = lazy(() => import('./pages/originals/dice').then((m) => ({ default: m.DiceGame })));
const LimboGame = lazy(() => import('./pages/originals/limbo').then((m) => ({ default: m.LimboGame })));
const MinesGame = lazy(() => import('./pages/originals/mines').then((m) => ({ default: m.MinesGame })));
const CrashGame = lazy(() => import('./pages/originals/crash').then((m) => ({ default: m.CrashGame })));
const PlinkoGame = lazy(() => import('./pages/originals/plinko').then((m) => ({ default: m.PlinkoGame })));
const WheelGame = lazy(() => import('./pages/originals/wheel').then((m) => ({ default: m.WheelGame })));
const HiloGame = lazy(() => import('./pages/originals/hilo').then((m) => ({ default: m.HiloGame })));
const TowerGame = lazy(() => import('./pages/originals/tower').then((m) => ({ default: m.TowerGame })));
const KenoGame = lazy(() => import('./pages/originals/keno').then((m) => ({ default: m.KenoGame })));
const RouletteGame = lazy(() => import('./pages/originals/roulette').then((m) => ({ default: m.RouletteGame })));
const BlackjackGame = lazy(() => import('./pages/originals/blackjack').then((m) => ({ default: m.BlackjackGame })));
const BaccaratGame = lazy(() => import('./pages/originals/baccarat').then((m) => ({ default: m.BaccaratGame })));
const DiamondsGame = lazy(() => import('./pages/originals/diamonds').then((m) => ({ default: m.DiamondsGame })));
const VideoPokerGame = lazy(() => import('./pages/originals/video-poker').then((m) => ({ default: m.VideoPokerGame })));
const CoinFlipGame = lazy(() => import('./pages/originals/coin-flip').then((m) => ({ default: m.CoinFlipGame })));
const PumpGame = lazy(() => import('./pages/originals/pump').then((m) => ({ default: m.PumpGame })));
const CupsGame = lazy(() => import('./pages/originals/cups').then((m) => ({ default: m.CupsGame })));
const MiniSlotGame = lazy(() => import('./pages/originals/mini-slot').then((m) => ({ default: m.MiniSlotGame })));
const RpsGame = lazy(() => import('./pages/originals/rps').then((m) => ({ default: m.RpsGame })));
const DragonTigerGame = lazy(() => import('./pages/originals/dragon-tiger').then((m) => ({ default: m.DragonTigerGame })));
const CasesGame = lazy(() => import('./pages/originals/cases').then((m) => ({ default: m.CasesGame })));
const SicBoGame = lazy(() => import('./pages/originals/sicbo').then((m) => ({ default: m.SicBoGame })));
const ScratchGame = lazy(() => import('./pages/originals/scratch').then((m) => ({ default: m.ScratchGame })));
const SlideGame = lazy(() => import('./pages/originals/slide').then((m) => ({ default: m.SlideGame })));
const BingoGame = lazy(() => import('./pages/originals/bingo').then((m) => ({ default: m.BingoGame })));
const AviatorGame = lazy(() => import('./pages/originals/aviator').then((m) => ({ default: m.AviatorGame })));

function Deferred({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={(
        <div className="min-h-[55vh] grid place-items-center bg-stake-bg text-stake-muted">
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em]">
            <span className="h-3 w-3 animate-pulse rounded-full bg-stake-green" />
            Loading game
          </div>
        </div>
      )}
    >
      {children}
    </Suspense>
  );
}

function SlotRoute({ title, accent, accentDeep, children }: { title: string; accent: string; accentDeep: string; children: ReactNode }) {
  return (
    <SlotPageLayout title={title} accent={accent} accentDeep={accentDeep}>
      <Deferred>{children}</Deferred>
    </SlotPageLayout>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <Routes>
          <Route path="/slots/sweet-bonanza" element={<SlotRoute title="Sweet Bonanza" accent="#ff7ab6" accentDeep="#a8307a"><SweetBonanza /></SlotRoute>} />
          <Route path="/slots/gates-of-olympus" element={<SlotRoute title="Gates of Olympus" accent="#ffd166" accentDeep="#c8932e"><GatesOfOlympus /></SlotRoute>} />
          <Route path="/slots/sugar-rush" element={<SlotRoute title="Sugar Rush" accent="#ff7ad9" accentDeep="#c8408a"><SugarRush /></SlotRoute>} />
          <Route path="/slots/wanted-wild" element={<SlotRoute title="Wanted Dead or a Wild" accent="#e8a449" accentDeep="#7a4a18"><WantedWild /></SlotRoute>} />
          <Route path="/slots/pharaoh-gold" element={<SlotRoute title="Pharaoh's Gold" accent="#ffd166" accentDeep="#a8761a"><PharaohGold /></SlotRoute>} />
          <Route path="/slots/wolf-gold" element={<SlotRoute title="Wolf Gold" accent="#a78bfa" accentDeep="#6638c8"><WolfGold /></SlotRoute>} />
          <Route path="/slots/big-juan" element={<SlotRoute title="Big Juan" accent="#ffd166" accentDeep="#c8932e"><BigJuan /></SlotRoute>} />
          <Route path="/slots/big-bass-bonanza" element={<Deferred><BigBassGame /></Deferred>} />

          <Route path="/originals/dice" element={<Deferred><DiceGame /></Deferred>} />
          <Route path="/originals/limbo" element={<Deferred><LimboGame /></Deferred>} />
          <Route path="/originals/mines" element={<Deferred><MinesGame /></Deferred>} />
          <Route path="/originals/crash" element={<Deferred><CrashGame /></Deferred>} />
          <Route path="/originals/plinko" element={<Deferred><PlinkoGame /></Deferred>} />
          <Route path="/originals/wheel" element={<Deferred><WheelGame /></Deferred>} />
          <Route path="/originals/hilo" element={<Deferred><HiloGame /></Deferred>} />
          <Route path="/originals/dragon-tower" element={<Deferred><TowerGame /></Deferred>} />
          <Route path="/originals/keno" element={<Deferred><KenoGame /></Deferred>} />
          <Route path="/originals/roulette" element={<Deferred><RouletteGame /></Deferred>} />
          <Route path="/originals/blackjack" element={<Deferred><BlackjackGame /></Deferred>} />
          <Route path="/originals/baccarat" element={<Deferred><BaccaratGame /></Deferred>} />
          <Route path="/originals/diamonds" element={<Deferred><DiamondsGame /></Deferred>} />
          <Route path="/originals/video-poker" element={<Deferred><VideoPokerGame /></Deferred>} />
          <Route path="/originals/flip" element={<Deferred><CoinFlipGame /></Deferred>} />
          <Route path="/originals/pump" element={<Deferred><PumpGame /></Deferred>} />
          <Route path="/originals/three-cups" element={<Deferred><CupsGame /></Deferred>} />
          <Route path="/originals/classic-slot" element={<Deferred><MiniSlotGame /></Deferred>} />
          <Route path="/originals/rps" element={<Deferred><RpsGame /></Deferred>} />
          <Route path="/originals/dragon-tiger" element={<Deferred><DragonTigerGame /></Deferred>} />
          <Route path="/originals/cases" element={<Deferred><CasesGame /></Deferred>} />
          <Route path="/originals/sicbo" element={<Deferred><SicBoGame /></Deferred>} />
          <Route path="/originals/scratch" element={<Deferred><ScratchGame /></Deferred>} />
          <Route path="/originals/slide" element={<Deferred><SlideGame /></Deferred>} />
          <Route path="/originals/bingo" element={<Deferred><BingoGame /></Deferred>} />
          <Route path="/originals/aviator" element={<Deferred><AviatorGame /></Deferred>} />

          <Route path="/originals/tower" element={<Navigate to="/originals/dragon-tower" replace />} />
          <Route path="/originals/coin-flip" element={<Navigate to="/originals/flip" replace />} />
          <Route path="/originals/cups" element={<Navigate to="/originals/three-cups" replace />} />
          <Route path="/originals/mini-slot" element={<Navigate to="/originals/classic-slot" replace />} />
          <Route path="/originals/big-bass" element={<Navigate to="/slots/big-bass-bonanza" replace />} />

          <Route path="/" element={<Layout><Home /></Layout>} />
          <Route path="/casino" element={<Layout><Home /></Layout>} />
          <Route path="/settings" element={<Layout><Deferred><Settings /></Deferred></Layout>} />
          <Route path="/sports" element={<Layout><ComingSoon title="Sports" /></Layout>} />
          <Route path="/live" element={<Layout><ComingSoon title="Live Casino" /></Layout>} />
          <Route path="/promotions" element={<Layout><ComingSoon title="Promotions" /></Layout>} />
          <Route path="*" element={<Layout><ComingSoon title="Not found" /></Layout>} />
        </Routes>
      </GameProvider>
    </ErrorBoundary>
  );
}
