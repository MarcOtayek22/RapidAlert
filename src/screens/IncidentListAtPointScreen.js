// src/screens/IncidentListAtPointScreen.js
import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Image } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";
import { DIRECTUS_URL } from "../api/directus";

function pickFileId(media) {
  if (!media) return null;
  if (typeof media === "string") return media;
  if (Array.isArray(media)) {
    const first = media[0];
    if (!first) return null;
    if (typeof first === "string") return first;
    if (typeof first === "object" && first.id) return first.id;
    return null;
  }
  if (typeof media === "object" && media.id) return media.id;
  return null;
}

export default function IncidentListAtPointScreen() {
  const navigation = useNavigation();
  const route = useRoute();

  const incidents = useMemo(() => {
    const params = route?.params;
    const maybe =
      params && typeof params === "object" && "incidents" in params ? params.incidents : [];
    return Array.isArray(maybe) ? maybe : [];
  }, [route?.params]);

  return (
    <Screen>
      <Header title="Incidents here" subtitle={`Choose one (${incidents.length})`} />

      <Card strong>
        {incidents.length === 0 ? (
          <Text style={styles.muted}>No incidents passed to this screen.</Text>
        ) : (
          <ScrollView contentContainerStyle={{ paddingBottom: 10 }}>
            {incidents.map((item) => {
              const fileId = pickFileId(item.media);
              const imageUrl = fileId ? `${DIRECTUS_URL}/assets/${fileId}` : null;

              return (
                <Pressable
                  key={String(item.id)}
                  onPress={() => navigation.navigate("IncidentDetails", { incidentId: item.id })}
                  style={styles.row}
                >
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {imageUrl ? (
                      <View style={styles.thumbWrap}>
                        <Image source={{ uri: imageUrl }} style={styles.thumb} resizeMode="cover" />
                      </View>
                    ) : (
                      <View style={styles.thumbPlaceholder}>
                        <Text style={{ color: theme.colors.faint, fontWeight: "900" }}>📍</Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }}>
                      <Text style={styles.title}>
                        {(item.category || "Unknown") + " • " + (item.status || "")}
                      </Text>

                      <Text style={styles.desc} numberOfLines={3}>
                        {item.description || ""}
                      </Text>

                      <Text style={styles.coords}>
                        ({Number(item.latitude).toFixed(5)}, {Number(item.longitude).toFixed(5)})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.sep} />
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: theme.colors.faint },
  row: { paddingVertical: 10 },
  title: { color: theme.colors.text, fontWeight: "900" },
  desc: { color: theme.colors.faint, marginTop: 6 },
  coords: { color: theme.colors.muted, marginTop: 8 },
  sep: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginTop: 12,
  },
  thumbWrap: {
    width: 64,
    height: 64,
    borderRadius: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  thumb: { width: "100%", height: "100%" },
  thumbPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
