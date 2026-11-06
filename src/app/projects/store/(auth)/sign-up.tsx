import { useRef, useState } from "react";
import { ScrollView, StyleSheet, type TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import { validateSignUp } from "@/src/projects/store/checkout/validation";
import FormField from "@/src/projects/store/components/ui/FormField";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import { hasBackend } from "@/src/projects/store/constants/config";
import { useSignUp } from "@/src/projects/store/hooks/useAuth";
import Text from "@/src/projects/store/components/ui/StoreText";
import {
  type StoreColors,
  useStoreStyles,
} from "@/src/projects/store/constants/theme";

export default function SignUpScreen() {
  const styles = useStoreStyles(createStyles);
  const signUp = useSignUp();
  const usernameRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const errors = submitted ? validateSignUp({ email, username, password }) : {};
  const errorMessage = getErrorMessage(signUp.error);

  const handleSubmit = () => {
    setSubmitted(true);
    if (Object.keys(validateSignUp({ email, username, password })).length > 0)
      return;
    signUp.mutate({ email: email.trim(), username: username.trim(), password });
  };

  return (
    <SafeAreaView style={styles.flex} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <Text style={styles.title} accessibilityRole="header">
          Create your account
        </Text>
        {!hasBackend() ? (
          <Text style={styles.note}>
            Demo: FakeStoreAPI accepts sign-ups but doesn&apos;t persist them,
            so this creates a local demo session.
          </Text>
        ) : null}
        {errorMessage ? (
          <Text style={styles.error} accessibilityRole="alert">
            {errorMessage}
          </Text>
        ) : null}

        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          error={errors.email}
          textContentType="emailAddress"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => usernameRef.current?.focus()}
        />
        <FormField
          ref={usernameRef}
          label="Username"
          value={username}
          onChangeText={setUsername}
          error={errors.username}
          textContentType="username"
          autoComplete="username-new"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <FormField
          ref={passwordRef}
          label="Password"
          value={password}
          onChangeText={setPassword}
          error={errors.password}
          secureTextEntry
          // newPassword lets iOS offer a strong generated password.
          textContentType="newPassword"
          autoComplete="new-password"
          passwordRules="minlength: 8; required: lower; required: digit;"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={handleSubmit}
        />

        <PrimaryButton
          title="Create account"
          onPress={handleSubmit}
          loading={signUp.isPending}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    flex: { flex: 1, backgroundColor: c.card },
    content: { padding: 16, gap: 14 },
    title: { fontSize: 24, fontWeight: "700", color: c.label },
    note: { fontSize: 13, color: c.muted },
    error: { color: c.danger, fontSize: 15 },
  });
