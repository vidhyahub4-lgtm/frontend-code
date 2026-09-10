import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthUser, LoginResponse, SidebarItem } from "../types/auth.types";
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
  const [user, setUser] = useState<AuthUser | null>(() => readStoredUser());
  const [sidebar, setSidebar] = useState<SidebarItem[]>(() => readStoredSidebar());
  const [token, setToken] = useState<string | null>(() => getStoredToken());

  const login = useCallback((response: LoginResponse) => {
    setStoredToken(response.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(response.data.user));
    localStorage.setItem(SIDEBAR_KEY, JSON.stringify(response.data.sidebar));

    setToken(response.accessToken);
    setUser(response.data.user);
    setSidebar(response.data.sidebar);
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SIDEBAR_KEY);

    setToken(null);
    setUser(null);
    setSidebar([]);
  }, []);

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
