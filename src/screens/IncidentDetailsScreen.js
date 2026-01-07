import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

const STATUS_LABELS = [
  "Unverified",
  "Verified",
  "False / Misleading",
  "Resolved / Expired",
];

export default function IncidentDetailsScreen({ route, navigation }) {
  const incident = route?.params?.incident || {};

  // Phase 1: fake status if none provided
  const currentStatus = incident.status || "Unverified";

  return (
    <Screen>
      <Header title="Incident" subtitle={incident.category || "Details"} />

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 18 }}>
          {incident.title || "Unknown incident"}
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
          {incident.description || "No description yet."}
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        {/* Incident meta */}
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

        {/* Status labels (Phase 1 requirement) */}
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
              <View
                key={label}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 999,
                  backgroundColor: active
                    ? theme.colors.cardStrong
                    : "transparent",
                  borderWidth: 1,
                  borderColor: active
                    ? theme.colors.border
                    : theme.colors.divider,
                }}
              >
                <Text
                  style={{
                    color: active ? theme.colors.text : theme.colors.muted,
                    fontWeight: "900",
                    fontSize: 12,
                  }}
                >
                  {label}
                </Text>
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
