import { normalisePhone, PickedFile, ShopApplication } from "./types";
import i18n from "../../../shared/i18n";

const v = (k: string, opts?: Record<string, unknown>) => i18n.t(`val.${k}` as "val.ownerName", opts as any) as string;

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
  if (!allowed.includes(f.mimeType.toLowerCase())) return kind === "image" ? v("jpgPng") : v("pdfJpgPng");
  if (f.size > MAX_FILE_BYTES) return v("tooBig");
  return "";
}

const money = (s: string) => /^\d{1,4}(\.\d{1,2})?$/.test(s.trim()) && Number(s) > 0;

/** `filesRequired` is false on devices where file choosing is not switched on yet (see pickFile.native.ts). */
export function validateStep(step: number, a: ShopApplication, filesRequired = true): Errors {
  const e: Errors = {};
  switch (step) {
    case 0:
      if (!a.ownerName.trim()) e.ownerName = v("ownerName");
      else if (a.ownerName.trim().length > 80) e.ownerName = v("nameLong");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email.trim())) e.email = v("email");
      if (!isMalaysianPhone(a.phone)) e.phone = v("phone");
      if (a.password.length < 6) e.password = v("password");
      else if (a.password !== a.passwordConfirm) e.passwordConfirm = v("passwordMatch");
      break;
    case 1:
      if (!a.shopName.trim()) e.shopName = v("shopName");
      else if (a.shopName.trim().length > 80) e.shopName = v("shopLong");
      if (!a.businessType) e.businessType = v("businessType");
      if (!isSsmNumber(a.ssmNumber)) e.ssmNumber = v("ssm");
      if (!a.description.trim()) e.description = v("description");
      else if (a.description.trim().length > 160) e.description = v("descLong");
      if (!a.ssmCertificate) { if (filesRequired) e.ssmCertificate = v("ssmFile"); }
      else if (fileProblem(a.ssmCertificate, "document")) e.ssmCertificate = fileProblem(a.ssmCertificate, "document");
      break;
    case 2:
      if (!a.address.trim()) e.address = v("address");
      else if (a.address.trim().length > 80) e.address = v("addressLong");
      if (!a.lat.trim() || !a.lng.trim()) e.pin = v("pin");
      else { const bad = pinProblem(a.lat, a.lng); if (bad) e.pin = bad; }
      break;
    case 3:
      if (!a.cuisine.trim()) e.cuisine = v("cuisine");
      // The current server stores this in a 40-character field.
      else if (a.cuisine.trim().length > 40) e.cuisine = v("cuisineLong");
      if (!a.priceRange) e.priceRange = v("priceRange");
      if (a.halal === null) e.halal = v("halal");
      if (a.halal === true) {
        if (!a.halalCertificate) { if (filesRequired) e.halalCertificate = v("halalFile"); }
        else if (fileProblem(a.halalCertificate, "document")) e.halalCertificate = fileProblem(a.halalCertificate, "document");
      }
      break;
    case 4:
      if (a.hours.every((h) => h.closed)) e.hours = v("oneDay");
      for (const h of a.hours) {
        if (h.closed) continue;
        if (!TIME.test(h.open) || !TIME.test(h.close)) { e.hours = v("time24"); break; }
        if (h.open >= h.close) { e.hours = v("closeAfter"); break; }
      }
      if (!a.delivery && !a.pickup && !a.dineIn) e.service = v("service");
      if (a.dineIn && !/^\d{1,4}$/.test(a.seats.trim())) e.seats = v("seats");
      if (!/^\d{1,3}$/.test(a.prepMinutes.trim()) || Number(a.prepMinutes) < 1) e.prepMinutes = v("prep");
      if (a.minOrder.trim() && !money(a.minOrder)) e.minOrder = v("minOrder");
      break;
    case 5:
      if (!a.noAllergens && a.allergens.length === 0) e.allergens = v("allergens");
      if (!a.licenceNo.trim()) e.licenceNo = v("licence");
      break;
    case 6:
      if (!a.logo) { if (filesRequired) e.logo = v("logo"); }
      else if (fileProblem(a.logo, "image")) e.logo = fileProblem(a.logo, "image");
      if (!a.cover) { if (filesRequired) e.cover = v("cover"); }
      else if (fileProblem(a.cover, "image")) e.cover = fileProblem(a.cover, "image");
      a.menuItems.forEach((m, i) => {
        const n = i + 1;
        if (!m.name.trim()) e[`menu${i}`] = v("dishName", { n });
        else if (!money(m.price)) e[`menu${i}`] = v("dishPrice", { n });
        else if (!m.description.trim()) e[`menu${i}`] = v("dishDesc", { n });
        else if (!m.photo) { if (filesRequired) e[`menu${i}`] = v("dishPhoto", { n }); }
        else if (fileProblem(m.photo, "image")) e[`menu${i}`] = v("dishFile", { n, problem: fileProblem(m.photo, "image") });
      });
      if (a.menuItems.length < 3) e.menu = v("menu3");
      break;
    case 7:
      if (!a.agreedTerms) e.agreedTerms = v("terms");
      break;
  }
  return e;
}

/** First step (0-7) that still has a problem, or -1 when the whole application is complete. */
export function firstIncompleteStep(a: ShopApplication, filesRequired = true): number {
  for (let i = 0; i < 8; i++) if (Object.keys(validateStep(i, a, filesRequired)).length) return i;
  return -1;
}

/** Why a latitude / longitude pair cannot be used, or "" when it is fine. Shared by the form and the pin card. */
export function pinProblem(lat: string, lng: string): string {
  const la = Number(lat.trim()), lo = Number(lng.trim());
  if (!Number.isFinite(la) || lat.trim() === "") return v("latNumber");
  if (!Number.isFinite(lo) || lng.trim() === "") return v("lngNumber");
  if (Math.abs(la) > 90) return v("latRange");
  if (Math.abs(lo) > 180) return v("lngRange");
  return "";
}
