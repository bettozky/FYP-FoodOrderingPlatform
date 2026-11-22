// The restaurant's seating plan used when allocating a table to a reservation.
// (A per-restaurant floor plan editor is a later feature.)
import i18n from "./i18n";

// The name follows the app language ("Table 1 (2 Pax)" / "Meja 1 (2 orang)" / "1 号桌（2 人）"); the id is what the server stores.
const table = (id: string, n: number, pax: number) => ({ id, capacity: pax, get name() { return i18n.t("tables.table", { n, pax }); } });
export const RESTAURANT_TABLES = [
  table("T-01", 1, 2),
  table("T-02", 2, 2),
  table("T-03", 3, 4),
  table("T-04", 4, 4),
  table("T-05", 5, 6),
  { id: "VIP-A", capacity: 8, get name() { return i18n.t("tables.vip", { room: "A", pax: 8 }); } },
];
