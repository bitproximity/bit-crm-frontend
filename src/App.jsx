import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Deals from './pages/Deals';
import Tasks from './pages/Tasks';
import Contacts from './pages/Contacts';
import Companies from './pages/Companies';
import Projects from './pages/Projects';
import Products from './pages/Products';
import Metrics from './pages/Metrics';
import Settings from './pages/Settings';

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return children;
}

function PrivateRoutes() {
  const { session, profile, loading, signOut } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Cargando...</div>;
  }

  if (!session) return <Navigate to="/login" replace />;

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-white px-4">
        <div className="max-w-sm text-center">
          <p className="font-headline text-lg mb-2">Cuenta no autorizada</p>
          <p className="text-brand-muted text-sm mb-4">
            Tu cuenta ({session.user.email}) inició sesión correctamente, pero todavía no está
            habilitada en el equipo de Bit CRM. Pide a un admin que la agregue.
          </p>
          <button onClick={signOut} className="text-sm text-brand-muted hover:text-brand-ice">
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  return (
    <Layout />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route element={<PrivateRoutes />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/deals" element={<Deals />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/contacts" element={<Contacts />} />
            <Route path="/companies" element={<Companies />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/products" element={<Products />} />
            <Route path="/metrics" element={<Metrics />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
