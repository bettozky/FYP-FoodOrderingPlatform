import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setOnUnauthorized, setToken } from "../../shared/api/client";

type User = { id: string; name: string; email: string; phone?: string };

type AuthContextValue = {
  isLoggedIn: boolean;
  name: string;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (input: { name: string; email: string; phone: string; dob: string; password: string }) => Promise<void>;
  logout: () => void;
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

  // FR-1.1: there is no guest mode. Everything past this screen needs an account.
  const login = async (email: string, password: string) => {
    const res = await api("POST", "/auth/login", { email, password, role: "customer" });
    start(res);
  };
  const register: AuthContextValue["register"] = async (input) => {
    start(await api("POST", "/auth/register", input));
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn: !!user, name: user?.name ?? "", user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
