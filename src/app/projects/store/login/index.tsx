import BackgroundView from "@/src/projects/store/components/ui/background-view";
import { DEMO_CREDENTIALS } from "@/src/projects/store/constants/credentials";
import { getErrorMessage, useLogin } from "@/src/projects/store/hooks/useAuth";
import { Colors } from "@/src/shared/constants/theme";
import { useColorScheme } from "@/src/shared/hooks/use-color-scheme";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];
  const fieldBackground = colorScheme === "dark" ? "#2C2C2E" : "#F2F2F7";

  const [username, setUsername] = useState<string>(DEMO_CREDENTIALS.username);
  const [password, setPassword] = useState<string>(DEMO_CREDENTIALS.password);

  const login = useLogin();
  const errorMessage = getErrorMessage(login.error);
  const isLoading = login.isPending;
  const canSubmit = username.length > 0 && password.length > 0 && !isLoading;

  const handleLogin = () => {
    if (!canSubmit) return;

    login.mutate(
      { username, password },
      {
        // Equivalent of `popUpTo: Destination.Login.self, inclusive: true`:
        // replace drops the login screen from the stack.
        onSuccess: () => {
          router.replace("/projects/store/main");
        },
      },
    );
  };

  return (
    <SafeAreaView
      style={[styles.flex, { backgroundColor: colors.background }]}
      edges={["bottom", "left", "right"]}
    >
      <Stack.Screen
        options={{ title: "Store Overflow", headerTitleAlign: "center" }}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* The whole form is inert while the request is in flight. */}
        <View pointerEvents={isLoading ? "none" : "auto"}>
          <BackgroundView style={styles.header}>
            <Text style={styles.welcome}>Welcome to</Text>
            <Text style={styles.appName}>Store Overflow</Text>
          </BackgroundView>

          <View style={styles.form}>
            {errorMessage ? (
              <Animated.View
                entering={FadeIn}
                exiting={FadeOut}
                style={styles.errorBox}
              >
                <Text style={[styles.errorText, { color: colors.text }]}>
                  {errorMessage}
                </Text>
              </Animated.View>
            ) : null}

            <LabeledTextField
              label="Username"
              placeholder="Username"
              value={username}
              onChangeText={setUsername}
              editable={!isLoading}
              backgroundColor={fieldBackground}
              textColor={colors.text}
            />

            <LabeledTextField
              label="Password"
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
              backgroundColor={fieldBackground}
              textColor={colors.text}
              secureTextEntry
              onSubmitEditing={handleLogin}
            />

            <Pressable
              onPress={handleLogin}
              disabled={!canSubmit}
              style={({ pressed }) => [
                styles.button,
                !canSubmit && styles.buttonDisabled,
                pressed && styles.buttonPressed,
              ]}
            >
              <Animated.View
                layout={LinearTransition}
                style={styles.buttonContent}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Login</Text>
                )}
              </Animated.View>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type LabeledTextFieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  editable: boolean;
  backgroundColor: string;
  textColor: string;
  secureTextEntry?: boolean;
  onSubmitEditing?: () => void;
};

function LabeledTextField({
  label,
  placeholder,
  value,
  onChangeText,
  editable,
  backgroundColor,
  textColor,
  secureTextEntry,
  onSubmitEditing,
}: LabeledTextFieldProps) {
  return (
    <View style={[styles.field, { backgroundColor }]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#8E8E93"
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        secureTextEntry={secureTextEntry}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType={onSubmitEditing ? "go" : "next"}
        onSubmitEditing={onSubmitEditing}
        style={[styles.fieldInput, { color: textColor }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  header: {
    minHeight: 200,
    width: "100%",
    padding: 16,
    gap: 8,
  },
  welcome: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  appName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
  },
  form: {
    padding: 16,
    gap: 16,
  },
  errorBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#FFCC00",
    backgroundColor: "rgba(255, 204, 0, 0.2)",
  },
  errorText: {
    textAlign: "center",
    fontSize: 16,
  },
  field: {
    padding: 16,
    borderRadius: 16,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 13,
    color: "#8E8E93",
  },
  fieldInput: {
    fontSize: 16,
    padding: 0,
  },
  button: {
    alignSelf: "center",
    borderRadius: 100,
    backgroundColor: "#007AFF",
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonContent: {
    minHeight: 24,
    paddingVertical: 16,
    paddingHorizontal: 32,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
});
