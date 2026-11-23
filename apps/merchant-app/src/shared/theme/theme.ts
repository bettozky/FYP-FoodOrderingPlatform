// ScootMeal merchant design tokens - v3 "premium" pass (Nov 2026). The same brand palette and tokens as the
// customer app (turmeric, ink, herb, chili on warm cream), set in the platform's own typeface (SF Pro on iPhone,
// Roboto on Android) with calmer weights, a larger and more even type scale, softer shadows and shared
// building blocks (`ui`). The merchant app wears ink: dark cards for live numbers, ink for selection.
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

// Kept identical to the customer app's theme.ts so both apps share one palette.
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
  amberSoft: "#F3E4C4",
  amberTint: "#FDF1DA",
  chiliSoft: "#F1DAD6",
  stoneSoft: "#C9C4B6",
  turmericLight: "#FFC24D",
  herbBorder: "#CFE4D5",
  chiliBorder: "#F3CBC5",
  amberBorder: "#F6DFAF",
  /** Hairline separators inside grouped lists (a touch lighter than stoneLine). */
  hairline: "#EFEBE3",

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

/** Screen-level layout: side gutter, gap between sections, and the widest a content column grows on tablets. */
export const layout = {
  gutter: 20,
  section: 28,
  maxWidth: 720,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 20,
  xl: 28,
  pill: 999,
};

export const iconSize = { sm: 16, md: 20, lg: 24 };

const tabular = ["tabular-nums"] as TextStyle["fontVariant"];

// Type scale after Apple's text styles, sized for a busy counter: big numbers, clear labels.
export const type = {
  h1: { fontSize: 30, lineHeight: 36, ...font.displayExtraBold, color: colors.ink, letterSpacing: -0.6 },
  h2: { fontSize: 21, lineHeight: 26, ...font.displayExtraBold, color: colors.ink, letterSpacing: -0.3 },
  h3: { fontSize: 16, lineHeight: 21, ...font.displayBold, color: colors.ink, letterSpacing: -0.1 },
  body: { fontSize: 16, lineHeight: 22, ...font.serif, color: colors.ink },
  bodyMuted: { fontSize: 14, lineHeight: 20, ...font.serif, color: colors.stoneText },
  small: { fontSize: 13, lineHeight: 18, ...font.display, color: colors.stoneText },
  price: { fontSize: 16, ...font.displayBold, color: colors.ink, fontVariant: tabular },
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

// Shared building blocks (cards, chips, buttons). Spread them into a StyleSheet:
// `card: { ...ui.card, padding: spacing.md }`. Ask in the group chat before adding new ones.
export const ui = {
  // White card with a hairline border.
  card: { backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine },
  // White group for settings-style rows (iOS inset grouped list). Rows inside are separated by hairlines.
  group: { backgroundColor: colors.paper, borderRadius: radius.md, overflow: "hidden" as const },
  // Ink card for live numbers (today's orders, revenue).
  cardDark: { backgroundColor: colors.ink, borderRadius: radius.lg },
  // Pill chips for filters, options and tabs. Active chip = ink background with white text.
  chip: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, minHeight: 36, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { ...font.display, fontSize: 14, color: colors.ink },
  chipTextOn: { color: colors.white },
  // iOS segmented control: a grey track with the selected segment as a white pill.
  segTrack: { flexDirection: "row" as const, padding: 3, borderRadius: 12, backgroundColor: colors.paperDim },
  segItem: { flex: 1, alignItems: "center" as const, justifyContent: "center" as const, minHeight: 36, borderRadius: 9 },
  segItemOn: { backgroundColor: colors.paper, ...shadow.soft },
  segText: { ...font.display, fontSize: 14, color: colors.stoneText },
  segTextOn: { ...font.displayBold, color: colors.ink },
  // Main call to action: amber pill with ink text (one per screen).
  buttonAccent: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.turmeric, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.xl },
  buttonAccentText: { ...font.displayBold, fontSize: 16, color: colors.ink },
  // Secondary action: ink pill with white text.
  buttonDark: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  buttonDarkText: { ...font.displayBold, fontSize: 15, color: colors.white },
  // Outline pill.
  buttonOutline: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneSoft, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  buttonOutlineText: { ...font.displayBold, fontSize: 15, color: colors.ink },
  // Round icon button on headers (menu, back, notifications). 40px, with hit slop to reach 44.
  iconButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: "center" as const, justifyContent: "center" as const, ...shadow.soft },
  // Prices.
  price: { ...font.displayBold, fontSize: 16, color: colors.ink, fontVariant: tabular },
  // Section heading.
  sectionTitle: { ...font.displayExtraBold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  link: { ...font.displayBold, fontSize: 15, color: colors.amberText },
  // Grey search field (iOS style).
  searchField: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, minHeight: 44, borderRadius: 12, backgroundColor: colors.paperDim, paddingHorizontal: spacing.md },
  // Text input.
  input: { minHeight: 50, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine, backgroundColor: colors.paper, paddingHorizontal: spacing.lg, fontSize: 16, ...font.serif, color: colors.ink },
};
