import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function Chip({ icon, text, tone = "neutral" }) {
  const toneStyles = {
    neutral: {
      bg: "rgba(255,255,255,0.06)",
      border: "rgba(255,255,255,0.10)",
      icon: theme.colors.primary3,
    },
    danger: {
      bg: "rgba(255,59,48,0.12)",
      border: "rgba(255,59,48,0.22)",
      icon: theme.colors.primary,
    },
    success: {
      bg: "rgba(46,212,122,0.12)",
      border: "rgba(46,212,122,0.22)",
      icon: theme.colors.success,
    },
    warn: {
      bg: "rgba(255,176,32,0.12)",
      border: "rgba(255,176,32,0.22)",
      icon: theme.colors.warn,
    },
  };

  const t = toneStyles[tone] || toneStyles.neutral;

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: t.bg,
        borderWidth: 1,
        borderColor: t.border,
      }}
    >
      <Ionicons name={icon} size={16} color={t.icon} />
      <Text style={{ color: theme.colors.faint, fontWeight: "900", fontSize: 13 }}>
        {text}
      </Text>
    </View>
  );
}
