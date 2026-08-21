import { Routes, Route } from 'react-router-dom';
import { HomePage } from '@/pages/HomePage';
import { RiskPage } from '@/pages/RiskPage';
import { AlertPage } from '@/pages/AlertPage';
import { OfflinePage } from '@/pages/OfflinePage';
import { SettingsPage } from '@/pages/SettingsPage';
import { Layout } from '@/components/Layout/Layout';
import { useUserStore } from '@/hooks/useStores';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user } = useUserStore();
  
  if (!user) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Silakan login terlebih dahulu</h2>
        <p className="text-gray-600 dark:text-gray-400">Fitur ini memerlukan akun untuk menyimpan data Anda</p>
      </div>
    </div>;
  }
  
  return <>{children}</>;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="risk" element={<PrivateRoute><RiskPage /></PrivateRoute>} />
        <Route path="alerts" element={<PrivateRoute><AlertPage /></PrivateRoute>} />
        <Route path="offline" element={<PrivateRoute><OfflinePage /></PrivateRoute>} />
        <Route path="settings" element={<PrivateRoute><SettingsPage /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}