import React from "react";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GradientBackground from "./GradientBackground";
import { theme } from "../theme/theme";

export default function Screen({ children, style, noPadding }) {
  return (
    <GradientBackground>
      <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1 }}>
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            {
              padding: noPadding ? 0 : theme.spacing(2),
              paddingBottom: theme.spacing(12), // space for tab bar
              gap: theme.spacing(2),
            },
            style,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    </GradientBackground>
  );
}

