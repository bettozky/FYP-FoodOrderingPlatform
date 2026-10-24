import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { Merchant } from "../../shared/api/types";
import { Address, addressesFromShops } from "./places";

export type { Address } from "./places";

type CatalogValue = {
  merchants: Merchant[];
  merchantById: Record<string, Merchant>;
  /** Places to order to, built from where the real shops are (one per canteen / venue). */
  addresses: Address[];
  address: Address;
  setAddress: (a: Address) => void;
  refreshMerchants: () => Promise<void>;
  loadError: string;
};

const CatalogContext = createContext<CatalogValue | undefined>(undefined);

// Until the shop list arrives the server measures distances from campus (its default).
const CAMPUS_DEFAULT: Address = { label: "Campus", line: "Campus", lat: NaN, lng: NaN };

/** Restaurants (with open/closed + distance from the chosen address) and the selected address. */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [address, setAddress] = useState<Address>(CAMPUS_DEFAULT);
  const [loadError, setLoadError] = useState("");

  const refreshMerchants = useCallback(async () => {
    try {
      const near = Number.isFinite(address.lat) ? `?lat=${address.lat}&lng=${address.lng}` : "";
      const r = await api<{ merchants?: Merchant[] }>("GET", `/merchants${near}`);
      // A wrong EXPO_PUBLIC_API_URL (e.g. missing "http://") gets a reply that is not the shop list.
      if (!Array.isArray(r.merchants)) throw new Error("The server address looks wrong. Set EXPO_PUBLIC_API_URL to http://<your-PC-IP>:3001.");
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

  // Shops rarely move, so only rebuild the places when the set of stall numbers changes.
  const placeKey = merchants.map((m) => `${m.id}:${m.stallNo}`).join("|");
  const addresses = useMemo(() => addressesFromShops(merchants), [placeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pick the first real place once the shops have loaded.
  useEffect(() => {
    if (!Number.isFinite(address.lat) && addresses.length) setAddress(addresses[0]);
  }, [addresses, address.lat]);

  const merchantById = useMemo(() => Object.fromEntries(merchants.map((m) => [m.id, m])), [merchants]);

  return (
    <CatalogContext.Provider value={{ merchants, merchantById, addresses, address, setAddress, refreshMerchants, loadError }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
