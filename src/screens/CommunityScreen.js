import React, { useMemo, useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import Screen from "../components/Screen";
import Header from "../components/Header";
import Card from "../components/Card";
import Chip from "../components/Chip";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../theme/theme";

export default function CommunityScreen() {
  const [tab, setTab] = useState("Needs"); // "Needs" | "Offers"

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

  const TabButton = ({ label, emoji, icon }) => {
    const active = tab === label; // ✅ logic unchanged (label still Needs/Offers)
    return (
      <TouchableOpacity
        onPress={() => setTab(label)}
        style={{
          flex: 1,
          paddingVertical: 12,
          borderRadius: 16,
          alignItems: "center",
          backgroundColor: active ? "rgba(255,59,48,0.10)" : "transparent",
          borderWidth: 1,
          borderColor: active ? "rgba(255,59,48,0.22)" : theme.colors.divider,
          flexDirection: "row",
          justifyContent: "center",
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 14 }}>{emoji}</Text>
        <Ionicons
          name={icon}
          size={16}
          color={active ? theme.colors.primary3 : theme.colors.muted}
        />
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
      <Header
        title="🤝 Community"
        subtitle="Needs / Offers (Phase 1 placeholder)"
        left={<Ionicons name="people" size={20} color={theme.colors.primary3} />}
      />

      <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap", marginBottom: theme.spacing(2) }}>
        <Chip icon="chatbubbles" text="Connect" />
        <Chip icon="medkit" text="Help" tone="success" />
        <Chip icon="share-social" text="Share" />
      </View>

      <Card strong>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TabButton label="Needs" emoji="🧩" icon="help-circle" />
          <TabButton label="Offers" emoji="🎁" icon="hand-left" />
        </View>

        <View style={{ height: theme.spacing(2) }} />

        <Text style={{ color: theme.colors.text, fontWeight: "900", fontSize: 16 }}>
          {tab === "Needs" ? "🧩 Needs" : "🎁 Offers"}
        </Text>
        <Text style={{ color: theme.colors.faint, marginTop: 8 }}>
          Phase 1 placeholder list (no backend yet).
        </Text>

        <View style={{ height: theme.spacing(2) }} />

        {items.map((it, idx) => (
          <View
            key={it.id}
            style={{
              paddingVertical: 12,
              borderTopWidth: idx === 0 ? 0 : 1,
              borderTopColor: theme.colors.divider,
              flexDirection: "row",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <Ionicons
              name={tab === "Needs" ? "alert-circle-outline" : "heart-outline"}
              size={18}
              color={theme.colors.primary3}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: "900" }}>{it.title}</Text>
              <Text style={{ color: theme.colors.faint, marginTop: 4, fontSize: 12 }}>
                Tap actions + posting will come later.
              </Text>
            </View>
          </View>
        ))}
      </Card>
    </Screen>
  );
}
