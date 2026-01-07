import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { theme } from "../theme/theme";

export default function VolunteerApplyScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Volunteer Application</Text>
      <Text style={styles.subtitle}>
        Phase 1 placeholder: upload docs + submit (no backend yet)
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Required Documents (placeholder)</Text>
        <Text style={styles.cardText}>• ID / Passport</Text>
        <Text style={styles.cardText}>• Proof of affiliation (optional)</Text>
        <Text style={styles.cardText}>• Short motivation / skills</Text>
      </View>

      <TouchableOpacity style={styles.primaryBtn} onPress={() => {}}>
        <Text style={styles.primaryBtnText}>Submit Application (placeholder)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.secondaryBtnText}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: theme.colors.bg0 },
  title: { fontSize: 28, fontWeight: "900", color: theme.colors.text, marginTop: 18 },
  subtitle: { marginTop: 8, color: theme.colors.muted, fontSize: 14, lineHeight: 20 },

  card: {
    marginTop: 18,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  cardTitle: { color: theme.colors.text, fontWeight: "800", fontSize: 16, marginBottom: 8 },
  cardText: { color: theme.colors.muted, fontSize: 14, marginTop: 4 },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: "center",
  },
  primaryBtnText: { color: theme.colors.text, fontWeight: "900" },

  secondaryBtn: { marginTop: 12, paddingVertical: 12, alignItems: "center" },
  secondaryBtnText: { color: theme.colors.muted, fontWeight: "800" },
});
