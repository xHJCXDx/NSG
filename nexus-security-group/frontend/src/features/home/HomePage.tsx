import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useTranslation } from '../../shared/i18n/translations';
import {
  Activity,
  BellRing,
  KeyRound,
  LayoutDashboard,
  MessageSquare,
  PlayCircle,
  ShieldAlert,
  BarChart3,
  Users,
  Settings,
  ListTree,
} from 'lucide-react';

interface QuickLink {
  label: string;
  description: string;
  path: string;
  icon: typeof LayoutDashboard;
  permission?: [string, string];
  color: string;
}

export function HomePage() {
  const { claims, hasPermission } = useAuth();
  const navigate = useNavigate();
  const t = useTranslation();

  const greeting = t.home.greeting.replace('{username}', claims.sub ?? t.home.defaultUser);

  const quickLinks: QuickLink[] = [
    { label: t.nav.dashboard, description: t.home.links.dashboard, path: '/', icon: LayoutDashboard, permission: ['dashboard', 'read'], color: 'brand' },
    { label: t.nav.threats, description: t.home.links.threats, path: '/threats', icon: ShieldAlert, permission: ['threats', 'read'], color: 'red' },
    { label: t.nav.alerts, description: t.home.links.alerts, path: '/alerts', icon: BellRing, permission: ['alerts', 'read'], color: 'yellow' },
    { label: t.nav.mentions, description: t.home.links.mentions, path: '/mentions', icon: MessageSquare, permission: ['mentions', 'read'], color: 'blue' },
    { label: t.nav.keywords, description: t.home.links.keywords, path: '/keywords', icon: KeyRound, permission: ['keywords', 'read'], color: 'purple' },
    { label: t.nav.analytics, description: t.home.links.analytics, path: '/analytics', icon: BarChart3, permission: ['metrics', 'read'], color: 'cyan' },
    { label: t.nav.automation, description: t.home.links.automation, path: '/automation', icon: PlayCircle, permission: ['workflows', 'read'], color: 'emerald' },
    { label: t.nav.logs, description: t.home.links.logs, path: '/logs', icon: ListTree, permission: ['logs', 'read'], color: 'slate' },
    { label: t.nav.users, description: t.home.links.users, path: '/users', icon: Users, permission: ['users', 'read'], color: 'orange' },
    { label: t.nav.settings, description: t.home.links.settings, path: '/settings', icon: Settings, color: 'zinc' },
  ];

  const visibleLinks = quickLinks.filter(
    (link) => !link.permission || hasPermission(link.permission[0], link.permission[1]),
  );

  const colorMap: Record<string, string> = {
    brand: 'bg-brand-500/10 text-brand-400 border-brand-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    slate: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    orange: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    zinc: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
  };

  return (
    <div className="space-y-8">
      <header>
        <p className="text-sm font-medium text-brand-400 tracking-wide uppercase">{t.home.eyebrow}</p>
        <h1 className="text-3xl font-bold text-content-heading tracking-tight mt-1">{greeting}</h1>
        <p className="text-content-secondary mt-2">{t.home.subtitle}</p>
      </header>

      <section>
        <h2 className="text-lg font-semibold text-content-heading mb-4">{t.home.quickAccess}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visibleLinks.map((link) => {
            const Icon = link.icon;
            return (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="glass-card p-5 text-left group hover:scale-[1.02] transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-2.5 rounded-xl border ${colorMap[link.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-content-heading group-hover:text-brand-400 transition-colors">
                      {link.label}
                    </h3>
                    <p className="text-sm text-content-muted mt-1">{link.description}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="glass-card p-6">
        <div className="flex items-center gap-3 mb-3">
          <Activity className="w-5 h-5 text-brand-400" />
          <h2 className="text-lg font-semibold text-content-heading">{t.home.sessionInfo}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-content-muted">{t.home.role}</span>
            <p className="font-medium text-content-primary capitalize">{claims.role ?? '-'}</p>
          </div>
          <div>
            <span className="text-content-muted">{t.home.authSource}</span>
            <p className="font-medium text-content-primary">{claims.auth_source === 'database' ? t.home.authDB : t.home.authBootstrap}</p>
          </div>
          <div>
            <span className="text-content-muted">{t.home.permissionsCount}</span>
            <p className="font-medium text-content-primary">{claims.permissions?.length ?? 0}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
