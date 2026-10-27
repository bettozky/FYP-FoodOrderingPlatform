// ScootMeal design tokens - v2 "bold market" look: clean white surfaces,
// near-black type/buttons, a punchy amber accent, circular food photography
// and a floating pill nav. Plus Jakarta Sans throughout.
//
// Token *names* are kept stable across the app's redesigns on purpose —
// screens reference fonts.display / colors.turmeric / colors.paper etc.
// rather than raw family strings or hex codes, so re-skinning the whole
// app is (mostly) just editing the values in this one file.

export const fonts = {
  display: "PlusJakartaSans_600SemiBold",
  displayBold: "PlusJakartaSans_700Bold",
  displayExtraBold: "PlusJakartaSans_800ExtraBold",
  serif: "PlusJakartaSans_400Regular",
  serifMedium: "PlusJakartaSans_500Medium",
  serifSemiBold: "PlusJakartaSans_600SemiBold",
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
  overlay: "rgba(21,19,15,0.5)",

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

  // semantic aliases so existing screens keep working unchanged
  surface: "#FFFFFF",
  surfaceAlt: "#F4F1EA",
  text: "#15130F",
  textMuted: "#8C8880",
  textFaint: "#B8B3A6",
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

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  xl: 28,
  pill: 999,
};

export const type = {
  h1: { fontSize: 26, fontFamily: fonts.displayExtraBold, color: colors.ink, letterSpacing: -0.4 },
  h2: { fontSize: 19, fontFamily: fonts.displayBold, color: colors.ink, letterSpacing: -0.2 },
  h3: { fontSize: 15, fontFamily: fonts.display, color: colors.ink },
  body: { fontSize: 15, fontFamily: fonts.serif, color: colors.ink },
  bodyMuted: { fontSize: 14, fontFamily: fonts.serif, color: colors.stoneText },
  small: { fontSize: 12, fontFamily: fonts.display, color: colors.stoneText },
  price: { fontSize: 16, fontFamily: fonts.displayBold, color: colors.ink },
};

export const shadow = {
  card: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 3,
  },
  soft: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  sheet: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 4,
  },
  floating: {
    shadowColor: "#15130F",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 16,
    elevation: 6,
  },
};

// Shared building blocks for the new customer layout (cards, chips, buttons). Spread them into a
// StyleSheet: `card: { ...ui.card, padding: spacing.md }`. Only Nathan edits this file (team rule),
// so ask in the group chat if a screen needs a new one.
export const ui = {
  // White card with a hairline border, used for dish rows, info cards and order cards.
  card: { backgroundColor: colors.paper, borderRadius: radius.md, borderWidth: 1, borderColor: colors.stoneLine },
  // Floating white card (stall info card, rider card): no border, soft shadow.
  cardRaised: { backgroundColor: colors.paper, borderRadius: radius.lg, ...shadow.card },
  // Pill chips for filters, options and tabs. Active chip = ink background with white text.
  chip: { flexDirection: "row" as const, alignItems: "center" as const, gap: 6, minHeight: 34, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.stoneLine },
  chipOn: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontFamily: fonts.display, fontSize: 12.5, color: colors.ink },
  chipTextOn: { color: colors.white },
  // Small read-only info chip (rating, prep time, "Delivery"): tinted, no border.
  infoChip: { flexDirection: "row" as const, alignItems: "center" as const, gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: colors.paperDim },
  infoChipText: { fontFamily: fonts.display, fontSize: 12, color: colors.ink },
  // Main call to action: amber pill with ink text (one per screen).
  buttonAccent: { minHeight: 52, borderRadius: radius.pill, backgroundColor: colors.turmeric, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.xl },
  buttonAccentText: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink },
  // Secondary action: ink pill with white text (e.g. "Call", "Browse stalls").
  buttonDark: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.ink, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  buttonDarkText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.white },
  // Outline pill (e.g. "Chat").
  buttonOutline: { minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.paper, borderWidth: 1.5, borderColor: colors.stoneLine, alignItems: "center" as const, justifyContent: "center" as const, paddingHorizontal: spacing.lg },
  buttonOutlineText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.ink },
  // Round icon button on headers and photos (back, cart, heart).
  iconButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.paper, alignItems: "center" as const, justifyContent: "center" as const, ...shadow.soft },
  // Round amber "+" on dish cards.
  addButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.turmeric, alignItems: "center" as const, justifyContent: "center" as const },
  // Qty stepper (− 2 +) used on dish detail and cart.
  stepper: { flexDirection: "row" as const, alignItems: "center" as const, gap: spacing.sm, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.stoneLine, backgroundColor: colors.paper, paddingHorizontal: 6, minHeight: 44 },
  stepperButton: { width: 32, height: 32, borderRadius: 16, alignItems: "center" as const, justifyContent: "center" as const },
  stepperValue: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.ink, minWidth: 18, textAlign: "center" as const },
  // Prices: amber-brown so they pass contrast on the cream background.
  price: { fontFamily: fonts.displayBold, fontSize: 15, color: colors.amberText },
  priceLarge: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.amberText },
  // Section heading with an optional "See all" link on the right.
  sectionTitle: { fontFamily: fonts.displayBold, fontSize: 17, color: colors.ink },
  link: { fontFamily: fonts.displayBold, fontSize: 13, color: colors.amberText },
  // Dark bar pinned to the bottom ("2 items · RM 17.50  [View cart]").
  bottomBar: { flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "space-between" as const, backgroundColor: colors.ink, borderRadius: radius.pill, paddingLeft: spacing.lg, paddingRight: 6, minHeight: 56, ...shadow.floating },
  bottomBarText: { fontFamily: fonts.displayBold, fontSize: 14, color: colors.white },
};
