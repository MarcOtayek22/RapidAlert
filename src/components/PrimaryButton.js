import React, { useMemo, useRef } from "react";
import { Pressable, Text, View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

export default function PrimaryButton({ title, onPress, icon, style, disabled }) {
  const scale = useRef(new Animated.Value(1)).current;

  const animateTo = (to) => {
    Animated.spring(scale, {
      toValue: to,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  const grad = useMemo(() => [theme.colors.primary, theme.colors.primary2], []);

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => !disabled && animateTo(0.97)}
      onPressOut={() => !disabled && animateTo(1)}
      style={{ opacity: disabled ? 0.55 : 1 }}
    >
      <Animated.View
        style={[
          { transform: [{ scale }], borderRadius: theme.radius.xl, overflow: "hidden" },
          style,
        ]}
      >
        <LinearGradient
          colors={grad}
          start={{ x: 0.05, y: 0 }}
          end={{ x: 0.95, y: 1 }}
          style={{
            paddingVertical: 14,
            paddingHorizontal: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 10,
          }}
        >
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: -30,
              left: -40,
              width: 120,
              height: 120,
              borderRadius: 999,
              backgroundColor: "rgba(255,255,255,0.16)",
            }}
          />

          {icon ? (
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                backgroundColor: "rgba(0,0,0,0.16)",
                alignItems: "center",
                justifyContent: "center",
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.14)",
              }}
            >
              {icon}
            </View>
          ) : null}

          <Text style={{ color: "white", fontSize: 15, fontWeight: "900", letterSpacing: 0.2 }}>
            {title}
          </Text>
        </LinearGradient>
      </Animated.View>
    </Pressable>
  );
}
