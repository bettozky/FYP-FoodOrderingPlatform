import { createContext, useContext, useState } from "react";

// Placeholder admin sign-in (in memory). FR-6.1: replace with real admin-only
// login and role-based access from the backend auth module.
type AuthValue = { isLoggedIn: boolean; name: string; login: (name: string) => void; logout: () => void };

const AuthContext = createContext<AuthValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState("");
  const [isLoggedIn, setLoggedIn] = useState(false);
  const login = (n: string) => {
    setName(n || "Admin");
    setLoggedIn(true);
  };
  const logout = () => {
    setName("");
    setLoggedIn(false);
  };
  return <AuthContext.Provider value={{ isLoggedIn, name, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
