import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const nav = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/deals', label: 'Pipeline' },
  { to: '/tasks', label: 'Tareas' },
  { to: '/contacts', label: 'Contactos' },
  { to: '/companies', label: 'Empresas' },
  { to: '/projects', label: 'Proyectos' },
  { to: '/products', label: 'Productos' },
  { to: '/metrics', label: 'Métricas' },
  { to: '/settings', label: 'Configuración' },
];

export default function Layout() {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex bg-brand-bg text-brand-white">
      <aside className="w-56 border-r border-brand-border flex flex-col">
        <div className="px-5 py-5 border-b border-brand-border">
          <img src="/brand/logo.png" alt="Bit Proximity" className="h-6" />
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm font-manrope transition ${
                  isActive
                    ? 'bg-gradient-to-r from-brand-violet/20 to-brand-magenta/20 text-brand-ice border border-brand-violet/40'
                    : 'text-brand-muted hover:bg-brand-panel hover:text-brand-white'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-brand-border text-sm">
          <div className="text-brand-white font-manrope">{profile?.full_name}</div>
          <div className="text-brand-muted text-xs mb-2 font-tech uppercase">{profile?.role}</div>
          <button onClick={signOut} className="text-brand-muted hover:text-brand-ice text-xs">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
