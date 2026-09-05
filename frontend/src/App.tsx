import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { RiskPage } from '@/pages/RiskPage';
import { AlertPage } from '@/pages/AlertPage';
import { OfflinePage } from '@/pages/OfflinePage';
import { Layout } from '@/components/Layout/Layout';

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="risk" element={<RiskPage />} />
        <Route path="alerts" element={<AlertPage />} />
        <Route path="offline" element={<OfflinePage />} />
      </Route>
    </Routes>
  );
}
