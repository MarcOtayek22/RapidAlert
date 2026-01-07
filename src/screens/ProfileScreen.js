import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { useNavigation } from "@react-navigation/native";

export default function ProfileScreen() {
  const navigation = useNavigation();

  return (
    <Screen>
      <Header title="Profile" subtitle="Auth + roles later" />

      {/* User card */}
      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Guest
        </Text>
        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
          Login / Register will be implemented in later phases.
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Login (placeholder)"
          onPress={() => {}}
          icon={<Ionicons name="log-in" size={18} color="white" />}
        />
      </Card>

      <View style={{ height: theme.spacing(3) }} />

      {/* Volunteer section */}
      <Card>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Volunteer Access
        </Text>

        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
          Apply to become a verified volunteer (Phase 1 placeholder).
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Apply to be a Volunteer"
          onPress={() => navigation.navigate("VolunteerApply")}
          icon={<Ionicons name="shield-checkmark" size={18} color="white" />}
        />
      </Card>
    </Screen>
  );
}
