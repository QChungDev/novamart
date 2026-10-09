"use client";

/**
 * Auth store — real JWT authentication against FastAPI backend.
 *
 * - Login/register via /api/v1/auth/*
 * - Access + refresh tokens in localStorage (via api/client tokenStore)
 * - User profile fetched from /api/v1/auth/me
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, tokenStore, ApiError, isApiConfigured } from "@/lib/api/client";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<AuthUser>) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

interface BackendUser {
  id: number;
  email: string;
  name: string;
  phone: string;
  role: string;
}

function toAuthUser(u: BackendUser): AuthUser {
  return { id: u.id, name: u.name, email: u.email, phone: u.phone || "" };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<string>("customer");
  const [loading, setLoading] = useState(true);

  // On mount: if tokens exist, fetch profile.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (isApiConfigured() && tokenStore.getAccess()) {
          const me = await api.get<BackendUser>("/api/v1/auth/me");
          if (alive) {
            setUser(toAuthUser(me));
            setRole(me.role);
          }
        }
      } catch {
        tokenStore.clear();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Global 401 handler -> logout.
  useEffect(() => {
    const handler = () => {
      setUser(null);
      setRole("customer");
    };
    window.addEventListener("novamart:unauthorized", handler);
    return () => window.removeEventListener("novamart:unauthorized", handler);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    if (!email.includes("@")) throw new Error("Email không hợp lệ.");
    if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    try {
      const data = await api.post<{
        user: BackendUser;
        tokens: { access_token: string; refresh_token: string };
      }>("/api/v1/auth/login", { email, password }, { auth: false });
      tokenStore.set(data.tokens.access_token, data.tokens.refresh_token);
      setUser(toAuthUser(data.user));
      setRole(data.user.role);
    } catch (e) {
      if (e instanceof ApiError) throw new Error(e.message);
      throw e;
    }
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    if (name.trim().length < 2) throw new Error("Vui lòng nhập họ tên.");
    if (!email.includes("@")) throw new Error("Email không hợp lệ.");
    if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    try {
      const data = await api.post<{
        user: BackendUser;
        tokens: { access_token: string; refresh_token: string };
      }>(
        "/api/v1/auth/register",
        { name: name.trim(), email, password },
        { auth: false },
      );
      tokenStore.set(data.tokens.access_token, data.tokens.refresh_token);
      setUser(toAuthUser(data.user));
      setRole(data.user.role);
    } catch (e) {
      if (e instanceof ApiError) throw new Error(e.message);
      throw e;
    }
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setRole("customer");
    api.post("/api/v1/auth/logout", {}).catch(() => {});
  }, []);

  const updateProfile = useCallback(async (patch: Partial<AuthUser>) => {
    const data = await api.patch<BackendUser>("/api/v1/users/me", {
      name: patch.name,
      phone: patch.phone,
    });
    setUser(toAuthUser(data));
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAdmin: role === "admin",
      loading,
      login,
      register,
      logout,
      updateProfile,
    }),
    [user, role, loading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
