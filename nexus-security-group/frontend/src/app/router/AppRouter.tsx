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
          <Route index element={<DashboardPage />} />
          <Route path="mentions" element={<MentionsPage />} />
          <Route path="threats" element={<ThreatsPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
