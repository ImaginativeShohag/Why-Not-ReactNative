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
  /**
   * Label only every Nth bar, counting back from the last one. Each shown
   * label then gets N slots of width, so dense charts stay readable.
   */
  labelEvery?: number;
};

export function BarChart({
  data,
  height,
  color,
  labelColor,
  formatValue,
  highlightLast,
  labelEvery = 1,
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
        {data.map((d, i) =>
          (data.length - 1 - i) % labelEvery === 0 ? (
            <Text
              key={i}
              style={[
                styles.label,
                {
                  color: labelColor,
                  width: slot * labelEvery,
                  // Centre the wider label on its own bar.
                  left: (i + 0.5) * slot - (slot * labelEvery) / 2,
                },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {d.label}
            </Text>
          ) : null,
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  max: { position: "absolute", right: 0, top: 0, fontSize: 11 },
  labels: { height: 18 },
  label: { position: "absolute", top: 0, fontSize: 10, textAlign: "center" },
});
