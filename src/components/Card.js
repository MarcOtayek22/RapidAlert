import React from "react";
import { View } from "react-native";
import { theme } from "../theme/theme";

export default function Card({ children, style, strong }) {
  return (
    <View
      style={[
        {
          backgroundColor: strong ? theme.colors.cardStrong : theme.colors.card,
          borderRadius: theme.radius.xl,
          borderWidth: 1,
          borderColor: theme.colors.border,
          padding: theme.spacing(2),
          ...theme.shadow.soft,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
