import { Pressable, StyleSheet, Text, View } from "react-native";
import { Project } from "../config/projects";

type ProjectListItemProps = {
  project: Project;
  onPress: () => void;
};

export function ProjectListItem({ project, onPress }: ProjectListItemProps) {
  return (
    <Pressable style={styles.card} onPress={onPress} accessibilityRole="button">
      <View style={styles.row}>
        <Text style={styles.emoji}>{project.emoji}</Text>
        <Text style={styles.title}>{project.title}</Text>
        <Text style={styles.dotAvailable}>●</Text>
      </View>
      <Text style={styles.subtitle}>{project.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
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
    fontWeight: "600",
  },
  dotAvailable: {
    color: "green",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
  },
});
