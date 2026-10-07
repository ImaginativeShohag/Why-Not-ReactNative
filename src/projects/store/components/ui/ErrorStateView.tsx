import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "./PrimaryButton";
import { storeColors } from "../../constants/theme";

type ErrorStateViewProps = {
  title?: string;
  message: string;
  retryLabel?: string;
  onRetry?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
};

export default function ErrorStateView({
  title = "Something went wrong",
  message,
  retryLabel = "Try again",
  onRetry,
  secondaryLabel,
  onSecondary,
}: ErrorStateViewProps) {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons
        name="alert-circle-outline"
        size={44}
        color={storeColors.muted}
      />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <PrimaryButton
          title={retryLabel}
          onPress={onRetry}
          style={styles.button}
        />
      ) : null}
      {onSecondary && secondaryLabel ? (
        <PrimaryButton
          title={secondaryLabel}
          onPress={onSecondary}
          variant="secondary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
  message: { fontSize: 15, color: storeColors.muted, textAlign: "center" },
  button: { alignSelf: "stretch", marginTop: 6 },
});
