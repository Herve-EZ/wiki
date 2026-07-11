import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { api } from "../lib/api";
import { clearTokens, loadTokens } from "../lib/auth";
import type { LoginResult, User } from "../lib/types";

type Status = "loading" | "anonymous" | "authenticated";

interface AuthState {
  status: Status;
  user: User | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  verifyMfa: (challengeToken: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);

  const refresh = useCallback(async () => {
    const tokens = await loadTokens();
    if (!tokens?.access) {
      setStatus("anonymous");
      setUser(null);
      return;
    }
    try {
      const me = await api.me();
      setUser(me);
      setStatus("authenticated");
    } catch {
      await clearTokens();
      setUser(null);
      setStatus("anonymous");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      const result = await api.login(email, password);
      if (result.kind === "tokens") await refresh();
      return result;
    },
    [refresh],
  );

  const verifyMfa = useCallback(
    async (challengeToken: string, code: string) => {
      await api.verifyMfa(challengeToken, code);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo<AuthState>(
    () => ({ status, user, login, verifyMfa, logout, refresh }),
    [status, user, login, verifyMfa, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
