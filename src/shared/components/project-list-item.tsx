import { Pressable, StyleSheet, Text, View } from "react-native";
import { Project } from "../config/projects";
import { useThemeColor } from "../hooks/use-theme-color";
import { ThemedText } from "./themed-text";

type ProjectListItemProps = {
  project: Project;
  onPress: () => void;
};

export function ProjectListItem({ project, onPress }: ProjectListItemProps) {
  const muted = useThemeColor({}, "icon");
  const border = useThemeColor({ light: "#e0e0e0", dark: "#2c2f31" }, "icon");
  return (
    <Pressable
      style={[styles.card, { borderColor: border }]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.row}>
        <Text style={styles.emoji}>{project.emoji}</Text>
        <ThemedText style={styles.title}>{project.title}</ThemedText>
        <Text style={styles.dotAvailable}>●</Text>
      </View>
      <ThemedText style={[styles.subtitle, { color: muted }]}>
        {project.subtitle}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  emoji: {
    fontSize: 20,
    marginRight: 8,
  },
  title: {
    flex: 1,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: "600",
  },
  dotAvailable: {
    color: "green",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 15,
  },
});
