import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import type { Line } from "@/src/projects/tic-tac-toe/utils/game";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  line: Line;
  /** Width and height of the 3×3 grid the line is drawn over. */
  size: number;
  color: string;
  reduceMotion: boolean;
};

/** Centre of cell `index` in a grid of `size` points. */
function cellCenter(index: number, size: number) {
  const cell = size / 3;
  return {
    x: ((index % 3) + 0.5) * cell,
    y: (Math.floor(index / 3) + 0.5) * cell,
  };
}

/** Pure geometry: the stroke from the first to the last cell, overshooting both a little. */
export function winLineEndpoints(line: Line, size: number) {
  const start = cellCenter(line[0], size);
  const end = cellCenter(line[2], size);
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.hypot(dx, dy);
  const overshoot = size / 3 / 2.6;
  const ux = dx / distance;
  const uy = dy / distance;
  return {
    x1: start.x - ux * overshoot,
    y1: start.y - uy * overshoot,
    x2: end.x + ux * overshoot,
    y2: end.y + uy * overshoot,
    length: distance + overshoot * 2,
  };
}

/** A round-capped line that draws itself across the three winning cells. */
export function WinLine({ line, size, color, reduceMotion }: Props) {
  const { x1, y1, x2, y2, length } = winLineEndpoints(line, size);
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      return;
    }
    // Wait for the last mark to finish drawing.
    progress.set(
      withDelay(
        220,
        withTiming(1, { duration: 380, easing: Easing.out(Easing.cubic) }),
      ),
    );
  }, [progress, reduceMotion]);

  const lineProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - progress.get()),
  }));

  return (
    <Svg
      width={size}
      height={size}
      style={[StyleSheet.absoluteFill, { pointerEvents: "none" }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <AnimatedPath
        d={`M ${x1} ${y1} L ${x2} ${y2}`}
        stroke={color}
        strokeWidth={Math.max(6, size * 0.035)}
        strokeLinecap="round"
        strokeDasharray={length}
        strokeOpacity={0.9}
        fill="none"
        animatedProps={lineProps}
      />
    </Svg>
  );
}
