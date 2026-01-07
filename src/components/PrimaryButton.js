import React from "react";
import { Pressable, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

export default function PrimaryButton({ title, onPress, icon, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        {
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          borderRadius: theme.radius.xl,
          overflow: "hidden",
        },
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.primary2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingVertical: 14,
          paddingHorizontal: 16,
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          gap: 10,
        }}
      >
        {icon ? <View>{icon}</View> : null}
        <Text style={{ color: "white", fontSize: 15, fontWeight: "800" }}>
          {title}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}
