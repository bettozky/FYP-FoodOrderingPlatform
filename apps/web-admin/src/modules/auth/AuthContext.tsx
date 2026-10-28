import { createContext, useContext, useEffect, useState } from "react";
import { api, getToken, setToken } from "../../shared/api";

// FR-6.1: admin-only login through the backend (POST /api/auth/login with role "admin").
// The token is kept in localStorage so a page refresh stays signed in.
type AdminUser = { id: string; name: string; email: string; role: string };
type Session = { token: string; user: AdminUser };
type AuthValue = {
  isLoggedIn: boolean;
  checking: boolean;
  name: string;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [checking, setChecking] = useState(() => Boolean(getToken()));

  // Restores the session after a refresh. Server restarts clear tokens, so a 401 means log in again.
  useEffect(() => {
    if (!getToken()) return;
    api<{ user: AdminUser }>("/auth/me")
      .then((r) => (r.user.role === "admin" ? setUser(r.user) : setToken(null)))
      .catch(() => setToken(null))
      .finally(() => setChecking(false));
  }, []);

  const login = async (email: string, password: string) => {
    const s = await api<Session>("/auth/login", { method: "POST", body: { email, password, role: "admin" } });
    setToken(s.token);
    setUser(s.user);
  };
  const logout = () => {
    api("/auth/logout", { method: "POST" }).catch(() => {});
    setToken(null);
    setUser(null);
  };
  return (
    <AuthContext.Provider value={{ isLoggedIn: Boolean(user), checking, name: user?.name ?? "", login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
