import React, { useEffect, useRef } from "react";
import { View, Animated } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../theme/theme";

import MapScreen from "../screens/MapScreen";
import ReportScreen from "../screens/ReportScreen";
import SosScreen from "../screens/SosScreen";
import CommunityScreen from "../screens/CommunityScreen";
import ProfileScreen from "../screens/ProfileScreen";

const Tab = createBottomTabNavigator();

function TabIcon({ name, color, focused }) {
  const scale = useRef(new Animated.Value(1)).current;
  const lift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: focused ? 1.12 : 1, friction: 7, tension: 160, useNativeDriver: true }),
      Animated.spring(lift, { toValue: focused ? -2 : 0, friction: 7, tension: 160, useNativeDriver: true }),
    ]).start();
  }, [focused, scale, lift]);

  return (
    <Animated.View style={{ transform: [{ translateY: lift }, { scale }] }}>
      <Ionicons name={name} size={22} color={color} />
    </Animated.View>
  );
}

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: {
          position: "absolute",
          left: 14,
          right: 14,
          bottom: 12,
          height: 78,
          borderTopWidth: 0,
          borderRadius: 28,
          backgroundColor: "transparent",
          paddingTop: 10,
          paddingBottom: 14,
        },

        tabBarBackground: () => (
          <View style={{ flex: 1, borderRadius: 28, overflow: "hidden" }}>
            <LinearGradient
              colors={[
                "rgba(255,59,48,0.18)",
                "rgba(20,16,28,0.90)",
                "rgba(20,16,28,0.84)",
              ]}
              start={{ x: 0.05, y: 0 }}
              end={{ x: 0.95, y: 1 }}
              style={{ flex: 1 }}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 28,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.10)",
              }}
            />
          </View>
        ),

        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: "900" },

        tabBarIcon: ({ color, focused }) => {
          const icons = {
            Map: focused ? "map" : "map-outline",
            Report: focused ? "add-circle" : "add-circle-outline",
            SOS: focused ? "radio" : "radio-outline",
            Community: focused ? "people" : "people-outline",
            Profile: focused ? "person" : "person-outline",
          };
          return <TabIcon name={icons[route.name] || "ellipse-outline"} color={color} focused={focused} />;
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
