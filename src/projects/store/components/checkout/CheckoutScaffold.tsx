import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import StepIndicator from "./StepIndicator";
import StickyFooter from "./StickyFooter";

type CheckoutScaffoldProps = {
  stepLabels: string[];
  currentIndex: number;
  /** Header height, so the keyboard offset accounts for the nav bar. */
  keyboardOffset: number;
  error?: string | null;
  children: ReactNode;
  footer: ReactNode;
};

/**
 * Step indicator + scrollable body + sticky CTA that rides above the
 * keyboard. The footer is a sibling of the ScrollView inside the
 * KeyboardAvoidingView — that's what keeps "Continue" reachable while typing.
 */
export default function CheckoutScaffold({
  stepLabels,
  currentIndex,
  keyboardOffset,
  error,
  children,
  footer,
}: CheckoutScaffoldProps) {
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardOffset}
    >
      <View style={styles.flex}>
        <StepIndicator labels={stepLabels} currentIndex={currentIndex} />
        {error ? (
          <Text
            style={styles.error}
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {error}
          </Text>
        ) : null}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
        >
          {children}
        </ScrollView>
        <StickyFooter>{footer}</StickyFooter>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 24 },
  error: {
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,59,48,0.1)",
    color: "#C4271C",
    fontSize: 14,
  },
});
