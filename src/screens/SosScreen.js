import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function SosScreen() {
  return (
    <Screen>
      <Header title="SOS" subtitle="Emergency alert (next: hold-to-send)" />

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          SOS is not active yet
        </Text>

        <View style={{ height: theme.spacing(1) }} />

        <Text style={{ color: theme.colors.faint }}>
          We will add: hold button → confirm → send location.
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Test SOS UI"
          onPress={() => {}}
          icon={<Ionicons name="radio" size={18} color="white" />}
        />
      </Card>
    </Screen>
  );
}
