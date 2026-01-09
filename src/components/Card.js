import React from "react";
import { View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

export default function Card({ children, style, strong }) {
  return (
    <View
      style={[
        {
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: strong ? "rgba(255,59,48,0.26)" : theme.colors.border,
          overflow: "hidden",
          ...theme.shadow.soft,
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[
          strong ? "rgba(255,59,48,0.12)" : "rgba(255,255,255,0.08)",
          strong ? "rgba(255,255,255,0.08)" : theme.colors.card,
          strong ? "rgba(255,255,255,0.06)" : theme.colors.card,
        ]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ padding: theme.spacing(2) }}
      >
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: theme.radius.xl,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.06)",
          }}
        />
        {children}
      </LinearGradient>
    </View>
  );
}
