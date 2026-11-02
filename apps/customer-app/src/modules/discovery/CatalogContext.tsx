import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../../shared/api/client";
import { useAuth } from "../auth/AuthContext";
import { Merchant } from "../../shared/api/types";
import { Address, addressesFromShops } from "./places";
import { keepIfSame } from "../../shared/util/same";

export type { Address } from "./places";

type CatalogValue = {
  merchants: Merchant[];
  merchantById: Record<string, Merchant>;
  /** The customer's own saved addresses (stored on the server), default first. */
  saved: Address[];
  saveAddress: (a: { label: string; line: string; lat: number; lng: number; note?: string; isDefault?: boolean }) => Promise<Address>;
  updateAddress: (id: string, patch: Partial<Pick<Address, "label" | "line" | "lat" | "lng" | "note" | "isDefault">>) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  /** Saved addresses first, then places built from where the real shops are (one per canteen / venue). */
  addresses: Address[];
  /** Only the shop places (used as map "pin near" choices). */
  places: Address[];
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
  const [saved, setSaved] = useState<Address[]>([]);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loadError, setLoadError] = useState("");

  const refreshMerchants = useCallback(async () => {
    try {
      const near = Number.isFinite(address.lat) ? `?lat=${address.lat}&lng=${address.lng}` : "";
      const r = await api<{ merchants?: Merchant[] }>("GET", `/merchants${near}`);
      // A wrong EXPO_PUBLIC_API_URL (e.g. missing "http://") gets a reply that is not the shop list.
      if (!Array.isArray(r.merchants)) throw new Error("The server address looks wrong. Set EXPO_PUBLIC_API_URL to http://<your-PC-IP>:3001.");
      setMerchants((p) => keepIfSame(p, r.merchants!));
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
  const places = useMemo(() => addressesFromShops(merchants), [placeKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const addresses = useMemo(() => [...saved, ...places.filter((p) => !saved.some((s) => s.line === p.line))], [saved, places]);

  // Load the customer's saved addresses after login (and clear them on logout). The default one becomes the selected address.
  useEffect(() => {
    setSaved([]);
    if (!userId) return;
    let alive = true;
    api<{ addresses?: Address[] }>("GET", "/addresses")
      .then((r) => {
        if (!alive || !Array.isArray(r.addresses)) return;
        setSaved(r.addresses);
        const def = r.addresses.find((a) => a.isDefault) ?? r.addresses[0];
        if (def) setAddress(def);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [userId]);

  const saveAddress: CatalogValue["saveAddress"] = async (input) => {
    const r = await api<{ address: Address }>("POST", "/addresses", input);
    const list = await api<{ addresses: Address[] }>("GET", "/addresses");
    setSaved(list.addresses);
    return r.address;
  };
  const updateAddress: CatalogValue["updateAddress"] = async (id, patch) => {
    await api("PATCH", `/addresses/${id}`, patch);
    const list = await api<{ addresses: Address[] }>("GET", "/addresses");
    setSaved(list.addresses);
    setAddress((cur) => (cur.id === id ? list.addresses.find((a) => a.id === id) ?? cur : cur));
  };
  const deleteAddress: CatalogValue["deleteAddress"] = async (id) => {
    await api("DELETE", `/addresses/${id}`);
    const list = await api<{ addresses: Address[] }>("GET", "/addresses");
    setSaved(list.addresses);
    setAddress((cur) => (cur.id === id ? list.addresses.find((a) => a.isDefault) ?? list.addresses[0] ?? places[0] ?? CAMPUS_DEFAULT : cur));
  };

  // Pick the first real place once the shops have loaded (when nothing else is selected).
  useEffect(() => {
    if (!Number.isFinite(address.lat) && addresses.length) setAddress(addresses[0]);
  }, [addresses, address.lat]);

  const merchantById = useMemo(() => Object.fromEntries(merchants.map((m) => [m.id, m])), [merchants]);

  return (
    <CatalogContext.Provider value={{ merchants, merchantById, saved, saveAddress, updateAddress, deleteAddress, addresses, places, address, setAddress, refreshMerchants, loadError }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
