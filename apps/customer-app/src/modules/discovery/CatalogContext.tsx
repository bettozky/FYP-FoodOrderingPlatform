import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { Merchant } from "../../shared/api/types";
import { ADDRESS_PRESETS } from "../../shared/data/mockData";

export type Address = { label: string; line: string; lat: number; lng: number };

type CatalogValue = {
  merchants: Merchant[];
  merchantById: Record<string, Merchant>;
  address: Address;
  setAddress: (a: Address) => void;
  refreshMerchants: () => Promise<void>;
  loadError: string;
};

const CatalogContext = createContext<CatalogValue | undefined>(undefined);

/** Restaurants (with open/closed + distance from the chosen address) and the selected delivery address. */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [address, setAddress] = useState<Address>(ADDRESS_PRESETS[0]);
  const [loadError, setLoadError] = useState("");

  const refreshMerchants = useCallback(async () => {
    try {
      const r = await api<{ merchants: Merchant[] }>("GET", `/merchants?lat=${address.lat}&lng=${address.lng}`);
      setMerchants(r.merchants);
      setLoadError("");
    } catch (e: any) {
      setLoadError(e.message);
    }
  }, [address]);

  useEffect(() => {
    refreshMerchants();
    const t = setInterval(refreshMerchants, 30000); // open/closed status follows the clock (FR-1.6)
    return () => clearInterval(t);
  }, [refreshMerchants]);

  const merchantById = useMemo(() => Object.fromEntries(merchants.map((m) => [m.id, m])), [merchants]);

  return (
    <CatalogContext.Provider value={{ merchants, merchantById, address, setAddress, refreshMerchants, loadError }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
