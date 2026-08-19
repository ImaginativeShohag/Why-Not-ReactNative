import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { Project, PROJECTS } from "../shared/config/projects";

export default function IndexScreen() {
  const router = useRouter();

  return (
    <SafeAreaView
      style={{ flex: 1 }}
      edges={["top", "bottom", "left", "right"]}
    >
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        <View
          style={{
            flexDirection: "column",
          }}
        >
          <Text style={styles.header}>Why Not ReactNative</Text>
          <Text style={styles.subheader}>Pick an exercise</Text>

          {PROJECTS.map((item) => (
            <ProjectListItem
              key={item.title}
              project={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type ProjectListItemProps = {
  project: Project;
  onPress: () => void;
};

export function ProjectListItem({ project, onPress }: ProjectListItemProps) {
  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View style={styles.row}>
        <Text style={styles.emoji}>{project.emoji}</Text>
        <Text style={styles.title}>{project.title}</Text>
        <Text
          style={project.available ? styles.dotAvailable : styles.dotPlanned}
        >
          {project.available ? "●" : "○"}
        </Text>
      </View>
      <Text style={styles.subtitle}>{project.subtitle}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: "bold",
  },
  subheader: {
    fontSize: 14,
    color: "#666",
    marginBottom: 16,
  },
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
  dotPlanned: {
    color: "#bbb",
  },
  subtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#888",
  },
});
