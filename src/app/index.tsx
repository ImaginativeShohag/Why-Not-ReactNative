import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { ScrollView } from "react-native-gesture-handler";
import { SafeAreaView } from "react-native-safe-area-context";
import { ProjectListItem } from "../shared/components/project-list-item";
import { ThemedText } from "../shared/components/themed-text";
import { PROJECTS } from "../shared/config/projects";
import { useThemeColor } from "../shared/hooks/use-theme-color";

export default function IndexScreen() {
  const router = useRouter();
  const muted = useThemeColor({}, "icon");

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
          <ThemedText style={styles.header}>Why Not ReactNative</ThemedText>
          <ThemedText style={[styles.subheader, { color: muted }]}>
            Pick an exercise
          </ThemedText>

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
    lineHeight: 26,
    fontWeight: "bold",
  },
  subheader: {
    fontSize: 14,
    lineHeight: 17,
    marginBottom: 16,
  },
});
