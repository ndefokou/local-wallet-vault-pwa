import { Routes, Route } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { HomePage } from '@/pages/HomePage';
import { CapabilityCheckPage } from '@/features/capability-check/CapabilityCheckPage';
import { CreateVaultPage } from '@/pages/CreateVaultPage';
import { UnlockPage } from '@/pages/UnlockPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ThreatModelPage } from '@/pages/ThreatModelPage';

function App() {
  return (
    <MainLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/capability-check" element={<CapabilityCheckPage />} />
        <Route path="/create-vault" element={<CreateVaultPage />} />
        <Route path="/unlock" element={<UnlockPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/threat-model" element={<ThreatModelPage />} />
      </Routes>
    </MainLayout>
  );
}

export default App;