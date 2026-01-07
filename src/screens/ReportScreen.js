import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function ReportScreen() {
  return (
    <Screen>
      <Header title="Report" subtitle="Create an incident report (UI first)" />

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          Report form (next)
        </Text>

        <View style={{ height: theme.spacing(1) }} />

        <Text style={{ color: theme.colors.faint }}>
          Category • Description • Photo • Location • Submit
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        <PrimaryButton
          title="Start Report"
          onPress={() => {}}
          icon={<Ionicons name="add" size={18} color="white" />}
        />
      </Card>
    </Screen>
  );
}
