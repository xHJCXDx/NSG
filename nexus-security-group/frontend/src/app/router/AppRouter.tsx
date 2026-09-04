import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginView } from '../../features/auth';
import { DashboardPage } from '../../features/dashboard';
import { MentionsPage } from '../../features/mentions';
import { ThreatsPage } from '../../features/threats';
import { UsersPage } from '../../features/users';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { AnalyticsPage } from '../pages/AnalyticsPage';
import { SettingsPage } from '../pages/SettingsPage';
import { ProtectedRoute } from './ProtectedRoute';

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
          >
          <Route index element={<ProtectedRoute requiredPermission="dashboard:read"><DashboardPage /></ProtectedRoute>} />
          <Route path="mentions" element={<ProtectedRoute requiredPermission="mentions:read"><MentionsPage /></ProtectedRoute>} />
          <Route path="threats" element={<ProtectedRoute requiredPermission="threats:read"><ThreatsPage /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute requiredPermission="users:read"><UsersPage /></ProtectedRoute>} />
          <Route path="analytics" element={<ProtectedRoute requiredPermission="metrics:read"><AnalyticsPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute requiredPermission="permissions:read"><SettingsPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
