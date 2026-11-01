import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createDevelopmentSession, getCurrentAdmin, loginAdmin, logoutAdmin, SESSION_EXPIRED_EVENT } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const clearSession = useCallback(() => setUser(null), []);

  useEffect(() => {
    const onExpired = () => {
      if (import.meta.env.DEV) {
        createDevelopmentSession().then(({ user: localUser }) => setUser(localUser)).catch(() => setUser({ id: 'development-owner', name: 'Local Admin', email: 'local-admin@localhost', role: 'owner' }));
      } else clearSession();
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    if (import.meta.env.DEV) {
      setUser({ id: 'development-owner', name: 'Local Admin', email: 'local-admin@localhost', role: 'owner' });
      setLoading(false);
      createDevelopmentSession().then(({ user: localUser }) => setUser(localUser)).catch(() => {});
    } else {
      getCurrentAdmin().then(({ user: current }) => setUser(current)).catch(() => setUser(null)).finally(() => setLoading(false));
    }
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [clearSession]);

  const signIn = async (email, password) => {
    const result = await loginAdmin(email, password);
    setUser(result.user);
    return result.user;
  };
  const signOut = async () => {
    if (import.meta.env.DEV) return;
    try { await logoutAdmin(); } catch { /* Clear local state even if the session already expired. */ }
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
