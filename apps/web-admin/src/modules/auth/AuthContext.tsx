import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, setToken, setUnauthorizedHandler } from "../../shared/api";

// FR-6.1: admin-only sign-in against the backend. The token is kept in memory only,
// so closing the tab signs the admin out.
type AuthValue = {
  isLoggedIn: boolean;
  name: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState("");
  const [isLoggedIn, setLoggedIn] = useState(false);

  const logout = useCallback(() => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    setToken("");
    setName("");
    setLoggedIn(false);
  }, []);

  useEffect(() => {
    // If the server forgets the token (for example after a restart), go back to the login page.
    setUnauthorizedHandler(() => {
      setToken("");
      setName("");
      setLoggedIn(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    const r = await api<{ token: string; user: { name: string } }>("/auth/login", {
      method: "POST",
      body: { email, password, role: "admin" },
    });
    setToken(r.token);
    setName(r.user.name || "Admin");
    setLoggedIn(true);
  };

  return <AuthContext.Provider value={{ isLoggedIn, name, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
