import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { canAccessPath, firstAllowedPath, isAdmin } from '../lib/permissions';
import {
  LayoutDashboard, GitBranch, CheckSquare, Users, Building2,
  FolderKanban, Package, BarChart3, Settings as SettingsIcon, LogOut, Clock3, UserCircle,
  Boxes, FileText, Receipt, CircleDollarSign, Handshake,
} from 'lucide-react';

const nav = [
  { to: '/', label: 'Dashboard', end: true, icon: LayoutDashboard },
  { to: '/deals', label: 'Pipeline', icon: CircleDollarSign },
  { to: '/activities', label: 'Actividades', icon: Clock3 },
  { to: '/tasks', label: 'Tareas', icon: CheckSquare },
  { to: '/contacts', label: 'Contactos', icon: Users },
  { to: '/companies', label: 'Empresas', icon: Building2 },
  { to: '/spaces', label: 'Espacios', icon: Boxes },
  { to: '/projects', label: 'Proyectos', icon: FolderKanban },
  { to: '/documents', label: 'Documentos', icon: FileText },
  { to: '/invoicing', label: 'Facturación', icon: Receipt },
  { to: '/b2b-meetings', label: 'Bit Prospect', icon: Handshake },
  { to: '/products', label: 'Productos', icon: Package },
  { to: '/metrics', label: 'Métricas', icon: BarChart3 },
];

export default function Layout() {
  const { profile, signOut } = useAuth();
  const location = useLocation();
  const role = profile?.role;

  const visibleNav = nav.filter((item) => canAccessPath(role, item.to));

  // Si acaba de entrar y "/" no le corresponde, lo mandamos directo a su primera sección permitida.
  if (location.pathname === '/' && !canAccessPath(role, '/')) {
    return <Navigate to={firstAllowedPath(role)} replace />;
  }

  const hasAccess = canAccessPath(role, location.pathname);

  return (
    <div className="min-h-screen flex bg-brand-bg text-brand-white">
      <aside className="w-60 border-r border-brand-border flex flex-col">
        <div className="px-5 py-5 border-b border-brand-border">
          <img src="/brand/logo.png" alt="Bit Proximity" className="h-6" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-manrope transition ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/20 text-brand-ice border border-brand-violet/40 shadow-[0_0_16px_-4px_rgba(133,0,255,0.5)]'
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
        <div className="px-3 pb-3 space-y-0.5">
          <NavLink
            to="/profile"
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-manrope transition ${
                isActive
                  ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/20 text-brand-ice border border-brand-violet/40 shadow-[0_0_16px_-4px_rgba(133,0,255,0.5)]'
                  : 'text-brand-muted hover:bg-brand-panel hover:text-brand-white'
              }`
            }
          >
            <UserCircle size={16} strokeWidth={2} />
            Mi Perfil
          </NavLink>
          {isAdmin(role) && (
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-manrope transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/20 text-brand-ice border border-brand-violet/40 shadow-[0_0_16px_-4px_rgba(133,0,255,0.5)]'
                    : 'text-brand-muted hover:bg-brand-panel hover:text-brand-white'
                }`
              }
            >
              <SettingsIcon size={16} strokeWidth={2} />
              Configuración
            </NavLink>
          )}
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
        <div className="page-transition max-w-[1600px] mx-auto">
          {hasAccess ? (
            <Outlet />
          ) : (
            <div className="max-w-md mx-auto mt-20 text-center">
              <p className="font-headline text-lg mb-2">No tienes acceso a esta sección</p>
              <p className="text-brand-muted text-sm mb-4">
                Tu rol ({role}) no incluye esta parte del CRM. Si crees que deberías tenerlo, pídele a un admin que ajuste tu rol en Configuración.
              </p>
              <NavLink to={firstAllowedPath(role)} className="text-brand-ice hover:underline text-sm">
                Ir a mi panel
              </NavLink>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
