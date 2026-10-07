import { Canvas, RoundedRect } from "@shopify/react-native-skia";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export type Bar = { label: string; value: number };

type Props = {
  data: Bar[];
  height: number;
  color: string;
  labelColor: string;
  formatValue: (v: number) => string;
  highlightLast?: boolean;
};

export function BarChart({
  data,
  height,
  color,
  labelColor,
  formatValue,
  highlightLast,
}: Props) {
  const [width, setWidth] = useState(0);
  const max = Math.max(1e-9, ...data.map((d) => d.value));
  const chartH = height - 18;
  const slot = data.length ? width / data.length : 0;
  const barW = Math.max(2, slot * 0.6);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      <Text style={[styles.max, { color: labelColor }]}>
        {formatValue(max)}
      </Text>
      <Canvas style={{ width, height: chartH }}>
        {data.map((d, i) => {
          const h = (d.value / max) * (chartH - 14);
          return (
            <RoundedRect
              key={i}
              x={i * slot + (slot - barW) / 2}
              y={chartH - h}
              width={barW}
              height={Math.max(h, 1)}
              r={3}
              color={color}
              opacity={highlightLast && i !== data.length - 1 ? 0.55 : 1}
            />
          );
        })}
      </Canvas>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text
            key={i}
            style={[styles.label, { color: labelColor, width: slot }]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  max: { position: "absolute", right: 0, top: 0, fontSize: 11 },
  labels: { flexDirection: "row", height: 18 },
  label: { fontSize: 10, textAlign: "center" },
});
