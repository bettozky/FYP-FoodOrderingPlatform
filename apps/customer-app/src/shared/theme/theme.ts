// ScootMeal design tokens - v3 "premium" pass (Nov 2026): the same brand palette (turmeric, ink, herb, chili
// on warm cream), set in the platform's own typeface (SF Pro on iPhone, Roboto on Android) with calmer weights,
// a larger and more even type scale, softer shadows and a few shared building blocks (`ui`).
//
// Token *names* are kept stable across the app's redesigns on purpose —
// screens reference font.display / colors.turmeric / colors.paper etc.
// rather than raw family strings or hex codes, so re-skinning the whole
// app is (mostly) just editing the values in this one file.
import { Platform, TextStyle } from "react-native";

/** The platform font stack. Native: the system font (SF Pro / Roboto). Web: the same fonts via CSS. */
const SYSTEM = Platform.select({
  ios: "System",
  android: "sans-serif",
  web: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  default: undefined,
}) as string;

type FontStyle = Pick<TextStyle, "fontFamily" | "fontWeight">;
const f = (fontWeight: TextStyle["fontWeight"]): FontStyle => ({ fontFamily: SYSTEM, fontWeight });

/**
 * Family + weight together. Spread it into a text style: `{ ...font.displayBold, fontSize: 15 }`.
 * The names are from the old Plus Jakarta Sans tokens; each now sits one weight lighter, because
 * SF and Roboto read heavier than Plus Jakarta Sans at the same weight.
 */
export const font = {
  display: f("500"),
  displayBold: f("600"),
  displayExtraBold: f("700"),
  serif: f("400"),
  serifMedium: f("500"),
  serifSemiBold: f("600"),
};

/** Family names only (kept for old call sites; prefer `font.*`, which also sets the weight). */
export const fonts = {
  display: SYSTEM,
  displayBold: SYSTEM,
  displayExtraBold: SYSTEM,
  serif: SYSTEM,
  serifMedium: SYSTEM,
  serifSemiBold: SYSTEM,
};

export const colors = {
  bg: "#FBFAF6",
  paper: "#FFFFFF",
  paperDim: "#F4F1EA",
  ink: "#15130F",
  turmeric: "#F5A623",
  turmericDeep: "#D9860B",
  chili: "#E8483A",
  herb: "#2F6F4E",
  herbLight: "#EAF3EC",
  stone: "#8C8880",
  stoneLine: "#ECE7DA",
  white: "#FFFFFF",
  overlay: "rgba(21,19,15,0.45)",

  // Darker tones of the same hues, used only for small TEXT so it meets 4.5:1 contrast
  // (colors.stone / turmericDeep / chili stay for icons, borders and large shapes).
  stoneText: "#6B675F",
  amberText: "#8A5200",
  chiliText: "#AE2A1F",

  // Soft tints, borders and light-on-dark tones used by status chips and cards (same in both apps).
  herbBorder: "#CFE4D5",
  chiliBorder: "#F3CBC5",
  amberBorder: "#F6DFAF",
  amberSoft: "#F3E4C4",
  amberTint: "#FDF1DA",
  chiliSoft: "#F1DAD6",
  stoneSoft: "#C9C4B6",
  turmericLight: "#FFC24D",
  /** Hairline separators inside grouped lists (a touch lighter than stoneLine). */
  hairline: "#EFEBE3",

  // Bright icon colours from the old Home category grid. The premium pass no longer uses them on Home;
  // kept so other screens that still reference them keep compiling. Icons and big shapes only.
  iconOrange: "#FF8A3D", iconOrangeTop: "#FFB070",
  iconRed: "#F2545B", iconRedTop: "#FF8A8F",
  iconGreen: "#2DB57A", iconGreenTop: "#63D6A2",
  iconPurple: "#8B6CF0", iconPurpleTop: "#B39DFF",
  iconBlue: "#3B9BF5", iconBlueTop: "#7CC0FF",
  iconPink: "#F06AA8", iconPinkTop: "#FF9CCB",
  iconTeal: "#1FB5B0", iconTealTop: "#5FD8D3",
  iconBrown: "#A9713F", iconBrownTop: "#CF9965",

  // semantic aliases so existing screens keep working unchanged
  surface: "#FFFFFF",
  surfaceAlt: "#F4F1EA",
  text: "#15130F",
  textMuted: "#8C8880",
  textFaint: "#A7A296",
  border: "#ECE7DA",
  danger: "#E8483A",
  warning: "#D9860B",
  primary: "#15130F",
  primaryDark: "#000000",
  primarySoft: "#F4F1EA",
  secondary: "#2F6F4E",
  secondarySoft: "#EAF3EC",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

/** Screen-level layout: side gutter, gap between sections, room left for the tab bar. */
export const layout = {
  gutter: 20,
  section: 28,
  tabBarClearance: 120,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const iconSize = { sm: 16, md: 20, lg: 24 };

// Type scale after Apple's text styles, sized for a dense food app:
// h1 = large title, h2 = title, h3 = headline, body, bodyMuted = subheadline, small = footnote.
export const type = {
  h1: { fontSize: 30, lineHeight: 36, ...font.displayExtraBold, color: colors.ink, letterSpacing: -0.6 },
  h2: { fontSize: 21, lineHeight: 26, ...font.displayExtraBold, color: colors.ink, letterSpacing: -0.3 },
  h3: { fontSize: 16, lineHeight: 21, ...font.displayBold, color: colors.ink, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 22, ...font.serif, color: colors.ink },
  bodyMuted: { fontSize: 14, lineHeight: 20, ...font.serif, color: colors.stoneText },
  small: { fontSize: 13, lineHeight: 18, ...font.display, color: colors.stoneText },
  price: { fontSize: 16, ...font.displayBold, color: colors.ink, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] },
};

// Ink-tinted shadows, kept quiet: depth should be felt, not seen.
export const shadow = {
  card: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  soft: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 1,
  },
  sheet: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  floating: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 6,
  },
};

