import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function ReportScreen() {
  const { isLoggedIn } = useAuth();
  const navigation = useNavigation();

  return (
    <Screen>
      <Header
        title="🚨 Report"
        subtitle="Create an incident report (UI first)"
        left={<Ionicons name="alert-circle" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
        <Chip icon="list" text="Category" />
        <Chip icon="document-text" text="Details" />
        <Chip icon="camera" text="Photo" />
        <Chip icon="navigate" text="Location" />
      </View>

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          📝 Report form (next)
        </Text>

        <View style={{ height: theme.spacing(1) }} />

        <Text style={{ color: theme.colors.faint }}>
          Category • Description • Photo • Location • Submit
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        {!isLoggedIn ? (
          <>
            <Text style={{ color: theme.colors.warn, fontWeight: "800", marginBottom: 10 }}>
              🔒 Login required to start a report.
            </Text>

            <PrimaryButton
              title="Go to Login"
              onPress={() => navigation.navigate("Profile")}
              icon={<Ionicons name="log-in" size={18} color="white" />}
            />
          </>
        ) : (
          <PrimaryButton
            title="Start Report"
            onPress={() => {}}
            icon={<Ionicons name="add" size={18} color="white" />}
          />
        )}
      </Card>
    </Screen>
  );
}
