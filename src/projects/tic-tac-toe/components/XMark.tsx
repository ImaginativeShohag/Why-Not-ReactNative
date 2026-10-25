import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Props = {
  size: number;
  color: string;
  reduceMotion: boolean;
  strokeWidth?: number;
};

/** An X drawn as two round-capped strokes, one after the other. */
export function XMark({ size, color, reduceMotion, strokeWidth }: Props) {
  const stroke = strokeWidth ?? Math.max(3, size * 0.15);
  const a = stroke / 2 + size * 0.1;
  const b = size - a;
  const length = Math.SQRT2 * (b - a);

  const first = useSharedValue(reduceMotion ? 1 : 0);
  const second = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.7);

  useEffect(() => {
    if (reduceMotion) {
      first.set(1);
      second.set(1);
      scale.set(1);
      return;
    }
    const easing = Easing.out(Easing.cubic);
    first.set(withTiming(1, { duration: 180, easing }));
    second.set(withDelay(140, withTiming(1, { duration: 180, easing })));
    scale.set(withSpring(1, { damping: 11, stiffness: 240 }));
  }, [first, second, scale, reduceMotion]);

  const firstProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - first.get()),
  }));
  const secondProps = useAnimatedProps(() => ({
    strokeDashoffset: length * (1 - second.get()),
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size, pointerEvents: "none" }, popStyle]}
    >
      <Svg width={size} height={size}>
        <AnimatedPath
          d={`M ${a} ${a} L ${b} ${b}`}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          fill="none"
          animatedProps={firstProps}
        />
        <AnimatedPath
          d={`M ${b} ${a} L ${a} ${b}`}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          fill="none"
          animatedProps={secondProps}
        />
      </Svg>
    </Animated.View>
  );
}
