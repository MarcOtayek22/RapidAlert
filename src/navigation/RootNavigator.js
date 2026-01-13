import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AppNavigator from "./AppNavigator";
import IncidentDetailsScreen from "../screens/IncidentDetailsScreen";
import VolunteerApplyScreen from "../screens/VolunteerApplyScreen";
import LocationDetailsScreen from "../screens/LocationDetailsScreen";

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={AppNavigator} />
      <Stack.Screen name="IncidentDetails" component={IncidentDetailsScreen} />
      <Stack.Screen name="LocationDetails" component={LocationDetailsScreen} />
      <Stack.Screen name="VolunteerApply" component={VolunteerApplyScreen} />
    </Stack.Navigator>
  );
}
