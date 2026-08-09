import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';
import Layout from './components/Layout';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Deals = lazy(() => import('./pages/Deals'));
const DealDetail = lazy(() => import('./pages/DealDetail'));
const Tasks = lazy(() => import('./pages/Tasks'));
const Contacts = lazy(() => import('./pages/Contacts'));
const Companies = lazy(() => import('./pages/Companies'));
const CompanyDetail = lazy(() => import('./pages/CompanyDetail'));
const Projects = lazy(() => import('./pages/Projects'));
const Spaces = lazy(() => import('./pages/Spaces'));
const Documents = lazy(() => import('./pages/Documents'));
const Invoicing = lazy(() => import('./pages/Invoicing'));
const ProjectDetail = lazy(() => import('./pages/ProjectDetail'));
const Products = lazy(() => import('./pages/Products'));
const Metrics = lazy(() => import('./pages/Metrics'));
const Activities = lazy(() => import('./pages/Activities'));
const Settings = lazy(() => import('./pages/Settings'));
const B2bMeetings = lazy(() => import('./pages/B2bMeetings'));

function PageFallback() {
  return <div className="text-brand-muted p-6">Cargando...</div>;
}

function PublicOnlyRoute({ children }) {
  const { session, loading } = useAuth();
  if (loading) return null;
  if (session) return <Navigate to="/" replace />;
  return children;
}

function PrivateRoutes() {
  const { session, profile, profileError, profileLoading, loading, signOut } = useAuth();

  if (loading || (session && profileLoading)) {
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
          {profileError && (
            <p className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4 text-left">
              Detalle técnico: {profileError}
            </p>
          )}
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
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route element={<PrivateRoutes />}>
              <Route path="/" element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
              <Route path="/deals" element={<Suspense fallback={<PageFallback />}><Deals /></Suspense>} />
              <Route path="/deals/:id" element={<Suspense fallback={<PageFallback />}><DealDetail /></Suspense>} />
              <Route path="/tasks" element={<Suspense fallback={<PageFallback />}><Tasks /></Suspense>} />
              <Route path="/contacts" element={<Suspense fallback={<PageFallback />}><Contacts /></Suspense>} />
              <Route path="/companies" element={<Suspense fallback={<PageFallback />}><Companies /></Suspense>} />
              <Route path="/companies/:id" element={<Suspense fallback={<PageFallback />}><CompanyDetail /></Suspense>} />
              <Route path="/projects" element={<Suspense fallback={<PageFallback />}><Projects /></Suspense>} />
              <Route path="/projects/:id" element={<Suspense fallback={<PageFallback />}><ProjectDetail /></Suspense>} />
              <Route path="/spaces" element={<Suspense fallback={<PageFallback />}><Spaces /></Suspense>} />
              <Route path="/documents" element={<Suspense fallback={<PageFallback />}><Documents /></Suspense>} />
              <Route path="/invoicing" element={<Suspense fallback={<PageFallback />}><Invoicing /></Suspense>} />
              <Route path="/products" element={<Suspense fallback={<PageFallback />}><Products /></Suspense>} />
              <Route path="/metrics" element={<Suspense fallback={<PageFallback />}><Metrics /></Suspense>} />
              <Route path="/activities" element={<Suspense fallback={<PageFallback />}><Activities /></Suspense>} />
              <Route path="/b2b-meetings" element={<Suspense fallback={<PageFallback />}><B2bMeetings /></Suspense>} />
              <Route path="/settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
