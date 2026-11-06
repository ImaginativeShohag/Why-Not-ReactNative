import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import Text from "../ui/StoreText";
import { type StoreColors, useStoreStyles } from "../../constants/theme";
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
  const styles = useStoreStyles(createStyles);
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

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    flex: { flex: 1 },
    content: { padding: 16, gap: 12, paddingBottom: 24 },
    error: {
      marginHorizontal: 16,
      padding: 12,
      borderRadius: 10,
      backgroundColor: c.dangerSoft,
      color: c.dangerText,
      fontSize: 14,
    },
  });
