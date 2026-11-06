import { StyleSheet, View } from "react-native";

import type { TotalsRow } from "../../checkout/pricing";
import Text from "../ui/StoreText";
import { type StoreColors, useStoreStyles } from "../../constants/theme";

export default function TotalsView({ rows }: { rows: TotalsRow[] }) {
  const styles = useStoreStyles(createStyles);
  return (
    <View style={styles.container}>
      {rows.map((row) => (
        <View
          key={row.label}
          style={[styles.row, row.emphasis && styles.emphasisRow]}
          accessible
          accessibilityLabel={`${row.label} ${row.value}`}
        >
          <Text style={[styles.label, row.emphasis && styles.emphasis]}>
            {row.label}
          </Text>
          <Text
            style={[
              styles.value,
              row.emphasis && styles.emphasis,
              row.positive && styles.positive,
            ]}
          >
            {row.value}
          </Text>
        </View>
      ))}
    </View>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    container: { gap: 6 },
    row: { flexDirection: "row", justifyContent: "space-between" },
    emphasisRow: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: c.tertiary,
      paddingTop: 8,
      marginTop: 2,
    },
    label: { fontSize: 15, color: c.secondaryText },
    value: { fontSize: 15, color: c.label, fontVariant: ["tabular-nums"] },
    emphasis: { fontSize: 17, fontWeight: "700", color: c.label },
    positive: { color: c.success },
  });
