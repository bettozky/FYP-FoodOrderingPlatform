// Shop sign-up (FR-5.1): the 8 sections from the task plan, section 7.
// The wizard keeps everything in one ShopApplication object, then turns it into
// the request body with toSignupRequest(). See ../README.md for the field list David maps to tables.

export type PickedFile = {
  name: string;
  size: number; // bytes
  mimeType: string; // image/jpeg, image/png or application/pdf
  uri: string; // local URI (native) or object URL (web), used for previews only
  file?: unknown; // the browser File object on web, used for upload
};

export type BusinessType = "stall" | "cafe" | "restaurant" | "home_kitchen";
export const BUSINESS_TYPES: { key: BusinessType; label: string }[] = [
  { key: "stall", label: "Stall" },
  { key: "cafe", label: "Cafe" },
  { key: "restaurant", label: "Restaurant" },
  { key: "home_kitchen", label: "Home kitchen" },
];

export type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export const DAYS: { key: DayKey; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];
export type DayHours = { day: DayKey; open: string; close: string; closed: boolean };

// The 9 common allergens (same names as backend/src/lib/allergens.ts), with local foods where they hide,
// so a stall owner recognises e.g. that kicap has soy and gluten, or that belacan counts as shellfish.
export const ALLERGENS = [
  { name: "Peanuts", examples: "kacang, satay sauce, rojak, peanut oil" },
  { name: "Tree nuts", examples: "cashew, almond, candlenut (buah keras)" },
  { name: "Shellfish", examples: "udang, crab, sotong, belacan, oyster sauce" },
  { name: "Fish", examples: "ikan bilis, fish sauce, fish ball, keropok" },
  { name: "Egg", examples: "telur, mayonnaise, egg noodles, kuih" },
  { name: "Milk", examples: "susu, condensed milk, butter, cheese, ghee" },
  { name: "Gluten", examples: "wheat flour, mee, roti, kicap, batter" },
  { name: "Soy", examples: "tauhu, tempeh, kicap, taucu, soy milk" },
  { name: "Sesame", examples: "bijan, sesame oil, sesame seeds" },
] as const;

export type MenuItemDraft = { name: string; price: string; description: string; photo: PickedFile | null; allergens: string[] };

export type ShopApplication = {
  // 1. Account
  ownerName: string;
  email: string;
  phone: string;
  password: string;
  passwordConfirm: string;
  // 2. Business
  shopName: string;
  businessType: BusinessType | null;
  ssmNumber: string;
  description: string;
  ssmCertificate: PickedFile | null;
  // 3. Location
  address: string;
  lat: string;
  lng: string;
  landmark: string;
  // 4. Food
  cuisine: string;
  priceRange: 1 | 2 | 3 | null;
  vegetarianOptions: boolean;
  halal: boolean | null;
  halalCertificate: PickedFile | null;
  // 5. Hours and service
  hours: DayHours[];
  delivery: boolean;
  pickup: boolean;
  dineIn: boolean;
  seats: string;
  prepMinutes: string;
  minOrder: string;
  // 6. Allergens and hygiene
  allergens: string[];
  noAllergens: boolean; // ticked "None of these" (so an empty list is a real answer, not a skipped question)
  licenceNo: string;
  // 7. Pictures
  logo: PickedFile | null;
  cover: PickedFile | null;
  menuItems: MenuItemDraft[];
  // 8. Review and agree
  agreedTerms: boolean;
};

export const emptyMenuItem = (): MenuItemDraft => ({ name: "", price: "", description: "", photo: null, allergens: [] });

export const emptyApplication = (): ShopApplication => ({
  ownerName: "", email: "", phone: "", password: "", passwordConfirm: "",
  shopName: "", businessType: null, ssmNumber: "", description: "", ssmCertificate: null,
  address: "", lat: "", lng: "", landmark: "",
  cuisine: "", priceRange: null, vegetarianOptions: false, halal: null, halalCertificate: null,
  hours: DAYS.map((d) => ({ day: d.key, open: "09:00", close: "21:00", closed: d.key === "sun" })),
  delivery: false, pickup: true, dineIn: false, seats: "", prepMinutes: "15", minOrder: "",
  allergens: [], noAllergens: false, licenceNo: "",
  logo: null, cover: null, menuItems: [emptyMenuItem(), emptyMenuItem(), emptyMenuItem()],
  agreedTerms: false,
});

