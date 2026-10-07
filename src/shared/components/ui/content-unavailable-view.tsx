import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useThemeColor } from "@/src/shared/hooks/use-theme-color";

type Props = {
  iconComponent: React.ComponentType<any>; // e.g. Ionicons, MaterialIcons
  iconName: string;
  iconSize?: number;
  iconColor?: string;
  title: string;
  description?: string;
  /** Overrides for screens with a fixed palette (e.g. always-dark camera). */
  titleColor?: string;
  descriptionColor?: string;
  action?: {
    label: string;
    onPress: () => void;
    color?: string;
    labelColor?: string;
  };
};

export default function ContentUnavailableView({
  iconComponent: IconSet,
  iconName,
  iconSize = 48,
  iconColor = "#8E8E93",
  title,
  description,
  titleColor,
  descriptionColor,
  action,
}: Props) {
  const themeTitleColor = useThemeColor({}, "text");
  const themeDescriptionColor = useThemeColor({}, "icon");

  return (
    <View style={styles.container}>
      <IconSet name={iconName} size={iconSize} color={iconColor} />
      <Text style={[styles.title, { color: titleColor ?? themeTitleColor }]}>
        {title}
      </Text>
      {description ? (
        <Text
          style={[
            styles.description,
            { color: descriptionColor ?? themeDescriptionColor },
          ]}
        >
          {description}
        </Text>
      ) : null}
      {action ? (
        <Pressable
          accessibilityRole="button"
          onPress={action.onPress}
          style={[
            styles.action,
            { backgroundColor: action.color ?? "#007AFF" },
          ]}
        >
          <Text
            style={[styles.actionLabel, { color: action.labelColor ?? "#fff" }]}
          >
            {action.label}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
  },
  description: {
    marginTop: 6,
    fontSize: 15,
    textAlign: "center",
  },
  action: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 999,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
});
