import React, { createContext, useContext, useState } from "react";

type Role = "customer" | "merchant";

type AuthContextValue = {
  isLoggedIn: boolean;
  name: string;
  role: Role;
  login: (name: string) => void;
  logout: () => void;
  setRole: (role: Role) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("customer");

  const login = (n: string) => {
    setName(n || "Badrul");
    setIsLoggedIn(true);
  };
  const logout = () => {
    setIsLoggedIn(false);
    setRole("customer");
  };

  return (
    <AuthContext.Provider value={{ isLoggedIn, name, role, login, logout, setRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
