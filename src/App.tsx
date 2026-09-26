import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useERPStore } from './store/useStore';
import { AuthPage } from './components/auth/AuthPage';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { DashboardOverview } from './pages/DashboardOverview';
import { RevenueDashboard } from './pages/RevenueDashboard';
import { FinancialDashboard } from './pages/FinancialDashboard';
import { ProductionDashboard } from './pages/ProductionDashboard';
import { InventoryDashboard } from './pages/InventoryDashboard';
import { ProductionPage } from './pages/ProductionPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesPage } from './pages/SalesPage';
import { CustomersPage } from './pages/CustomersPage';
import { SuppliersPage } from './pages/SuppliersPage';
import { ExpensesPage } from './pages/ExpensesPage';
import { ReportsPage } from './pages/ReportsPage';
import { MachinesPage } from './pages/MachinesPage';
import { UsersPage } from './pages/UsersPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { BackupRestorePage } from './pages/BackupRestorePage';
import { BillingPage } from './pages/BillingPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { UpdatePasswordPage } from './pages/UpdatePasswordPage';
import { UpgradeModal } from './components/saas/UpgradeModal';
import { SessionTimeoutManager } from './components/auth/SessionTimeoutManager';
import { ErrorBoundary } from './components/common/ErrorBoundary';

function AppRoutes() {
  const navigate = useNavigate();
  const handleNavigate = (page: string) => {
    const route = page.startsWith('/') ? page : `/${page}`;
    navigate(route);
  };

  return (
    <AppLayout>
      <SessionTimeoutManager />
      <Routes>
        <Route path="/" element={<DashboardOverview onNavigate={handleNavigate} />} />
        <Route path="/dashboard" element={<DashboardOverview onNavigate={handleNavigate} />} />
        <Route path="/login" element={<Navigate to="/dashboard" replace />} />
        <Route path="/revenue-dash" element={<RevenueDashboard />} />
        <Route path="/financials" element={<FinancialDashboard />} />
        <Route path="/financial-dash" element={<FinancialDashboard />} />
        <Route path="/production-dash" element={<ProductionDashboard onNavigate={handleNavigate} />} />
        <Route
          path="/inventory-dash"
          element={<InventoryDashboard onNavigate={handleNavigate} onOpenScanner={() => {}} />}
        />
        <Route path="/warehouse" element={<InventoryDashboard onNavigate={handleNavigate} onOpenScanner={() => {}} />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/inventory" element={<InventoryPage onOpenScanner={() => {}} />} />
        <Route path="/machines" element={<MachinesPage />} />
        <Route path="/sales" element={<SalesPage />} />
        <Route path="/customers" element={<CustomersPage />} />
        <Route path="/suppliers" element={<SuppliersPage />} />
        <Route path="/purchases" element={<SuppliersPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/approvals" element={<ApprovalsPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/audit-logs" element={<AuditLogsPage />} />
        <Route path="/backup" element={<BackupRestorePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <UpgradeModal />
    </AppLayout>
  );
}

export function App() {
  const { isAuthenticated, isAuthChecking, theme } = useERPStore();

  // Sync Dark/Light theme class to html element
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  if (isAuthChecking) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#070b14] text-white">
        <div className="w-10 h-10 border-4 border-sky-500/30 border-t-sky-500 rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-slate-300 tracking-wide">Checking authentication...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/update-password" element={<UpdatePasswordPage />} />
          <Route path="/invite/:token" element={<AuthPage />} />
          <Route
            path="/*"
            element={!isAuthenticated ? <AuthPage /> : <AppRoutes />}
          />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
