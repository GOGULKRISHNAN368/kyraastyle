import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getAuthMode, getCurrentAdmin, loginAdmin, logoutAdmin, SESSION_EXPIRED_EVENT, setAuthDisabledMode } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authDisabled, setAuthDisabled] = useState(false);

  const signOut = useCallback(async () => {
    if (authDisabled) return;
    try { await logoutAdmin(); } catch { /* Expired sessions are already signed out. */ }
    setUser(null);
  }, [authDisabled]);

  useEffect(() => {
    let active = true;
    const onUnauthorized = () => { if (active) setUser(null); };
    window.addEventListener(SESSION_EXPIRED_EVENT, onUnauthorized);
    getAuthMode()
      .then(async (mode) => {
        if (!active) return;
        setAuthDisabledMode(mode.authDisabled);
        setAuthDisabled(mode.authDisabled);
        if (mode.authDisabled) {
          setUser({ id: 'local-dev', name: 'Local Admin', email: 'local-dev', role: 'admin' });
          return;
        }
        const data = await getCurrentAdmin();
        if (active) setUser(data.user || null);
      })
      .catch(() => { if (active) setUser(null); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.removeEventListener(SESSION_EXPIRED_EVENT, onUnauthorized); };
  }, []);

  const signIn = useCallback(async (email, password) => {
    const data = await loginAdmin(email, password);
    setUser(data.user || null);
    return data.user;
  }, []);

  return <AuthContext.Provider value={{ user, loading, authDisabled, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
