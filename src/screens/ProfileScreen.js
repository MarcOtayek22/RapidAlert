import React, { useState } from "react";
import { Text, View, TextInput } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";

export default function ProfileScreen() {
  const { me, role, verified, isLoggedIn, login, logout, loading } = useAuth();

  const [email, setEmail] = useState("test@user.com");
  const [password, setPassword] = useState("12345678");
  const [error, setError] = useState(null);

  const isUser = role === "user";
  const isVolunteer = role === "volunteer";

  async function handleLogin() {
    try {
      setError(null);
      await login(email.trim(), password);
    } catch (e) {
      setError(e?.message || "Login failed");
    }
  }

  return (
    <Screen>
      <Header title="Profile" subtitle="Phase 3: Auth + roles" />

      <Card strong>
        {loading ? (
          <Text style={{ color: theme.colors.faint }}>Loading...</Text>
        ) : isLoggedIn ? (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              {me?.first_name || me?.email || "User"}
            </Text>

            <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
              Role:{" "}
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {String(role)}
              </Text>
            </Text>

            <Text style={{ color: theme.colors.faint, marginTop: 6 }}>
              Verified:{" "}
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>
                {verified ? "Yes" : "No"}
              </Text>
            </Text>

            <View style={{ height: theme.spacing(2) }} />

            {/* ✅ Phase 3 gating */}
            {isUser && !verified ? (
              <>
                <Text style={{ color: theme.colors.faint, marginBottom: 10 }}>
                  Apply to become a verified volunteer (application workflow is Phase 11).
                </Text>
                <PrimaryButton
                  title="Apply to be Volunteer (Phase 11)"
                  onPress={() => {}}
                  icon={<Ionicons name="shield-checkmark" size={18} color="white" />}
                />
                <View style={{ height: theme.spacing(2) }} />
              </>
            ) : null}

            {isVolunteer && !verified ? (
              <>
                <Text style={{ color: theme.colors.warn, fontWeight: "900", marginBottom: 10 }}>
                  Waiting verification — volunteer tasks are locked.
                </Text>
                <View style={{ height: theme.spacing(2) }} />
              </>
            ) : null}

            {isVolunteer && verified ? (
              <>
                <Text style={{ color: theme.colors.success, fontWeight: "900", marginBottom: 10 }}>
                  Verified volunteer — tasks unlocked (placeholder UI).
                </Text>

                <PrimaryButton
                  title="Volunteer Tasks (placeholder)"
                  onPress={() => {}}
                  icon={<Ionicons name="clipboard" size={18} color="white" />}
                />
                <View style={{ height: theme.spacing(2) }} />
              </>
            ) : null}

            <PrimaryButton
              title="Logout"
              onPress={logout}
              icon={<Ionicons name="log-out" size={18} color="white" />}
            />
          </>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
              Guest
            </Text>
            <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
              You can browse, but reporting / SOS requires login.
            </Text>

            <View style={{ height: theme.spacing(2) }} />

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={theme.colors.muted}
              autoCapitalize="none"
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 14,
                padding: 12,
                color: theme.colors.text,
                marginBottom: 10,
              }}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              style={{
                backgroundColor: "rgba(255,255,255,0.06)",
                borderWidth: 1,
                borderColor: theme.colors.border,
                borderRadius: 14,
                padding: 12,
                color: theme.colors.text,
                marginBottom: 12,
              }}
            />

            {error ? (
              <Text style={{ color: theme.colors.danger, marginBottom: 10 }}>
                {error}
              </Text>
            ) : null}

            <PrimaryButton
              title="Login"
              onPress={handleLogin}
              icon={<Ionicons name="log-in" size={18} color="white" />}
            />
          </>
        )}
      </Card>
    </Screen>
  );
}
