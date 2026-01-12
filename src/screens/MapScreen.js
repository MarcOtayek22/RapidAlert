import React, { useCallback, useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";
import { listIncidents } from "../api/directus";

export default function MapScreen() {
  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listIncidents();
      setItems(data);
    } catch (e) {
      setErr(e?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useFocusEffect(useCallback(() => { load(); }, []));

  return (
    <Screen>
      <Header title="Map" subtitle="Live incidents (feed for Phase 4)" />

      {err ? (
        <Card><Text style={{ color: theme.colors.danger }}>{err}</Text></Card>
      ) : null}

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          {loading ? "Loading..." : `Incidents (${items.length})`}
        </Text>

        <View style={{ height: theme.spacing(1) }} />

        {items.slice(0, 12).map((it) => (
          <View
            key={it.id}
            style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              {it.category} • {it.status}
            </Text>
            <Text style={{ color: theme.colors.faint, marginTop: 4 }}>{it.description}</Text>
            <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
              ({Number(it.latitude).toFixed(4)}, {Number(it.longitude).toFixed(4)})
            </Text>
          </View>
        ))}

        {items.length === 0 && !loading ? (
          <Text style={{ color: theme.colors.faint }}>No incidents yet. Create one from Report.</Text>
        ) : null}
      </Card>
    </Screen>
  );
}