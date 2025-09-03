import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  iconComponent: React.ComponentType<any>; // e.g. Ionicons, MaterialIcons
  iconName: string;
  iconSize?: number;
  iconColor?: string;
  title: string;
  description?: string;
};

export default function ContentUnavailableView({
  iconComponent: IconSet,
  iconName,
  iconSize = 48,
  iconColor = "#8E8E93",
  title,
  description,
}: Props) {
  return (
    <View style={styles.container}>
      <IconSet name={iconName} size={iconSize} color={iconColor} />
      <Text style={styles.title}>{title}</Text>
      {description ? (
        <Text style={styles.description}>{description}</Text>
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
    color: "#1C1C1E",
  },
  description: {
    marginTop: 6,
    fontSize: 15,
    textAlign: "center",
    color: "#6C6C70",
  },
});
