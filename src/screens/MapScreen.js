// src/screens/MapScreen.js
import React, { useCallback, useMemo, useRef, useState, useEffect } from "react";
import {
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import { useFocusEffect, useRoute } from "@react-navigation/native";
import MapView, { Marker, Callout } from "react-native-maps";
import * as Location from "expo-location";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";

import { listIncidents } from "../api/directus";

function toNumber(x) {
  const n = typeof x === "number" ? x : Number(x);
  return Number.isFinite(n) ? n : null;
}

// Haversine distance in meters
function distanceMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const h =
    sinDLat * sinDLat +
    Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

// Greedy clustering by radius (meters)
function clusterIncidentsByRadius(incidents, radiusMeters) {
  const clusters = [];

  for (const inc of incidents) {
    let placed = false;

    for (const cl of clusters) {
      const d = distanceMeters(
        inc.latitude,
        inc.longitude,
        cl.latitude,
        cl.longitude
      );
      if (d <= radiusMeters) {
        cl.items.push(inc);

        // update center as average
        const n = cl.items.length;
        cl.latitude = (cl.latitude * (n - 1) + inc.latitude) / n;
        cl.longitude = (cl.longitude * (n - 1) + inc.longitude) / n;

        placed = true;
        break;
      }
    }

    if (!placed) {
      clusters.push({
        latitude: inc.latitude,
        longitude: inc.longitude,
        items: [inc],
      });
    }
  }

  return clusters;
}

export default function MapScreen({ navigation }) {
  const route = useRoute();
  const mapRef = useRef(null);

  const [items, setItems] = useState([]);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const [myLoc, setMyLoc] = useState(null); // { lat, lng }
  const [locErr, setLocErr] = useState(null);

  // ✅ Use 120m for grouping “same area” incidents
  const CLUSTER_RADIUS_METERS = 120;

  const load = useCallback(async () => {
    setLoading(true);
    setErr(null);
    try {
      const data = await listIncidents();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setItems([]);
      setErr(e?.message || "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Load on focus (always refresh when you come back to Map tab/screen)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // ✅ First mount
  useEffect(() => {
    load();
  }, [load]);

  // ✅ Reload when coming back from ReportScreen:
  // navigation.navigate("Map", { refresh: Date.now() })
  useEffect(() => {
    if (!route?.params?.refresh) return;
    load();
  }, [route?.params?.refresh, load]);

  async function getMyLocation() {
    try {
      setLocErr(null);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocErr("Location permission denied.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setMyLoc({ lat, lng });

      // Center map on your location
      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          600
        );
      }
    } catch (e) {
      setLocErr(e?.message || "Failed to get location");
    }
  }

  // Normalize + split bad coords
  const normalized = useMemo(() => {
    const ok = [];
    const bad = [];
    for (const inc of items) {
      const lat = toNumber(inc.latitude);
      const lng = toNumber(inc.longitude);
      if (lat === null || lng === null) bad.push(inc);
      else ok.push({ ...inc, latitude: lat, longitude: lng });
    }

    // Stable ordering (helps prevent “marker disappears” weirdness)
    ok.sort(
      (a, b) =>
        a.latitude - b.latitude ||
        a.longitude - b.longitude ||
        String(a.id).localeCompare(String(b.id))
    );

    return { ok, bad };
  }, [items]);

  const groups = useMemo(() => {
    return clusterIncidentsByRadius(normalized.ok, CLUSTER_RADIUS_METERS);
  }, [normalized.ok]);

  // Nearest capped at 5 (as you wanted)
  const nearest = useMemo(() => {
    if (!myLoc) return [];
    const scored = normalized.ok.map((inc) => ({
      inc,
      d: distanceMeters(myLoc.lat, myLoc.lng, inc.latitude, inc.longitude),
    }));
    scored.sort((a, b) => a.d - b.d);
    return scored.slice(0, 5);
  }, [myLoc, normalized.ok]);

  const first = groups[0];

  // ✅ Fit to all cluster centers AFTER data loads
  // This also “brings back markers” visually after refresh.
  useEffect(() => {
    if (!mapRef.current) return;
    if (loading) return;
    if (!groups.length) return;

    const coords = groups.map((g) => ({
      latitude: g.latitude,
      longitude: g.longitude,
    }));

    const t = setTimeout(() => {
      try {
        mapRef.current.fitToCoordinates(coords, {
          edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
          animated: true,
        });
      } catch (e) {}
    }, 250);

    return () => clearTimeout(t);
  }, [groups, loading]);

  return (
    <Screen>
      <Header title="Map" subtitle="Live incidents" />

      {err ? (
        <Card>
          <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>
            {err}
          </Text>
        </Card>
      ) : null}

      <Card strong>
        <View style={styles.topRow}>
          <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
            {loading ? "Loading..." : `Incidents (${items.length})`}
          </Text>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={load} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>Refresh</Text>
            </Pressable>

            <Pressable onPress={getMyLocation} style={styles.smallBtn}>
              <Text style={styles.smallBtnText}>My location</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate("Report")}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>+ Report</Text>
            </Pressable>
          </View>
        </View>

        <View style={{ marginTop: 10 }}>
          <Text style={{ color: theme.colors.faint }}>
            Debug: total={items.length} | withCoords={normalized.ok.length} | badCoords=
            {normalized.bad.length} | clusters={groups.length} | radius=
            {CLUSTER_RADIUS_METERS}m
          </Text>

          {locErr ? (
            <Text style={{ color: theme.colors.warn, marginTop: 6 }}>
              {locErr}
            </Text>
          ) : null}

          {myLoc ? (
            <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
              My GPS: ({myLoc.lat.toFixed(5)}, {myLoc.lng.toFixed(5)})
            </Text>
          ) : null}
        </View>

        {/* ✅ Nearest list (capped at 5) */}
        {myLoc && nearest.length > 0 ? (
          <View style={{ marginTop: 10 }}>
            <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
              Nearest incidents (max 5)
            </Text>

            {/* NOTE: ScrollView is fine here because this list is max 5 items */}
            <ScrollView style={{ maxHeight: 140, marginTop: 6 }}>
              {nearest.map(({ inc, d }) => (
                <Pressable
                  key={String(inc.id)}
                  onPress={() => {
                    if (!mapRef.current) return;
                    mapRef.current.animateToRegion(
                      {
                        latitude: inc.latitude,
                        longitude: inc.longitude,
                        latitudeDelta: 0.02,
                        longitudeDelta: 0.02,
                      },
                      600
                    );
                  }}
                  style={{ paddingVertical: 8 }}
                >
                  <Text style={{ color: theme.colors.faint }}>
                    #{inc.id} • {inc.category || "Unknown"} • {Math.round(d)}m away
                  </Text>
                  <Text style={{ color: theme.colors.muted }}>
                    ({inc.latitude.toFixed(5)}, {inc.longitude.toFixed(5)})
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        ) : null}

        <View style={{ height: theme.spacing(1) }} />

        <View style={styles.mapWrap}>
          {loading && items.length === 0 ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" />
              <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
                Loading incidents…
              </Text>
            </View>
          ) : (
            <MapView
              ref={mapRef}
              style={styles.map}
              initialRegion={{
                latitude: first?.latitude ?? 33.8938, // Beirut fallback
                longitude: first?.longitude ?? 35.5018,
                latitudeDelta: 0.08,
                longitudeDelta: 0.08,
              }}
            >
              {groups.map((g) => {
                const count = g.items.length;
                const top = g.items[0];

                // ✅ Stable key based on incident ids (fix: markers not appearing after refresh)
                const clusterKey = `cluster-${g.items
                  .map((x) => x.id)
                  .sort()
                  .join("-")}`;

                return (
                  <Marker
                    key={clusterKey}
                    coordinate={{ latitude: g.latitude, longitude: g.longitude }}
                  >
                    <View
                      style={[
                        styles.markerBubble,
                        count > 1 ? styles.markerMulti : styles.markerSingle,
                      ]}
                    >
                      <Text style={styles.markerText}>
                        {count > 1 ? String(count) : "!"}
                      </Text>
                    </View>

                    <Callout
                      onPress={() => {
                        if (count === 1) {
                          navigation.navigate("IncidentDetails", {
                            incidentId: top.id,
                          });
                        } else {
                          navigation.navigate("IncidentListAtPoint", {
                            incidents: g.items,
                          });
                        }
                      }}
                    >
                      <View style={{ maxWidth: 240 }}>
                        <Text style={{ fontWeight: "900" }}>
                          {count === 1
                            ? `${top.category ?? "Unknown"} • ${top.status ?? ""}`
                            : `${count} incidents here`}
                        </Text>

                        {count === 1 ? (
                          <Text style={{ marginTop: 6 }} numberOfLines={4}>
                            {top.description ?? ""}
                          </Text>
                        ) : (
                          <Text style={{ marginTop: 6 }} numberOfLines={3}>
                            Tap to choose which incident to open.
                          </Text>
                        )}
                      </View>
                    </Callout>
                  </Marker>
                );
              })}
            </MapView>
          )}
        </View>

        {/* If it “disappears”, refresh brings it back:
            - load() re-fetches
            - fitToCoordinates re-frames markers
        */}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  smallBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  smallBtnText: {
    color: theme.colors.text,
    fontWeight: "800",
  },
  mapWrap: {
    height: 420,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  map: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  markerBubble: {
    width: 34,
    height: 34,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  markerSingle: { backgroundColor: "#ef4444" },
  markerMulti: { backgroundColor: "#111827" },
  markerText: { color: "white", fontWeight: "900" },
});
