import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

export default function GradientBackground({ children }) {
  const sweep = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 420, useNativeDriver: true }).start();

    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(sweep, { toValue: 1, duration: 4200, useNativeDriver: true }),
        Animated.timing(sweep, { toValue: 0, duration: 4200, useNativeDriver: true }),
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [sweep, fade]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 120] });
  const sweepOpacity = sweep.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.14] });

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg0 }}>
      {/* Base gradient */}
      <LinearGradient
        colors={[theme.colors.bg0, theme.colors.bg1, theme.colors.bg0]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ ...StyleSheet.absoluteFillObject }}
      />

      {/* Subtle red tint (corner wash, not bubbles) */}
      <LinearGradient
        colors={["rgba(255,59,48,0.14)", "rgba(255,59,48,0.00)"]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 0.9 }}
        style={{ ...StyleSheet.absoluteFillObject }}
      />

      {/* Grid overlay */}
      <View pointerEvents="none" style={{ ...StyleSheet.absoluteFillObject, opacity: 0.12 }}>
        {Array.from({ length: 18 }).map((_, i) => (
          <View
            key={`h-${i}`}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: i * 42,
              height: 1,
              backgroundColor: "rgba(255,255,255,0.10)",
            }}
          />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <View
            key={`v-${i}`}
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              left: i * 42,
              width: 1,
              backgroundColor: "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </View>

      {/* Light sweep */}
      <Animated.View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: -140,
          bottom: -140,
          left: "50%",
          width: 220,
          transform: [{ translateX }, { rotate: "12deg" }],
          opacity: sweepOpacity,
        }}
      >
        <LinearGradient
          colors={["rgba(255,255,255,0.00)", "rgba(255,255,255,0.45)", "rgba(255,255,255,0.00)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1 }}
        />
      </Animated.View>

      {/* Content fade in */}
      <Animated.View style={{ flex: 1, opacity: fade }}>{children}</Animated.View>
    </View>
  );
}

const StyleSheet = {
  absoluteFillObject: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
};
