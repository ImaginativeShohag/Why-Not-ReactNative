import {
  Group,
  LinearGradient,
  Path,
  Rect,
  Skia,
  Text,
  matchFont,
  vec,
} from "@shopify/react-native-skia";
import { Platform } from "react-native";

export type ShareCardData = {
  title: string;
  date: string;
  stats: { label: string; value: string }[];
  /** Normalised route path from the workout thumbnail. */
  path: [number, number][];
};

export const SHARE_CARD_SIZE = { width: 1080, height: 1350 };

const family = Platform.select({ ios: "Helvetica", default: "sans-serif" });

/**
 * A pure Skia element tree — rendered offscreen with `drawAsImage`, never
 * mounted in the UI. Plain data in, picture out.
 */
export function ShareCard({ data }: { data: ShareCardData }) {
  const { width, height } = SHARE_CARD_SIZE;
  const titleFont = matchFont({
    fontFamily: family,
    fontSize: 72,
    fontWeight: "bold",
  });
  const valueFont = matchFont({
    fontFamily: family,
    fontSize: 64,
    fontWeight: "bold",
  });
  const labelFont = matchFont({
    fontFamily: family,
    fontSize: 30,
    fontWeight: "600",
  });

  const route = Skia.Path.Make();
  const box = { x: 90, y: 280, s: 620 };
  const offsetX = (width - box.s) / 2;
  data.path.forEach(([x, y], i) =>
    i === 0
      ? route.moveTo(offsetX + x * box.s, box.y + y * box.s)
      : route.lineTo(offsetX + x * box.s, box.y + y * box.s),
  );

  return (
    <Group>
      <Rect x={0} y={0} width={width} height={height}>
        <LinearGradient
          start={vec(0, 0)}
          end={vec(width, height)}
          colors={["#052e16", "#000000"]}
        />
      </Rect>
      <Text x={90} y={150} text={data.title} font={titleFont} color="#ffffff" />
      <Text x={90} y={210} text={data.date} font={labelFont} color="#9ca3af" />
      <Path
        path={route}
        style="stroke"
        strokeWidth={10}
        color="#22c55e"
        strokeJoin="round"
        strokeCap="round"
      />
      {data.stats.slice(0, 6).map((s, i) => {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = 90 + col * 320;
        const y = 1030 + row * 170;
        return (
          <Group key={s.label}>
            <Text x={x} y={y} text={s.value} font={valueFont} color="#ffffff" />
            <Text
              x={x}
              y={y + 48}
              text={s.label.toUpperCase()}
              font={labelFont}
              color="#22c55e"
            />
          </Group>
        );
      })}
      <Text
        x={90}
        y={height - 40}
        text="Why-Not-ReactNative"
        font={labelFont}
        color="#4b5563"
      />
    </Group>
  );
}