// Shared building blocks for the customer layout (cards, chips, buttons). Spread them into a
// StyleSheet: `card: { ...ui.card, padding: spacing.md }`. Only Nathan edits this file (team rule),
// so ask in the group chat if a screen needs a new one.
export const ui = {
  // White card with a hairline border, used for dish rows, info cards and order cards.
  card: { backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine },
  // Floating white card (stall info card, rider card): no border, soft shadow.
  cardRaised: { backgroundColor: colors.paper, borderRadius: radius.lg, ...shadow.card },
  // White group for settings-style rows (iOS inset grouped list). Rows inside are separated by hairlines.
  group: { backgroundColor: colors.paper, borderRadius: radius.md, overflow: "hidden" as const },
  // Pill chips for filters, options and tabs. Active chip = ink background with white text.
  chip: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, minHeight: 36, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...font.display, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.white },
  // Small read-only info chip (rating, prep time, "Delivery"): tinted, no border.
  infoChip: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.paperDim },
  infoChipText: { ...font.display, fontSize: 13, color: colors.ink },
  // Main call to action: amber pill with ink text (one per screen).
  buttonAccent: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.turmeric, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.xl },
  buttonAccentText: { ...font.displayBold, fontSize: 16, color: colors.ink },
  // Secondary action: ink pill with white text (e.g. "Call", "Browse stalls").
  buttonDark: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  buttonDarkText: { ...font.displayBold, fontSize: 15, color: colors.white },
  // Outline pill (e.g. "Chat").
  buttonOutline: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  buttonOutlineText: { ...font.displayBold, fontSize: 15, color: colors.ink },
  // Round icon button on headers and photos (back, cart, heart). 40px, with hit slop to reach 44.
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: "center" as const, justifyContent: "center" as const, ...shadow.soft },
  // Round amber "+" on dish cards.
  addButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.turmeric, alignItems: "center" as const, justifyContent: "center" as const },
  // Qty stepper (− 2 +) used on dish detail and cart.
  stepper: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.stoneLine, backgroundColor: colors.paper, paddingHorizontal: 6, minHeight: 44 },
  stepperButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const },
  stepperValue: { ...font.displayBold, fontSize: 16, color: colors.ink, minWidth: 18, textAlign: "center" as const, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] },
  // Prices: amber-brown so they pass contrast on the cream background.
  price: { ...font.displayBold, fontSize: 16, color: colors.amberText, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] },
  priceLarge: { ...font.displayExtraBold, fontSize: 28, color: colors.amberText, letterSpacing: -0.4, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] },
  // Section heading with an optional "See all" link on the right.
  sectionTitle: { ...font.displayExtraBold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  link: { ...font.displayBold, fontSize: 15, color: colors.amberText },
  // Grey search field (iOS style) used on Home, the stall menu and anywhere else that searches.
  searchField: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, minHeight: 44, borderRadius: 12, backgroundColor: colors.paperDim, paddingHorizontal: spacing.md },
  // Dark bar pinned to the bottom ("2 items · RM 17.50  [View cart]").
  bottomBar: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, backgroundColor: colors.ink, borderRadius: radius.pill, paddingLeft: spacing.lg, paddingRight: 6, minHeight: 56, ...shadow.floating },
  bottomBarText: { ...font.displayBold, fontSize: 15, color: colors.white },
};
