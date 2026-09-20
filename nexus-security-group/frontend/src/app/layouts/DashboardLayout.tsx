import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { Activity, KeyRound, LayoutDashboard, LogOut, MessageSquare, Settings, ShieldAlert, Users } from 'lucide-react';
import { useTranslation } from '../../shared/i18n/translations';

export function DashboardLayout() {
  const { hasPermission, logout } = useAuth();
  const navigate = useNavigate();
  const t = useTranslation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: t.nav.dashboard, path: '/', icon: LayoutDashboard, permission: ['dashboard', 'read'] },
    { name: t.nav.mentions, path: '/mentions', icon: MessageSquare, permission: ['mentions', 'read'] },
    { name: t.nav.threats, path: '/threats', icon: ShieldAlert, permission: ['threats', 'read'] },
    { name: t.nav.keywords, path: '/keywords', icon: KeyRound, permission: ['keywords', 'read'] },
    { name: t.nav.users, path: '/users', icon: Users, permission: ['users', 'read'] },
    { name: t.nav.analytics, path: '/analytics', icon: Activity, permission: ['metrics', 'read'] },
    { name: t.nav.settings, path: '/settings', icon: Settings, permission: ['permissions', 'read'] },
  ].filter((item) => hasPermission(item.permission[0], item.permission[1]));

  return (
    <div className="min-h-screen bg-surface-primary flex text-content-primary selection:bg-brand-500 selection:text-white">
      {/* Sidebar */}
      <aside aria-label="Sidebar" className="w-64 flex-shrink-0 glass border-r border-edge-card flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center space-x-3">
          <img
            src="/nsg-symbol.png"
            alt=""
            aria-hidden="true"
            className="h-10 w-10 rounded-xl object-contain drop-shadow-[0_0_14px_rgba(168,85,247,0.28)]"
          />
          <div>
            <h2 className="font-bold text-content-heading tracking-tight leading-tight">NSG</h2>
            <p className="text-xs text-brand-400 font-medium">Dashboard</p>
          </div>
        </div>

        <nav aria-label="Main navigation" className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                    isActive
                      ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-inner'
                      : 'text-content-muted hover:bg-surface-hover hover:text-content-secondary'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon aria-hidden="true" className={`w-5 h-5 ${isActive ? 'text-brand-400' : ''}`} />
                    <span className="font-medium">{item.name}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-edge-card">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-content-muted hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all"
          >
            <LogOut aria-hidden="true" className="w-5 h-5" />
            <span className="font-medium">{t.nav.signOut}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Background ambient glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="flex-1 overflow-y-auto p-8 relative z-10 animate-slide-up">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
