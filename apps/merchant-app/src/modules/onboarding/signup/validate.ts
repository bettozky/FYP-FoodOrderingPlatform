import { normalisePhone, PickedFile, ShopApplication } from "./types";

// One function per step. Each returns a map of field -> message; an empty map means the step is complete.
export type Errors = Partial<Record<string, string>>;

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_FILE_BYTES = 2 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const DOC_TYPES = [...IMAGE_TYPES, "application/pdf"];

/** Malaysian mobile (01x) or landline (0x) numbers, written with or without +60, spaces or dashes. */
export function isMalaysianPhone(raw: string): boolean {
  const p = normalisePhone(raw);
  return /^\+601\d{8,9}$/.test(p) || /^\+60[3-9]\d{7,8}$/.test(p);
}

/** New SSM format is 12 digits (e.g. 202301012345); the old format is up to 7 digits plus a letter (e.g. 1234567-A). Either may be given. */
export function isSsmNumber(raw: string): boolean {
  const s = raw.trim().toUpperCase();
  return /^\d{12}(\s*\(\d{1,7}-?[A-Z]\))?$/.test(s) || /^\d{1,7}-?[A-Z]$/.test(s);
}

export function fileProblem(f: PickedFile | null, kind: "image" | "document"): string {
  if (!f) return "";
  const allowed = kind === "image" ? IMAGE_TYPES : DOC_TYPES;
  if (!allowed.includes(f.mimeType.toLowerCase())) return kind === "image" ? "Use a JPG or PNG photo." : "Use a PDF, JPG or PNG file.";
  if (f.size > MAX_FILE_BYTES) return "This file is bigger than 2 MB. Choose a smaller one.";
  return "";
}

const money = (s: string) => /^\d{1,4}(\.\d{1,2})?$/.test(s.trim()) && Number(s) > 0;

/** `filesRequired` is false on devices where file choosing is not switched on yet (see pickFile.native.ts). */
export function validateStep(step: number, a: ShopApplication, filesRequired = true): Errors {
  const e: Errors = {};
  switch (step) {
    case 0:
      if (!a.ownerName.trim()) e.ownerName = "Enter the shop owner's name.";
      else if (a.ownerName.trim().length > 80) e.ownerName = "Keep the name under 80 characters.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) e.email = "Enter a valid email address.";
      if (!isMalaysianPhone(a.phone)) e.phone = "Enter a valid Malaysian number, e.g. +60 12-345 6789.";
      if (a.password.length < 6) e.password = "Use at least 6 characters.";
      else if (a.password !== a.passwordConfirm) e.passwordConfirm = "Your passwords do not match.";
      break;
    case 1:
      if (!a.shopName.trim()) e.shopName = "Enter your shop name.";
      else if (a.shopName.trim().length > 80) e.shopName = "Keep the shop name under 80 characters.";
      if (!a.businessType) e.businessType = "Choose your business type.";
      if (!isSsmNumber(a.ssmNumber)) e.ssmNumber = "Enter your SSM number, e.g. 202301012345 or 1234567-A.";
      if (!a.description.trim()) e.description = "Add a short description.";
      else if (a.description.trim().length > 160) e.description = "Keep it under 160 characters.";
      if (!a.ssmCertificate) { if (filesRequired) e.ssmCertificate = "Upload your SSM certificate."; }
      else if (fileProblem(a.ssmCertificate, "document")) e.ssmCertificate = fileProblem(a.ssmCertificate, "document");
      break;
    case 2:
      if (!a.address.trim()) e.address = "Enter your address or stall number.";
      else if (a.address.trim().length > 80) e.address = "Keep the address under 80 characters.";
      if (!a.lat.trim() || !a.lng.trim()) e.pin = "Set the map pin so customers can find you.";
      else if (Math.abs(Number(a.lat)) > 90 || Math.abs(Number(a.lng)) > 180 || isNaN(Number(a.lat)) || isNaN(Number(a.lng))) e.pin = "That pin location is not valid.";
      break;
    case 3:
      if (!a.cuisine.trim()) e.cuisine = "Enter at least one cuisine type.";
      // The current server stores this in a 40-character field.
      else if (a.cuisine.trim().length > 40) e.cuisine = "Keep it under 40 characters, e.g. Noodles, Drinks.";
      if (!a.priceRange) e.priceRange = "Choose a price range.";
      if (a.halal === null) e.halal = "Tell customers whether your food is halal.";
      if (a.halal === true) {
        if (!a.halalCertificate) { if (filesRequired) e.halalCertificate = "Upload your halal certificate."; }
        else if (fileProblem(a.halalCertificate, "document")) e.halalCertificate = fileProblem(a.halalCertificate, "document");
      }
      break;
    case 4:
      if (a.hours.every((h) => h.closed)) e.hours = "Open on at least one day.";
      for (const h of a.hours) {
        if (h.closed) continue;
        if (!TIME.test(h.open) || !TIME.test(h.close)) { e.hours = "Use 24-hour times such as 09:00 and 21:00."; break; }
        if (h.open >= h.close) { e.hours = "Closing time must be after opening time."; break; }
      }
      if (!a.delivery && !a.pickup && !a.dineIn) e.service = "Turn on at least one way to get food.";
      if (a.dineIn && !/^\d{1,4}$/.test(a.seats.trim())) e.seats = "Enter the number of seats.";
      if (!/^\d{1,3}$/.test(a.prepMinutes.trim()) || Number(a.prepMinutes) < 1) e.prepMinutes = "Enter minutes, e.g. 15.";
      if (a.minOrder.trim() && !money(a.minOrder)) e.minOrder = "Enter an amount like 5.00, or leave it empty.";
      break;
    case 5:
      if (!a.licenceNo.trim()) e.licenceNo = "Enter your food hygiene or business licence number.";
      break;
    case 6:
      if (!a.logo) { if (filesRequired) e.logo = "Add your logo."; }
      else if (fileProblem(a.logo, "image")) e.logo = fileProblem(a.logo, "image");
      if (!a.cover) { if (filesRequired) e.cover = "Add a cover photo."; }
      else if (fileProblem(a.cover, "image")) e.cover = fileProblem(a.cover, "image");
      a.menuItems.forEach((m, i) => {
        const n = i + 1;
        if (!m.name.trim()) e[`menu${i}`] = `Dish ${n}: enter a name.`;
        else if (!money(m.price)) e[`menu${i}`] = `Dish ${n}: enter a price like 8.50.`;
        else if (!m.description.trim()) e[`menu${i}`] = `Dish ${n}: add a short description.`;
        else if (!m.photo) { if (filesRequired) e[`menu${i}`] = `Dish ${n}: add a real photo.`; }
        else if (fileProblem(m.photo, "image")) e[`menu${i}`] = `Dish ${n}: ${fileProblem(m.photo, "image")}`;
      });
      if (a.menuItems.length < 3) e.menu = "Add at least 3 dishes.";
      break;
    case 7:
      if (!a.agreedTerms) e.agreedTerms = "Tick the box to agree to the merchant terms.";
      break;
  }
  return e;
}

/** First step (0-7) that still has a problem, or -1 when the whole application is complete. */
export function firstIncompleteStep(a: ShopApplication, filesRequired = true): number {
  for (let i = 0; i < 8; i++) if (Object.keys(validateStep(i, a, filesRequired)).length) return i;
  return -1;
}
