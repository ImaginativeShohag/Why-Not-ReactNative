import Ionicons from "@expo/vector-icons/Ionicons";
import type { PermissionResponse } from "expo";
import * as Linking from "expo-linking";
import { useEffect, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { IconName } from "@/src/projects/camera-social/components/common/IconButton";
import { Palette } from "@/src/projects/camera-social/constants/theme";

/**
 * The permission state machine, once:
 *
 *   undetermined ─(rationale → "Allow")→ system prompt ─┬→ granted → children
 *                                                       └→ denied  → blocked screen → Settings
 *
 * Project-agnostic on purpose (camera, mic, media library here; location in
 * Project 04) — it only knows a PermissionResponse and three callbacks. It
 * lives in this slice until a second project needs it.
 */

export type GateState = "loading" | "rationale" | "blocked" | "granted";

export function gateState(status: PermissionResponse | null): GateState {
  if (!status) return "loading";
  if (status.granted) return "granted";
  // `canAskAgain` false means the OS won't show the prompt again — only
  // Settings can fix it. Asking anyway is the silent dead end.
  if (status.status === "denied" && !status.canAskAgain) return "blocked";
  return "rationale";
}

type Props = {
  status: PermissionResponse | null;
  onRequest: () => Promise<unknown>;
  /** Re-read the status (e.g. after returning from Settings). */
  onRecheck?: () => Promise<unknown>;
  icon: IconName;
  title: string;
  rationale: string;
  /** Shown on the blocked screen. */
  settingsHint?: string;
  onCancel?: () => void;
  children: ReactNode;
};

export function PermissionGate({
  status,
  onRequest,
  onRecheck,
  icon,
  title,
  rationale,
  settingsHint = "Access was turned off. You can turn it back on in Settings.",
  onCancel,
  children,
}: Props) {
  const [requesting, setRequesting] = useState(false);
  const state = gateState(status);

  // Returning from Settings doesn't re-render anything by itself.
  useEffect(() => {
    if (!onRecheck || state === "granted") return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") void onRecheck();
    });
    return () => sub.remove();
  }, [onRecheck, state]);

  if (state === "granted") return <>{children}</>;

  if (state === "loading") {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={Palette.text} />
      </View>
    );
  }

  const blocked = state === "blocked";
  const request = async () => {
    setRequesting(true);
    try {
      await onRequest();
    } finally {
      setRequesting(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconWrap}>
        <Ionicons
          name={blocked ? "lock-closed" : icon}
          size={40}
          color={Palette.text}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{blocked ? settingsHint : rationale}</Text>
      <Pressable
        accessibilityRole="button"
        onPress={blocked ? () => void Linking.openSettings() : request}
        disabled={requesting}
        style={({ pressed }) => [styles.primary, pressed && { opacity: 0.8 }]}
      >
        {requesting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.primaryText}>
            {blocked ? "Open Settings" : "Allow access"}
          </Text>
        )}
      </Pressable>
      {onCancel ? (
        <Pressable
          accessibilityRole="button"
          onPress={onCancel}
          style={styles.secondary}
        >
          <Text style={styles.secondaryText}>Not now</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: Palette.background,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Palette.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    color: Palette.text,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  body: {
    color: Palette.textMuted,
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 28,
  },
  primary: {
    backgroundColor: Palette.text,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 999,
    minWidth: 200,
    alignItems: "center",
  },
  primaryText: { color: "#000", fontWeight: "700", fontSize: 16 },
  secondary: { marginTop: 14, padding: 10 },
  secondaryText: { color: Palette.textMuted, fontSize: 15 },
});