export const STEPS = [
  { key: "account", title: "Account", description: "Who will manage this merchant account?" },
  { key: "business", title: "Business", description: "Tell us about your shop. Your SSM certificate is only seen by the admin." },
  { key: "location", title: "Location", description: "Where customers can find you." },
  { key: "food", title: "Food", description: "What you serve and how much it costs." },
  { key: "service", title: "Hours and service", description: "When you are open and how customers get their food." },
  { key: "hygiene", title: "Allergens and hygiene", description: "Customers with allergies see this on your shop page and dish pages." },
  { key: "pictures", title: "Pictures", description: "Real photos help customers choose. JPG or PNG, up to 2 MB each." },
  { key: "review", title: "Review and agree", description: "Check your answers, then send your shop for approval." },
] as const;

export type FileMeta = { name: string; size: number; mimeType: string };
const meta = (f: PickedFile | null): FileMeta | null => (f ? { name: f.name, size: f.size, mimeType: f.mimeType } : null);

/** Normalises a Malaysian phone number to +60 format, e.g. "012-345 6789" -> "+60123456789". */
export function normalisePhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, "");
  if (digits.startsWith("+60")) return digits;
  if (digits.startsWith("60")) return "+" + digits;
  if (digits.startsWith("0")) return "+6" + digits;
  return digits;
}

/**
 * Request body for POST /auth/register-merchant.
 * The top-level fields are what the current backend already reads, so sign-up keeps working today.
 * Everything new is under `application` for David's merchant tables (see README).
 * We never ask for IC numbers or bank details (privacy, task plan section 7).
 */
export function toSignupRequest(a: ShopApplication, filesPending = false) {
  const firstOpen = a.hours.find((h) => !h.closed) ?? a.hours[0];
  return {
    businessName: a.shopName.trim(),
    ownerName: a.ownerName.trim(),
    email: a.email.trim().toLowerCase(),
    phone: normalisePhone(a.phone),
    password: a.password,
    stallNo: a.address.trim(),
    cuisine: a.cuisine.trim(),
    open: firstOpen.open,
    close: firstOpen.close,
    application: {
      business: { type: a.businessType, ssmNumber: a.ssmNumber.trim(), description: a.description.trim() },
      location: {
        address: a.address.trim(),
        landmark: a.landmark.trim(),
        lat: a.lat.trim() ? Number(a.lat) : null,
        lng: a.lng.trim() ? Number(a.lng) : null,
      },
      food: {
        cuisines: a.cuisine.split(",").map((s) => s.trim()).filter(Boolean),
        priceRange: a.priceRange,
        vegetarianOptions: a.vegetarianOptions,
        halal: a.halal === true,
      },
      service: {
        hours: a.hours.map((h) => ({ day: h.day, open: h.closed ? null : h.open, close: h.closed ? null : h.close, closed: h.closed })),
        delivery: a.delivery,
        pickup: a.pickup,
        dineIn: a.dineIn,
        seats: a.dineIn ? Number(a.seats) : null,
        prepMinutes: Number(a.prepMinutes),
        minOrder: a.minOrder.trim() ? Number(a.minOrder) : 0,
      },
      hygiene: { allergens: a.noAllergens ? [] : a.allergens, noneUsed: a.noAllergens, licenceNo: a.licenceNo.trim() },
      // A dish can only contain allergens the kitchen uses (a shop allergen unticked later drops off its dishes too).
      menuItems: a.menuItems.map((m) => ({
        name: m.name.trim(), price: Number(m.price), description: m.description.trim(), photo: meta(m.photo),
        allergens: a.noAllergens ? [] : m.allergens.filter((x) => a.allergens.includes(x)),
      })),
      files: {
        ssmCertificate: meta(a.ssmCertificate),
        halalCertificate: a.halal ? meta(a.halalCertificate) : null,
        logo: meta(a.logo),
        cover: meta(a.cover),
      },
      // True when the merchant signed up on a phone without file choosing; the admin should ask for the files.
      filesPending,
      agreedTermsAt: new Date().toISOString(),
    },
  };
}
export type SignupRequest = ReturnType<typeof toSignupRequest>;
