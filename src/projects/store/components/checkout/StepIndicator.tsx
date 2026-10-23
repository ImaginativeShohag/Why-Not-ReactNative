import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { storeColors } from "../../constants/theme";

type StepIndicatorProps = {
  labels: string[];
  currentIndex: number;
};

/** ①──②──③──④ — tells the user how much is left, the top abandonment fix. */
export default function StepIndicator({
  labels,
  currentIndex,
}: StepIndicatorProps) {
  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentIndex + 1} of ${labels.length}: ${labels[currentIndex]}`}
      // 0-based so VoiceOver's percentage maths lands on 0–100 %; `text`
      // replaces the percentage with "Step N of M" where supported.
      accessibilityValue={{
        min: 0,
        max: Math.max(1, labels.length - 1),
        now: currentIndex,
        text: `Step ${currentIndex + 1} of ${labels.length}`,
      }}
    >
      <View style={styles.row}>
        {labels.map((label, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          return (
            <Fragment key={label}>
              {index > 0 ? (
                <View
                  style={[
                    styles.connector,
                    index <= currentIndex && styles.connectorDone,
                  ]}
                />
              ) : null}
              <View style={[styles.dot, (done || current) && styles.dotActive]}>
                <Text
                  style={[
                    styles.dotText,
                    (done || current) && styles.dotTextActive,
                  ]}
                >
                  {done ? "✓" : index + 1}
                </Text>
              </View>
            </Fragment>
          );
        })}
      </View>
      <Text style={styles.label}>{labels[currentIndex]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingVertical: 12, gap: 6 },
  row: { flexDirection: "row", alignItems: "center" },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1.5,
    borderColor: storeColors.tertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  dotActive: {
    backgroundColor: storeColors.accent,
    borderColor: storeColors.accent,
  },
  dotText: { fontSize: 13, fontWeight: "600", color: storeColors.muted },
  dotTextActive: { color: "#fff" },
  connector: {
    flex: 1,
    height: 2,
    backgroundColor: storeColors.separator,
    marginHorizontal: 4,
  },
  connectorDone: { backgroundColor: storeColors.accent },
  label: { fontSize: 20, fontWeight: "700" },
});
