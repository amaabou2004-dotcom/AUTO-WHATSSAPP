import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, AUTH_TOKEN_KEY, AUTH_UNAUTHORIZED_EVENT } from '../lib/api';
import { ErrorState, PageLoader } from './UI';

interface AuthUser { email: string }
interface AuthStatus { required: boolean; demo: boolean }
interface LoginResponse { token: string; user: AuthUser; expiresIn: number }

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  demoMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);

  const logout = useCallback(() => {
    window.localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  }, []);

  useEffect(() => {
    let active = true;
    async function initialize() {
      try {
        const status = await api<AuthStatus>('/auth/status');
        if (!active) return;
        setDemoMode(status.demo);
        const token = window.localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          const session = await api<{ user: AuthUser }>('/auth/me');
          if (active) setUser(session.user);
        }
      } catch (reason) {
        if (active) {
          window.localStorage.removeItem(AUTH_TOKEN_KEY);
          setUser(null);
          if (!(reason instanceof ApiError && reason.status === 401)) {
            setError(reason instanceof Error ? reason.message : 'Impossible de vérifier votre session.');
          }
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void initialize();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, logout);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    window.localStorage.setItem(AUTH_TOKEN_KEY, response.token);
    setUser(response.user);
    setError(null);
  }, []);

  const value = useMemo(() => ({ user, loading, error, demoMode, login, logout }), [user, loading, error, demoMode, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider.');
  return context;
}

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, error } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoader />;
  if (error) return <ErrorState message={error} retry={() => window.location.reload()} />;
  if (!user) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children;
}
