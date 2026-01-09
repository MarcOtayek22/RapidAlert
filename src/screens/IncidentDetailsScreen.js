import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

const STATUS_LABELS = ["Unverified", "Verified", "False / Misleading", "Resolved / Expired"];

export default function IncidentDetailsScreen({ route, navigation }) {
  const incident = route?.params?.incident || {};
  const currentStatus = incident.status || "Unverified"; // logic unchanged

  const toneFor = (label) => {
    if (label === "Verified") return "success";
    if (label === "Unverified") return "warn";
    if (label === "False / Misleading") return "danger";
    return "neutral";
  };

  return (
    <Screen>
      <Header
        title="🧭 Incident"
        subtitle={incident.category || "Details"}
        left={<Ionicons name="information-circle" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Chip icon="calendar" text="Timeline" />
        <Chip icon="location" text="Location" />
        <Chip icon="shield-checkmark" text="Status" />
      </View>

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>
          {incident.title || "Unknown incident"}
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
          {incident.description || "No description yet."}
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider,
            paddingTop: theme.spacing(2),
            gap: 6,
          }}
        >
          <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
            Location:{" "}
            <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
              {incident.locationName || "Unknown"}
            </Text>
          </Text>
        </View>

        <View style={{ height: theme.spacing(2) }} />

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Incident Status
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
          Confidence labels (Phase 1 placeholder)
        </Text>

        <View style={{ height: theme.spacing(1.5) }} />

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {STATUS_LABELS.map((label) => {
            const active = label === currentStatus;
            return (
              <View key={label} style={{ opacity: active ? 1 : 0.85 }}>
                <Chip
                  icon={active ? "checkmark-circle" : "ellipse-outline"}
                  text={label}
                  tone={active ? toneFor(label) : "neutral"}
                />
              </View>
            );
          })}
        </View>

        <View style={{ height: theme.spacing(3) }} />

        <PrimaryButton
          title="Back"
          onPress={() => navigation.goBack()}
          icon={<Ionicons name="arrow-back" size={18} color="white" />}
        />
      </Card>
    </Screen>
  );
}
