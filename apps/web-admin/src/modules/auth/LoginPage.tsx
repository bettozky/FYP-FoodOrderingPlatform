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
      <input placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
      <input placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      <button className="btn" type="submit">Sign in</button>
    </form>
  );
}
