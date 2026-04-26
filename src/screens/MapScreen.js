// src/screens/MapScreen.js
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  Pressable,
  ScrollView,
} from "react-native";
import MapView, { Marker, Circle, Polyline } from "react-native-maps";
import * as Location from "expo-location";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import {
  registerForNotificationsAsync,
  sendLocalDangerNotification,
} from "../api/notifications";
import { listIncidents, listDangerZones } from "../api/directus";

const STATUS_OPTIONS = ["all", "unverified", "verified", "disputed", "false"];
const CATEGORY_OPTIONS = ["all", "Fire", "Road Closure", "Explosion", "Medical", "Other"];
const ORS_API_KEY = process.env.EXPO_PUBLIC_ORS_API_KEY || "";
const SAFE_BUFFER_M = 120;
const INCIDENT_GROUP_DISTANCE_M = 300;

function statusColor(status) {
  const s = String(status || "").toLowerCase();
  if (s === "verified") return theme.colors.success;
  if (s === "unverified") return theme.colors.primary2;
  if (s === "disputed") return theme.colors.warn;
  if (s === "false") return "rgba(7, 0, 0, 0.35)";
  return theme.colors.primary2;
}

function dominantStatus(items = []) {
  const counts = {};
  for (const it of items) {
    const s = String(it?.status || "unknown").toLowerCase();
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

function metersToLatitudeDelta(meters) {
  return meters / 111320;
}

function computeSafePoint(zone, userPos) {
  const centerLat = Number(zone.latitude);
  const centerLng = Number(zone.longitude);
  const radius = Number(zone.radius_m);

  const latDelta = userPos.latitude - centerLat;
  const lngDelta = userPos.longitude - centerLng;

  const distance = distanceInMeters(
    centerLat,
    centerLng,
    userPos.latitude,
    userPos.longitude
  );

  const targetDistance = radius + SAFE_BUFFER_M;

  if (!Number.isFinite(distance) || distance < 1) {
    const northLat = centerLat + metersToLatitudeDelta(targetDistance);
    return {
      latitude: northLat,
      longitude: centerLng,
    };
  }

  const scale = targetDistance / distance;

  return {
    latitude: centerLat + latDelta * scale,
    longitude: centerLng + lngDelta * scale,
  };
}

async function fetchSafeRoute(start, end) {
  const res = await fetch(
    "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
    {
      method: "POST",
      headers: {
        Authorization: ORS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        coordinates: [
          [start.longitude, start.latitude],
          [end.longitude, end.latitude],
        ],
      }),
    }
  );

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const msg =
      json?.error?.message ||
      json?.error ||
      json?.message ||
      `ORS HTTP ${res.status}`;
    throw new Error(msg);
  }

  const coords = json?.features?.[0]?.geometry?.coordinates || [];
  const summary = json?.features?.[0]?.properties?.summary || null;

  return {
    points: coords.map(([lng, lat]) => ({
      latitude: lat,
      longitude: lng,
    })),
    summary,
  };
}

function buildDistanceGroups(incidents, thresholdMeters = 300) {
  const valid = (incidents || []).filter((inc) => {
    const lat = Number(inc?.latitude);
    const lng = Number(inc?.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng);
  });

  const groups = [];

  for (const inc of valid) {
    const lat = Number(inc.latitude);
    const lng = Number(inc.longitude);

    let matchedGroupIndex = -1;
    let bestDistance = Infinity;

    for (let i = 0; i < groups.length; i += 1) {
      const g = groups[i];
      const d = distanceInMeters(lat, lng, g.latitude, g.longitude);

      if (d <= thresholdMeters && d < bestDistance) {
        matchedGroupIndex = i;
        bestDistance = d;
      }
    }

    if (matchedGroupIndex === -1) {
      groups.push({
        key: `group-${inc.id}`,
        latitude: lat,
        longitude: lng,
        items: [inc],
      });
    } else {
      const g = groups[matchedGroupIndex];
      g.items.push(inc);

      const count = g.items.length;
      const sumLat = g.items.reduce((acc, item) => acc + Number(item.latitude), 0);
      const sumLng = g.items.reduce((acc, item) => acc + Number(item.longitude), 0);

      g.latitude = sumLat / count;
      g.longitude = sumLng / count;
      g.key = `group-${g.items.map((item) => item.id).join("-")}`;
    }
  }

  return groups;
}

