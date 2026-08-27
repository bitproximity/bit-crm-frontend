import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileNetworkError, setProfileNetworkError] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const lastFetchedUserId = useRef(null);

  const fetchProfile = async () => {
    setProfileLoading(true);
    // Reintenta un par de veces con espera creciente antes de rendirse — un "Failed to
    // fetch" suele ser el servidor despertando (ej. tras estar inactivo), no un rechazo
    // real; sin este reintento, esa demora de arranque se veía como "cuenta no autorizada".
    const delays = [0, 1500, 3500];
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await new Promise((r) => setTimeout(r, delays[i]));
      try {
        const p = await api.get('/api/team/me');
        setProfile(p);
        setProfileError('');
        setProfileNetworkError(false);
        setProfileLoading(false);
        return;
      } catch (err) {
        const isNetworkError = /failed to fetch|networkerror|tardó demasiado/i.test(err.message || '');
        if (isNetworkError && i < delays.length - 1) continue; // reintenta solo si fue de red, no si fue un 403 real
        setProfile(null);
        setProfileError(err.message || 'Error desconocido consultando tu perfil.');
        setProfileNetworkError(isNetworkError);
      }
    }
    setProfileLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      lastFetchedUserId.current = null;
      setProfile(null);
      setProfileError('');
      setProfileLoading(false);
      return;
    }

    // Supabase renueva el token solo cada vez que la pestaña vuelve a estar activa
    // tras un rato en segundo plano — eso dispara este efecto de nuevo con un
    // objeto "session" distinto aunque sea el mismo usuario. Si ya tenemos su
    // perfil cargado, lo reutilizamos en vez de mostrar pantallas de carga y
    // perder el estado de lo que se estaba viendo.
    if (lastFetchedUserId.current === session.user.id) return;
    lastFetchedUserId.current = session.user.id;

    fetchProfile();
  }, [session]);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, profile, profileError, profileNetworkError, profileLoading, signOut, retryProfile: fetchProfile, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
