import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function VolunteerApplyScreen({ navigation }) {
  return (
    <Screen>
      <Header
        title="🫶 Volunteer Application"
        subtitle="Phase 1 placeholder: upload docs + submit (no backend yet)"
        left={<Ionicons name="document-text" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Chip icon="id-card" text="Identity" />
        <Chip icon="attach" text="Documents" />
        <Chip icon="send" text="Submit" tone="success" />
      </View>

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          📄 Required Documents (placeholder)
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 10 }}>• ID / Passport</Text>
        <Text style={{ color: theme.colors.faint, marginTop: 6 }}>• Proof of affiliation (optional)</Text>
        <Text style={{ color: theme.colors.faint, marginTop: 6 }}>• Short motivation / skills</Text>

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Submit Application (placeholder)"
          onPress={() => {}}
          icon={<Ionicons name="paper-plane" size={18} color="white" />}
        />

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Back"
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="arrow-back" size={18} color="white" />}
        />
      </Card>
    </Screen>
  );
}
