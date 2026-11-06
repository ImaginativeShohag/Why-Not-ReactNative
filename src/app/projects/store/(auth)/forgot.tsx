import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { requestPasswordReset } from "@/src/projects/store/api/auth.api";
import FormField from "@/src/projects/store/components/ui/FormField";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import { isValidEmail } from "@/src/projects/store/checkout/validation";
import Text from "@/src/projects/store/components/ui/StoreText";
import {
  type StoreColors,
  useStoreStyles,
} from "@/src/projects/store/constants/theme";

/**
 * Requests a reset email. The email carries a universal link
 * (https://<linkDomain>/reset?token=…); the token is verified by the backend,
 * never trusted by the app.
 */
export default function ForgotPasswordScreen() {
  const styles = useStoreStyles(createStyles);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const reset = useMutation({ mutationFn: requestPasswordReset });

  const emailError =
    submitted && !isValidEmail(email) ? "Enter a valid email" : undefined;

  const handleSubmit = () => {
    setSubmitted(true);
    if (!isValidEmail(email)) return;
    reset.mutate(email.trim());
  };

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {reset.isSuccess ? (
          <Text style={styles.body} accessibilityLiveRegion="polite">
            If an account exists for {email.trim()}, a reset link is on its way.
            Open it on this device to choose a new password.
          </Text>
        ) : (
          <>
            <Text style={styles.body}>
              Enter the email you signed up with and we&apos;ll send you a link
              to reset your password.
            </Text>
            {reset.error ? (
              <Text style={styles.error} accessibilityRole="alert">
                {getErrorMessage(reset.error)}
              </Text>
            ) : null}
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              error={emailError}
              textContentType="emailAddress"
              autoComplete="email"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleSubmit}
            />
            <PrimaryButton
              title="Send reset link"
              onPress={handleSubmit}
              loading={reset.isPending}
            />
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.card },
    content: { padding: 16, gap: 14 },
    body: { fontSize: 16, lineHeight: 22, color: c.label },
    error: { color: c.danger, fontSize: 15 },
  });
