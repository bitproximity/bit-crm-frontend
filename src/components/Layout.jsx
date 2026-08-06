import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  LayoutDashboard, GitBranch, CheckSquare, Users, Building2,
  FolderKanban, Package, BarChart3, Settings as SettingsIcon, LogOut,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/deals', label: 'Pipeline', icon: GitBranch },
  { to: '/tasks', label: 'Tareas', icon: CheckSquare },
  { to: '/contacts', label: 'Contactos', icon: Users },
  { to: '/companies', label: 'Empresas', icon: Building2 },
  { to: '/projects', label: 'Proyectos', icon: FolderKanban },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/metrics', label: 'Métricas', icon: BarChart3 },
];

export default function Layout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-brand-bg text-brand-white">
      <aside className="w-60 border-r border-brand-border flex flex-col">
        <div className="px-5 py-5 border-b border-brand-border">
          <img src="/brand/logo.png" alt="Bit Proximity" className="h-6" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-manrope transition ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/20 text-brand-ice border border-brand-violet/40'
                      : 'text-brand-muted hover:bg-brand-panel hover:text-brand-white'
                  }`
                }
              >
                <Icon size={16} strokeWidth={2} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div className="px-3 pb-3">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-manrope transition ${
                isActive
                  ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/20 text-brand-ice border border-brand-violet/40'
                  : 'text-brand-muted hover:bg-brand-panel hover:text-brand-white'
              }`
            }
          >
            <SettingsIcon size={16} strokeWidth={2} />
            Configuración
          </NavLink>
        </div>
        <div className="px-5 py-4 border-t border-brand-border flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-brand-violet to-brand-magenta flex items-center justify-center text-xs font-tech font-bold flex-shrink-0">
            {profile?.full_name?.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-brand-white font-manrope text-sm truncate">{profile?.full_name}</div>
            <div className="text-brand-muted text-xs font-tech uppercase truncate">{profile?.role}</div>
          </div>
          <button onClick={signOut} className="text-brand-muted hover:text-red-400 flex-shrink-0" title="Cerrar sesión">
            <LogOut size={15} />
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
