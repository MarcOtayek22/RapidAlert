import React, { useMemo, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import { theme } from "../theme/theme";

export default function CommunityScreen() {
  const [tab, setTab] = useState("Needs"); // "Needs" | "Offers"

  // Examples strictly from your doc (Needs/Offers placeholders)
  const items = useMemo(() => {
    const needs = [
      { id: "n1", title: "Need blood donors" },
      { id: "n2", title: "Need transport" },
      { id: "n3", title: "Need shelter" },
    ];

    const offers = [
      { id: "o1", title: "I can drive" },
      { id: "o2", title: "I can host 2 people" },
      { id: "o3", title: "I have first aid kit" },
    ];

    return tab === "Needs" ? needs : offers;
  }, [tab]);

  const TabButton = ({ label }) => {
    const active = tab === label;
    return (
      <TouchableOpacity
        onPress={() => setTab(label)}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 14,
          alignItems: "center",
          backgroundColor: active ? theme.colors.cardStrong : "transparent",
          borderWidth: 1,
          borderColor: active ? theme.colors.border : theme.colors.divider,
        }}
      >
        <Text
          style={{
            color: active ? theme.colors.text : theme.colors.muted,
            fontWeight: "900",
            fontSize: 13,
          }}
        >
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <Screen>
      <Header title="Community Support" subtitle="Needs / Offers (Phase 1 placeholder)" />

      {/* Needs / Offers toggle */}
      <Card strong>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TabButton label="Needs" />
          <TabButton label="Offers" />
        </View>

        <View style={{ height: theme.spacing(2) }} />

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          {tab}
        </Text>
        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
          Phase 1 placeholder list (no backend yet).
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        {/* Placeholder list */}
        {items.map((it, idx) => (
          <View
            key={it.id}
            style={{
              paddingVertical: 12,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: theme.colors.divider,
            }}
          >
            <Text style={{ color: theme.colors.text, fontWeight: "800" }}>
              {it.title}
            </Text>
            <Text style={{ color: theme.colors.faint, marginTop: 4, fontSize: 12 }}>
              Tap actions + posting will come later.
            </Text>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
