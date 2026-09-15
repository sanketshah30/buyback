import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { authApi } from './authApi';
import { getToken, setToken } from './api';
import type { Role, User } from '../types/api';

interface SessionContext {
  partnerId: number | null;
  partnerLocationId: number | null;
  roles: Role[];
}

interface AuthContextValue extends SessionContext {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (token: string, user: User, session: SessionContext) => void;
  logout: () => Promise<void>;
  /** e.g. `hasRight('process_buyback')` - true if any of the user's roles grants this right. */
  hasRight: (right: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const USER_STORAGE_KEY = 'buyback.user';
const SESSION_STORAGE_KEY = 'buyback.session';

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function loadStoredSession(): SessionContext {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as SessionContext;
  } catch {
    // fall through to default below
  }
  return { partnerId: null, partnerLocationId: null, roles: [] };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getToken());
  const [user, setUser] = useState<User | null>(loadStoredUser());
  const [session, setSession] = useState<SessionContext>(loadStoredSession());

  const login = useCallback((newToken: string, newUser: User, newSession: SessionContext) => {
    setToken(newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    setTokenState(newToken);
    setUser(newUser);
    setSession(newSession);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort: even if the server call fails (e.g. already expired),
      // still clear local state so the user isn't stuck "logged in".
    }
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setTokenState(null);
    setUser(null);
    setSession({ partnerId: null, partnerLocationId: null, roles: [] });
  }, []);

  const hasRight = useCallback((right: string) => session.roles.some((role) => role.rights.includes(right)), [session.roles]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated: Boolean(token), ...session, login, logout, hasRight }),
    [user, token, session, login, logout, hasRight],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
