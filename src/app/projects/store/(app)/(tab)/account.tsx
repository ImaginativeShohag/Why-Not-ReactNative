import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { type ComponentProps, useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";

import { storeApi } from "@/src/projects/store/api/client";
import { refreshCoordinator } from "@/src/projects/store/api/refreshCoordinator";
import { useSession } from "@/src/projects/store/auth/useSession";
import PrimaryButton from "@/src/projects/store/components/ui/PrimaryButton";
import SectionHeader from "@/src/projects/store/components/ui/SectionHeader";
import SegmentedControl from "@/src/projects/store/components/ui/SegmentedControl";
import type { SimulatedOutcome } from "@/src/projects/store/models/Payment";
import {
  askForOrderUpdates,
  getPushPermission,
  type PushPermission,
} from "@/src/projects/store/notifications/registerForPush";
import { useDevFlags } from "@/src/projects/store/utils/devFlags";
import { env } from "@/src/shared/constants/env";
import { storeColors } from "@/src/projects/store/constants/theme";

export default function AccountScreen() {
  const router = useRouter();
  const session = useSession();
  const [push, setPush] = useState<PushPermission>("undetermined");

  useEffect(() => {
    getPushPermission()
      .then(setPush)
      .catch(() => {});
  }, []);

  const enablePush = () => {
    // Rationale BEFORE the one-shot system prompt.
    askForOrderUpdates({
      title: "Get order updates?",
      message:
        "We'll notify you when your order is packed, shipped and delivered. No marketing unless you opt in.",
      confirmLabel: "Turn on",
      onResult: setPush,
    });
  };

  const toggleBiometric = async (enabled: boolean) => {
    const ok = await session.setBiometricEnabled(enabled);
    if (!ok && enabled) {
      Alert.alert(
        "Biometric unlock",
        "Face ID / fingerprint isn't available or wasn't confirmed.",
      );
    }
  };

  if (session.status !== "signedIn") {
    return (
      <ScrollView contentContainerStyle={styles.content}>
        <Ionicons
          name="person-circle-outline"
          size={72}
          color={storeColors.tertiary}
          style={styles.center}
        />
        <Text style={styles.title} accessibilityRole="header">
          You&apos;re browsing as a guest
        </Text>
        <Text style={styles.subtitle}>
          Sign in to check out, track orders and sync your bag across devices.
        </Text>
        <PrimaryButton
          title="Sign in"
          onPress={() => router.push("/projects/store/sign-in")}
        />
        <PrimaryButton
          title="Create account"
          variant="secondary"
          onPress={() => router.push("/projects/store/sign-up")}
        />
        <Row
          icon="heart-outline"
          label="Wishlist"
          onPress={() => router.push("/projects/store/wishlist")}
        />
        {env.variant !== "production" ? <DevMenu /> : null}
      </ScrollView>
    );
  }

  const { user } = session;
  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View
        style={styles.profile}
        accessible
        accessibilityLabel={`Signed in as ${user?.username}`}
      >
        <Ionicons name="person-circle" size={64} color={storeColors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.name}>{user?.displayName ?? user?.username}</Text>
          <Text style={styles.subtitle}>
            {user?.email ??
              `Signed in with ${user?.provider === "password" ? "password" : user?.provider}`}
          </Text>
        </View>
      </View>

      <SectionHeader title="Shopping" />
      <Row
        icon="receipt-outline"
        label="Orders"
        onPress={() => router.push("/projects/store/orders")}
      />
      <Row
        icon="heart-outline"
        label="Wishlist"
        onPress={() => router.push("/projects/store/wishlist")}
      />

      <SectionHeader title="Settings" />
      <View style={styles.row}>
        <Ionicons
          name="notifications-outline"
          size={22}
          color={storeColors.accent}
        />
        <Text style={styles.rowLabel}>Order updates</Text>
        {push === "granted" ? (
          <Text style={styles.rowValue}>On</Text>
        ) : push === "denied" ? (
          <Text style={styles.rowValue}>Off in Settings</Text>
        ) : (
          <Pressable
            onPress={enablePush}
            accessibilityRole="button"
            testID="enable-push"
          >
            <Text style={styles.link}>Turn on</Text>
          </Pressable>
        )}
      </View>
      <View style={styles.row}>
        <Ionicons
          name="finger-print-outline"
          size={22}
          color={storeColors.accent}
        />
        <Text style={styles.rowLabel}>Unlock with Face ID / fingerprint</Text>
        <Switch
          value={session.biometricEnabled}
          onValueChange={toggleBiometric}
          accessibilityLabel="Unlock with biometrics"
        />
      </View>

      <PrimaryButton
        title="Sign out"
        variant="destructive"
        onPress={() =>
          Alert.alert("Sign out", "Sign out from Store?", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Sign out",
              style: "destructive",
              onPress: () => session.signOut(),
            },
          ])
        }
        style={{ marginTop: 24 }}
        testID="sign-out"
      />

      {env.variant !== "production" ? <DevMenu /> : null}
    </ScrollView>
  );
}

