import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer, DarkTheme } from "@react-navigation/native";
import RootNavigator from "./src/navigation/RootNavigator";
import { theme } from "./src/theme/theme";

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.colors.bg0,
    card: theme.colors.bg0,
    text: theme.colors.text,
    border: theme.colors.border,
    primary: theme.colors.primary,
    notification: theme.colors.danger,
  },
};

export default function App() {
  return (
    <>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <RootNavigator />
      </NavigationContainer>
    </>
  );
}
