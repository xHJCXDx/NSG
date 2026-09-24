import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginView } from '../../features/auth';
import { ErrorBoundary } from '../../shared/components/ErrorBoundary';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ProtectedRoute } from './ProtectedRoute';

const DashboardPage = lazy(() => import('../../features/dashboard').then(m => ({ default: m.DashboardPage })));
const MentionsPage = lazy(() => import('../../features/mentions').then(m => ({ default: m.MentionsPage })));
const ThreatsPage = lazy(() => import('../../features/threats').then(m => ({ default: m.ThreatsPage })));
const KeywordsPage = lazy(() => import('../../features/keywords').then(m => ({ default: m.KeywordsPage })));
const AutomationPage = lazy(() => import('../../features/automation').then(m => ({ default: m.AutomationPage })));
const AlertsPage = lazy(() => import('../../features/alerts').then(m => ({ default: m.AlertsPage })));
const LogsPage = lazy(() => import('../../features/logs').then(m => ({ default: m.LogsPage })));
const UsersPage = lazy(() => import('../../features/users').then(m => ({ default: m.UsersPage })));
const AnalyticsPage = lazy(() => import('../pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(m => ({ default: m.SettingsPage })));

function LazyFallback() {
  return <div className="p-8 text-content-muted">Loading...</div>;
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />

        <Route
          path="/"
          element={
            <ErrorBoundary>
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            </ErrorBoundary>
          }
          >
          <Route index element={<ProtectedRoute requiredPermission="dashboard:read"><Suspense fallback={<LazyFallback />}><DashboardPage /></Suspense></ProtectedRoute>} />
          <Route path="mentions" element={<ProtectedRoute requiredPermission="mentions:read"><Suspense fallback={<LazyFallback />}><MentionsPage /></Suspense></ProtectedRoute>} />
          <Route path="threats" element={<ProtectedRoute requiredPermission="threats:read"><Suspense fallback={<LazyFallback />}><ThreatsPage /></Suspense></ProtectedRoute>} />
          <Route path="keywords" element={<ProtectedRoute requiredPermission="keywords:read"><Suspense fallback={<LazyFallback />}><KeywordsPage /></Suspense></ProtectedRoute>} />
          <Route path="automation" element={<ProtectedRoute requiredPermission="workflows:read"><Suspense fallback={<LazyFallback />}><AutomationPage /></Suspense></ProtectedRoute>} />
          <Route path="alerts" element={<ProtectedRoute requiredPermission="alerts:read"><Suspense fallback={<LazyFallback />}><AlertsPage /></Suspense></ProtectedRoute>} />
          <Route path="logs" element={<ProtectedRoute requiredPermission="logs:read"><Suspense fallback={<LazyFallback />}><LogsPage /></Suspense></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute requiredPermission="users:read"><Suspense fallback={<LazyFallback />}><UsersPage /></Suspense></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute requiredPermission="metrics:read"><Suspense fallback={<LazyFallback />}><AnalyticsPage /></Suspense></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requiredPermission="permissions:read"><Suspense fallback={<LazyFallback />}><SettingsPage /></Suspense></ProtectedRoute>} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
