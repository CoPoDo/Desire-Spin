import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Home } from './pages/Home';
import { Settings } from './pages/Settings';
import { ComingSoon } from './components/layout/ComingSoon';
import { SweetBonanza } from './pages/slots/sweet-bonanza';
import { GatesOfOlympus } from './pages/slots/gates-of-olympus';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/slots/sweet-bonanza" element={<SweetBonanza />} />
        <Route path="/slots/gates-of-olympus" element={<GatesOfOlympus />} />
        <Route path="/casino" element={<Home />} />
        <Route path="/sports" element={<ComingSoon title="Sports" />} />
        <Route path="/live" element={<ComingSoon title="Live Casino" />} />
        <Route path="/promotions" element={<ComingSoon title="Promotions" />} />
        <Route path="*" element={<ComingSoon title="Not found" />} />
      </Routes>
    </Layout>
  );
}
