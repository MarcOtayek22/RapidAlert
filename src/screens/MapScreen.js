import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ActivityIndicator, Pressable } from "react-native";
import MapView, { Marker, Circle } from "react-native-maps";
import * as Location from "expo-location";
import { useIsFocused, useNavigation } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import { theme } from "../theme/theme";
import {
  registerForNotificationsAsync,
  sendLocalDangerNotification,
} from "../api/notifications";
import { listIncidents, listDangerZones } from "../api/directus";
const STATUS_OPTIONS = ["all", "unverified", "verified", "disputed", "false"];
const CATEGORY_OPTIONS = ["all", "Fire", "Road Closure", "Explosion", "Medical", "Other"];


function statusColor(status) {
  const s = (status || "").toLowerCase();
  if (s === "verified") return theme.colors.success; // green
  if (s === "unverified") return theme.colors.primary2; // purple
  if (s === "disputed") return theme.colors.warn; // yellow
  if (s === "false") return "rgba(7, 0, 0, 0.35)"; // black
  return theme.colors.primary2;
}

// ✅ for grouped markers: choose the dominant status at that location
function dominantStatus(items = []) {
  const counts = {};
  for (const it of items) {
    const s = (it?.status || "unknown").toLowerCase();
    counts[s] = (counts[s] || 0) + 1;
  }
  let best = "unknown";
  let bestCount = -1;
  for (const [s, c] of Object.entries(counts)) {
    if (c > bestCount) {
      best = s;
      bestCount = c;
    }
  }
  return best;
}

// ✅ rounds so “same place” groups into one marker
function groupKey(lat, lng) {
  const r = (n) => Number(n).toFixed(4);
  return `${r(lat)}|${r(lng)}`;
}

