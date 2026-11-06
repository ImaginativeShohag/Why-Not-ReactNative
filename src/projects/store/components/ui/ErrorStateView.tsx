import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import PrimaryButton from "./PrimaryButton";
import Text from "./StoreText";
import {
  type StoreColors,
  useStoreColors,
  useStoreStyles,
} from "../../constants/theme";

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
  const colors = useStoreColors();
  const styles = useStoreStyles(createStyles);
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={44} color={colors.muted} />
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

const createStyles = (c: StoreColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      gap: 10,
    },
    title: { fontSize: 18, fontWeight: "600", textAlign: "center" },
    message: { fontSize: 15, color: c.muted, textAlign: "center" },
    button: { alignSelf: "stretch", marginTop: 6 },
  });
