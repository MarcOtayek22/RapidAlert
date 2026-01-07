import React from "react";
import { View, Text } from "react-native";
import { theme } from "../theme/theme";

export default function Header({ title, subtitle, right }) {
  return (
    <View
      style={{
        marginBottom: theme.spacing(2),
        flexDirection: "row",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: theme.spacing(2),
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.colors.text, ...theme.type.h1 }}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: theme.colors.faint, marginTop: 6, ...theme.type.body }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ? <View>{right}</View> : null}
    </View>
  );
}
