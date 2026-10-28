import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, errorText, setOnUnauthorized, setToken } from "../../shared/api/client";
import type { FailedUpload } from "../onboarding/signup/upload";

type Merchant = { id: string; name: string; approval: "pending" | "approved" | "rejected" | "suspended" };
type User = { id: string; name: string; email: string; merchant?: Merchant };

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
  /**
   * `afterCreate` runs once the new account's token is set, before the app switches screens.
   * The wizard uses it to upload the sign-up files; the ones that failed end up in `failedUploads`.
   */
  register: (input: MerchantSignup, afterCreate?: () => Promise<FailedUpload[]>) => Promise<void>;
  /** Sign-up files that did not upload, shown on PendingApprovalScreen. */
  failedUploads: FailedUpload[];
  setFailedUploads: (list: FailedUpload[]) => void;
  checkApproval: () => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [failedUploads, setFailedUploads] = useState<FailedUpload[]>([]);

  const start = (res: { token: string; user: User & { role: string } }) => {
    if (res.user.role !== "merchant") throw new Error("This is not a merchant account. Use the customer app.");
    setToken(res.token);
    setUser(res.user);
  };

  const logout = useCallback(() => {
    api("POST", "/auth/logout").catch(() => {});
    setToken(null);
    setUser(null);
    setFailedUploads([]);
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
  const register = async (input: MerchantSignup, afterCreate?: () => Promise<FailedUpload[]>) => {
    const res = await api<{ token: string; user: User & { role: string } }>("POST", "/auth/register-merchant", input);
    // The account already exists at this point, so a failed upload must not block sign-up.
    setToken(res.token);
    // uploadSignupFiles reports each failed file itself; this catch is only a safety net.
    const failed = afterCreate ? await afterCreate().catch((e) => (console.warn("Sign-up uploads:", errorText(e)), [])) : [];
    setFailedUploads(failed);
    start(res);
  };
  const checkApproval = useCallback(async () => {
    const r = await api<{ user: User }>("GET", "/auth/me");
    setUser(r.user);
  }, []);

  return (
    <AuthContext.Provider
      value={{ isLoggedIn: !!user, name: user?.merchant?.name ?? user?.name ?? "", user, approval: user?.merchant?.approval ?? null, login, register, failedUploads, setFailedUploads, checkApproval, logout }}
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
