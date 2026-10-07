import type { StyleProp, TextStyle } from "react-native";

import { splitHighlights } from "@/src/projects/offline-journal/utils/text";
import { ThemedText } from "@/src/shared/components/themed-text";

export type HighlightedTextProps = {
  /** Text with MATCH_START / MATCH_END markers around the matches. */
  text: string;
  style?: StyleProp<TextStyle>;
  highlightStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
};

export function HighlightedText({
  text,
  style,
  highlightStyle,
  numberOfLines,
}: HighlightedTextProps) {
  return (
    <ThemedText style={style} numberOfLines={numberOfLines}>
      {splitHighlights(text).map((part, index) =>
        part.match ? (
          <ThemedText
            key={index}
            style={[style, { fontWeight: "700" }, highlightStyle]}
          >
            {part.text}
          </ThemedText>
        ) : (
          part.text
        ),
      )}
    </ThemedText>
  );
}
