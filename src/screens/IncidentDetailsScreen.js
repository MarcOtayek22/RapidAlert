// src/screens/IncidentDetailsScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { Text, View, ActivityIndicator, Image } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { DIRECTUS_URL, getIncidentById } from "../api/directus";

const STATUS_LABELS = [
  "Unverified",
  "Verified",
  "False / Misleading",
  "Resolved / Expired",
];

function pickFileId(media) {
  if (!media) return null;

  // Most common shapes:
  // 1) "fileId"
  if (typeof media === "string") return media;

  // 2) { id: "fileId" }
  if (typeof media === "object" && !Array.isArray(media) && media.id) return media.id;

  // 3) [ { id: "fileId" }, ... ] or [ "fileId", ... ]
  if (Array.isArray(media)) {
    const first = media[0];
    if (!first) return null;
    if (typeof first === "string") return first;
    if (typeof first === "object" && first.id) return first.id;
  }

  return null;
}

export default function IncidentDetailsScreen({ route, navigation }) {
  const incidentId = route?.params?.incidentId;

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErr(null);
        const data = await getIncidentById(incidentId);
        if (alive) setIncident(data || null);
      } catch (e) {
        if (alive) setErr(e?.message || "Failed to load incident");
      } finally {
        if (alive) setLoading(false);
      }
    }

    if (!incidentId) {
      setErr("Missing incidentId");
      setLoading(false);
      return;
    }

    load();
    return () => {
      alive = false;
    };
  }, [incidentId]);

  const currentStatus = incident?.status || "Unverified";

  const toneFor = (label) => {
    if (label === "Verified") return "success";
    if (label === "Unverified") return "warn";
    if (label === "False / Misleading") return "danger";
    return "neutral";
  };

  const fileId = useMemo(() => pickFileId(incident?.media), [incident?.media]);
  const imageUrl = fileId ? `${DIRECTUS_URL}/assets/${fileId}` : null;

  if (loading) {
    return (
      <Screen>
        <Header title="🧭 Incident" subtitle="Loading..." />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" />
        </View>
      </Screen>
    );
  }

  if (err || !incident) {
    return (
      <Screen>
        <Header title="🧭 Incident" subtitle="Error" />
        <Card strong>
          <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
            {err || "Incident not found"}
          </Text>

          <View style={{ height: theme.spacing(2) }} />

          <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
        </Card>
      </Screen>
    );
  }

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
          {incident.category || "Incident"}
        </Text>

        {imageUrl ? (
          <View style={{ marginTop: 12, borderRadius: 16, overflow: "hidden" }}>
            <Image
              source={{ uri: imageUrl }}
              style={{ width: "100%", height: 220 }}
              resizeMode="cover"
              onError={() => {
                // If this triggers, it’s almost always Directus file perms (public read on directus_files/assets)
                console.log("Image failed to load:", imageUrl);
              }}
            />
          </View>
        ) : (
          <Text style={{ color: theme.colors.faint, marginTop: 12 }}>
            No photo attached.
          </Text>
        )}

        <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
          {incident.description || "No description yet."}
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: theme.spacing(2) }}>
          <Text style={{ color: theme.colors.muted, fontWeight: "700" }}>
            Coordinates:{" "}
            <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
              {incident.latitude && incident.longitude
                ? `${Number(incident.latitude).toFixed(5)}, ${Number(incident.longitude).toFixed(5)}`
                : "Unknown"}
            </Text>
          </Text>
        </View>

        <View style={{ height: theme.spacing(2) }} />

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Incident Status
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

        <PrimaryButton title="Back" onPress={() => navigation.goBack()} />
      </Card>
    </Screen>
  );
}
