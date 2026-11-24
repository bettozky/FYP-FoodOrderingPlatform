import { useCallback, useEffect, useState } from "react";
import { api } from "../../shared/api/client";
import { useAuth } from "../auth/AuthContext";
import { EMPTY_DIET, type DietProfile } from "./diet";

// The saved diet profile, shared by every screen without a provider: one copy in this module, loaded once per login.
let current: DietProfile | null = null;
let loadedFor = "";
const listeners = new Set<(p: DietProfile | null) => void>();
const publish = (p: DietProfile | null) => { current = p; listeners.forEach((l) => l(p)); };

export function useDiet() {
  const { user } = useAuth();
  const [diet, setDiet] = useState<DietProfile | null>(current);

  useEffect(() => {
    listeners.add(setDiet);
    return () => { listeners.delete(setDiet); };
  }, []);

  useEffect(() => {
    const id = user?.id ?? "";
    if (!id) { loadedFor = ""; publish(null); return; }
    if (loadedFor === id) { setDiet(current); return; }
    loadedFor = id;
    api<{ diet: DietProfile }>("GET", "/diet")
      .then((r) => publish(r.diet ?? EMPTY_DIET))
      .catch(() => { loadedFor = ""; });
  }, [user?.id]);

  const save = useCallback(async (p: DietProfile) => {
    const r = await api<{ diet: DietProfile }>("PUT", "/diet", p);
    publish(r.diet);
  }, []);

  return { diet, save };
}
