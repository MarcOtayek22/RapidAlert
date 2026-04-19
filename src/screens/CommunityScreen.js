// src/screens/CommunityScreen.js
import React, { useEffect, useMemo, useState } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  Pressable,
  TextInput,
  ActivityIndicator,
  Linking,
} from "react-native";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import {
  createSupportPost,
  listSupportPosts,
  patchSupportPost,
} from "../api/directus";

const TYPE_TABS = ["Needs", "Offers"];
const TYPE_TO_DB = { Needs: "need", Offers: "offer" };
const CATEGORY_OPTIONS = ["Transport", "Shelter", "Medical", "Supplies", "Other"];

function normalizeRole(role) {
  return String(role || "guest").trim().toLowerCase();
}

function isVerifiedBool(v) {
  return v === true || v === 1 || v === "true";
}

async function openGoogleMaps(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

  const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
  await Linking.openURL(url);
}

export default function CommunityScreen() {
  const { isLoggedIn, me, role, verified } = useAuth();

  const [tab, setTab] = useState("Needs");
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState(null);

  const [loading, setLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(true);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [posts, setPosts] = useState([]);
  const [busyId, setBusyId] = useState(null);

  const roleNorm = useMemo(() => normalizeRole(role), [role]);
  const verifiedBool = useMemo(() => isVerifiedBool(verified), [verified]);
  const canVerifyPost =
    isLoggedIn &&
    verifiedBool &&
    (roleNorm === "user" || roleNorm === "volunteer" || roleNorm === "admin");

  async function getGps() {
    setGpsLoading(true);
    setError(null);
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

  async function loadPosts() {
    setPostsLoading(true);
    try {
      const data = await listSupportPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Failed to load community posts.");
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleCreatePost() {
    if (!isLoggedIn || !me?.id) {
      setError("Login required to create a post.");
      return;
    }

    if (!coords) {
      setError("Please get your location first.");
      return;
    }

    if (description.trim().length < 5) {
      setError("Please write a longer description.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await createSupportPost({
        type: TYPE_TO_DB[tab],
        category,
        decription: description.trim(),
        latitude: coords.lat,
        longitude: coords.lng,
        status: "open",
        user: me.id,
        verified_post: false,
      });

      setSuccess("Community post created.");
      setDescription("");
      setCategory(CATEGORY_OPTIONS[0]);
      await loadPosts();
    } catch (e) {
      setError(e?.message || "Failed to create support post.");
    } finally {
      setLoading(false);
    }
  }

  async function handleHelp(post) {
    if (!isLoggedIn || !me?.id || !post?.id) return;

    setBusyId(post.id);
    setError(null);
    setSuccess(null);

    try {
      await patchSupportPost(post.id, {
        accepted_by: me.id,
      });
      await loadPosts();
    } catch (e) {
      setError(e?.message || "Failed to offer help.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleVerify(post) {
    if (!canVerifyPost || !post?.id) return;

    setBusyId(post.id);
    setError(null);
    setSuccess(null);

    try {
      await patchSupportPost(post.id, {
        verified_post: true,
      });
      await loadPosts();
    } catch (e) {
      setError(e?.message || "Failed to verify post.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(post) {
    if (!post?.id) return;

    setBusyId(post.id);
    setError(null);
    setSuccess(null);

    try {
      await patchSupportPost(post.id, {
        status: "completed",
      });
      await loadPosts();
    } catch (e) {
      setError(e?.message || "Failed to mark post completed.");
    } finally {
      setBusyId(null);
    }
  }

  const filteredPosts = useMemo(() => {
    const wantedType = TYPE_TO_DB[tab];
    return posts.filter((p) => String(p?.type || "").toLowerCase() === wantedType);
  }, [posts, tab]);

  const TabButton = ({ label, emoji, icon }) => {
    const active = tab === label;
    return (
      <TouchableOpacity
        onPress={() => setTab(label)}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 16,
          alignItems: "center",
          backgroundColor: active ? "rgba(255,59,48,0.10)" : "transparent",
          borderWidth: 1,
          borderColor: active ? "rgba(255,59,48,0.22)" : theme.colors.divider,
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
        <Ionicons
          name={icon}
          size={16}
          color={active ? theme.colors.primary3 : theme.colors.muted}
        />
        <Text
          style={{
            color: active ? theme.colors.text : theme.colors.muted,
            fontWeight: "900",
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <Header
        title="🤝 Community"
        subtitle="Needs / Offers"
        left={<Ionicons name="people" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: theme.spacing(2) }}>
        <Chip icon="chatbubbles" text="Connect" />
        <Chip icon="medkit" text="Help" tone="success" />
        <Chip icon="checkmark-circle" text="Trusted posts" />
      </View>

      <Card strong>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TabButton label="Needs" emoji="🧩" icon="help-circle" />
          <TabButton label="Offers" emoji="🎁" icon="hand-left" />
        </View>

        <View style={{ height: theme.spacing(2) }} />

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Create a {tab === "Needs" ? "Need" : "Offer"}
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        {!isLoggedIn ? (
          <Text style={{ color: theme.colors.warn, fontWeight: "900" }}>
            Login required to create community posts.
          </Text>
        ) : (
          <>
            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Category</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {CATEGORY_OPTIONS.map((item) => {
                const active = item === category;
                return (
                  <Pressable
                    key={item}
                    onPress={() => setCategory(item)}
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

            <Text style={{ color: theme.colors.faint, marginBottom: 8 }}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={`Describe your ${tab === "Needs" ? "need" : "offer"}...`}
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
              title={coords ? "Location ready ✅" : gpsLoading ? "Getting location..." : "Get location"}
              onPress={getGps}
              disabled={gpsLoading}
              icon={<Ionicons name="locate" size={18} color="white" />}
            />

            <View style={{ height: theme.spacing(2) }} />

            <PrimaryButton
              title={loading ? "Posting..." : `Post ${tab === "Needs" ? "Need" : "Offer"}`}
              onPress={handleCreatePost}
              disabled={loading}
              icon={<Ionicons name="paper-plane" size={18} color="white" />}
            />
          </>
        )}

        {error ? (
          <Text style={{ color: theme.colors.danger, marginTop: 12 }}>{error}</Text>
        ) : null}

        {success ? (
          <Text style={{ color: theme.colors.success, marginTop: 12, fontWeight: "800" }}>
            {success}
          </Text>
        ) : null}
      </Card>

      <View style={{ height: theme.spacing(2) }} />

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          {tab === "Needs" ? "🧩 Community Needs" : "🎁 Community Offers"}
        </Text>

        <View style={{ height: theme.spacing(1.5) }} />

        {postsLoading ? (
          <View style={{ paddingVertical: 16, alignItems: "center" }}>
            <ActivityIndicator />
            <Text style={{ color: theme.colors.faint, marginTop: 10 }}>Loading posts...</Text>
          </View>
        ) : filteredPosts.length === 0 ? (
          <Text style={{ color: theme.colors.faint }}>
            No {tab.toLowerCase()} yet.
          </Text>
        ) : (
          filteredPosts.map((post) => {
            const creatorId = post?.user?.id;
            const acceptedById = post?.accepted_by?.id;
            const isMine = creatorId === me?.id;
            const isCompleted = String(post?.status || "").toLowerCase() === "completed";
            const alreadyHelping = acceptedById === me?.id;
            const verifiedPost = post?.verified_post === true || post?.verified_post === 1;

            return (
              <View
                key={post.id}
                style={{
                  paddingVertical: 12,
                  borderTopWidth: 1,
                  borderTopColor: theme.colors.divider,
                }}
              >
                <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 15 }}>
                  {post?.category || "Other"}
                </Text>

                <View style={{ height: 8 }} />

                <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                  <Chip icon="alert-circle" text={`Status: ${post?.status || "open"}`} />
                  {verifiedPost ? (
                    <Chip icon="checkmark-circle" text="Verified post" tone="success" />
                  ) : null}
                  {post?.accepted_by?.email ? (
                    <Chip
                      icon="hand-left"
                      text={
                        tab === "Offers"
                          ? `Needer: ${post.accepted_by.email}`
                          : `Helper: ${post.accepted_by.email}`
                      }
                    />
                  ) : null}
                </View>

                <Text style={{ color: theme.colors.faint, marginTop: 10 }}>
                  {post?.decription || "No description"}
                </Text>

                <Text style={{ color: theme.colors.faint, marginTop: 6, fontSize: 12 }}>
                  By: {post?.user?.email || "unknown"}
                </Text>

                <Text style={{ color: theme.colors.faint, marginTop: 4, fontSize: 12 }}>
                  Location: {post?.latitude}, {post?.longitude}
                </Text>

                <View style={{ height: 10 }} />

                <PrimaryButton
                  title="Open in Google Maps"
                  onPress={() => openGoogleMaps(post?.latitude, post?.longitude)}
                  icon={<Ionicons name="navigate" size={18} color="white" />}
                />

                {!isCompleted ? (
                  <>
                    <View style={{ height: 12 }} />

                    {!post?.accepted_by?.id && isLoggedIn ? (
                      <PrimaryButton
                        title={
                          busyId === post.id
                            ? "Updating..."
                            : tab === "Offers"
                            ? "I’ll Need That"
                            : "I’ll Help"
                        }
                        onPress={() => handleHelp(post)}
                        disabled={busyId === post.id}
                        icon={<Ionicons name="hand-left" size={18} color="white" />}
                      />
                    ) : null}

                    {alreadyHelping ? (
                      <Text style={{ color: theme.colors.success, marginTop: 10, fontWeight: "800" }}>
                        {tab === "Offers"
                          ? "You requested this offer."
                          : "You are helping with this post."}
                      </Text>
                    ) : null}

                    {canVerifyPost && !verifiedPost ? (
                      <View style={{ marginTop: 10 }}>
                        <PrimaryButton
                          title={busyId === post.id ? "Verifying..." : "Verify Post"}
                          onPress={() => handleVerify(post)}
                          disabled={busyId === post.id}
                          icon={<Ionicons name="checkmark-circle" size={18} color="white" />}
                        />
                      </View>
                    ) : null}

                    {isMine ? (
                      <View style={{ marginTop: 10 }}>
                        <PrimaryButton
                          title={busyId === post.id ? "Completing..." : "Mark Completed"}
                          onPress={() => handleComplete(post)}
                          disabled={busyId === post.id}
                          icon={<Ionicons name="checkmark-done-circle" size={18} color="white" />}
                        />
                      </View>
                    ) : null}
                  </>
                ) : (
                  <Text style={{ color: theme.colors.success, marginTop: 12, fontWeight: "900" }}>
                    Completed
                  </Text>
                )}
              </View>
            );
          })
        )}
      </Card>
    </Screen>
  );
}