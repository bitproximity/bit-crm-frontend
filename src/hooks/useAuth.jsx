import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const lastFetchedUserId = useRef(null);

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

    setProfileLoading(true);
    api.get('/api/team/me')
      .then((p) => { setProfile(p); setProfileError(''); })
      .catch((err) => { setProfile(null); setProfileError(err.message || 'Error desconocido consultando tu perfil.'); })
      .finally(() => setProfileLoading(false));
  }, [session]);

  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ session, profile, profileError, profileLoading, signOut, loading: session === undefined }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