function distanceInMeters(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371000;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function MapScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();


  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [incidents, setIncidents] = useState([]);
  const [alertedZoneIds, setAlertedZoneIds] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [myPos, setMyPos] = useState(null);

  async function loadIncidents() {
    setLoading(true);
    setErr(null);
    try {
      const data = await listIncidents();
      const items = Array.isArray(data) ? data : data?.data ?? [];

      // normalize coordinates safely (keeps everything else the same)
      const fixed = (items || []).map((it) => ({
        ...it,
        latitude: typeof it.latitude === "string" ? parseFloat(it.latitude) : it.latitude,
        longitude: typeof it.longitude === "string" ? parseFloat(it.longitude) : it.longitude,
      }));

      setIncidents(fixed);
    } catch (e) {
      setErr(e?.message || "Failed to load incidents.");
    } finally {
      setLoading(false);
    }
  }

  async function loadDangerZones() {
  try {
    const data = await listDangerZones();
    const items = Array.isArray(data) ? data : data?.data ?? [];

    console.log("raw danger zones from API:", items);

    const fixed = (items || []).map((zone) => ({
      ...zone,
      latitude: typeof zone.latitude === "string" ? parseFloat(zone.latitude) : zone.latitude,
      longitude: typeof zone.longitude === "string" ? parseFloat(zone.longitude) : zone.longitude,
      radius_m: typeof zone.radius_m === "string" ? parseFloat(zone.radius_m) : zone.radius_m,
    }));

    console.log("normalized danger zones:", fixed);
    setDangerZones(fixed);
  } catch (e) {
    console.error("Failed to load danger zones:", e);
    setDangerZones([]);
  }
}
  async function loadMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({});
      setMyPos({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    } catch {
      // ignore
    }
  }

useEffect(() => {
  if (!isFocused) return;
  loadIncidents();
  loadDangerZones();
  loadMyLocation();
  console.log("Requesting notification permission...");
  registerForNotificationsAsync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isFocused]);

useEffect(() => {
  if (!myPos || !dangerZones.length) return;

  async function checkNearbyDanger() {
    console.log("myPos:", myPos);
    console.log("dangerZones:", dangerZones);
    console.log("alertedZoneIds:", alertedZoneIds);

    for (const zone of dangerZones) {
      console.log("checking zone:", zone);

      if (alertedZoneIds.includes(zone.id)) {
        console.log("zone already alerted, skipping:", zone.id);
        continue;
      }

      if (
        !Number.isFinite(zone.latitude) ||
        !Number.isFinite(zone.longitude) ||
        !Number.isFinite(zone.radius_m)
      ) {
        console.log("invalid zone coords/radius, skipping:", zone);
        continue;
      }

      const d = distanceInMeters(
        myPos.latitude,
        myPos.longitude,
        zone.latitude,
        zone.longitude
      );

      console.log(
        "zone id:", zone.id,
        "distance:", d,
        "radius:", zone.radius_m,
        "inside:", d <= zone.radius_m
      );

      if (d <= zone.radius_m) {
        console.log("INSIDE danger zone -> sending notification for zone", zone.id);

        await sendLocalDangerNotification({
          title: "Danger nearby",
          body: "A verified incident has been reported near your location.",
          data: {
            zoneId: zone.id,
            incidentId: zone.incident,
          },
        });

        setAlertedZoneIds((prev) => [...prev, zone.id]);
      }
    }
  }

  checkNearbyDanger();
}, [myPos, dangerZones]);

useEffect(() => {
  if (!isFocused) return;

  const interval = setInterval(() => {
    loadDangerZones();
  }, 15000); // every 15 seconds

  return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isFocused]);

  const filtered = useMemo(() => {
    return (incidents || []).filter((inc) => {
      const s = (inc?.status || "").toLowerCase();
      const statusOk = statusFilter === "all" || s === statusFilter;

      const categoryOk =
        categoryFilter === "all" || (inc?.category || "") === categoryFilter;

      return statusOk && categoryOk;
    });
  }, [incidents, statusFilter, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const inc of filtered) {
      const lat = parseFloat(inc.latitude);
      const lng = parseFloat(inc.longitude);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const key = groupKey(lat, lng);
      if (!map.has(key)) {
        map.set(key, { key, latitude: lat, longitude: lng, items: [] });
      }
      map.get(key).items.push(inc);
    }

    return Array.from(map.values());
  }, [filtered]);

  const initialRegion = useMemo(() => {
    if (myPos) {
      return {
        latitude: myPos.latitude,
        longitude: myPos.longitude,
        latitudeDelta: 0.15,
        longitudeDelta: 0.15,
      };
    }
    return {
      latitude: 34.0,
      longitude: 35.7,
      latitudeDelta: 0.4,
      longitudeDelta: 0.4,
    };
  }, [myPos]);

  return (
    <Screen>
      <Header title="Live incidents dashboard" subtitle="Map + filters" />

      {/* ✅ Chip uses ONLY `text` */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Chip icon="pulse" text={`Incidents: ${filtered.length}`} tone="danger" />
        <Chip icon="navigate" text={`Markers: ${grouped.length}`} />
      </View>

      {/* Filters */}
      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.faint, fontWeight: "900", marginBottom: 10 }}>
          Status
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {STATUS_OPTIONS.map((s) => {
            const active = s === statusFilter;
            return (
              <Pressable
                key={s}
                onPress={() => setStatusFilter(s)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
                  backgroundColor: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <Text
                  style={{
                    color: active ? theme.colors.text : theme.colors.muted,
                    fontWeight: "900",
                  }}
                >
                  {s}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={{ height: 14 }} />

        <Text style={{ color: theme.colors.faint, fontWeight: "900", marginBottom: 10 }}>
          Category
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {CATEGORY_OPTIONS.map((c) => {
            const active = c === categoryFilter;
            return (
              <Pressable
                key={c}
                onPress={() => setCategoryFilter(c)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
                  backgroundColor: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
                }}
              >
                <Text
                  style={{
                    color: active ? theme.colors.text : theme.colors.muted,
                    fontWeight: "900",
                  }}
                >
                  {c}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* ✅ IMPORTANT FIX: explicit Map height so it never disappears */}
      <Card strong style={{ overflow: "hidden" }}>
        {loading ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>Loading incidents…</Text>
          </View>
        ) : err ? (
          <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>{err}</Text>
        ) : (
          <MapView
            style={{ height: 420, width: "100%" }}   // ✅ map always visible
            initialRegion={initialRegion}
          >
            {/* current location marker */}
            {myPos ? (
              <Marker
                coordinate={myPos}
                title="You"
                description="Your current location"
                pinColor={theme.colors.primary}
              />
            ) : null}

             {dangerZones.map((zone) => {
    if (
      !Number.isFinite(zone.latitude) ||
      !Number.isFinite(zone.longitude) ||
      !Number.isFinite(zone.radius_m)
    ) {
      return null;
    }

    return (
      <Circle
        key={zone.id}
        center={{
          latitude: zone.latitude,
          longitude: zone.longitude,
        }}
        radius={zone.radius_m}
        strokeWidth={2}
        strokeColor="rgba(255, 0, 0, 0.7)"
        fillColor="rgba(255, 0, 0, 0.2)"
      />
    );
  })}


            {/* grouped incident markers */}
            {grouped.map((g) => {
              const count = g.items.length;
              const groupStatus = dominantStatus(g.items);
              const color = statusColor(groupStatus);

              return (
                <Marker
                  key={g.key}
                  coordinate={{ latitude: g.latitude, longitude: g.longitude }}
                  onPress={() =>
                    navigation.navigate("LocationDetails", {
                      groupKey: g.key,
                      incidents: g.items,
                    })
                  }
                >
                  {/* custom marker (same structure as before, just colored) */}
                  <View style={{ alignItems: "center" }}>
                    <View
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 999,
                        backgroundColor: "rgba(0,0,0,0.55)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.18)",
                        marginBottom: 6,
                      }}
                    >
                      <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 12 }}>
                        {count} incident(s) here
                      </Text>
                    </View>

                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 999,
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255,255,255,0.10)",
                        borderWidth: 1,
                        borderColor: "rgba(255,255,255,0.18)",
                      }}
                    >
                      <View
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: 999,
                          backgroundColor: color,
                        }}
                      />
                    </View>
                  </View>
                </Marker>
              );
            })}
          </MapView>
        )}
      </Card>
    </Screen>
  );
}