function prettyDate(value) {
  if (!value) return "Unknown date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString();
}

function ViewToggleButton({ active, label, icon, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 11,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "row",
        gap: 8,
        borderWidth: 1,
        borderColor: active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.12)",
        backgroundColor: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
      }}
    >
      <Ionicons
        name={icon}
        size={16}
        color={active ? theme.colors.text : theme.colors.muted}
      />
      <Text
        style={{
          color: active ? theme.colors.text : theme.colors.muted,
          fontWeight: "900",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function MapScreen() {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const mapRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [incidents, setIncidents] = useState([]);
  const [alertedZoneIds, setAlertedZoneIds] = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("map"); // map | list

  const [myPos, setMyPos] = useState(null);

  const [activeZone, setActiveZone] = useState(null);
  const [safePoint, setSafePoint] = useState(null);
  const [routePoints, setRoutePoints] = useState([]);
  const [routeSummary, setRouteSummary] = useState(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState(null);

  async function loadIncidents() {
    setLoading(true);
    setErr(null);

    try {
      const data = await listIncidents();
      const items = Array.isArray(data) ? data : data?.data ?? [];

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

      const fixed = (items || []).map((zone) => ({
        ...zone,
        latitude: typeof zone.latitude === "string" ? parseFloat(zone.latitude) : zone.latitude,
        longitude: typeof zone.longitude === "string" ? parseFloat(zone.longitude) : zone.longitude,
        radius_m: typeof zone.radius_m === "string" ? parseFloat(zone.radius_m) : zone.radius_m,
      }));

      setDangerZones(fixed);
    } catch (e) {
      if (e?.name === "AbortError") return;
      console.error("Failed to load danger zones:", e);
      setDangerZones([]);
    }
  }

  async function loadMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({});
      setMyPos({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!isFocused) return;
    loadIncidents();
    loadDangerZones();
    loadMyLocation();
    registerForNotificationsAsync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  useEffect(() => {
    if (!myPos || !dangerZones.length) {
      setActiveZone(null);
      return;
    }

    let nearestInsideZone = null;
    let nearestDistance = Infinity;

    for (const zone of dangerZones) {
      if (
        !Number.isFinite(zone.latitude) ||
        !Number.isFinite(zone.longitude) ||
        !Number.isFinite(zone.radius_m)
      ) {
        continue;
      }

      const d = distanceInMeters(
        myPos.latitude,
        myPos.longitude,
        zone.latitude,
        zone.longitude
      );

      if (d <= zone.radius_m && d < nearestDistance) {
        nearestInsideZone = zone;
        nearestDistance = d;
      }
    }

    setActiveZone(nearestInsideZone || null);

    if (!nearestInsideZone) {
      setSafePoint(null);
      setRoutePoints([]);
      setRouteSummary(null);
      setRouteError(null);
    }
  }, [myPos, dangerZones]);

  useEffect(() => {
    if (!myPos || !dangerZones.length) return;

    async function checkNearbyDanger() {
      for (const zone of dangerZones) {
        if (alertedZoneIds.includes(zone.id)) continue;

        if (
          !Number.isFinite(zone.latitude) ||
          !Number.isFinite(zone.longitude) ||
          !Number.isFinite(zone.radius_m)
        ) {
          continue;
        }

        const d = distanceInMeters(
          myPos.latitude,
          myPos.longitude,
          zone.latitude,
          zone.longitude
        );

        if (d <= zone.radius_m) {
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
  }, [myPos, dangerZones, alertedZoneIds]);

  useEffect(() => {
    if (!isFocused) return;

    const interval = setInterval(() => {
      loadDangerZones();
      loadMyLocation();
    }, 15000);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFocused]);

  async function handleGetSafeRoute() {
    if (!myPos || !activeZone) return;

    if (!ORS_API_KEY) {
      setRouteError("Missing EXPO_PUBLIC_ORS_API_KEY in .env");
      return;
    }

    setRouteLoading(true);
    setRouteError(null);

    try {
      const target = computeSafePoint(activeZone, myPos);
      setSafePoint(target);

      const route = await fetchSafeRoute(myPos, target);
      setRoutePoints(route.points || []);
      setRouteSummary(route.summary || null);

      if (route.points?.length && mapRef.current) {
        mapRef.current.fitToCoordinates([myPos, target, ...route.points], {
          edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
          animated: true,
        });
      }
    } catch (e) {
      setRouteError(e?.message || "Failed to fetch safe route.");
      setRoutePoints([]);
      setRouteSummary(null);
    } finally {
      setRouteLoading(false);
    }
  }

  function handleClearRoute() {
    setSafePoint(null);
    setRoutePoints([]);
    setRouteSummary(null);
    setRouteError(null);
  }

  const filtered = useMemo(() => {
    return (incidents || []).filter((inc) => {
      const s = String(inc?.status || "").toLowerCase();
      const statusOk = statusFilter === "all" || s === statusFilter;

      const categoryOk =
        categoryFilter === "all" || String(inc?.category || "") === categoryFilter;

      return statusOk && categoryOk;
    });
  }, [incidents, statusFilter, categoryFilter]);

  const grouped = useMemo(() => {
    return buildDistanceGroups(filtered, INCIDENT_GROUP_DISTANCE_M);
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

  const routeDistanceKm = routeSummary?.distance
    ? (routeSummary.distance / 1000).toFixed(2)
    : null;

  const routeDurationMin = routeSummary?.duration
    ? Math.ceil(routeSummary.duration / 60)
    : null;

  return (
    <Screen>
      <Header title="Live incidents dashboard" subtitle="Map + filters" />

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 12 }}>
        <Chip icon="pulse" text={`Incidents: ${filtered.length}`} tone="danger" />
        <Chip icon="navigate" text={`Markers: ${grouped.length}`} />
      </View>

      <Card style={{ marginBottom: 12 }}>
        <Text style={{ color: theme.colors.faint, fontWeight: "900", marginBottom: 10 }}>
          View
        </Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <ViewToggleButton
            active={viewMode === "map"}
            label="Map"
            icon="map"
            onPress={() => setViewMode("map")}
          />
          <ViewToggleButton
            active={viewMode === "list"}
            label="List"
            icon="list"
            onPress={() => setViewMode("list")}
          />
        </View>

        <View style={{ height: 14 }} />

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

      {activeZone ? (
        <Card strong style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.warn, fontWeight: "900", fontSize: 16 }}>
            You are inside a danger zone
          </Text>

          <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
            Get a safe route to a point outside the active danger radius.
          </Text>

          {routeError ? (
            <Text style={{ color: theme.colors.danger, marginTop: 10 }}>
              {routeError}
            </Text>
          ) : null}

          {routeSummary ? (
            <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {routeDistanceKm ? (
                <Chip icon="swap-horizontal" text={`${routeDistanceKm} km`} />
              ) : null}
              {routeDurationMin ? (
                <Chip icon="time" text={`${routeDurationMin} min`} />
              ) : null}
            </View>
          ) : null}

          <View style={{ height: 12 }} />

          <PrimaryButton
            title={routeLoading ? "Generating route..." : "Get Safe Route"}
            onPress={handleGetSafeRoute}
            disabled={routeLoading}
          />

          {routePoints.length ? (
            <View style={{ marginTop: 10 }}>
              <PrimaryButton title="Clear Route" onPress={handleClearRoute} />
            </View>
          ) : null}
        </Card>
      ) : null}

      <Card strong style={{ overflow: "hidden" }}>
        {loading ? (
          <View style={{ paddingVertical: 18, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
              Loading incidents…
            </Text>
          </View>
        ) : err ? (
          <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>{err}</Text>
        ) : viewMode === "map" ? (
          <MapView
            ref={mapRef}
            style={{ height: 420, width: "100%" }}
            initialRegion={initialRegion}
          >
            {myPos ? (
              <Marker
                coordinate={myPos}
                title="You"
                description="Your current location"
                pinColor={theme.colors.primary}
              />
            ) : null}

            {safePoint ? (
              <Marker
                coordinate={safePoint}
                title="Safe point"
                description="Suggested point outside danger zone"
                pinColor="#2563EB"
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
                <React.Fragment key={zone.id}>
                  <Circle
                    center={{
                      latitude: zone.latitude,
                      longitude: zone.longitude,
                    }}
                    radius={zone.radius_m}
                    strokeWidth={2}
                    strokeColor="rgba(255, 0, 0, 0.7)"
                    fillColor="rgba(255, 0, 0, 0.2)"
                  />

                  <Marker
                    coordinate={{
                      latitude: zone.latitude,
                      longitude: zone.longitude,
                    }}
                    anchor={{ x: 0.5, y: 0.5 }}
                    tracksViewChanges={false}
                    tappable={false}
                  >
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: "#ff0000",
                        borderWidth: 2,
                        borderColor: "white",
                      }}
                    />
                  </Marker>
                </React.Fragment>
              );
            })}

            {routePoints.length ? (
              <>
                <Polyline
                  coordinates={routePoints}
                  strokeWidth={10}
                  strokeColor="rgba(255,255,255,0.95)"
                  lineCap="round"
                  lineJoin="round"
                  zIndex={9}
                />
                <Polyline
                  coordinates={routePoints}
                  strokeWidth={6}
                  strokeColor="#2563EB"
                  lineCap="round"
                  lineJoin="round"
                  zIndex={10}
                />
              </>
            ) : null}

            {grouped.map((g) => {
              const count = g.items.length;
              const groupStatus = dominantStatus(g.items);
              const color = statusColor(groupStatus);

              return (
                <Marker
                  key={g.key}
                  coordinate={{ latitude: g.latitude, longitude: g.longitude }}
                  anchor={{ x: 0.5, y: 0.8 }}
                  onPress={() =>
                    navigation.navigate("LocationDetails", {
                      groupKey: g.key,
                      incidents: g.items,
                    })
                  }
                >
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
        ) : (
          <ScrollView
            style={{ maxHeight: 420 }}
            contentContainerStyle={{ paddingBottom: 8 }}
            showsVerticalScrollIndicator={false}
          >
            {filtered.length === 0 ? (
              <Text style={{ color: theme.colors.faint }}>
                No incidents match the selected filters.
              </Text>
            ) : (
              filtered.map((incident) => (
                <Pressable
                  key={incident.id}
                  onPress={() => navigation.navigate("IncidentDetails", { id: incident.id })}
                  style={{
                    paddingVertical: 12,
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        backgroundColor: statusColor(incident.status),
                      }}
                    />
                    <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 15 }}>
                      {incident.category || "Incident"}
                    </Text>
                    <Text style={{ color: theme.colors.faint, fontWeight: "700" }}>
                      • {incident.status || "unknown"}
                    </Text>
                  </View>

                  <Text
                    style={{ color: theme.colors.faint, marginTop: 6 }}
                    numberOfLines={2}
                  >
                    {incident.description || "No description"}
                  </Text>

                  <Text style={{ color: theme.colors.faint, marginTop: 6, fontSize: 12 }}>
                    {prettyDate(incident.date_created)}
                  </Text>

                  <Text style={{ color: theme.colors.faint, marginTop: 4, fontSize: 12 }}>
                    {Number(incident.latitude).toFixed(5)}, {Number(incident.longitude).toFixed(5)}
                  </Text>
                </Pressable>
              ))
            )}
          </ScrollView>
        )}
      </Card>
    </Screen>
  );
}