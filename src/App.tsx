
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { ThemeProvider, ToastProvider, RouteErrorBoundary } from '@/shared';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Home from './pages/Home';
import CategoryManagement from './pages/CategoryManagement';
import EnvelopeTypeManagement from './pages/EnvelopeTypeManagement';
import EnvelopeManagement from './pages/EnvelopeManagement';
import SpendingByCategoryReport from './pages/SpendingByCategoryReport';

const FullPageLoader = () => (
  <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center text-primary-600">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-10 h-10 animate-spin" />
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500 animate-pulse">
        Carregando MoneyDash...
      </span>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <RouteErrorBoundary>{children}</RouteErrorBoundary>;
};

const PublicRoute = ({ children }: { children?: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/categorias" element={<ProtectedRoute><CategoryManagement /></ProtectedRoute>} />
      <Route path="/envelopes" element={<ProtectedRoute><EnvelopeManagement /></ProtectedRoute>} />
      <Route path="/tipos-envelope" element={<ProtectedRoute><EnvelopeTypeManagement /></ProtectedRoute>} />
      <Route path="/dashboards/relatorio-gastos-categoria" element={<ProtectedRoute><SpendingByCategoryReport /></ProtectedRoute>} />
      {/* Fallback para evitar URLs inválidas quebrando o fluxo */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <HashRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppContent />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </HashRouter>
  );
};

export default App;
