import React, { useMemo, useState } from "react";
import { Text, View, TextInput, Pressable, Image } from "react-native";
import * as Location from "expo-location";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";

import { useAuth } from "../auth/AuthContext";
import { createIncident, uploadFile } from "../api/directus";

const CATEGORIES = [
  "Fire",
  "Road Closure",
  "Explosion",
  "Medical",
  "Theft",
  "Car Breakdown",
  "Stuck Somewhere",
  "Other",
];

export default function ReportScreen() {
  const { isLoggedIn, me } = useAuth();
  const navigation = useNavigation();

  const [started, setStarted] = useState(false);

  const [category, setCategory] = useState(CATEGORIES[0]);
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [media, setMedia] = useState(null); // { uri, name, type }
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = useMemo(() => {
    return (
      isLoggedIn &&
      !!me?.id &&
      !!coords &&
      description.trim().length >= 5 &&
      !loading
    );
  }, [isLoggedIn, me?.id, coords, description, loading]);

  async function getGps() {
    setError(null);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return setError("Location permission denied.");

    const pos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
  }

  async function pickPhoto() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setError("Media permission denied.");

    const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],   // ✅ FIXED
    allowsEditing: true,
    quality: 0.85,
});

    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) return;

    setMedia({
      uri: asset.uri,
      name: asset.fileName || "incident.jpg",
      type: asset.mimeType || "image/jpeg",
    });
  }

  async function submit() {
    if (!canSubmit) return;

    setLoading(true);
    setError(null);

    try {
      let uploadedFileId = null;

      // 1) upload file (optional)
      if (media?.uri) {
        const uploaded = await uploadFile(media);
        uploadedFileId = uploaded?.id || null;
      }

      // 2) build payload
      const payload = {
        category,
        description: description.trim(),
        status: "unverified",
        score: 0,
        latitude: coords.lat,
        longitude: coords.lng,
        reported_by: me.id,

        // ✅ Many-to-Many media field (0 or 1 file)
        ...(uploadedFileId
          ? { media_file: uploadedFileId }: {}),
      };

      // 3) create incident
      await createIncident(payload);

      // 4) reset UI
      setStarted(false);
      setCategory(CATEGORIES[0]);
      setDescription("");
      setCoords(null);
      setMedia(null);

      navigation.navigate("Map", { refresh: Date.now() });
    } catch (e) {
      setError(e?.message || "Failed to submit incident.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <Header title="Report" subtitle="Create an incident report" />

      <Card strong>
        {!isLoggedIn ? (
          <>
            <Text style={{ color: theme.colors.warn, fontWeight: "800", marginBottom: 10 }}>
              Login required to start a report.
            </Text>
            <PrimaryButton
              title="Go to Login"
              onPress={() => navigation.navigate("Profile")}
              icon={<Ionicons name="log-in" size={18} color="white" />}
            />
          </>
        ) : !started ? (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              Report form
            </Text>

            <View style={{ height: theme.spacing(1) }} />

            <Text style={{ color: theme.colors.faint }}>
              Category • Description • Photo • Location • Submit
            </Text>

            <View style={{ height: theme.spacing(2) }} />

            <PrimaryButton
              title="Start Report"
              onPress={() => setStarted(true)}
              icon={<Ionicons name="add" size={18} color="white" />}
            />
          </>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              Incident details
            </Text>

            <View style={{ height: theme.spacing(2) }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORIES.map((c) => {
                const active = c === category;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
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

            <View style={{ height: theme.spacing(2) }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What happened?"
              placeholderTextColor={theme.colors.muted}
              multiline
              style={{
                minHeight: 96,
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
              title={coords ? "GPS ready ✅" : "Get GPS location"}
              onPress={getGps}
              icon={<Ionicons name="locate" size={18} color="white" />}
            />

            <View style={{ height: theme.spacing(1.5) }} />

            <PrimaryButton
              title={media ? "Change photo" : "Attach photo (optional)"}
              onPress={pickPhoto}
              icon={<Ionicons name="image" size={18} color="white" />}
            />

            {media?.uri ? (
              <View style={{ marginTop: 12 }}>
                <Image
                  source={{ uri: media.uri }}
                  style={{ width: "100%", height: 180, borderRadius: 16 }}
                />
              </View>
            ) : null}

            {error ? (
              <Text style={{ color: theme.colors.danger, marginTop: 12 }}>{error}</Text>
            ) : null}

            <View style={{ height: theme.spacing(2) }} />

            <PrimaryButton
              title={loading ? "Submitting..." : "Submit Incident"}
              onPress={submit}
              disabled={!canSubmit}
              icon={<Ionicons name="send" size={18} color="white" />}
            />

            <Pressable onPress={() => setStarted(false)} style={{ marginTop: 10 }}>
              <Text style={{ color: theme.colors.faint, textAlign: "center" }}>Cancel</Text>
            </Pressable>
          </>
        )}
      </Card>
    </Screen>
  );
}
