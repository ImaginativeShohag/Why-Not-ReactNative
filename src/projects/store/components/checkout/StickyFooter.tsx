import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type StoreColors, useStoreStyles } from "../../constants/theme";

/**
 * Bottom action bar. Place it as a sibling AFTER the ScrollView inside a
 * KeyboardAvoidingView so the primary CTA rides above the keyboard.
 */
export default function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const styles = useStoreStyles(createStyles);
  return (
    <View
      style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {children}
    </View>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    footer: {
      paddingHorizontal: 16,
      paddingTop: 12,
      gap: 8,
      backgroundColor: c.card,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderColor: c.tertiary,
    },
  });
