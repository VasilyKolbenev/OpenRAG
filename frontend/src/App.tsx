import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import ErrorBoundary from '@/components/shared/ErrorBoundary';
import Sidebar from '@/components/layout/Sidebar';
import AnimatedBG from '@/components/layout/AnimatedBG';
import DashboardPage from '@/pages/DashboardPage';
import ChatPage from '@/pages/ChatPage';
import DebuggerPage from '@/pages/DebuggerPage';
import ComparePage from '@/pages/ComparePage';
import DocumentsPage from '@/pages/DocumentsPage';
import IntelligencePage from '@/pages/IntelligencePage';
import { AdvisorChatbot } from '@/components/advisor/AdvisorChatbot';
import { useAppStore } from '@/stores/appStore';
import { api } from '@/lib/api';
import { HEALTH_POLL_INTERVAL } from '@/lib/constants';

function AppShell() {
  const setHealthStatus = useAppStore((s) => s.setHealthStatus);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      try {
        const res = await api.health();
        if (!mounted) return;
        const allHealthy = Object.values(res.services).every(
          (s) => s === 'healthy',
        );
        setHealthStatus(allHealthy ? 'healthy' : 'degraded');
      } catch {
        if (mounted) setHealthStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, HEALTH_POLL_INTERVAL);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [setHealthStatus]);

  return (
    <div className="min-h-screen bg-serpent-bg text-serpent-text font-dm-sans relative flex">
      <AnimatedBG />
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-[240px] px-4 lg:px-8 py-7 relative z-10 min-h-screen">
        <ErrorBoundary>
          <Routes>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/documents" element={<DocumentsPage />} />
            <Route path="/debugger" element={<DebuggerPage />} />
            <Route path="/debugger/:traceId" element={<DebuggerPage />} />
            <Route path="/compare" element={<ComparePage />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </ErrorBoundary>
      </main>
      <AdvisorChatbot />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}
