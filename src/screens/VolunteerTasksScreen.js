// src/screens/VolunteerTasksScreen.js
import React, { useEffect, useMemo, useState } from "react";
import { Text, View, ActivityIndicator, Linking, Platform } from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { listSosRequests, patchSosRequest } from "../api/directus";
import {
  registerForNotificationsAsync,
  sendLocalDangerNotification,
} from "../api/notifications";

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

async function openDefaultMap(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const label = "SOS Location";
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${encodeURIComponent(label)}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${encodeURIComponent(label)})`;

  await Linking.openURL(url);
}

async function openGoogleMaps(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  await Linking.openURL(url);
}

export default function VolunteerTasksScreen() {
  const { me, role, verified } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);
  const [myPos, setMyPos] = useState(null);
  const [alertedIds, setAlertedIds] = useState([]);

  const roleNorm = useMemo(
    () => String(role || "guest").trim().toLowerCase(),
    [role]
  );

  const verifiedBool = useMemo(
    () => verified === true || verified === 1 || verified === "true",
    [verified]
  );

  const canAccess = roleNorm === "volunteer" && verifiedBool;

  async function loadMyLocation() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setMyPos({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (e) {
      console.log("loadMyLocation failed:", e?.message);
    }
  }

  async function loadRequests() {
    setLoading(true);
    setError(null);

    try {
      const data = await listSosRequests();
      const openOrAssigned = (data || []).filter(
        (item) => item?.status === "active" || item?.status === "assigned"
      );
      setItems(openOrAssigned);
    } catch (e) {
      setError(e?.message || "Failed to load SOS requests.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!canAccess) return;

    registerForNotificationsAsync();
    loadMyLocation();
    loadRequests();

    const interval = setInterval(() => {
      loadMyLocation();
      loadRequests();
    }, 15000);

    return () => clearInterval(interval);
  }, [canAccess]);

  useEffect(() => {
    if (!canAccess || !myPos || !items.length) return;

    async function notifyNearbySos() {
      for (const item of items) {
        if (item?.status !== "active") continue;
        if (alertedIds.includes(item.id)) continue;

        const lat = Number(item?.latitude);
        const lng = Number(item?.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const d = distanceInMeters(
          myPos.latitude,
          myPos.longitude,
          lat,
          lng
        );

        if (d <= 1000) {
          await sendLocalDangerNotification({
            title: "Nearby SOS request",
            body: `${item?.type_of_help || "Emergency"} request near your location.`,
            data: { sosId: item.id },
          });

          setAlertedIds((prev) => [...prev, item.id]);
        }
      }
    }

    notifyNearbySos();
  }, [canAccess, myPos, items, alertedIds]);

  async function acceptRequest(item) {
    if (!item?.id || !me?.id) return;

    setBusyId(item.id);
    setError(null);

    try {
      await patchSosRequest(item.id, {
        status: "assigned",
        assigned_volunteer: me.id,
        withdrawal_requested: false,
      });

      await loadRequests();
    } catch (e) {
      setError(e?.message || "Failed to accept SOS request.");
    } finally {
      setBusyId(null);
    }
  }

  async function resolveRequest(item) {
    if (!item?.id) return;

    setBusyId(item.id);
    setError(null);

    try {
      await patchSosRequest(item.id, {
        status: "resolved",
        withdrawal_requested: false,
      });

      await loadRequests();
    } catch (e) {
      setError(e?.message || "Failed to resolve SOS request.");
    } finally {
      setBusyId(null);
    }
  }

  async function approveWithdrawal(item) {
    if (!item?.id) return;

    setBusyId(item.id);
    setError(null);

    try {
      await patchSosRequest(item.id, {
        status: "cancelled",
        withdrawal_requested: false,
      });

      await loadRequests();
    } catch (e) {
      setError(e?.message || "Failed to approve withdrawal.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Header
        title="📋 Volunteer Tasks"
        subtitle="Active SOS requests"
        left={<Ionicons name="clipboard" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: theme.spacing(2) }}>
        <Chip icon="radio" text="SOS requests" tone="danger" />
        <Chip icon="person" text="Volunteer tasks" />
        <Chip icon="notifications" text="Nearby alerts" />
      </View>

      {!canAccess ? (
        <Card strong>
          <Text style={{ color: theme.colors.warn, fontWeight: "900" }}>
            Only verified volunteers can access this screen.
          </Text>
        </Card>
      ) : loading ? (
        <Card strong>
          <ActivityIndicator />
          <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
            Loading SOS requests...
          </Text>
        </Card>
      ) : error ? (
        <Card strong>
          <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>{error}</Text>
        </Card>
      ) : items.length === 0 ? (
        <Card strong>
          <Text style={{ color: theme.colors.faint, fontWeight: "800" }}>
            No active SOS requests right now.
          </Text>
        </Card>
      ) : (
        items.map((item) => {
          const assignedToMe = item?.assigned_volunteer?.id === me?.id;
          const isAssigned = item?.status === "assigned";
          const withdrawalRequested = item?.withdrawal_requested === true;

          return (
            <Card key={item.id} strong style={{ marginBottom: 12 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
                {item?.type_of_help || "SOS Request"}
              </Text>

              <View style={{ height: theme.spacing(1) }} />

              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip icon="alert-circle" text={`Status: ${item?.status || "unknown"}`} />
                <Chip icon="mail" text={`User: ${item?.user?.email || "unknown"}`} />
                {withdrawalRequested ? (
                  <Chip icon="exit" text="Withdrawal requested" tone="warn" />
                ) : null}
              </View>

              <View style={{ height: theme.spacing(1.5) }} />

              <Text style={{ color: theme.colors.faint }}>
                Note: {item?.note?.trim() ? item.note : "No note provided"}
              </Text>
              <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
                Location: {item?.latitude}, {item?.longitude}
              </Text>

              <View style={{ height: theme.spacing(1.5) }} />

              <View style={{ gap: 10 }}>
                <PrimaryButton
                  title="Show on Map"
                  onPress={() => openDefaultMap(item?.latitude, item?.longitude)}
                  icon={<Ionicons name="map" size={18} color="white" />}
                />

                <PrimaryButton
                  title="Open in Google Maps"
                  onPress={() => openGoogleMaps(item?.latitude, item?.longitude)}
                  icon={<Ionicons name="navigate" size={18} color="white" />}
                />
              </View>

              <View style={{ height: theme.spacing(2) }} />

              {!isAssigned ? (
                <PrimaryButton
                  title={busyId === item.id ? "Accepting..." : "Accept SOS"}
                  onPress={() => acceptRequest(item)}
                  disabled={busyId === item.id}
                  icon={<Ionicons name="checkmark-circle" size={18} color="white" />}
                />
              ) : assignedToMe ? (
                <>
                  {withdrawalRequested ? (
                    <>
                      <PrimaryButton
                        title={busyId === item.id ? "Approving..." : "Approve Withdrawal"}
                        onPress={() => approveWithdrawal(item)}
                        disabled={busyId === item.id}
                        icon={<Ionicons name="close-circle" size={18} color="white" />}
                      />
                      <View style={{ height: theme.spacing(1.5) }} />
                    </>
                  ) : null}

                  <PrimaryButton
                    title={busyId === item.id ? "Completing..." : "Mark Resolved"}
                    onPress={() => resolveRequest(item)}
                    disabled={busyId === item.id}
                    icon={<Ionicons name="checkmark-done-circle" size={18} color="white" />}
                  />
                </>
              ) : (
                <Text style={{ color: theme.colors.warn, fontWeight: "900" }}>
                  Already assigned
                </Text>
              )}
            </Card>
          );
        })
      )}
    </Screen>
  );
}