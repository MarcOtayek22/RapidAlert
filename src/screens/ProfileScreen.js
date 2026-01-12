import React, { useMemo, useState } from "react";
import { Text, View, TextInput } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";

export default function ProfileScreen() {
  const { me, role, verified, isLoggedIn, login, logout, loading, refresh } = useAuth();

  const [email, setEmail] = useState("test@user.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState(null);

  const roleNorm = useMemo(() => String(role || "guest").trim().toLowerCase(), [role]);
  const verifiedBool = useMemo(() => verified === true || verified === "true" || verified === 1, [verified]);

  const isGuest = !isLoggedIn || roleNorm === "guest";
  const isUser = roleNorm === "user";
  const isVolunteer = roleNorm === "volunteer";
  const isAdmin = roleNorm === "admin";

  const displayName = useMemo(() => {
    const first = me?.first_name?.trim();
    const last = me?.last_name?.trim();
    const full = [first, last].filter(Boolean).join(" ");
    return full || me?.email || "User";
  }, [me]);

  async function handleLogin() {
    try {
      setError(null);
      await login(email.trim(), password);
      if (typeof refresh === "function") await refresh();
    } catch (e) {
      setError(e?.message || "Login failed");
    }
  }

  return (
    <Screen>
      <Header
        title="👤 Profile"
        subtitle="Auth + roles + verification"
        left={<Ionicons name="person" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: theme.spacing(2) }}>
        <Chip icon="lock-closed" text="Secure login" />
        <Chip icon="shield-checkmark" text="Roles" />
        <Chip icon="sparkles" text="Verification" />
      </View>

      <Card strong>
        {loading ? (
          <Text style={{ color: theme.colors.faint }}>⏳ Loading...</Text>
        ) : isGuest ? (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              👋 Guest
            </Text>
            <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
              You can browse, but reporting / SOS requires login.
            </Text>

            <View style={{ height: theme.spacing(2) }} />

            <View style={{ gap: 10 }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Ionicons name="mail" size={18} color={theme.colors.primary3} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor={theme.colors.muted}
                  autoCapitalize="none"
                  style={{ color: theme.colors.text, flex: 1, fontWeight: "800" }}
                />
              </View>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  borderRadius: 16,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Ionicons name="key" size={18} color={theme.colors.primary3} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor={theme.colors.muted}
                  secureTextEntry
                  style={{ color: theme.colors.text, flex: 1, fontWeight: "800" }}
                />
              </View>
            </View>

            <View style={{ height: theme.spacing(1) }} />

            {error ? (
              <Text style={{ color: theme.colors.danger, marginBottom: 10, fontWeight: "900" }}>
                ❌ {error}
              </Text>
            ) : null}

            <PrimaryButton
              title="Login"
              onPress={handleLogin}
              icon={<Ionicons name="log-in" size={18} color="white" />}
            />
          </>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              ✨ {displayName}
            </Text>

            <View style={{ height: theme.spacing(1) }} />

            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <Chip icon="person-circle" text={`Role: ${roleNorm}`} />
              <Chip
                icon={verifiedBool ? "checkmark-circle" : "close-circle"}
                text={verifiedBool ? "Verified: Yes" : "Verified: No"}
                tone={verifiedBool ? "success" : "warn"}
              />
            </View>

            <View style={{ height: theme.spacing(2) }} />

            {(isUser || isAdmin) && !verifiedBool ? (
              <>
                <Text style={{ color: theme.colors.faint, marginBottom: 10 }}>
                  🧾 Apply to become a verified volunteer (application workflow later).
                </Text>

                <PrimaryButton
                  title="Apply to be Volunteer"
                  onPress={() => {
                    console.log("Apply pressed");
                  }}
                  icon={<Ionicons name="shield-checkmark" size={18} color="white" />}
                />
                <View style={{ height: theme.spacing(2) }} />
              </>
            ) : null}

            {isVolunteer && !verifiedBool ? (
              <>
                <Text style={{ color: theme.colors.warn, fontWeight: "900", marginBottom: 10 }}>
                  ⚠️ Volunteer role detected, but not verified — tasks locked.
                </Text>
                <View style={{ height: theme.spacing(2) }} />
              </>
            ) : null}

            {isVolunteer && verifiedBool ? (
              <>
                <Text style={{ color: theme.colors.success, fontWeight: "900", marginBottom: 10 }}>
                  ✅ Verified volunteer — tasks unlocked (placeholder UI).
                </Text>

                <PrimaryButton
                  title="Volunteer Tasks (placeholder)"
                  onPress={() => console.log("Volunteer tasks")}
                  icon={<Ionicons name="clipboard" size={18} color="white" />}
                />
                <View style={{ height: theme.spacing(2) }} />
              </>
            ) : null}

            <PrimaryButton
              title="Refresh Profile"
              onPress={refresh}
              icon={<Ionicons name="refresh" size={18} color="white" />}
            />

            <View style={{ height: theme.spacing(2) }} />

            <PrimaryButton
              title="Logout"
              onPress={logout}
              icon={<Ionicons name="log-out" size={18} color="white" />}
            />
          </>
        )}
      </Card>

      <Card>
        <Text style={{ color: theme.colors.faint, fontWeight: "900" }}>🐞 Debug:</Text>
        <Text style={{ color: theme.colors.faint }}>isLoggedIn: {String(isLoggedIn)}</Text>
        <Text style={{ color: theme.colors.faint }}>role(raw): {String(role)}</Text>
        <Text style={{ color: theme.colors.faint }}>role(norm): {String(roleNorm)}</Text>
        <Text style={{ color: theme.colors.faint }}>verified(raw): {String(verified)}</Text>
        <Text style={{ color: theme.colors.faint }}>verified(bool): {String(verifiedBool)}</Text>
      </Card>
    </Screen>
  );
}
