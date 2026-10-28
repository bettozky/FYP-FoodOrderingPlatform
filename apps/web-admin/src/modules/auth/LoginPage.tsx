import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function LoginPage() {
  const { isLoggedIn, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (isLoggedIn) return <Navigate to="/" replace />;
  return (
    <form
      className="login"
      onSubmit={async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        try {
          await login(email.trim(), password);
        } catch (err) {
          setError((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h1>ScootMeal Admin</h1>
      <input placeholder="Admin email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="error">{error}</p>}
      <button className="btn" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
