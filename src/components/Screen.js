import React from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "./GradientBackground";
import { theme } from "../theme/theme";

export default function Screen({ children, style, noPadding }) {
  return (
    <GradientBackground>
      <SafeAreaView
        edges={["top", "left", "right"]}
        style={{ flex: 1 }}
      >
        <View
          style={[
            { flex: 1, padding: noPadding ? 0 : theme.spacing(2) },
            style,
          ]}
        >
          {children}
        </View>
      </SafeAreaView>
    </GradientBackground>
  );
}
