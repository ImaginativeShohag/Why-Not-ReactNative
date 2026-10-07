import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useRef, useState, type ComponentProps, type ReactNode } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TimeStepper } from "@/src/projects/offline-journal/components/TimeStepper";
import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { scheduleDailyReminder } from "@/src/projects/offline-journal/reminders/scheduleReminder";
import { useSettingsStore } from "@/src/projects/offline-journal/stores/settingsStore";
import { formatClock } from "@/src/projects/offline-journal/utils/date";
import { ThemedText } from "@/src/shared/components/themed-text";

const SLIDES = 3;

export default function OnboardingScreen() {
  const palette = usePalette();
  const { width } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const reminder = useSettingsStore((state) => state.reminder);
  const patch = useSettingsStore((state) => state.patch);

  const goTo = (next: number) => {
    scroller.current?.scrollTo({ x: next * width, animated: true });
    setPage(next);
  };

  // This slide IS the pre-prompt rationale: by the time the one-shot system
  // dialog appears, the user has already chosen to see it.
  const enableReminder = async () => {
    const id = await scheduleDailyReminder(reminder.hour, reminder.minute);
    if (id) {
      patch({ reminder: { ...reminder, enabled: true } });
      goTo(2);
      return;
    }
    Alert.alert(
      "Notifications are off",
      "You can allow them in Settings any time — the journal works fine without.",
      [
        { text: "Continue", onPress: () => goTo(2) },
        { text: "Open Settings", onPress: () => void Linking.openSettings() },
      ],
    );
  };

  const finish = (compose: boolean) => {
    patch({ onboarded: true });
    router.replace("/projects/offline-journal");
    if (compose) router.push("/projects/offline-journal/entry/compose");
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: palette.paper }]}>
      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setPage(Math.round(event.nativeEvent.contentOffset.x / width))
        }
      >
        <Slide
          width={width}
          icon="lock-closed-outline"
          title="Private by default"
          body="Every entry lives on this device and works with the network off. Sync is optional, and you can add a Face ID lock in Settings."
        >
          <PrimaryButton label="Next" onPress={() => goTo(1)} />
        </Slide>

        <Slide
          width={width}
          icon="notifications-outline"
          title="A gentle nudge"
          body="One quiet reminder a day, at the time you choose. Nothing else, ever."
        >
          <TimeStepper
            hour={reminder.hour}
            minute={reminder.minute}
            onChange={(hour, minute) =>
              patch({ reminder: { ...reminder, hour, minute } })
            }
          />
          <PrimaryButton
            label={`Remind me at ${formatClock(reminder.hour, reminder.minute)}`}
            onPress={() => void enableReminder()}
          />
          <TextButton label="Not now" onPress={() => goTo(2)} />
        </Slide>

        <Slide
          width={width}
          icon="create-outline"
          title="Two lines is enough"
          body="What happened today? Write it down while it's fresh — it saves as you type."
        >
          <PrimaryButton
            label="Write my first entry"
            onPress={() => finish(true)}
          />
          <TextButton label="Go to my journal" onPress={() => finish(false)} />
        </Slide>
      </ScrollView>

      <View style={styles.dots}>
        {Array.from({ length: SLIDES }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === page ? palette.accent : palette.border },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

function Slide({
  width,
  icon,
  title,
  body,
  children,
}: {
  width: number;
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  body: string;
  children: ReactNode;
}) {
  const palette = usePalette();
  return (
    <View style={[styles.slide, { width }]}>
      <Ionicons name={icon} size={64} color={palette.accent} />
      <ThemedText type="title" style={[styles.title, { color: palette.text }]}>
        {title}
      </ThemedText>
      <ThemedText style={[styles.body, { color: palette.muted }]}>
        {body}
      </ThemedText>
      <View style={styles.actions}>{children}</View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[styles.primary, { backgroundColor: palette.accent }]}
    >
      <ThemedText style={{ color: palette.accentText, fontWeight: "600" }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

function TextButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const palette = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={8}>
      <ThemedText style={{ color: palette.muted }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  slide: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  title: { textAlign: "center", fontSize: 30, lineHeight: 36 },
  body: { textAlign: "center", fontSize: 17, lineHeight: 25 },
  actions: { alignItems: "center", gap: 16, marginTop: 24 },
  primary: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 26 },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
