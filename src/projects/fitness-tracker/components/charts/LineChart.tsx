import {
  Canvas,
  LinearGradient,
  Path,
  Skia,
  vec,
} from "@shopify/react-native-skia";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import type { SeriesPoint } from "../../tracking/metrics";

type Props = {
  data: SeriesPoint[];
  height: number;
  color: string;
  labelColor: string;
  formatY: (y: number) => string;
  /** Pace: lower is better, so draw it upside-down (faster = higher). */
  invert?: boolean;
  /** Cap drawn points; the series is downsampled by striding. */
  maxPoints?: number;
};

/** Minimal Skia line + area chart (victory-native isn't installed). */
export function LineChart({
  data,
  height,
  color,
  labelColor,
  formatY,
  invert,
  maxPoints = 300,
}: Props) {
  const [width, setWidth] = useState(0);

  const { line, area, min, max } = useMemo(() => {
    const stride = Math.max(1, Math.ceil(data.length / maxPoints));
    const pts = data.filter(
      (_, i) => i % stride === 0 || i === data.length - 1,
    );
    const line = Skia.Path.Make();
    const area = Skia.Path.Make();
    if (pts.length < 2 || width === 0) return { line, area, min: 0, max: 0 };
    const ys = pts.map((p) => p.y);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const minX = pts[0].x;
    const spanX = pts[pts.length - 1].x - minX || 1;
    const spanY = maxY - minY || 1;
    const pad = 4;
    const h = height - pad * 2;
    const toX = (x: number) => ((x - minX) / spanX) * width;
    const toY = (y: number) =>
      pad + (invert ? (y - minY) / spanY : 1 - (y - minY) / spanY) * h;
    pts.forEach((p, i) =>
      i === 0
        ? line.moveTo(toX(p.x), toY(p.y))
        : line.lineTo(toX(p.x), toY(p.y)),
    );
    area.addPath(line);
    area.lineTo(width, height);
    area.lineTo(0, height);
    area.close();
    return { line, area, min: minY, max: maxY };
  }, [data, width, height, invert, maxPoints]);

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={{ height }}
    >
      {data.length < 2 ? (
        <Text style={{ color: labelColor }}>Not enough data</Text>
      ) : (
        <>
          <Canvas style={StyleSheet.absoluteFill}>
            <Path path={area}>
              <LinearGradient
                start={vec(0, 0)}
                end={vec(0, height)}
                colors={[`${color}66`, `${color}00`]}
              />
            </Path>
            <Path
              path={line}
              style="stroke"
              strokeWidth={2}
              color={color}
              strokeJoin="round"
            />
          </Canvas>
          <Text style={[styles.label, styles.top, { color: labelColor }]}>
            {formatY(invert ? min : max)}
          </Text>
          <Text style={[styles.label, styles.bottom, { color: labelColor }]}>
            {formatY(invert ? max : min)}
          </Text>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: { position: "absolute", right: 0, fontSize: 11, fontWeight: "600" },
  top: { top: 0 },
  bottom: { bottom: 0 },
});
