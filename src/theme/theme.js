export const theme = {
  colors: {
    // backgrounds
    bg0: "#070B16", // deepest
    bg1: "#0B1430", // mid
    bg2: "#111827", // neutral dark slate
 // top glow

    // surfaces
    card: "rgba(255,255,255,0.06)",
    cardStrong: "rgba(255,255,255,0.10)",
    border: "rgba(255,255,255,0.12)",
    divider: "rgba(255,255,255,0.08)",

    // text
    text: "#EAF0FF",
    muted: "#A7B3CF",
    faint: "rgba(234,240,255,0.65)",

    // accents
    // accents
primary: "#FF3B30",    // iOS emergency red (🔥 VERY important)
primary2: "#FF6B6B",   // lighter red for gradients
danger: "#FF3B30",     // SAME as primary (intentional)

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
    // subtle iOS-like glow
    soft: {
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: 10 },
      elevation: 8,
    },
  },

  type: {
    h1: { fontSize: 30, fontWeight: "800", letterSpacing: -0.2 },
    h2: { fontSize: 22, fontWeight: "800" },
    body: { fontSize: 15, fontWeight: "500" },
    small: { fontSize: 13, fontWeight: "600" },
  },
};
