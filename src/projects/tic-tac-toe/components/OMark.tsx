import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  color: string;
  reduceMotion: boolean;
  strokeWidth?: number;
};

/** An O drawn as one round-capped stroke, starting at 12 o'clock. */
export function OMark({ size, color, reduceMotion, strokeWidth }: Props) {
  const stroke = strokeWidth ?? Math.max(3, size * 0.15);
  const center = size / 2;
  const radius = center - stroke / 2 - size * 0.08;
  const circumference = 2 * Math.PI * radius;

  const progress = useSharedValue(reduceMotion ? 1 : 0);
  const scale = useSharedValue(reduceMotion ? 1 : 0.7);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(1);
      scale.set(1);
      return;
    }
    progress.set(
      withTiming(1, { duration: 340, easing: Easing.out(Easing.cubic) }),
    );
    scale.set(withSpring(1, { damping: 11, stiffness: 240 }));
  }, [progress, scale, reduceMotion]);

  const circleProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));
  const popStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size, pointerEvents: "none" }, popStyle]}
    >
      <Svg width={size} height={size}>
        <AnimatedCircle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          fill="none"
          // Rotate so the stroke starts at the top instead of 3 o'clock.
          rotation={-90}
          origin={`${center}, ${center}`}
          animatedProps={circleProps}
        />
      </Svg>
    </Animated.View>
  );
}
