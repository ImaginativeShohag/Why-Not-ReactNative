import { type StyleProp, StyleSheet, type TextStyle } from "react-native";

import Text from "./StoreText";
import { type StoreColors, useStoreStyles } from "../../constants/theme";

export default function SectionHeader({
  title,
  style,
}: {
  title: string;
  style?: StyleProp<TextStyle>;
}) {
  const styles = useStoreStyles(createStyles);
  return (
    <Text style={[styles.header, style]} accessibilityRole="header">
      {title.toUpperCase()}
    </Text>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    header: {
      fontSize: 13,
      color: c.muted,
      marginTop: 16,
      marginBottom: 6,
      letterSpacing: 0.5,
    },
  });
