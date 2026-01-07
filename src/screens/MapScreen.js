import React from "react";
import { Text } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";

export default function MapScreen() {
  return (
    <Screen>
      <Header title="Map" subtitle="Live incidents nearby (placeholder)" />
      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
          Map will go here
        </Text>
        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
          Next: add location permissions + markers.
        </Text>
      </Card>
    </Screen>
  );
}
