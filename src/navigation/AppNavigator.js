import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

import MapScreen from "../screens/MapScreen";
import ReportScreen from "../screens/ReportScreen";
import SosScreen from "../screens/SosScreen";
import CommunityScreen from "../screens/CommunityScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          left: 16,
          right: 16,
          bottom: 14,
          height: 74,
          borderTopWidth: 0,
          borderRadius: 26,
          backgroundColor: "rgba(17,27,46,0.85)",
          paddingTop: 10,
          paddingBottom: 14,
        },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "700" },

        tabBarIcon: ({ color, size, focused }) => {
          const icons = {
            Map: focused ? "map" : "map-outline",
            Report: focused ? "add-circle" : "add-circle-outline",
            SOS: focused ? "radio" : "radio-outline",
            Community: focused ? "people" : "people-outline",
            Profile: focused ? "person" : "person-outline",
          };
          const name = icons[route.name] || "ellipse-outline";
          return <Ionicons name={name} size={size ?? 22} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Report" component={ReportScreen} />
      <Tab.Screen name="SOS" component={SosScreen} />
      <Tab.Screen name="Community" component={CommunityScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
