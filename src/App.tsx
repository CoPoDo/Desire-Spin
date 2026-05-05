import { Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GameProvider } from './components/layout/GameProvider';
import { Layout } from './components/layout/Layout';
import { SlotPageLayout } from './components/layout/SlotPageLayout';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { ComingSoon } from './components/layout/ComingSoon';
import { SweetBonanza } from './pages/slots/sweet-bonanza';
import { sweetBonanzaConfig } from './pages/slots/sweet-bonanza/config';
import { GatesOfOlympus } from './pages/slots/gates-of-olympus';
import { gatesOfOlympusConfig } from './pages/slots/gates-of-olympus/config';
import { SugarRush } from './pages/slots/sugar-rush';
import { sugarRushConfig } from './pages/slots/sugar-rush/config';
import { JuanCantina } from './pages/slots/juan-cantina';
import { juanCantinaConfig } from './pages/slots/juan-cantina/config';
import { WantedWild } from './pages/slots/wanted-wild';
import { wantedWildConfig } from './pages/slots/wanted-wild/config';
import { PharaohGold } from './pages/slots/pharaoh-gold';
import { pharaohGoldConfig } from './pages/slots/pharaoh-gold/config';
import { WolfGold } from './pages/slots/wolf-gold';
import { wolfGoldConfig } from './pages/slots/wolf-gold/config';
import { BigJuan } from './pages/slots/big-juan';
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
import { RpsGame } from './pages/originals/rps';
import { DragonTigerGame } from './pages/originals/dragon-tiger';
import { CasesGame } from './pages/originals/cases';
import { SicBoGame } from './pages/originals/sicbo';
import { MiniRouletteGame } from './pages/originals/mini-roulette';
import { ScratchGame } from './pages/originals/scratch';
import { PenaltyGame } from './pages/originals/penalty';
import { TreasureGame } from './pages/originals/treasure';
import { BigBassGame } from './pages/originals/big-bass';
import { SlideGame } from './pages/originals/slide';
import { BingoGame } from './pages/originals/bingo';
import { AviatorGame } from './pages/originals/aviator';

export default function App() {
  return (
    <ErrorBoundary>
      <GameProvider>
        <Routes>
        {/* Slot games — fullscreen immersive layout, no sidebar/footer.
         *  Each slot passes its own theme accent so the top-bar (title
         *  gradient, balance pill, refill button) lights up in the slot's
         *  own colour rather than the shared Olympus gold. */}
        <Route
          path="/slots/sweet-bonanza"
          element={<SlotPageLayout title="Sweet Bonanza" accent={sweetBonanzaConfig.theme.accent} accentDeep="#a8307a"><SweetBonanza /></SlotPageLayout>}
        />
        <Route
          path="/slots/gates-of-olympus"
          element={<SlotPageLayout title="Gates of Olympus" accent={gatesOfOlympusConfig.theme.accent} accentDeep="#c8932e"><GatesOfOlympus /></SlotPageLayout>}
        />
        <Route
          path="/slots/sugar-rush"
          element={<SlotPageLayout title="Sugar Rush" accent={sugarRushConfig.theme.accent} accentDeep="#c8408a"><SugarRush /></SlotPageLayout>}
        />
        <Route
          path="/slots/juan-cantina"
          element={<SlotPageLayout title="Juan's Cantina" accent={juanCantinaConfig.theme.accent} accentDeep="#a86018"><JuanCantina /></SlotPageLayout>}
        />
        <Route
          path="/slots/wanted-wild"
          element={<SlotPageLayout title="Wanted Dead or a Wild" accent={wantedWildConfig.theme.accent} accentDeep="#7a4a18"><WantedWild /></SlotPageLayout>}
        />
        <Route
          path="/slots/pharaoh-gold"
          element={<SlotPageLayout title="Pharaoh's Gold" accent={pharaohGoldConfig.theme.accent} accentDeep="#a8761a"><PharaohGold /></SlotPageLayout>}
        />
        <Route
          path="/slots/wolf-gold"
          element={<SlotPageLayout title="Wolf Gold" accent={wolfGoldConfig.theme.accent} accentDeep="#6638c8"><WolfGold /></SlotPageLayout>}
        />
        <Route
          path="/slots/big-juan"
          element={<SlotPageLayout title="Big Juan" accent="#ffd166" accentDeep="#c8932e"><BigJuan /></SlotPageLayout>}
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
        <Route path="/originals/rps" element={<RpsGame />} />
        <Route path="/originals/dragon-tiger" element={<DragonTigerGame />} />
        <Route path="/originals/cases" element={<CasesGame />} />
        <Route path="/originals/sicbo" element={<SicBoGame />} />
        <Route path="/originals/mini-roulette" element={<MiniRouletteGame />} />
        <Route path="/originals/scratch" element={<ScratchGame />} />
        <Route path="/originals/penalty" element={<PenaltyGame />} />
        <Route path="/originals/treasure" element={<TreasureGame />} />
        <Route path="/originals/big-bass" element={<BigBassGame />} />
        <Route path="/originals/slide" element={<SlideGame />} />
        <Route path="/originals/bingo" element={<BingoGame />} />
        <Route path="/originals/aviator" element={<AviatorGame />} />

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
