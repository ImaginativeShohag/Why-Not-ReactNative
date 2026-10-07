import { Fragment } from "react";
import { StyleSheet, Text, View } from "react-native";

import { storeColors } from "../../constants/theme";

type OrderStatusTimelineProps = {
  labels: string[];
  /** Index of the latest reached step, -1 when none. */
  currentIndex: number;
};

/** ●━━━━●━━━━○────○  Placed · Packed · Shipped · Delivered */
export default function OrderStatusTimeline({
  labels,
  currentIndex,
}: OrderStatusTimelineProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={
        currentIndex >= 0
          ? `Order status: ${labels[currentIndex]}`
          : "Order status: not started"
      }
      style={styles.container}
    >
      <View style={styles.row}>
        {labels.map((label, index) => (
          <Fragment key={label}>
            {index > 0 ? (
              <View
                style={[styles.bar, index <= currentIndex && styles.barDone]}
              />
            ) : null}
            <View
              style={[styles.dot, index <= currentIndex && styles.dotDone]}
            />
          </Fragment>
        ))}
      </View>
      <View style={styles.labels}>
        {labels.map((label, index) => (
          <Text
            key={label}
            style={[
              styles.label,
              index === currentIndex && styles.labelCurrent,
            ]}
            numberOfLines={1}
          >
            {label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8 },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: storeColors.separator,
  },
  dotDone: { backgroundColor: storeColors.success },
  bar: { flex: 1, height: 3, backgroundColor: storeColors.separator },
  barDone: { backgroundColor: storeColors.success },
  labels: { flexDirection: "row", justifyContent: "space-between" },
  label: {
    fontSize: 12,
    color: storeColors.muted,
    flex: 1,
    textAlign: "center",
  },
  labelCurrent: { color: "#000", fontWeight: "600" },
});
