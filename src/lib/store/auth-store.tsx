"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  /** Mock login — accepts any email/password, or the demo account. */
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (patch: Partial<AuthUser>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "novamart-auth-v1";

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

function readStored(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR hydration mismatch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(readStored());
    setLoading(false);
  }, []);

  const persist = (u: AuthUser | null) => {
    setUser(u);
    try {
      if (u) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 700)); // mock latency
    if (!email.includes("@")) throw new Error("Email không hợp lệ.");
    if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    // Demo account gets a friendly name; anything else derives from email.
    const name =
      email.toLowerCase() === "customer@novamart.vn"
        ? "Khách hàng Demo"
        : email.split("@")[0].replace(/[._-]+/g, " ");
    persist({
      id: "u-demo",
      name: name.charAt(0).toUpperCase() + name.slice(1),
      email,
      phone: "0903123456",
    });
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 700));
    if (name.trim().length < 2) throw new Error("Vui lòng nhập họ tên.");
    if (!email.includes("@")) throw new Error("Email không hợp lệ.");
    if (password.length < 6) throw new Error("Mật khẩu phải có ít nhất 6 ký tự.");
    persist({ id: "u-demo", name: name.trim(), email, phone: "" });
  }, []);

  const logout = useCallback(() => persist(null), []);

  const updateProfile = useCallback(
    (patch: Partial<AuthUser>) => {
      setUser((prev) => {
        if (!prev) return prev;
        const next = { ...prev, ...patch };
        try {
          window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  const value = useMemo(
    () => ({ user, loading, login, register, logout, updateProfile }),
    [user, loading, login, register, logout, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
