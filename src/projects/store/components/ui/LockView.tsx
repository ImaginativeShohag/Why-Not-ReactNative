import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import PrimaryButton from "./PrimaryButton";
import { storeColors } from "../../constants/theme";

type LockViewProps = {
  onUnlock: () => void;
  onSignOut: () => void;
};

/** Covers the navigator (without unmounting it) until biometric unlock. */
export default function LockView({ onUnlock, onSignOut }: LockViewProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="lock-closed" size={48} color={storeColors.accent} />
      <Text style={styles.title} accessibilityRole="header">
        Store is locked
      </Text>
      <Text style={styles.subtitle}>
        Unlock to continue where you left off.
      </Text>
      <PrimaryButton
        title="Unlock"
        onPress={onUnlock}
        style={styles.button}
        testID="store-unlock"
      />
      <PrimaryButton
        title="Sign out"
        onPress={onSignOut}
        variant="secondary"
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 15, color: storeColors.muted, textAlign: "center" },
  button: { alignSelf: "stretch" },
});
