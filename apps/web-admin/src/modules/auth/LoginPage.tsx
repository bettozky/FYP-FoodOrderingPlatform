import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (isLoggedIn) return <Navigate to="/" replace />;
  return (
    <form
      className="login"
      onSubmit={(e) => {
        e.preventDefault();
        login(email.split("@")[0]);
      }}
    >
      <h1>ScootMeal Admin</h1>
      <label htmlFor="admin-email">Admin email</label>
      <input id="admin-email" placeholder="Admin email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <label htmlFor="admin-password">Password</label>
      <input id="admin-password" placeholder="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" type="submit">Sign in</button>
    </form>
  );
}
