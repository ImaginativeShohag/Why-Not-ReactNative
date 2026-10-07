import { Canvas, Path, Skia } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { View } from "react-native";

type Props = {
  /** Normalised [x, y] in 0..1, precomputed at finish (Douglas–Peucker'd). */
  path: [number, number][];
  size: number;
  color: string;
  background: string;
};

/**
 * "Static" route thumbnail for list rows: a Skia path, not a MapView. Fifty
 * rows of live maps would each spin up a native map and tile fetches.
 */
export function RouteThumbnail({ path, size, color, background }: Props) {
  const skPath = useMemo(() => {
    const p = Skia.Path.Make();
    const pad = size * 0.12;
    const s = size - pad * 2;
    path.forEach(([x, y], i) =>
      i === 0
        ? p.moveTo(pad + x * s, pad + y * s)
        : p.lineTo(pad + x * s, pad + y * s),
    );
    return p;
  }, [path, size]);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: 10,
        overflow: "hidden",
        backgroundColor: background,
      }}
    >
      {path.length > 1 ? (
        <Canvas style={{ width: size, height: size }}>
          <Path
            path={skPath}
            style="stroke"
            strokeWidth={2.5}
            color={color}
            strokeJoin="round"
            strokeCap="round"
          />
        </Canvas>
      ) : null}
    </View>
  );
}
