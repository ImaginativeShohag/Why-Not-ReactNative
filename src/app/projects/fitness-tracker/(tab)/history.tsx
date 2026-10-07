import Ionicons from "@expo/vector-icons/Ionicons";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { Chip } from "@/src/projects/fitness-tracker/components/Chip";
import { WorkoutRow } from "@/src/projects/fitness-tracker/components/WorkoutRow";
import { usePalette } from "@/src/projects/fitness-tracker/constants/theme";
import { useWorkouts } from "@/src/projects/fitness-tracker/hooks/useWorkouts";
import {
  ACTIVITY_LABELS,
  type ActivityType,
} from "@/src/projects/fitness-tracker/models/Workout";
import ContentUnavailableView from "@/src/shared/components/ui/content-unavailable-view";

const FILTERS: (ActivityType | null)[] = [null, "run", "walk", "cycle", "hike"];

export default function HistoryScreen() {
  const router = useRouter();
  const palette = usePalette();
  const [type, setType] = useState<ActivityType | null>(null);
  const { data: workouts, loading } = useWorkouts(type);

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        style={styles.filterBar}
      >
        {FILTERS.map((f) => (
          <Chip
            key={f ?? "all"}
            label={f ? ACTIVITY_LABELS[f] : "All"}
            selected={type === f}
            onPress={() => setType(f)}
            color={palette.accent}
            textColor={palette.text}
            borderColor={palette.border}
          />
        ))}
      </ScrollView>
      <FlashList
        data={workouts}
        keyExtractor={(w) => w.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          loading ? null : (
            <ContentUnavailableView
              iconComponent={Ionicons}
              iconName="walk-outline"
              iconColor={palette.muted}
              title="No workouts"
              description="Finished workouts show up here."
              titleColor={palette.text}
              descriptionColor={palette.muted}
            />
          )
        }
        renderItem={({ item }) => (
          <WorkoutRow
            workout={item}
            textColor={palette.text}
            mutedColor={palette.muted}
            cardColor={palette.card}
            accent={palette.accent}
            onPress={(id) =>
              router.push({
                pathname: "/projects/fitness-tracker/workout/[id]",
                params: { id },
              })
            }
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  filterBar: { flexGrow: 0 },
  filters: { gap: 8, padding: 12 },
  list: { padding: 12, paddingTop: 0 },
});
