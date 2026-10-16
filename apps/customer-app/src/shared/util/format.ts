import { useEffect, useState } from "react";
import { serverTime } from "../api/client";

export const rm = (n: number) => `RM ${n.toFixed(2)}`;

/** Seconds left until `deadline` (server epoch ms), ticking every second. */
export function useCountdown(deadline?: number): number {
  const calc = () => (deadline ? Math.max(0, Math.ceil((deadline - serverTime()) / 1000)) : 0);
  const [s, setS] = useState(calc);
  useEffect(() => {
    setS(calc());
    const t = setInterval(() => setS(calc()), 1000);
    return () => clearInterval(t);
  }, [deadline]);
  return s;
}

export const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export const prettyDate = (d: string) =>
  new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
