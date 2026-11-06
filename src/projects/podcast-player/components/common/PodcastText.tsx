import { Text, type TextProps } from "react-native";

import { usePodcastColors } from "../../constants/theme";

/**
 * `Text` that defaults to the podcast player's text colour. React Native's own
 * `Text` is black unless told otherwise, which disappears on the dark scheme,
 * so the project imports this instead. A `color` in `style` still wins.
 */
export default function PodcastText({ style, ...rest }: TextProps) {
  const { text } = usePodcastColors();
  return <Text {...rest} style={[{ color: text }, style]} />;
}
