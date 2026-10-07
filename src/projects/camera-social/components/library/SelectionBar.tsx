import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { SlideInDown, SlideOutDown } from "react-native-reanimated";

import { GlassView } from "@/src/projects/camera-social/components/common/GlassView";
import { Palette } from "@/src/projects/camera-social/constants/theme";

type Action = { label: string; onPress: () => void; disabled?: boolean };

type Props = {
  count: number;
  actions: Action[];
  busy?: boolean;
  bottomInset: number;
};

/** "2 selected      Edit  Share" — floats above the tab bar while selecting. */
export function SelectionBar({ count, actions, busy, bottomInset }: Props) {
  return (
    <Animated.View
      entering={SlideInDown.duration(180)}
      exiting={SlideOutDown.duration(150)}
      style={[styles.wrap, { bottom: bottomInset }]}
    >
      <GlassView style={styles.bar} intensity={70}>
        <Text style={styles.count}>
          {count === 0 ? "Select items" : `${count} selected`}
        </Text>
        <View style={styles.actions}>
          {busy ? <ActivityIndicator color={Palette.text} /> : null}
          {actions.map((a) => (
            <Pressable
              key={a.label}
              onPress={a.onPress}
              disabled={a.disabled || busy}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.action,
                { opacity: a.disabled || busy ? 0.35 : pressed ? 0.6 : 1 },
              ]}
            >
              <Text style={styles.actionText}>{a.label}</Text>
            </Pressable>
          ))}
        </View>
      </GlassView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 10, right: 10 },
  bar: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  count: { color: Palette.text, fontSize: 15, fontWeight: "600" },
  actions: { flexDirection: "row", alignItems: "center", gap: 18 },
  action: { paddingVertical: 4 },
  actionText: { color: Palette.accent, fontSize: 16, fontWeight: "700" },
});
