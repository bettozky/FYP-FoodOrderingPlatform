import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useAuth } from "../auth/AuthContext";

// The customer's weekly budget (null = none), shared by Account → Spending and Checkout without a provider.
let current: number | null = null;
let loadedFor = "";
const listeners = new Set<(b: number | null) => void>();
const publish = (b: number | null) => { current = b; listeners.forEach((l) => l(b)); };

export function useBudget() {
  const { user } = useAuth();
  const [budget, setBudget] = useState<number | null>(current);

  useEffect(() => {
    listeners.add(setBudget);
    return () => { listeners.delete(setBudget); };
  }, []);

  useEffect(() => {
    const id = user?.id ?? "";
    if (!id) { loadedFor = ""; publish(null); return; }
    if (loadedFor === id) { setBudget(current); return; }
    loadedFor = id;
    api<{ weeklyBudget: number | null }>("GET", "/budget")
      .then((r) => publish(r.weeklyBudget ?? null))
      .catch(() => { loadedFor = ""; });
  }, [user?.id]);

  const save = useCallback(async (weeklyBudget: number | null) => {
    const r = await api<{ weeklyBudget: number | null }>("PUT", "/budget", { weeklyBudget });
    publish(r.weeklyBudget ?? null);
  }, []);

  return { budget, save };
}
