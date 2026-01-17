import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { fileAssetUrl, getIncident, getMyVote, upsertVote } from "../api/directus";

export default function IncidentDetailsScreen() {
  const route = useRoute();
  const id = route?.params?.id;

  // ✅ hooks must be here (inside the component)
  const { isLoggedIn, me } = useAuth();
  const userId = me?.id;

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [myVote, setMyVote] = useState(null); // "up" | "down" | null
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteErr, setVoteErr] = useState(null);

  async function load() {
  setLoading(true);
  setErr(null);

  try {
    const data = await getIncident(id);
    setIncident(data);

    // ✅ only try vote if logged in
    if (isLoggedIn && userId) {
      try {
        const v = await getMyVote(id);
        setMyVote(v?.vote || null);
      } catch (e) {
        // If vote fails, don't break the whole incident screen
        setMyVote(null);
      }
    } else {
      setMyVote(null);
    }
  } catch (e) {
    setErr(e?.message || "Failed to load incident.");
  } finally {
    setLoading(false);
  }
}


  useEffect(() => {
  if (id) load();
}, [id, isLoggedIn, userId]);


  const mediaUrl = useMemo(() => {
    const fileId =
      typeof incident?.media_file === "string"
        ? incident.media_file
        : incident?.media_file?.id;

    return fileAssetUrl(fileId);
  }, [incident]);

  async function handleVote(v) {
    if (!isLoggedIn) {
      setVoteErr("Please login to vote.");
      return;
    }

    try {
      setVoteErr(null);
      setVoteLoading(true);

      await upsertVote({ incidentId: id, userId, vote: v });
      setMyVote(v);

      await load();
    } catch (e) {
      setVoteErr(e?.message || "Failed to vote.");
    } finally {
      setVoteLoading(false);
    }
  }
  return (
    <Screen>
      <Header title="Incident Details" subtitle={id ? `#${id}` : ""} />

      <Card strong>
        {loading ? (
          <View style={{ paddingVertical: 10, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>Loading…</Text>
          </View>
        ) : err ? (
          <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>{err}</Text>
        ) : !incident ? (
          <Text style={{ color: theme.colors.faint }}>Not found.</Text>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "900" }}>
              {incident.category || "Incident"}
            </Text>

            <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
              Status:{" "}
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                {incident.status}
              </Text>
              {"  "}•{"  "}
              Score:{" "}
              <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
                {incident.score ?? 0}
              </Text>
            </Text>

            <View style={{ height: 12 }} />
            <View style={{ height: 14 }} />

<Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Community verification</Text>

<View style={{ flexDirection: "row", gap: 12 }}>
  <Pressable
    onPress={() => handleVote("up")}
    disabled={voteLoading}
    style={{
      flex: 1,
      paddingVertical: 12,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: myVote === "up" ? "rgba(34,197,94,0.18)" : "rgba(255,255,255,0.06)",
    }}
  >
    <Ionicons name="thumbs-up" size={18} color={theme.colors.text} />
    <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 6 }}>
      Upvote
    </Text>
  </Pressable>

  <Pressable
    onPress={() => handleVote("down")}
    disabled={voteLoading}
    style={{
      flex: 1,
      paddingVertical: 12,
      borderRadius: 16,
      alignItems: "center",
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: myVote === "down" ? "rgba(239,68,68,0.18)" : "rgba(255,255,255,0.06)",
    }}
  >
    <Ionicons name="thumbs-down" size={18} color={theme.colors.text} />
    <Text style={{ color: theme.colors.text, fontWeight: "900", marginTop: 6 }}>
      Downvote
    </Text>
  </Pressable>
</View>

{voteErr ? (
  <Text style={{ color: theme.colors.danger, marginTop: 10, fontWeight: "800" }}>
    {voteErr}
  </Text>
) : null}
            

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Description</Text>
            <Text style={{ color: theme.colors.text, lineHeight: 20 }}>
              {incident.description || "—"}
            </Text>

            {mediaUrl ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Media</Text>
                <Image
                  source={{ uri: mediaUrl }}
                  style={{ width: "100%", height: 220, borderRadius: 16 }}
                />
              </View>
            ) : null}
          </>
        )}
      </Card>
    </Screen>
  );
}

