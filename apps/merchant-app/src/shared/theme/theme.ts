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
  bodyMuted: { fontSize: 14, fontFamily: fonts.serif, color: colors.stone },
  small: { fontSize: 12, fontFamily: fonts.display, color: colors.stone },
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
