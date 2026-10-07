import type React from "react";
import {
  type ImageStyle,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from "react-native";
import type { AnimatedProps } from "react-native-reanimated";
import Animated from "react-native-reanimated";

interface Props extends AnimatedProps<ViewProps> {
  style?: StyleProp<ImageStyle>;
  title: string;
  uri: string;
  rounded?: boolean;
  /** Pre-formatted price label. */
  priceLabel: string;
}

export const SlideItem: React.FC<Props> = ({
  style,
  title,
  uri,
  rounded = false,
  priceLabel,
  testID,
  ...animatedViewProps
}) => (
  <Animated.View
    testID={testID}
    style={{ flex: 1 }}
    accessible
    accessibilityRole="imagebutton"
    accessibilityLabel={`${title}, ${priceLabel}`}
    {...animatedViewProps}
  >
    <Animated.Image
      style={[style, styles.container, rounded && { borderRadius: 15 }]}
      source={{ uri }}
      resizeMode="cover"
    />
    <View style={styles.overlay}>
      <View style={styles.overlayTextContainer}>
        <Text style={styles.overlayText} numberOfLines={2}>
          {title}
        </Text>
      </View>
      <View style={styles.overlayTextContainer}>
        <Text style={styles.overlayText}>{priceLabel}</Text>
      </View>
    </View>
  </Animated.View>
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "#00000055",
    borderRadius: 16,
  },
  overlayText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  overlayTextContainer: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    padding: 10,
    borderRadius: 10,
    minWidth: 40,
    minHeight: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
