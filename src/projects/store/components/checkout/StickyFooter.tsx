import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { storeColors } from "../../constants/theme";

/**
 * Bottom action bar. Place it as a sibling AFTER the ScrollView inside a
 * KeyboardAvoidingView so the primary CTA rides above the keyboard.
 */
export default function StickyFooter({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderColor: storeColors.tertiary,
  },
});
