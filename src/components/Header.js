import React, { useEffect, useRef } from "react";
import { View, Text, Animated } from "react-native";
import { theme } from "../theme/theme";

export default function Header({ title, subtitle, right, left }) {
  const w = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(w, { toValue: 1, duration: 520, useNativeDriver: false }).start();
  }, [w]);

  const underlineWidth = w.interpolate({ inputRange: [0, 1], outputRange: [26, 64] });

  return (
    <View
      style={{
        marginBottom: theme.spacing(2),
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: theme.spacing(2),
      }}
    >
      <View style={{ flex: 1, flexDirection: "row", gap: 12, alignItems: "center" }}>
        {left ? (
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 16,
              backgroundColor: "rgba(255,59,48,0.14)",
              borderWidth: 1,
              borderColor: "rgba(255,59,48,0.24)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {left}
          </View>
        ) : null}

        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, ...theme.type.h1 }}>{title}</Text>

          <Animated.View
            style={{
              marginTop: 8,
              width: underlineWidth,
              height: 4,
              borderRadius: 99,
              backgroundColor: theme.colors.primary,
              opacity: 0.85,
            }}
          />

          {subtitle ? (
            <Text style={{ color: theme.colors.faint, marginTop: 10, ...theme.type.body }}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {right ? <View>{right}</View> : null}
    </View>
  );
}
