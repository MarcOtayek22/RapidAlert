import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { useIsFocused, useNavigation, useRoute } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import { theme } from "../theme/theme";
import { listIncidents } from "../api/directus";

const STATUS_OPTIONS = ["all", "unverified", "verified", "disputed", "false"];
const CATEGORY_OPTIONS = ["all", "Fire", "Road Closure", "Explosion", "Medical", "Other"];

function pinColorForStatus(status) {
  if (status === "verified") return "green";
  if (status === "false") return "red";
  if (status === "disputed") return "orange";
  return "purple";
}

function groupKey(lat, lng) {
  // round so “same place” is treated as same marker
  const r = (n) => Number(n).toFixed(4);
  return `${r(lat)}|${r(lng)}`;
}

export default function MapScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();

  const [myPos, setMyPos] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const refreshKey = route?.params?.refresh;

  const region = useMemo(() => {
    if (!myPos) {
      return {
        latitude: 33.8938,
        longitude: 35.5018,
        latitudeDelta: 0.25,
        longitudeDelta: 0.25,
      };
    }
    return {
      latitude: myPos.latitude,
      longitude: myPos.longitude,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [myPos]);

  const filtered = useMemo(() => {
    return (incidents || [])
      .filter((it) => (statusFilter === "all" ? true : it.status === statusFilter))
      .filter((it) => (categoryFilter === "all" ? true : it.category === categoryFilter));
  }, [incidents, statusFilter, categoryFilter]);

  // ✅ GROUP BY LOCATION
  const grouped = useMemo(() => {
    const map = new Map();

    for (const it of filtered) {
      const key = groupKey(it.latitude, it.longitude);
      const arr = map.get(key) || [];
      arr.push(it);
      map.set(key, arr);
    }

    return Array.from(map.entries()).map(([key, items]) => {
      const first = items[0];
      return {
        key,
        latitude: first.latitude,
        longitude: first.longitude,
        items,
      };
    });
  }, [filtered]);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        setMyPos({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      }

      const data = await listIncidents();

      const fixed = (data || [])
        .map((it) => ({
          ...it,
          latitude: typeof it.latitude === "string" ? parseFloat(it.latitude) : it.latitude,
          longitude: typeof it.longitude === "string" ? parseFloat(it.longitude) : it.longitude,
        }))
        .filter((it) => Number.isFinite(it.latitude) && Number.isFinite(it.longitude));

      setIncidents(fixed);
    } catch (e) {
      setErr(e?.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, refreshKey]);

  return (
    <Screen>
      <Header title="🗺️ Map" subtitle="Live incidents dashboard" />

      <View style={{ gap: 10, marginBottom: theme.spacing(2) }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <Chip text={`Incidents: ${filtered.length}`} icon="pulse" tone="danger" />
          <Chip text={`Markers: ${grouped.length}`} icon="navigate" />
          <Chip text={`Status: ${statusFilter}`} icon="funnel" />
          <Chip text={`Category: ${categoryFilter}`} icon="pricetag" />
        </View>

        <Card style={{ padding: 12 }}>
          <Text style={{ color: theme.colors.faint, fontWeight: "800", marginBottom: 8 }}>
            Status
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {STATUS_OPTIONS.map((s) => {
              const active = s === statusFilter;
              return (
                <Pressable
                  key={s}
                  onPress={() => setStatusFilter(s)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "rgba(255,255,255,0.35)" : theme.colors.border,
                    backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{s}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ height: 12 }} />

          <Text style={{ color: theme.colors.faint, fontWeight: "800", marginBottom: 8 }}>
            Category
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {CATEGORY_OPTIONS.map((c) => {
              const active = c === categoryFilter;
              return (
                <Pressable
                  key={c}
                  onPress={() => setCategoryFilter(c)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: active ? "rgba(255,255,255,0.35)" : theme.colors.border,
                    backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
                  }}
                >
                  <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{c}</Text>
                </Pressable>
              );
            })}
          </View>
        </Card>
      </View>

      <Card strong style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <View style={{ padding: 18, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>Loading…</Text>
          </View>
        ) : err ? (
          <View style={{ padding: 18 }}>
            <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>{err}</Text>
          </View>
        ) : (
          <MapView style={{ width: "100%", height: 420 }} initialRegion={region}>
            {myPos ? (
              <Marker
                coordinate={myPos}
                title="You"
                description="Your current location"
                pinColor={theme.colors.primary}
              />
            ) : null}

            {grouped.map((g) => {
              const top = g.items[0];
              const count = g.items.length;

              return (
                <Marker
                  key={g.key}
                  coordinate={{ latitude: g.latitude, longitude: g.longitude }}
                  title={`${count} incident(s) here`}
                  description={`${top.category || "Incident"} • ${top.status || ""}`}
                  pinColor={pinColorForStatus(top.status)}
                  onPress={() =>
                    navigation.navigate("LocationDetails", {
                      groupKey: g.key,
                      incidents: g.items,
                    })
                  }
                />
              );
            })}
          </MapView>
        )}
      </Card>
    </Screen>
  );
}
