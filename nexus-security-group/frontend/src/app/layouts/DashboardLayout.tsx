import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth';
import { Activity, LayoutDashboard, LogOut, MessageSquare, Settings, Shield, ShieldAlert, Users } from 'lucide-react';

export function DashboardLayout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Mentions', path: '/mentions', icon: MessageSquare },
    { name: 'Threats', path: '/threats', icon: ShieldAlert },
    { name: 'Users', path: '/users', icon: Users },
    { name: 'Analytics', path: '/analytics', icon: Activity },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-dark-900 flex text-gray-100 selection:bg-brand-500 selection:text-white">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 glass border-r border-white/5 flex flex-col h-screen sticky top-0">
        <div className="p-6 flex items-center space-x-3">
          <div className="w-10 h-10 bg-brand-500/20 rounded-xl flex items-center justify-center border border-brand-500/30">
            <Shield className="w-5 h-5 text-brand-400" />
          </div>
          <div>
            <h2 className="font-bold text-white tracking-tight leading-tight">NSG</h2>
            <p className="text-xs text-brand-400 font-medium">Dashboard</p>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.name}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  isActive
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-inner'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-brand-400' : ''}`} />
                <span className="font-medium">{item.name}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 border border-transparent transition-all"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
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
