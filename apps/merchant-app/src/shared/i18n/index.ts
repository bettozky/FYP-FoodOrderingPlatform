// App languages: English, Bahasa Melayu and Chinese (i18next + react-i18next). Same set-up as the customer app.
//   - Words live in en.json / ms.json / zh.json under the same keys, e.g. "orders.accept".
//   - Screens call   const { t } = useTranslation();   then   t("orders.accept").
//   - Code outside React (contexts, helpers) uses   i18n.t("...").
//   - A key missing in ms.json or zh.json shows the English text instead of a blank.
//   - TypeScript checks every key against en.json, so a typo fails `npx tsc`.
// Only the app's own text is translated. Dish names, shop details, customer names and reviews stay as written.
// Server messages (errors, notifications) are still English for now.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import ms from "./ms.json";
import zh from "./zh.json";

export type Lang = "en" | "ms" | "zh";
export const LANGUAGES: { code: Lang; label: string; short: string }[] = [
  { code: "en", label: "English", short: "EN" },
  { code: "ms", label: "Bahasa Melayu", short: "BM" },
  { code: "zh", label: "中文", short: "中文" },
];
const CODES: Lang[] = ["en", "ms", "zh"];
const STORE_KEY = "scootmeal.merchant.language";

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (CODES as string[]).includes(v);

/** Browser storage on the web build; phones have none without an extra package, so they use the account's saved choice. */
function saved(): Lang | null {
  try {
    const v = (globalThis as any).localStorage?.getItem(STORE_KEY);
    return isLang(v) ? v : null;
  } catch {
    return null;
  }
}

/** The phone's or browser's own language, if it is one we have. */
function deviceLanguage(): Lang {
  try {
    const loc = String(Intl.DateTimeFormat().resolvedOptions().locale || "").toLowerCase();
    if (loc.startsWith("zh")) return "zh";
    if (loc.startsWith("ms") || loc.startsWith("id")) return "ms";
  } catch {}
  return "en";
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, ms: { translation: ms }, zh: { translation: zh } },
  lng: saved() ?? deviceLanguage(),
  fallbackLng: "en",
  supportedLngs: CODES,
  interpolation: { escapeValue: false }, // React already escapes text
});

export const currentLanguage = (): Lang => (isLang(i18n.language) ? i18n.language : "en");

/** Switch the whole app to another language (every screen redraws). Remembered in the browser on the web build. */
export function setLanguage(lang: Lang) {
  if (lang !== i18n.language) void i18n.changeLanguage(lang);
  try {
    (globalThis as any).localStorage?.setItem(STORE_KEY, lang);
  } catch {}
}

/** Locale for dates and numbers in the chosen language (Malaysian variants). */
export const locale = (): string => ({ en: "en-MY", ms: "ms-MY", zh: "zh-MY" })[currentLanguage()];

export default i18n;

// Type-checked keys: t("orders.accept") compiles, t("orders.acept") does not.
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}
