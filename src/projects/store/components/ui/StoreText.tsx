import { Text, type TextProps } from "react-native";

import { useStoreColors } from "../../constants/theme";

/**
 * `Text` that defaults to the store's label colour. React Native's own `Text`
 * is black unless told otherwise, which disappears on the dark background, so
 * the store imports this instead. A `color` in `style` still wins.
 */
export default function StoreText({ style, ...rest }: TextProps) {
  const { label } = useStoreColors();
  return <Text {...rest} style={[{ color: label }, style]} />;
}