function Row({
  icon,
  label,
  onPress,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={22} color={storeColors.accent} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={storeColors.tertiary} />
    </Pressable>
  );
}

const OUTCOMES: { value: SimulatedOutcome; label: string }[] = [
  { value: "succeed", label: "succeed" },
  { value: "decline", label: "decline" },
  { value: "network_drop", label: "network_drop" },
];

/**
 * Deliberate failure modes (non-production builds only). "Fire 6 requests"
 * is the M2 checkpoint: with forced 401s on, six parallel requests must
 * produce exactly one refresh and zero logouts.
 */
function DevMenu() {
  const flags = useDevFlags();
  const [lastRun, setLastRun] = useState<string | null>(null);

  const fireSix = async () => {
    refreshCoordinator.resetStats();
    const started = Date.now();
    const results = await Promise.allSettled(
      Array.from({ length: 6 }, (_, i) => storeApi.get(`/products/${i + 1}`)),
    );
    const ok = results.filter((r) => r.status === "fulfilled").length;
    setLastRun(
      `${ok}/6 succeeded · ${refreshCoordinator.refreshCount} refresh call(s) · ${Date.now() - started}ms`,
    );
  };

  return (
    <View style={styles.dev}>
      <SectionHeader title={`Developer (${env.variant})`} />
      <DevSwitch
        label="Force 401 on first attempt"
        value={flags.forceUnauthorized}
        onChange={(v) => flags.set({ forceUnauthorized: v })}
      />
      <DevSwitch
        label="Fail next token refresh"
        value={flags.failNextRefresh}
        onChange={(v) => flags.set({ failNextRefresh: v })}
      />
      <DevSwitch
        label="Fail wishlist writes"
        value={flags.failWishlistWrites}
        onChange={(v) => flags.set({ failWishlistWrites: v })}
      />
      <Text style={styles.devLabel}>Simulated payment outcome</Text>
      <SegmentedControl
        options={OUTCOMES}
        value={flags.simulatedPaymentOutcome}
        onChange={(outcome) => flags.set({ simulatedPaymentOutcome: outcome })}
        role="radio"
      />
      <PrimaryButton
        title="Fire 6 requests at once"
        variant="secondary"
        onPress={fireSix}
      />
      {lastRun ? <Text style={styles.devResult}>{lastRun}</Text> : null}
    </View>
  );
}

function DevSwitch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        accessibilityLabel={label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 48 },
  center: { alignSelf: "center" },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  subtitle: { fontSize: 14, color: storeColors.muted },
  profile: { flexDirection: "row", alignItems: "center", gap: 12 },
  name: { fontSize: 20, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  rowLabel: { flex: 1, fontSize: 16 },
  rowValue: { fontSize: 15, color: storeColors.muted },
  link: { color: storeColors.accent, fontWeight: "600", fontSize: 15 },
  dev: { marginTop: 24, gap: 8 },
  devLabel: { fontSize: 13, color: storeColors.muted },
  devResult: {
    fontSize: 13,
    color: storeColors.secondaryText,
    fontVariant: ["tabular-nums"],
  },
});
