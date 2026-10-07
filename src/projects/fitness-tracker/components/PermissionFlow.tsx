import { Pressable, StyleSheet, Text, View } from "react-native";

export type PermissionStep = {
  key: string;
  title: string;
  why: string;
  status: "granted" | "denied" | "undetermined" | "blocked";
  /** Disabled until the step before it is granted — order matters. */
  locked: boolean;
};

type Props = {
  steps: PermissionStep[];
  onRequest: (key: string) => void;
  onOpenSettings: () => void;
  colors: {
    text: string;
    muted: string;
    card: string;
    accent: string;
    warn: string;
    danger: string;
  };
};

const STATUS_LABEL = {
  granted: "Granted",
  denied: "Denied",
  undetermined: "Not asked",
  blocked: "Blocked",
};

/**
 * Dumb, ordered permission checklist. The screen owns the permission state
 * and decides what "request" means; this only renders it.
 */
export function PermissionFlow({
  steps,
  onRequest,
  onOpenSettings,
  colors,
}: Props) {
  return (
    <View style={{ gap: 12 }}>
      {steps.map((step, i) => {
        const statusColor =
          step.status === "granted"
            ? colors.accent
            : step.status === "blocked"
              ? colors.danger
              : colors.warn;
        const action =
          step.status === "granted"
            ? null
            : step.status === "blocked"
              ? "Open Settings"
              : "Allow";
        return (
          <View
            key={step.key}
            style={[
              styles.card,
              { backgroundColor: colors.card, opacity: step.locked ? 0.5 : 1 },
            ]}
          >
            <View style={styles.header}>
              <Text style={[styles.index, { color: colors.muted }]}>
                {i + 1}
              </Text>
              <Text style={[styles.title, { color: colors.text }]}>
                {step.title}
              </Text>
              <Text style={[styles.status, { color: statusColor }]}>
                {STATUS_LABEL[step.status]}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 13 }}>
              {step.why}
            </Text>
            {action ? (
              <Pressable
                disabled={step.locked}
                onPress={() =>
                  step.status === "blocked"
                    ? onOpenSettings()
                    : onRequest(step.key)
                }
                accessibilityRole="button"
                style={[styles.button, { backgroundColor: colors.accent }]}
              >
                <Text style={styles.buttonText}>{action}</Text>
              </Pressable>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, gap: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  index: { fontSize: 14, fontWeight: "800", width: 18 },
  title: { flex: 1, fontSize: 16, fontWeight: "700" },
  status: { fontSize: 13, fontWeight: "700" },
  button: {
    marginTop: 6,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "800" },
});
