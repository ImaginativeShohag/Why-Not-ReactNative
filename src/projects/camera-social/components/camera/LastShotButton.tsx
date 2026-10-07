import { Image } from "expo-image";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type LayoutChangeEvent,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

type Props = {
  thumbUri: string | null;
  pending: number;
  bump: SharedValue<number>;
  onPress: () => void;
  onLayout?: (e: LayoutChangeEvent) => void;
  iconRotation?: number;
};

/** Bottom-left "last shot" button; target of the fly-to-corner animation. */
export function LastShotButton({
  thumbUri,
  pending,
  bump,
  onPress,
  onLayout,
  iconRotation = 0,
}: Props) {
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: bump.get() }, { rotate: `${iconRotation}deg` }],
  }));
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open last capture"
      onLayout={onLayout}
    >
      <Animated.View style={[styles.box, style]}>
        {thumbUri ? (
          <Image
            source={{ uri: thumbUri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={120}
          />
        ) : null}
        {pending > 0 ? (
          <View style={styles.pending}>
            <ActivityIndicator color="#fff" size="small" />
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export const LAST_SHOT_SIZE = 52;

const styles = StyleSheet.create({
  box: {
    width: LAST_SHOT_SIZE,
    height: LAST_SHOT_SIZE,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  pending: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
});
