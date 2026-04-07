"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthUser, LoginPayload } from "@/services/auth";
import { AuthService } from "@/services/auth";
import { UserService } from "@/services/user";
import { clearTokens, hasStoredTokens } from "@/lib/auth-storage";

export type AuthContextType = {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  login: (payload: LoginPayload) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const me = await UserService.getMe();
      setUser(me);
    } catch (err: any) {
      setUser(null);
      setError(
        err?.response?.data?.message || err?.message || "Unable to load your account"
      );
      clearTokens();
    }
  }, []);

  const login = useCallback(
    async (payload: LoginPayload) => {
      setError(null);
      const data = await AuthService.login(payload);
      setUser(data.user);
    },
    []
  );

  const logout = useCallback(async () => {
    await AuthService.logout();
    setUser(null);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && hasStoredTokens()) {
      refresh().finally(() => setLoading(false));
    } else {
      clearTokens();
      setUser(null);
      setLoading(false);
    }
  }, [refresh]);

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, error, refresh, login, logout }),
    [user, loading, error, refresh, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
