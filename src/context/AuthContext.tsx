import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, LoginResponse, SidebarItem } from "../types/auth.types";
import { clearStoredSelectedSchool } from "../lib/selectedSchool";
import { clearStoredSelectedSession } from "../lib/selectedSession";
import { setUnauthorizedHandler } from "../lib/authEvents";
import { getTokenExpiryMs, isTokenExpired } from "../lib/jwt";
import { markSessionExpired } from "../lib/sessionExpiry";
import { clearStoredToken, getStoredToken, setStoredToken } from "../lib/tokenStorage";

const USER_KEY = "vidyahub_user";
const SIDEBAR_KEY = "vidyahub_sidebar";

interface AuthContextValue {
  user: AuthUser | null;
  sidebar: SidebarItem[];
  isAuthenticated: boolean;
  login: (response: LoginResponse) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Everything that belongs to one login. Shared by logout and expiry cleanup. */
function clearAuthStorage(): void {
  clearStoredToken();
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SIDEBAR_KEY);
  clearStoredSelectedSchool(); // selections belong to this login only
  clearStoredSelectedSession();
}

function currentPath(): string {
  return window.location.pathname + window.location.search;
}

// setTimeout cannot wait longer than this (~24.8 days).
const MAX_TIMEOUT_MS = 2 ** 31 - 1;

function readStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function readStoredSidebar(): SidebarItem[] {
  const raw = localStorage.getItem(SIDEBAR_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SidebarItem[];
  } catch {
    return [];
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // If the saved token already expired while the app was closed, start
  // logged out (ProtectedRoute then sends the user to /login) and remember
  // the page they were on. Only reads here; storage is cleaned in an effect.
  const [startup] = useState(() => {
    const storedToken = getStoredToken();
    return {
      expired: Boolean(storedToken && isTokenExpired(storedToken)),
      returnTo: currentPath(),
    };
  });

  const [user, setUser] = useState<AuthUser | null>(() =>
    startup.expired ? null : readStoredUser()
  );
  const [sidebar, setSidebar] = useState<SidebarItem[]>(() =>
    startup.expired ? [] : readStoredSidebar()
  );
  const [token, setToken] = useState<string | null>(() =>
    startup.expired ? null : getStoredToken()
  );

  const login = useCallback((response: LoginResponse) => {
    setStoredToken(response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(response.data.sidebar));

    setToken(response.accessToken);
    setUser(response.data.user);
    setSidebar(response.data.sidebar);
  }, []);

  const logout = useCallback(() => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
    setSidebar([]);
  }, []);

  // Logout because the session expired (not by the user's choice): remember
  // the current page so the login page can explain and return here.
  const expireSession = useCallback(() => {
    if (!getStoredToken()) return; // already logged out — several calls can fail together
    markSessionExpired(currentPath());
    logout();
  }, [logout]);

  // 1. Token was already expired at startup: clean up what was left in storage.
  useEffect(() => {
    if (!startup.expired) return;
    clearAuthStorage();
    markSessionExpired(startup.returnTo);
  }, [startup]);

  // 2. Any API call answered with 401 logs the user out (see httpClient).
  useEffect(() => {
    setUnauthorizedHandler(expireSession);
    return () => setUnauthorizedHandler(null);
  }, [expireSession]);

  // 3. If the tab stays open past the token's expiry, log out at that moment.
  useEffect(() => {
    if (!token) return;
    const expiresAt = getTokenExpiryMs(token);
    if (expiresAt === null) return;
    const delay = Math.min(Math.max(expiresAt - Date.now(), 0), MAX_TIMEOUT_MS);
    const timerId = window.setTimeout(expireSession, delay);
    return () => window.clearTimeout(timerId);
  }, [token, expireSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sidebar,
      isAuthenticated: Boolean(token),
      login,
      logout,
    }),
    [user, sidebar, token, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
