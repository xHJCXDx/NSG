import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LoginView } from '../../features/auth/LoginView';
import { DashboardPage } from '../../features/dashboard/pages/DashboardPage';
import { MentionsPage } from '../../features/mentions/pages/MentionsPage';
import { ThreatsPage } from '../../features/threats/pages/ThreatsPage';
import { DashboardLayout } from '../layouts/DashboardLayout';
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
          <Route path="analytics" element={<div className="text-gray-400">Analytics detailed view coming soon...</div>} />
          <Route path="settings" element={<div className="text-gray-400">Settings coming soon...</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
