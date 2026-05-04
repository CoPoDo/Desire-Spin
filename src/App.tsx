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
