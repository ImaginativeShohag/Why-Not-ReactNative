import { Ionicons } from "@expo/vector-icons";
import { Link, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type TextInput,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { getErrorMessage } from "@/src/projects/store/api/errors";
import {
  isAppleSignInAvailable,
  signInWithApple,
  type SocialResult,
  useGoogleSignIn,
} from "@/src/projects/store/auth/socialSignIn";
import { useSession } from "@/src/projects/store/auth/useSession";
import { validateCredentials } from "@/src/projects/store/checkout/validation";
import BackgroundView from "@/src/projects/store/components/ui/background-view";
import FormField from "@/src/projects/store/components/ui/FormField";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import SocialButton from "@/src/projects/store/components/ui/SocialButton";
import { useSignIn } from "@/src/projects/store/hooks/useAuth";
import { env } from "@/src/shared/constants/env";
import { useThemeColor } from "@/src/shared/hooks/use-theme-color";
import { storeColors } from "@/src/projects/store/constants/theme";

// FakeStoreAPI's public demo user — offered as a one-tap fill in
// non-production builds only, instead of pre-filling the form from a
// hardcoded credentials file.
const DEMO_USER = { username: "mor_2314", password: "83r5^_" };

export default function SignInScreen() {
  const router = useRouter();
  const textColor = useThemeColor({}, "text");
  const backgroundColor = useThemeColor({}, "background");
  const session = useSession();
  const signIn = useSignIn();
  const google = useGoogleSignIn();
  const passwordRef = useRef<TextInput>(null);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [socialBusy, setSocialBusy] = useState<"apple" | "google" | null>(null);
  const [socialError, setSocialError] = useState<string | null>(null);

  useEffect(() => {
    isAppleSignInAvailable().then(setAppleAvailable);
  }, []);

  const validation = validateCredentials({ username, password });
  const errors = submitted ? validation : {};
  const errorMessage = getErrorMessage(signIn.error) ?? socialError;
  const busy = signIn.isPending || socialBusy !== null;

  const handleSubmit = () => {
    setSubmitted(true);
    setSocialError(null);
    if (Object.keys(validation).length > 0) return;
    // On success there is nothing to do here: the session flips to signedIn,
    // Stack.Protected removes (auth), and the (app) layout replays any
    // buffered destination.
    signIn.mutate({ username: username.trim(), password });
  };

  const handleSocial = async (
    provider: "apple" | "google",
    run: () => Promise<SocialResult>,
  ) => {
    setSocialError(null);
    signIn.reset();
    setSocialBusy(provider);
    try {
      const outcome = await run();
      // Cancelling the sheet is not an error: back to a clean idle state.
      if (outcome.type === "error") setSocialError(outcome.message);
      if (outcome.type === "success") {
        await session.completeSignIn(outcome.result, provider);
      }
    } finally {
      setSocialBusy(null);
    }
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor }]}
      edges={["bottom", "left", "right"]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <BackgroundView style={styles.header}>
          <Text style={styles.welcome}>Welcome back to</Text>
          <Text style={styles.appName} accessibilityRole="header">
            Store Overflow
          </Text>
        </BackgroundView>

        <View style={styles.form} pointerEvents={busy ? "none" : "auto"}>
          {errorMessage ? (
            <Animated.View
              entering={FadeIn}
              exiting={FadeOut}
              style={styles.errorBox}
              accessibilityRole="alert"
              accessibilityLiveRegion="assertive"
            >
              <Text style={[styles.errorText, { color: textColor }]}>
                {errorMessage}
              </Text>
            </Animated.View>
          ) : null}

          <FormField
            label="Username or email"
            placeholder="Username"
            value={username}
            onChangeText={setUsername}
            error={errors.username}
            textColor={textColor}
            textContentType="username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="sign-in-username"
          />

          <View>
            <FormField
              ref={passwordRef}
              label="Password"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              textColor={textColor}
              secureTextEntry={!showPassword}
              textContentType="password"
              autoComplete="current-password"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={handleSubmit}
              testID="sign-in-password"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={styles.eye}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel={
                showPassword ? "Hide password" : "Show password"
              }
            >
              <Ionicons
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color={storeColors.muted}
              />
            </Pressable>
          </View>

          <Link href="/projects/store/forgot" asChild>
            <Pressable style={styles.forgot} accessibilityRole="link">
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>
          </Link>

          <PrimaryButton
            title="Sign in"
            onPress={handleSubmit}
            loading={signIn.isPending}
            testID="sign-in-submit"
          />

          {env.variant !== "production" ? (
            <Pressable
              onPress={() => {
                setUsername(DEMO_USER.username);
                setPassword(DEMO_USER.password);
              }}
              accessibilityRole="button"
              testID="sign-in-fill-demo"
            >
              <Text style={styles.devLink}>
                Fill FakeStoreAPI demo user (dev)
              </Text>
            </Pressable>
          ) : null}

          {appleAvailable || google.available ? (
            <View style={styles.divider}>
              <View style={styles.rule} />
              <Text style={styles.or}>or</Text>
              <View style={styles.rule} />
            </View>
          ) : null}

          {/* App Store rule: offering Google sign-in requires offering Apple too. */}
          {appleAvailable ? (
            <SocialButton
              provider="apple"
              loading={socialBusy === "apple"}
              disabled={busy}
              onPress={() => handleSocial("apple", signInWithApple)}
            />
          ) : null}
          {google.available ? (
            <SocialButton
              provider="google"
              loading={socialBusy === "google"}
              disabled={busy}
              onPress={() => handleSocial("google", google.signIn)}
            />
          ) : null}

          <View style={styles.footerLinks}>
            {session.status === "signedOut" ? (
              <Pressable
                onPress={() => session.continueAsGuest()}
                accessibilityRole="button"
                testID="sign-in-guest"
              >
                <Text style={styles.link}>Continue as guest ›</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => router.back()}
                accessibilityRole="button"
              >
                <Text style={styles.link}>Keep browsing ›</Text>
              </Pressable>
            )}
            <Link href="/projects/store/sign-up" asChild>
              <Pressable accessibilityRole="link">
                <Text style={styles.link}>New here? Create account ›</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  header: { minHeight: 180, width: "100%", padding: 16, gap: 8 },
  welcome: { fontSize: 16, fontWeight: "bold", color: "#fff" },
  appName: { fontSize: 28, fontWeight: "bold", color: "#fff" },
  form: { padding: 16, gap: 14 },
  errorBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#FFCC00",
    backgroundColor: "rgba(255, 204, 0, 0.2)",
  },
  errorText: { textAlign: "center", fontSize: 15 },
  eye: { position: "absolute", right: 14, top: 30 },
  forgot: { alignSelf: "flex-end" },
  link: { color: storeColors.accent, fontSize: 15, fontWeight: "500" },
  devLink: { color: storeColors.muted, fontSize: 13, textAlign: "center" },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 4,
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: storeColors.tertiary,
  },
  or: { color: storeColors.muted },
  footerLinks: { gap: 14, alignItems: "center", marginTop: 8 },
});
