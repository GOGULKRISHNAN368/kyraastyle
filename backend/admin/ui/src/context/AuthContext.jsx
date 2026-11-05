import { createContext, useCallback, useContext, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user] = useState({ id: 'local-dev', name: 'Local Admin', email: 'local-dev', role: 'admin' });
  const loading = false;
  const authDisabled = true;

  const signOut = useCallback(async () => {
    // There is no sign-out in the local no-auth dashboard.
  }, []);

  const signIn = useCallback(async (email, password) => {
    return user;
  }, [user]);

  return <AuthContext.Provider value={{ user, loading, authDisabled, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
