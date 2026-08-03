import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
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

function PrivateRoutes() {
  const { session, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-neutral-500">Cargando...</div>;
  }

  if (!session) return <Navigate to="/login" replace />;

  return (
    <Layout />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
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
