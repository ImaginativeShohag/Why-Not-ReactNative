import { Pressable, StyleSheet, Text, View } from "react-native";

import { GlassView } from "@/src/projects/camera-social/components/common/GlassView";
import { Palette } from "@/src/projects/camera-social/constants/theme";

type Props = {
  type: string;
  data: string;
  isLink: boolean;
  onCopy: () => void;
  onOpen: () => void;
  onDismiss: () => void;
};

/** Result card for Scan mode. */
export function ScanResultCard({
  type,
  data,
  isLink,
  onCopy,
  onOpen,
  onDismiss,
}: Props) {
  return (
    <GlassView style={styles.card} intensity={60}>
      <Text style={styles.type}>{type.toUpperCase()}</Text>
      <Text style={styles.data} numberOfLines={3} selectable>
        {data}
      </Text>
      <View style={styles.actions}>
        <Action label="Copy" onPress={onCopy} />
        {isLink ? <Action label="Open" onPress={onOpen} primary /> : null}
        <Action label="Scan again" onPress={onDismiss} />
      </View>
    </GlassView>
  );
}

function Action({
  label,
  onPress,
  primary,
}: {
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.action,
        primary && styles.primary,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.actionText, primary && { color: "#000" }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 16, borderRadius: 18, padding: 16 },
  type: {
    color: Palette.accent,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  data: { color: Palette.text, fontSize: 16, marginTop: 6 },
  actions: { flexDirection: "row", gap: 8, marginTop: 14 },
  action: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.14)",
  },
  primary: { backgroundColor: Palette.accent },
  actionText: { color: Palette.text, fontWeight: "700" },
});
