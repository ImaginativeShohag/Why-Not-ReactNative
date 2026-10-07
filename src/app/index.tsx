import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProjectListItem } from "../shared/components/project-list-item";
import { PROJECTS } from "../shared/config/projects";

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
              key={item.slug}
              project={item}
              onPress={() => router.push(item.route)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
});
