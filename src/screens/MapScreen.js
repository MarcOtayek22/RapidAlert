import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function MapScreen() {
  return (
    <Screen>
      <Header
        title="🗺️ Map"
        subtitle="Live incidents nearby (placeholder)"
        left={<Ionicons name="location" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Chip icon="pulse" text="Live feed" tone="danger" />
        <Chip icon="locate" text="Nearby" />
        <Chip icon="shield-checkmark" text="Verified" />
      </View>

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "800", fontSize: 16 }}>
          📍 Map will go here
        </Text>
        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
          Next: add location permissions + markers.
        </Text>
      </Card>
    </Screen>
  );
}
