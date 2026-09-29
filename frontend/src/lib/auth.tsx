import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi } from './authApi';
import { getToken, setToken, SESSION_EXPIRED_EVENT } from './api';
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
  /** True only when the session was force-cleared by a 401 (see SESSION_EXPIRED_EVENT below), never for an explicit logout() - so LoginPage can tell the user why they landed there. Cleared on the next login(). */
  sessionExpired: boolean;
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
  const [sessionExpired, setSessionExpired] = useState(false);

  const login = useCallback((newToken: string, newUser: User, newSession: SessionContext) => {
    setToken(newToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(newUser));
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    setTokenState(newToken);
    setUser(newUser);
    setSession(newSession);
    setSessionExpired(false);
  }, []);

  /** Clears all local session state - shared by an explicit logout() and a forced session-expired logout below. */
  const clearSession = useCallback(() => {
    setToken(null);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setTokenState(null);
    setUser(null);
    setSession({ partnerId: null, partnerLocationId: null, roles: [] });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Best-effort: even if the server call fails (e.g. already expired),
      // still clear local state so the user isn't stuck "logged in".
    }
    clearSession();
  }, [clearSession]);

  // If any API call comes back 401 (session logged out elsewhere, expired,
  // or revoked - see lib/api.ts's SESSION_EXPIRED_EVENT), clear local state
  // immediately without another round-trip to /auth/logout (that session is
  // already dead server-side). `isAuthenticated` flipping to false then
  // makes every `ProtectedRoute` redirect to /login on its next render -
  // unlike an explicit logout(), this also flags `sessionExpired` so the
  // login page can explain why.
  useEffect(() => {
    const handleSessionExpired = () => {
      clearSession();
      setSessionExpired(true);
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [clearSession]);

  const hasRight = useCallback((right: string) => session.roles.some((role) => role.rights.includes(right)), [session.roles]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, isAuthenticated: Boolean(token), ...session, login, logout, hasRight, sessionExpired }),
    [user, token, session, login, logout, hasRight, sessionExpired],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
