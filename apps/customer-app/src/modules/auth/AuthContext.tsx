import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api, setOnUnauthorized, setToken } from "../../shared/api/client";
import { form, LocalFile } from "../../shared/util/files";
import i18n, { currentLanguage, isLang, Lang, setLanguage } from "../../shared/i18n";
import type { Guardian } from "./components/GuardianModal";

type User = { id: string; name: string; email: string; phone?: string; avatar?: string; language?: Lang };

type AuthContextValue = {
  isLoggedIn: boolean;
  name: string;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  /** "Continue with Google". Returns { needsDob } for a brand-new person: ask their date of birth, then call again with `dob`. */
  loginWithGoogle: (idToken: string, dob?: string, guardian?: Guardian) => Promise<{ needsDob: true; name: string; email: string } | null>;
  /** Under 16 (GUARDIAN_AGE on the server) a parent or guardian must approve: pass their name, phone and consent. */
  register: (input: { name: string; email: string; phone: string; dob: string; password: string; guardian?: Guardian }) => Promise<void>;
  logout: () => void;
  /** Edit my name / phone (PATCH /auth/me). */
  updateProfile: (input: { name?: string; phone?: string }) => Promise<void>;
  /** Change password (POST /auth/password); other devices are signed out. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  /** Permanently delete my account (DELETE /auth/me). Fails while an order or booking is open. */
  deleteAccount: (password: string) => Promise<void>;
  /** Upload a new profile photo (POST /auth/me/avatar) or remove it (file = null). */
  setAvatar: (file: LocalFile | null) => Promise<void>;
  /** Switch the app language now; when signed in, also save it on the account (PATCH /auth/me). */
  changeLanguage: (lang: Lang) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // True once the person taps a language on the login screen: that choice beats the one saved on the account.
  const pickedOnLogin = useRef(false);

  const start = (res: { token: string; user: User & { role: string } }) => {
    if (res.user.role !== "customer") throw new Error(i18n.t("auth.notCustomer"));
    setToken(res.token);
    const saved = isLang(res.user.language) ? res.user.language : undefined;
    // Language after login: the one just picked on the login screen, else the account's, else the phone's.
    // Whatever is used ends up saved on the account, so it follows the person to another phone.
    if (saved && !pickedOnLogin.current) setLanguage(saved);
    const lang = currentLanguage();
    if (lang !== saved) api("PATCH", "/auth/me", { language: lang }).catch(() => {});
    pickedOnLogin.current = false;
    setUser({ ...res.user, language: lang });
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
  const loginWithGoogle: AuthContextValue["loginWithGoogle"] = async (idToken, dob, guardian) => {
    const res = await api<any>("POST", "/auth/google", { idToken, dob, ...(guardian ? { guardian } : {}) });
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

  const changeLanguage = (lang: Lang) => {
    setLanguage(lang);
    if (!user) pickedOnLogin.current = true;
    if (user) {
      setUser((cur) => (cur ? { ...cur, language: lang } : cur));
      api("PATCH", "/auth/me", { language: lang }).catch(() => {}); // the app has already switched; saving is best effort
    }
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, name: user?.name ?? "", user, login, loginWithGoogle, register, logout, updateProfile, changePassword, deleteAccount, setAvatar, changeLanguage }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
