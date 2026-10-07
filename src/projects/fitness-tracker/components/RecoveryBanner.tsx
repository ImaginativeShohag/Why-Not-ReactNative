import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  title: string;
  subtitle: string;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
  color: string;
};

/** Shown on launch when a workout was running when the process died. */
export function RecoveryBanner({
  title,
  subtitle,
  onResume,
  onFinish,
  onDiscard,
  color,
}: Props) {
  return (
    <View style={[styles.box, { borderColor: color }]}>
      <Text style={[styles.title, { color }]}>{title}</Text>
      <Text style={styles.sub}>{subtitle}</Text>
      <View style={styles.row}>
        <Action label="Resume" onPress={onResume} color={color} filled />
        <Action label="Finish" onPress={onFinish} color={color} />
        <Action label="Discard" onPress={onDiscard} color="#9ca3af" />
      </View>
    </View>
  );
}

function Action({
  label,
  onPress,
  color,
  filled,
}: {
  label: string;
  onPress: () => void;
  color: string;
  filled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={[
        styles.action,
        { borderColor: color, backgroundColor: filled ? color : "transparent" },
      ]}
    >
      <Text style={{ color: filled ? "#fff" : color, fontWeight: "700" }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 2, borderRadius: 16, padding: 14, gap: 6 },
  title: { fontSize: 17, fontWeight: "800" },
  sub: { color: "#9ca3af", fontSize: 13 },
  row: { flexDirection: "row", gap: 8, marginTop: 6 },
  action: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
});
