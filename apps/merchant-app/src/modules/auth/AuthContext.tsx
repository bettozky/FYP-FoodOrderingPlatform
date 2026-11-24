import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setOnUnauthorized, setToken } from "../../shared/api/client";
import i18n, { currentLanguage, isLang, Lang, setLanguage } from "../../shared/i18n";

type Merchant = { id: string; name: string; approval: "pending" | "approved" | "rejected" | "suspended" };
type User = { id: string; name: string; email: string; merchant?: Merchant; language?: Lang };

export type MerchantSignup = {
  businessName: string; ownerName: string; email: string; phone: string; password: string;
  stallNo?: string; cuisine?: string; open?: string; close?: string;
  /** Full answers from the 8-step shop sign-up (see modules/onboarding/README.md). */
  application?: Record<string, unknown>;
};

type AuthContextValue = {
  isLoggedIn: boolean;
  name: string;
  user: User | null;
  approval: Merchant["approval"] | null;
  login: (email: string, password: string) => Promise<void>;
  /** `afterCreate` runs with the new token before the app switches screens (used to upload sign-up files). */
  register: (input: MerchantSignup, afterCreate?: (token: string) => Promise<void>) => Promise<void>;
  checkApproval: () => Promise<void>;
  logout: () => void;
  /** Switch the app language now; when signed in, also save it on the account (PATCH /auth/me). */
  changeLanguage: (lang: Lang) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // True once the owner taps a language on the login screen: that choice beats the one saved on the account.
  const pickedOnLogin = useRef(false);

  const start = (res: { token: string; user: User & { role: string } }) => {
    if (res.user.role !== "merchant") throw new Error(i18n.t("auth.notMerchant"));
    setToken(res.token);
    const saved = isLang(res.user.language) ? res.user.language : undefined;
    // Language after login: the one just picked on the login screen, else the account's, else the phone's.
    if (saved && !pickedOnLogin.current) setLanguage(saved);
    const lang = currentLanguage();
    if (lang !== saved) api("PATCH", "/auth/me", { language: lang }).catch(() => {});
    pickedOnLogin.current = false;
    setUser({ ...res.user, language: lang });
  };

  const changeLanguage = (lang: Lang) => {
    setLanguage(lang);
    if (!user) pickedOnLogin.current = true;
    else {
      setUser((cur) => (cur ? { ...cur, language: lang } : cur));
      api("PATCH", "/auth/me", { language: lang }).catch(() => {}); // the app has already switched; saving is best effort
    }
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
  const register = async (input: MerchantSignup, afterCreate?: (token: string) => Promise<void>) => {
    const res = await api<{ token: string; user: User & { role: string } }>("POST", "/auth/register-merchant", input);
    // The account already exists at this point, so a failed upload must not block sign-up.
    if (afterCreate) await afterCreate(res.token).catch(() => {});
    start(res);
  };
  const checkApproval = useCallback(async () => {
    const r = await api<{ user: User }>("GET", "/auth/me");
    setUser(r.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!user, name: user?.merchant?.name ?? user?.name ?? "", user, approval: user?.merchant?.approval ?? null, login, register, checkApproval, logout, changeLanguage }}
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
