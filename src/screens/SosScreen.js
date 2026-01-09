import React from "react";
import { Text, View } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import PrimaryButton from "../components/PrimaryButton";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";
import { useAuth } from "../auth/AuthContext";
import { useNavigation } from "@react-navigation/native";

export default function SosScreen() {
  const { isLoggedIn } = useAuth();
  const navigation = useNavigation();

  return (
    <Screen>
      <Header title="SOS" subtitle="Emergency alert (next: hold-to-send)" />

      <Card strong>
        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          SOS is not active yet
        </Text>

        <View style={{ height: theme.spacing(1) }} />

        <Text style={{ color: theme.colors.faint }}>
          We will add: hold button → confirm → send location.
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        {!isLoggedIn ? (
          <>
            <Text style={{ color: theme.colors.warn, fontWeight: "800", marginBottom: 10 }}>
              Login required to use SOS.
            </Text>

            <PrimaryButton
              title="Go to Login"
              onPress={() => navigation.navigate("Profile")}
              icon={<Ionicons name="log-in" size={18} color="white" />}
            />
          </>
        ) : (
          <PrimaryButton
            title="Test SOS UI"
            onPress={() => {}}
            icon={<Ionicons name="radio" size={18} color="white" />}
          />
        )}
      </Card>
    </Screen>
  );
}
