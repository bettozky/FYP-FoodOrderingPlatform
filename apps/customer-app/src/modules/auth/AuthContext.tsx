import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setOnUnauthorized, setToken } from "../../shared/api/client";
import { form, LocalFile } from "../../shared/util/files";

type User = { id: string; name: string; email: string; phone?: string; avatar?: string };

type AuthContextValue = {
  isLoggedIn: boolean;
  name: string;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  /** "Continue with Google". Returns { needsDob } for a brand-new person: ask their date of birth, then call again with `dob`. */
  loginWithGoogle: (idToken: string, dob?: string) => Promise<{ needsDob: true; name: string; email: string } | null>;
  register: (input: { name: string; email: string; phone: string; dob: string; password: string }) => Promise<void>;
  logout: () => void;
  /** Edit my name / phone (PATCH /auth/me). */
  updateProfile: (input: { name?: string; phone?: string }) => Promise<void>;
  /** Change password (POST /auth/password); other devices are signed out. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Permanently delete my account (DELETE /auth/me). Fails while an order or booking is open. */
  deleteAccount: (password: string) => Promise<void>;
  /** Upload a new profile photo (POST /auth/me/avatar) or remove it (file = null). */
  setAvatar: (file: LocalFile | null) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const start = (res: { token: string; user: User & { role: string } }) => {
    if (res.user.role !== "customer") throw new Error("This is not a customer account. Use the merchant app.");
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

  // FR-1.1: there is no guest mode. Everything past the login screen needs an account (the login screen itself now explains what ScootMeal does).
  const login = async (email: string, password: string) => {
    const res = await api("POST", "/auth/login", { email, password, role: "customer" });
    start(res);
  };
  const loginWithGoogle: AuthContextValue["loginWithGoogle"] = async (idToken, dob) => {
    const res = await api<any>("POST", "/auth/google", { idToken, dob });
    if (res.needsDob) return { needsDob: true, name: res.name, email: res.email };
    start(res);
    return null;
  };
  const register: AuthContextValue["register"] = async (input) => {
    start(await api("POST", "/auth/register", input));
  };

  const updateProfile: AuthContextValue["updateProfile"] = async (input) => {
    const r = await api<{ user: User }>("PATCH", "/auth/me", input);
    setUser((cur) => (cur ? { ...cur, ...r.user } : cur));
  };
  const changePassword: AuthContextValue["changePassword"] = async (currentPassword, newPassword) => {
    await api("POST", "/auth/password", { currentPassword, newPassword });
  };

  const deleteAccount: AuthContextValue["deleteAccount"] = async (password) => {
    await api("DELETE", "/auth/me", { password });
    setToken(null);
    setUser(null);
  };

  const setAvatar: AuthContextValue["setAvatar"] = async (file) => {
    if (file) {
      const r = await api<{ avatar: string }>("POST", "/auth/me/avatar", await form({}, { file }));
      setUser((cur) => (cur ? { ...cur, avatar: r.avatar } : cur));
    } else {
      await api("DELETE", "/auth/me/avatar");
      setUser((cur) => (cur ? { ...cur, avatar: undefined } : cur));
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, name: user?.name ?? "", user, login, loginWithGoogle, register, logout, updateProfile, changePassword, deleteAccount, setAvatar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
