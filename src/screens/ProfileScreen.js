// src/screens/ProfileScreen.js
import React, { useMemo, useState } from "react";
import { Text, View, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { registerUser } from "../api/directus";

function AuthModeButton({ label, value, mode, setMode, setError, setSuccess }) {
  const active = mode === value;

  return (
    <Pressable
      onPress={() => {
        setMode(value);
        setError(null);
        setSuccess(null);
      }}
      style={{
        flex: 1,
        paddingVertical: 10,
        borderRadius: 14,
        alignItems: "center",
        backgroundColor: active ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.04)",
        borderWidth: 1,
        borderColor: active ? "rgba(255,255,255,0.35)" : theme.colors.border,
      }}
    >
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

function InputRow({
  icon,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = "none",
}) {
  return (
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
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        style={{ color: theme.colors.text, flex: 1, fontWeight: "800" }}
      />
    </View>
  );
}

export default function ProfileScreen({ navigation }) {
  const { me, role, verified, isLoggedIn, login, logout, loading, refresh } = useAuth();

  const [mode, setMode] = useState("login");

  const [loginEmail, setLoginEmail] = useState("user@rapidalert.com");
  const [loginPassword, setLoginPassword] = useState("12345678");

  const [signupFirstName, setSignupFirstName] = useState("");
  const [signupLastName, setSignupLastName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirmPassword, setSignupConfirmPassword] = useState("");

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [authBusy, setAuthBusy] = useState(false);

  const roleNorm = useMemo(() => String(role || "guest").trim().toLowerCase(), [role]);

  const verifiedBool = useMemo(
    () => verified === true || verified === "true" || verified === 1,
    [verified]
  );

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
      setAuthBusy(true);
      setError(null);
      setSuccess(null);
      await login(loginEmail.trim(), loginPassword);
    } catch (e) {
      setError(e?.message || "Login failed");
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleSignup() {
    const first = signupFirstName.trim();
    const last = signupLastName.trim();
    const email = signupEmail.trim().toLowerCase();
    const password = signupPassword;
    const confirm = signupConfirmPassword;

    if (!first) {
      setError("First name is required.");
      return;
    }

    if (!last) {
      setError("Last name is required.");
      return;
    }

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!email.includes("@")) {
      setError("Please enter a valid email.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    try {
      setAuthBusy(true);
      setError(null);
      setSuccess(null);

      await registerUser({
        email,
        password,
        first_name: first,
        last_name: last,
      });

      await login(email, password);

      setSuccess("Account created successfully.");
      setSignupFirstName("");
      setSignupLastName("");
      setSignupEmail("");
      setSignupPassword("");
      setSignupConfirmPassword("");
    } catch (e) {
      setError(e?.message || "Signup failed");
    } finally {
      setAuthBusy(false);
    }
  }

  return (
    <Screen>
      <Header
        title="👤 Profile"
        subtitle="Auth + roles + verification"
        left={<Ionicons name="person" size={20} color={theme.colors.primary} />}
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

            <View style={{ flexDirection: "row", gap: 10 }}>
              <AuthModeButton
                label="Login"
                value="login"
                mode={mode}
                setMode={setMode}
                setError={setError}
                setSuccess={setSuccess}
              />
              <AuthModeButton
                label="Sign Up"
                value="signup"
                mode={mode}
                setMode={setMode}
                setError={setError}
                setSuccess={setSuccess}
              />
            </View>

            <View style={{ height: theme.spacing(2) }} />

            {mode === "login" ? (
              <View style={{ gap: 10 }}>
                <InputRow
                  icon="mail"
                  value={loginEmail}
                  onChangeText={setLoginEmail}
                  placeholder="Email"
                />

                <InputRow
                  icon="key"
                  value={loginPassword}
                  onChangeText={setLoginPassword}
                  placeholder="Password"
                  secureTextEntry
                />

                {error ? (
                  <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
                    ❌ {error}
                  </Text>
                ) : null}

                {success ? (
                  <Text style={{ color: theme.colors.success, fontWeight: "900" }}>
                    ✅ {success}
                  </Text>
                ) : null}

                <PrimaryButton
                  title={authBusy ? "Logging in..." : "Login"}
                  onPress={handleLogin}
                  disabled={authBusy}
                  icon={<Ionicons name="log-in" size={18} color="white" />}
                />
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                <InputRow
                  icon="person"
                  value={signupFirstName}
                  onChangeText={setSignupFirstName}
                  placeholder="First name"
                  autoCapitalize="words"
                />

                <InputRow
                  icon="person"
                  value={signupLastName}
                  onChangeText={setSignupLastName}
                  placeholder="Last name"
                  autoCapitalize="words"
                />

                <InputRow
                  icon="mail"
                  value={signupEmail}
                  onChangeText={setSignupEmail}
                  placeholder="Email"
                />

                <InputRow
                  icon="key"
                  value={signupPassword}
                  onChangeText={setSignupPassword}
                  placeholder="Password"
                  secureTextEntry
                />

                <InputRow
                  icon="checkmark-circle"
                  value={signupConfirmPassword}
                  onChangeText={setSignupConfirmPassword}
                  placeholder="Confirm password"
                  secureTextEntry
                />

                {error ? (
                  <Text style={{ color: theme.colors.danger, fontWeight: "900" }}>
                    ❌ {error}
                  </Text>
                ) : null}

                {success ? (
                  <Text style={{ color: theme.colors.success, fontWeight: "900" }}>
                    ✅ {success}
                  </Text>
                ) : null}

                <PrimaryButton
                  title={authBusy ? "Creating account..." : "Create Account"}
                  onPress={handleSignup}
                  disabled={authBusy}
                  icon={<Ionicons name="person-add" size={18} color="white" />}
                />
              </View>
            )}
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

           {(isUser || isAdmin) ? (
  <>
    <Text style={{ color: theme.colors.faint, marginBottom: 10 }}>
      🧾 Apply to become a volunteer.
    </Text>

    <PrimaryButton
      title="Apply to be Volunteer"
      onPress={() => navigation.navigate("VolunteerApply")}
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
                  ✅ Verified volunteer — tasks unlocked.
                </Text>

                <PrimaryButton
                  title="Volunteer Tasks"
                  onPress={() => navigation.navigate("VolunteerTasks")}
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
        <Text style={{ color: theme.colors.faint }}>
          verified_badge(from me): {String(me?.verified_badge)}
        </Text>
      </Card>
    </Screen>
  );
}