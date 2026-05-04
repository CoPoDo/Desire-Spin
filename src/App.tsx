import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameProvider } from './components/layout/GameProvider';
import { Layout } from './components/layout/Layout';
import { SlotPageLayout } from './components/layout/SlotPageLayout';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { ComingSoon } from './components/layout/ComingSoon';
import { SweetBonanza } from './pages/slots/sweet-bonanza';
import { GatesOfOlympus } from './pages/slots/gates-of-olympus';
import { DiceGame } from './pages/originals/dice';
import { LimboGame } from './pages/originals/limbo';
import { MinesGame } from './pages/originals/mines';
import { CrashGame } from './pages/originals/crash';
import { PlinkoGame } from './pages/originals/plinko';
import { WheelGame } from './pages/originals/wheel';
import { HiloGame } from './pages/originals/hilo';
import { TowerGame } from './pages/originals/tower';
import { KenoGame } from './pages/originals/keno';
import { RouletteGame } from './pages/originals/roulette';
import { BlackjackGame } from './pages/originals/blackjack';
import { BaccaratGame } from './pages/originals/baccarat';
import { DiamondsGame } from './pages/originals/diamonds';
import { VideoPokerGame } from './pages/originals/video-poker';
import { CoinFlipGame } from './pages/originals/coin-flip';
import { PumpGame } from './pages/originals/pump';
import { CupsGame } from './pages/originals/cups';
import { MiniSlotGame } from './pages/originals/mini-slot';
import { RaceGame } from './pages/originals/race';

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <Routes>
        {/* Slot games — fullscreen immersive layout, no sidebar/footer */}
        <Route
          path="/slots/sweet-bonanza"
          element={<SlotPageLayout><SweetBonanza /></SlotPageLayout>}
        />
        <Route
          path="/slots/gates-of-olympus"
          element={<SlotPageLayout><GatesOfOlympus /></SlotPageLayout>}
        />
        <Route path="/originals/dice" element={<DiceGame />} />
        <Route path="/originals/limbo" element={<LimboGame />} />
        <Route path="/originals/mines" element={<MinesGame />} />
        <Route path="/originals/crash" element={<CrashGame />} />
        <Route path="/originals/plinko" element={<PlinkoGame />} />
        <Route path="/originals/wheel" element={<WheelGame />} />
        <Route path="/originals/hilo" element={<HiloGame />} />
        <Route path="/originals/tower" element={<TowerGame />} />
        <Route path="/originals/keno" element={<KenoGame />} />
        <Route path="/originals/roulette" element={<RouletteGame />} />
        <Route path="/originals/blackjack" element={<BlackjackGame />} />
        <Route path="/originals/baccarat" element={<BaccaratGame />} />
        <Route path="/originals/diamonds" element={<DiamondsGame />} />
        <Route path="/originals/video-poker" element={<VideoPokerGame />} />
        <Route path="/originals/coin-flip" element={<CoinFlipGame />} />
        <Route path="/originals/pump" element={<PumpGame />} />
        <Route path="/originals/cups" element={<CupsGame />} />
        <Route path="/originals/mini-slot" element={<MiniSlotGame />} />
        <Route path="/originals/race" element={<RaceGame />} />

        {/* Lobby + non-game routes — full Layout with sidebar */}
        <Route path="/" element={<Layout><Home /></Layout>} />
        <Route path="/casino" element={<Layout><Home /></Layout>} />
        <Route path="/settings" element={<Layout><Settings /></Layout>} />
        <Route path="/sports" element={<Layout><ComingSoon title="Sports" /></Layout>} />
        <Route path="/live" element={<Layout><ComingSoon title="Live Casino" /></Layout>} />
        <Route path="/promotions" element={<Layout><ComingSoon title="Promotions" /></Layout>} />
        <Route path="*" element={<Layout><ComingSoon title="Not found" /></Layout>} />
        </Routes>
      </GameProvider>
    </ErrorBoundary>
  );
}
