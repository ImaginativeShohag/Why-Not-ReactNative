import { type StyleProp, StyleSheet, Text, type TextStyle } from "react-native";

import { storeColors } from "../../constants/theme";

export default function SectionHeader({
  title,
  style,
}: {
  title: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Text style={[styles.header, style]} accessibilityRole="header">
      {title.toUpperCase()}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 13,
    color: storeColors.muted,
    marginTop: 16,
    marginBottom: 6,
    letterSpacing: 0.5,
  },
});
