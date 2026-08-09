import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined); // undefined = cargando
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) {
      setProfileLoading(true);
      api.get('/api/team/me')
        .then((p) => { setProfile(p); setProfileError(''); })
        .catch((err) => { setProfile(null); setProfileError(err.message || 'Error desconocido consultando tu perfil.'); })
        .finally(() => setProfileLoading(false));
    } else {
      setProfile(null);
      setProfileError('');
      setProfileLoading(false);
    }
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
