import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setOnUnauthorized, setToken } from "../../shared/api/client";

type Merchant = { id: string; name: string; approval: "pending" | "approved" | "rejected" | "suspended" };
type User = { id: string; name: string; email: string; merchant?: Merchant };

export type MerchantSignup = {
  businessName: string; ownerName: string; email: string; phone: string; password: string;
  stallNo?: string; cuisine?: string; open?: string; close?: string;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  name: string;
  user: User | null;
  approval: Merchant["approval"] | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: MerchantSignup) => Promise<void>;
  checkApproval: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const start = (res: { token: string; user: User & { role: string } }) => {
    if (res.user.role !== "merchant") throw new Error("This is not a merchant account. Use the customer app.");
    setToken(res.token);
    setUser(res.user);
  };

  const logout = useCallback(() => {
    api("POST", "/auth/logout").catch(() => {});
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      setToken(null);
      setUser(null);
    });
    return () => setOnUnauthorized(null);
  }, []);

  const login = async (email: string, password: string) => start(await api("POST", "/auth/login", { email, password, role: "merchant" }));
  // FR-5.1: sign-up creates a PENDING business; an admin approves it in the web dashboard.
  const register = async (input: MerchantSignup) => start(await api("POST", "/auth/register-merchant", input));
  const checkApproval = useCallback(async () => {
    const r = await api<{ user: User }>("GET", "/auth/me");
    setUser(r.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!user, name: user?.merchant?.name ?? user?.name ?? "", user, approval: user?.merchant?.approval ?? null, login, register, checkApproval, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
