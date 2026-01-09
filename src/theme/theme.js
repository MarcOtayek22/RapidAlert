export const theme = {
  colors: {
    bg0: "#07060A",
    bg1: "#0B0810",
    bg2: "#14101C",

    card: "rgba(255,255,255,0.06)",
    cardStrong: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.12)",
    divider: "rgba(255,255,255,0.08)",

    text: "#F4F6FF",
    muted: "#B7BFD6",
    faint: "rgba(244,246,255,0.70)",

    primary: "#FF3B30",
    primary2: "#FF6B6B",
    primary3: "#FFB3B3",

    danger: "#FF3B30",
    success: "#2ED47A",
    warn: "#FFB020",
  },

  spacing: (n) => n * 8,

  radius: {
    sm: 12,
    md: 16,
    lg: 22,
    xl: 28,
  },

  shadow: {
    soft: {
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },

  type: {
    h1: { fontSize: 30, fontWeight: "900", letterSpacing: -0.2 },
    h2: { fontSize: 20, fontWeight: "900", letterSpacing: -0.1 },
    body: { fontSize: 15, fontWeight: "700" },
    small: { fontSize: 13, fontWeight: "800" },
  },
};
