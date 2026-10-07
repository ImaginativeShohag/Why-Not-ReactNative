import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useMemo, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

type Props = {
  progress: number;
  size: number;
  color: string;
  trackColor: string;
  strokeWidth?: number;
  children?: ReactNode;
};

export function ProgressRing({
  progress,
  size,
  color,
  trackColor,
  strokeWidth = 12,
  children,
}: Props) {
  const path = useMemo(() => {
    const p = Skia.Path.Make();
    const r = size / 2 - strokeWidth / 2;
    // Start at 12 o'clock.
    p.addArc(
      { x: size / 2 - r, y: size / 2 - r, width: r * 2, height: r * 2 },
      -90,
      359.99,
    );
    return p;
  }, [size, strokeWidth]);

  return (
    <View style={{ width: size, height: size }}>
      <Canvas style={StyleSheet.absoluteFill}>
        <Path
          path={path}
          style="stroke"
          strokeWidth={strokeWidth}
          color={trackColor}
        />
        <Path
          path={path}
          style="stroke"
          strokeWidth={strokeWidth}
          color={color}
          strokeCap="round"
          start={0}
          end={Math.max(0, Math.min(1, progress))}
        />
      </Canvas>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: "center", justifyContent: "center" },
});
