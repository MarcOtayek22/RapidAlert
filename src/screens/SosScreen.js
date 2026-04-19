// src/screens/SosScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  TextInput,
  Pressable,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useIsFocused } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import {
  createSosRequest,
  listMySosRequests,
  patchSosRequest,
} from "../api/directus";

const HELP_TYPES = ["Medical", "Transport", "Shelter", "Supplies", "Other"];

function prettyStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active") return "Active";
  if (s === "assigned") return "Assigned";
  if (s === "resolved") return "Resolved";
  if (s === "cancelled") return "Cancelled";
  return status || "Unknown";
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

export default function SosScreen() {
  const { isLoggedIn, me, role, verified } = useAuth();
  const navigation = useNavigation();
  const isFocused = useIsFocused();

  const [typeOfHelp, setTypeOfHelp] = useState(HELP_TYPES[0]);
  const [note, setNote] = useState("");
  const [coords, setCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [latestMySos, setLatestMySos] = useState(null);

  const roleNorm = useMemo(
    () => String(role || "guest").trim().toLowerCase(),
    [role]
  );

  const verifiedBool = useMemo(
    () => verified === true || verified === 1 || verified === "true",
    [verified]
  );

  const isVerifiedVolunteer = roleNorm === "volunteer" && verifiedBool;

  const canSubmit = useMemo(() => {
    return isLoggedIn && !!me?.id && !!coords && !loading && !gpsLoading;
  }, [isLoggedIn, me?.id, coords, loading, gpsLoading]);

  async function getGps({ silent = false } = {}) {
    if (!silent) {
      setError(null);
      setSuccess(null);
    }

    setGpsLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("Location permission denied.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setCoords({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      });
    } catch (e) {
      setError(e?.message || "Failed to get location.");
    } finally {
      setGpsLoading(false);
    }
  }

  async function loadMyLatestSos() {
    if (!me?.id) return;

    setStatusLoading(true);
    try {
      const items = await listMySosRequests(me.id);
      setLatestMySos(items?.[0] || null);
    } catch (e) {
      console.log("loadMyLatestSos failed:", e?.message);
    } finally {
      setStatusLoading(false);
    }
  }

  useEffect(() => {
    if (!isFocused || !isLoggedIn) return;
    getGps({ silent: true });
  }, [isFocused, isLoggedIn]);

  useEffect(() => {
    if (!isFocused || !isLoggedIn || !me?.id) return;
    loadMyLatestSos();
  }, [isFocused, isLoggedIn, me?.id]);

  async function handleSendSos() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createSosRequest({
        latitude: coords.lat,
        longitude: coords.lng,
        type_of_help: typeOfHelp,
        note: note.trim(),
        status: "active",
        user: me.id,
        withdrawal_requested: false,
      });

      setSuccess("SOS request sent successfully.");
      setNote("");
      setTypeOfHelp(HELP_TYPES[0]);

      await loadMyLatestSos();
      await getGps({ silent: true });
    } catch (e) {
      setError(e?.message || "Failed to send SOS request.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelActive() {
    if (!latestMySos?.id) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await patchSosRequest(latestMySos.id, {
        status: "cancelled",
        withdrawal_requested: false,
      });
      setSuccess("SOS request cancelled.");
      await loadMyLatestSos();
    } catch (e) {
      setError(e?.message || "Failed to cancel SOS.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRequestWithdrawal() {
    if (!latestMySos?.id) return;

    setActionLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await patchSosRequest(latestMySos.id, {
        withdrawal_requested: true,
      });
      setSuccess("Withdrawal requested. Waiting for volunteer action.");
      await loadMyLatestSos();
    } catch (e) {
      setError(e?.message || "Failed to request withdrawal.");
    } finally {
      setActionLoading(false);
    }
  }

  const latestStatus = String(latestMySos?.status || "").toLowerCase();
  const canCancelActive = latestStatus === "active";
  const canRequestWithdrawal =
    latestStatus === "assigned" && latestMySos?.withdrawal_requested !== true;

  return (
    <Screen>
      <Header
        title="🆘 SOS"
        subtitle="Emergency request with live location"
        left={<Ionicons name="warning" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: theme.spacing(2) }}>
        <Chip icon="hand-left" text="Emergency request" tone="warn" />
        <Chip icon="navigate-circle" text="Auto GPS" />
        <Chip icon="call" text="Volunteer support" tone="danger" />
      </View>

      <Card strong>
        {!isLoggedIn ? (
          <>
            <Text style={{ color: theme.colors.warn, fontWeight: "900", marginBottom: 10 }}>
              Login required to use SOS.
            </Text>

            <PrimaryButton
              title="Go to Login"
              onPress={() => navigation.navigate("Profile")}
              icon={<Ionicons name="log-in" size={18} color="white" />}
            />
          </>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              Create SOS request
            </Text>

            <View style={{ height: theme.spacing(1.5) }} />

            {gpsLoading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator />
                <Text style={{ color: theme.colors.faint }}>Getting current location...</Text>
              </View>
            ) : coords ? (
              <Text style={{ color: theme.colors.success, fontWeight: "800" }}>
                Location ready ✅
              </Text>
            ) : (
              <Text style={{ color: theme.colors.warn, fontWeight: "800" }}>
                Location not ready yet.
              </Text>
            )}

            <View style={{ height: theme.spacing(2) }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Type of help</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {HELP_TYPES.map((item) => {
                const active = item === typeOfHelp;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setTypeOfHelp(item)}
                    style={{
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: active ? "rgba(255,255,255,0.35)" : theme.colors.border,
                      backgroundColor: active ? "rgba(255,255,255,0.10)" : "transparent",
                    }}
                  >
                    <Text style={{ color: theme.colors.text, fontWeight: "800" }}>{item}</Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={{ height: theme.spacing(2) }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add details about the emergency..."
              placeholderTextColor={theme.colors.muted}
              multiline
              style={{
                minHeight: 90,
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 14,
                padding: 12,
                color: theme.colors.text,
              }}
            />

            <View style={{ height: theme.spacing(2) }} />

            <PrimaryButton
              title="Retry location"
              onPress={() => getGps()}
              icon={<Ionicons name="locate" size={18} color="white" />}
            />

            {error ? (
              <Text style={{ color: theme.colors.danger, marginTop: 12 }}>{error}</Text>
            ) : null}

            {success ? (
              <Text style={{ color: theme.colors.success, marginTop: 12, fontWeight: "800" }}>
                {success}
              </Text>
            ) : null}

            <View style={{ height: theme.spacing(2) }} />

            <PrimaryButton
              title={loading ? "Sending..." : "Send SOS"}
              onPress={handleSendSos}
              disabled={!canSubmit}
              icon={<Ionicons name="radio" size={18} color="white" />}
            />

            {isVerifiedVolunteer ? (
              <>
                <View style={{ height: theme.spacing(2) }} />
                <PrimaryButton
                  title="Open Volunteer Tasks"
                  onPress={() => navigation.navigate("VolunteerTasks")}
                  icon={<Ionicons name="clipboard" size={18} color="white" />}
                />
              </>
            ) : null}
          </>
        )}
      </Card>

      {isLoggedIn ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
            My latest SOS status
          </Text>

          <View style={{ height: theme.spacing(1.5) }} />

          {statusLoading ? (
            <Text style={{ color: theme.colors.faint }}>Loading latest SOS...</Text>
          ) : !latestMySos ? (
            <Text style={{ color: theme.colors.faint }}>No SOS requests yet.</Text>
          ) : (
            <>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <Chip icon="radio" text={latestMySos.type_of_help || "SOS"} tone="danger" />
                <Chip icon="alert-circle" text={`Status: ${prettyStatus(latestMySos.status)}`} />
                {latestMySos.withdrawal_requested ? (
                  <Chip icon="exit" text="Withdrawal requested" tone="warn" />
                ) : null}
              </View>

              <View style={{ height: theme.spacing(1.5) }} />

              <Text style={{ color: theme.colors.faint }}>
                Note: {latestMySos.note?.trim() ? latestMySos.note : "No note provided"}
              </Text>

              <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
                Location: {latestMySos.latitude}, {latestMySos.longitude}
              </Text>

              <View style={{ height: theme.spacing(1.5) }} />

              <View style={{ gap: 10 }}>
                <PrimaryButton
                  title="Show on Map"
                  onPress={() => openDefaultMap(latestMySos?.latitude, latestMySos?.longitude)}
                  icon={<Ionicons name="map" size={18} color="white" />}
                />

                <PrimaryButton
                  title="Open in Google Maps"
                  onPress={() => openGoogleMaps(latestMySos?.latitude, latestMySos?.longitude)}
                  icon={<Ionicons name="navigate" size={18} color="white" />}
                />
              </View>

              {latestMySos.assigned_volunteer?.email ? (
                <Text style={{ color: theme.colors.success, marginTop: 10, fontWeight: "800" }}>
                  Assigned volunteer: {latestMySos.assigned_volunteer.email}
                </Text>
              ) : null}

              {canCancelActive ? (
                <>
                  <View style={{ height: theme.spacing(2) }} />
                  <PrimaryButton
                    title={actionLoading ? "Cancelling..." : "Cancel SOS"}
                    onPress={handleCancelActive}
                    disabled={actionLoading}
                    icon={<Ionicons name="close-circle" size={18} color="white" />}
                  />
                </>
              ) : null}

              {canRequestWithdrawal ? (
                <>
                  <View style={{ height: theme.spacing(2) }} />
                  <PrimaryButton
                    title={actionLoading ? "Requesting..." : "Request Withdrawal"}
                    onPress={handleRequestWithdrawal}
                    disabled={actionLoading}
                    icon={<Ionicons name="arrow-undo" size={18} color="white" />}
                  />
                </>
              ) : null}
            </>
          )}
        </Card>
      ) : null}
    </Screen>
  );
}