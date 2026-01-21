// src/screens/IncidentDetailsScreen.js
import React, { useEffect, useState, useMemo } from "react";
import { View, Text, ActivityIndicator, Image, Pressable } from "react-native";
import { useRoute } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";

import {
  fileAssetUrl,
  getIncident,
  getMyVote,
  upsertVote,
  recomputeIncidentScoreAndStatus,
} from "../api/directus";

export default function IncidentDetailsScreen() {
  const route = useRoute();
  const id = route?.params?.id;

  const { isLoggedIn, me } = useAuth();
  const userId = me?.id;

  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [myVote, setMyVote] = useState(null); // "up" | "down" | null
  const [voteLoading, setVoteLoading] = useState(false);
  const [voteErr, setVoteErr] = useState(null);

  const [debugMsg, setDebugMsg] = useState(null); // to prove recompute ran

  async function load() {
    setLoading(true);
    setErr(null);

    try {
      const data = await getIncident(id);
      setIncident(data);

      if (isLoggedIn && userId) {
        const v = await getMyVote(id, userId);
        setMyVote(v?.vote || null);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, isLoggedIn, userId]);

  const mediaUrl = useMemo(() => {
    const fileId =
      typeof incident?.media_file === "string"
        ? incident.media_file
        : incident?.media_file?.id;

    return fileAssetUrl(fileId);
  }, [incident]);

  async function handleVote(v) {
    if (!isLoggedIn || !userId) {
      setVoteErr("Please login to vote.");
      return;
    }
    if (!incident) {
      setVoteErr("Incident not loaded yet.");
      return;
    }

    try {
      setVoteErr(null);
      setDebugMsg(null);
      setVoteLoading(true);

      // 1) Save vote (Part 1+2)
      await upsertVote({ incidentId: id, userId, vote: v });
      setMyVote(v);

      // 2) Recompute + patch score/status (Part 3+4)
      const result = await recomputeIncidentScoreAndStatus(incident);

      // This message proves recompute ran + how many votes were used
      setDebugMsg(
        `Recomputed from ${result.votesCount} vote(s) → score=${result.score}, status=${result.status}`
      );

      // 3) Update local UI instantly
      setIncident((prev) =>
        prev ? { ...prev, score: result.score, status: result.status } : prev
      );

      // 4) Reload from server to ensure DB updated
      await load();
    } catch (e) {
      // If score isn't changing, this error is usually:
      // - Forbidden (policy denies patch incidents)
      // - Fields don't exist (score/status)
      // - Relation expand missing (votesCount=0)
      setVoteErr(e?.message || "Failed to vote / recompute.");
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
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
              Loading…
            </Text>
          </View>
        ) : err ? (
          <Text style={{ color: theme.colors.danger, fontWeight: "800" }}>
            {err}
          </Text>
        ) : !incident ? (
          <Text style={{ color: theme.colors.faint }}>Not found.</Text>
        ) : (
          <>
            <Text
              style={{
                color: theme.colors.text,
                fontSize: 18,
                fontWeight: "900",
              }}
            >
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

            <View style={{ height: 14 }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>
              Community verification
            </Text>

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
                  backgroundColor:
                    myVote === "up"
                      ? "rgba(34,197,94,0.18)"
                      : "rgba(255,255,255,0.06)",
                }}
              >
                <Ionicons name="thumbs-up" size={18} color={theme.colors.text} />
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "900",
                    marginTop: 6,
                  }}
                >
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
                  backgroundColor:
                    myVote === "down"
                      ? "rgba(239,68,68,0.18)"
                      : "rgba(255,255,255,0.06)",
                }}
              >
                <Ionicons
                  name="thumbs-down"
                  size={18}
                  color={theme.colors.text}
                />
                <Text
                  style={{
                    color: theme.colors.text,
                    fontWeight: "900",
                    marginTop: 6,
                  }}
                >
                  Downvote
                </Text>
              </Pressable>
            </View>

            {voteErr ? (
              <Text
                style={{
                  color: theme.colors.danger,
                  marginTop: 10,
                  fontWeight: "800",
                }}
              >
                {voteErr}
              </Text>
            ) : null}

            {/* ✅ Debug proof (doesn’t break UI; you can delete later) */}
            {debugMsg ? (
              <Text
                style={{
                  color: theme.colors.faint,
                  marginTop: 8,
                  fontWeight: "700",
                }}
              >
                {debugMsg}
              </Text>
            ) : null}

            <View style={{ height: 14 }} />

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>
              Description
            </Text>
            <Text style={{ color: theme.colors.text, lineHeight: 20 }}>
              {incident.description || "—"}
            </Text>

            {mediaUrl ? (
              <View style={{ marginTop: 14 }}>
                <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>
                  Media
                </Text>
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
