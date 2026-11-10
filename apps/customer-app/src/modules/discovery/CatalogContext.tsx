import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as Location from "expo-location";
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
  /** The customer's live position (pinned as "My current location") while location sharing is on. */
  myLocation: Address | null;
  locating: boolean;
  locationError: string;
  startLiveLocation: () => Promise<void>;
  stopLiveLocation: () => void;
};

const CatalogContext = createContext<CatalogValue | undefined>(undefined);

// Until the shop list arrives the server measures distances from campus (its default).
export const MY_LOCATION_LABEL = "My location";
const MY_LOCATION_LINE = "My current location";

const CAMPUS_DEFAULT: Address = { label: "Campus", line: "Campus", lat: NaN, lng: NaN };

/** Restaurants (with open/closed + distance from the chosen address) and the selected address. */
export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [address, setAddress] = useState<Address>(CAMPUS_DEFAULT);
  const [saved, setSaved] = useState<Address[]>([]);
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [loadError, setLoadError] = useState("");
  const [myLocation, setMyLocation] = useState<Address | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState("");
  const watchRef = useRef<{ remove: () => void } | null>(null);

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
  const addresses = useMemo(
    () => [...(myLocation ? [myLocation] : []), ...saved, ...places.filter((p) => !saved.some((s) => s.line === p.line))],
    [myLocation, saved, places]
  );

  // Live location: pin the customer's real position and keep it current while they move (only when they turn it on).
  const applyPosition = useCallback((lat: number, lng: number, select = false) => {
    const here: Address = { label: MY_LOCATION_LABEL, line: MY_LOCATION_LINE, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    setMyLocation(here);
    setAddress((cur) => {
      if (cur.label !== MY_LOCATION_LABEL) return select ? here : cur;
      // Ignore tiny GPS jitter (under about 20 m) so the stall list does not reshuffle for nothing.
      const moved = Math.hypot((cur.lat - here.lat) * 111000, (cur.lng - here.lng) * 111000 * Math.cos((here.lat * Math.PI) / 180));
      return moved < 20 ? cur : here;
    });
  }, []);
  const stopLiveLocation = useCallback(() => {
    watchRef.current?.remove();
    watchRef.current = null;
    setMyLocation(null);
    setLocating(false);
    setAddress((cur) => (cur.label === MY_LOCATION_LABEL ? CAMPUS_DEFAULT : cur));
  }, []);
  const startLiveLocation = useCallback(async () => {
    setLocationError("");
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status !== "granted") throw new Error("Allow location access in your browser or phone settings, then try again.");
      const first = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      applyPosition(first.coords.latitude, first.coords.longitude, true);
      watchRef.current?.remove();
      watchRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 20, timeInterval: 5000 },
        (pos) => applyPosition(pos.coords.latitude, pos.coords.longitude)
      );
    } catch (e: any) {
      setLocationError(e?.message || "Could not get your location. Check that location is on.");
    } finally {
      setLocating(false);
    }
  }, [applyPosition]);
  // Stop watching on logout / unmount.
  useEffect(() => () => { watchRef.current?.remove(); }, []);
  useEffect(() => { if (!userId) stopLiveLocation(); }, [userId, stopLiveLocation]);

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
    <CatalogContext.Provider value={{ merchants, merchantById, saved, saveAddress, updateAddress, deleteAddress, addresses, places, address, setAddress, refreshMerchants, loadError, myLocation, locating, locationError, startLiveLocation, stopLiveLocation }}>
      {children}
    </CatalogContext.Provider>
  );
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
