import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, Image } from "react-native";
import { useRoute } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";
import { fileAssetUrl, getIncident } from "../api/directus";


export default function IncidentDetailsScreen() {
  const route = useRoute();
  const id = route?.params?.id;

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await getIncident(id);
      setIncident(data);
    } catch (e) {
      setErr(e?.message || "Failed to load incident.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) load();
  }, [id]);

  const mediaUrl = useMemo(() => {
  const fileId =
    typeof incident?.media_file === "string"
      ? incident.media_file
      : incident?.media_file?.id;

  return fileAssetUrl(fileId);
}, [incident]);


  return (
    <Screen>
      <Header title="Incident Details" subtitle={id ? `#${id}` : ""} />

      <Card strong>
        {loading ? (
          <View style={{ paddingVertical: 10, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>Loading…</Text>
          </View>
        ) : err ? (
          <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>{err}</Text>
        ) : !incident ? (
          <Text style={{ color: theme.colors.faint }}>Not found.</Text>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              {incident.category || "Incident"}
            </Text>

            <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
              Status:{" "}
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                {incident.status}
              </Text>
              {"  "}•{"  "}
              Score:{" "}
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                {incident.score ?? 0}
              </Text>
            </Text>

            <View style={{ height: 12 }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Description</Text>
            <Text style={{ color: theme.colors.text, lineHeight: 20 }}>
              {incident.description || "—"}
            </Text>

            {mediaUrl ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Media</Text>
                <Image
                  source={{ uri: mediaUrl }}
                  style={{ width: "100%", height: 220, borderRadius: 16 }}
                />
              </View>
            ) : null}
          </>
        )}
      </Card>
    </Screen>
  );
}
