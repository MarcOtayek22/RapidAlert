import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

export default function GradientBackground({ children }) {
  return (
    <LinearGradient
      colors={[theme.colors.bg2, theme.colors.bg1, theme.colors.bg0]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Soft “glow” overlays */}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -120,
          left: -120,
          width: 320,
          height: 320,
          borderRadius: 999,
          backgroundColor: "rgba(91,124,255,0.18)",
        }}
      />
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          bottom: -140,
          right: -140,
          width: 360,
          height: 360,
          borderRadius: 999,
          backgroundColor: "rgba(139,92,255,0.16)",
        }}
      />
      {children}
    </LinearGradient>
  );
}
