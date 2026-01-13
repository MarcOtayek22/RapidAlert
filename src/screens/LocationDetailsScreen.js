import React, { useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";

export default function LocationDetailsScreen() {
  const route = useRoute();
  const navigation = useNavigation();

  const { groupKey, incidents = [] } = route?.params || {};

  const title = useMemo(() => {
    if (!incidents?.length) return "Location";
    const { latitude, longitude } = incidents[0];
    return `(${latitude?.toFixed?.(4)}, ${longitude?.toFixed?.(4)})`;
  }, [incidents]);

  return (
    <Screen>
      <Header title="Location Incidents" subtitle={title} />

      <Card strong>
        {!incidents.length ? (
          <Text style={{ color: theme.colors.faint }}>No incidents here.</Text>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", marginBottom: 12 }}>
              Incidents at this location ({incidents.length})
            </Text>

            {incidents.map((it) => (
              <Pressable
                key={it.id}
                onPress={() => navigation.navigate("IncidentDetails", { id: it.id })}
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: 1,
                  borderBottomColor: "rgba(255,255,255,0.08)",
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                  {it.category || "Incident"}{" "}
                  <Text style={{ color: theme.colors.faint, fontWeight: "700" }}>
                    • {it.status || "unknown"}
                  </Text>
                </Text>
                <Text style={{ color: theme.colors.faint, marginTop: 4 }} numberOfLines={2}>
                  {it.description || "—"}
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </Card>
    </Screen>
  );
}
