"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AuthUser, LoginPayload } from "@/services/auth";
import { AuthService } from "@/services/auth";
import { UserService } from "@/services/user";
import { getAccessToken } from "@/lib/auth-storage";
import { setCookie, deleteCookie } from "@/lib/cookies";

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
      // ensure cookie exists while authenticated
      setCookie("cv_auth", "1", 7);
    } catch (err: any) {
      setUser(null);
      setError(err?.message || null);
      deleteCookie("cv_auth");
    }
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setError(null);
    await AuthService.login(payload);
    setCookie("cv_auth", "1", 7);
    await refresh();
  }, [refresh]);

  const logout = useCallback(async () => {
    await AuthService.logout();
    deleteCookie("cv_auth");
    setUser(null);
  }, []);

  useEffect(() => {
    // On mount, attempt to fetch user if we have a token
    if (typeof window !== 'undefined' && getAccessToken()) {
      refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refresh]);

  const value = useMemo<AuthContextType>(() => ({ user, loading, error, refresh, login, logout }), [user, loading, error, refresh, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
