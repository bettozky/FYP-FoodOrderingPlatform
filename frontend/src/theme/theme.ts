// ScootMeal design tokens - single source of truth for colour/spacing/type
// so every screen looks like one system rather than a pile of one-offs.

export const colors = {
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F1ECE3",
  primary: "#E85D2C", // warm orange - appetite colour, ScootMeal brand
  primaryDark: "#C2481F",
  primarySoft: "#FDEAE1",
  secondary: "#1F6F5C", // deep green for accents/success
  secondarySoft: "#E3F2ED",
  text: "#241C15",
  textMuted: "#7C7267",
  textFaint: "#A79E93",
  border: "#EAE3D8",
  danger: "#C23B3B",
  warning: "#B8860B",
  white: "#FFFFFF",
  overlay: "rgba(36,28,21,0.45)",
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
  sm: 8,
  md: 14,
  lg: 20,
  pill: 999,
};

export const type = {
  h1: { fontSize: 26, fontWeight: "800" as const, color: colors.text },
  h2: { fontSize: 20, fontWeight: "700" as const, color: colors.text },
  h3: { fontSize: 16, fontWeight: "700" as const, color: colors.text },
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.text },
  bodyMuted: { fontSize: 14, fontWeight: "400" as const, color: colors.textMuted },
  small: { fontSize: 12, fontWeight: "500" as const, color: colors.textMuted },
  price: { fontSize: 16, fontWeight: "800" as const, color: colors.text },
};

export const shadow = {
  card: {
    shadowColor: "#241C15",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
};
