import { StyleSheet, Text, View } from "react-native";

import { GlassView } from "@/src/projects/camera-social/components/common/GlassView";
import {
  IconButton,
  type IconName,
} from "@/src/projects/camera-social/components/common/IconButton";
import { Palette } from "@/src/projects/camera-social/constants/theme";

export type FlashSetting = "off" | "on" | "auto" | "screen";

const FLASH_ICON: Record<FlashSetting, IconName> = {
  off: "flash-off",
  on: "flash",
  auto: "flash-outline",
  screen: "sunny",
};

type Props = {
  topInset: number;
  flash: FlashSetting;
  onCycleFlash: () => void;
  showTorch: boolean;
  torch: boolean;
  onToggleTorch: () => void;
  onSettings: () => void;
  onClose: () => void;
  /** "00:12" while recording; replaces the centre of the bar. */
  recordingLabel?: string | null;
  iconRotation?: number;
  disabled?: boolean;
};

/** Translucent top bar: flash · (torch) · timer · settings · close. */
export function CameraTopBar({
  topInset,
  flash,
  onCycleFlash,
  showTorch,
  torch,
  onToggleTorch,
  onSettings,
  onClose,
  recordingLabel,
  iconRotation = 0,
  disabled,
}: Props) {
  return (
    <GlassView style={[styles.bar, { paddingTop: topInset + 4 }]}>
      <View style={styles.side}>
        <IconButton
          icon={FLASH_ICON[flash]}
          label={flash}
          color={flash === "off" ? Palette.text : Palette.accent}
          onPress={onCycleFlash}
          disabled={disabled}
          accessibilityLabel={`Flash ${flash}`}
          iconRotation={iconRotation}
        />
        {showTorch ? (
          <IconButton
            icon={torch ? "flashlight" : "flashlight-outline"}
            color={torch ? Palette.accent : Palette.text}
            onPress={onToggleTorch}
            accessibilityLabel={torch ? "Torch on" : "Torch off"}
            iconRotation={iconRotation}
          />
        ) : null}
      </View>
      {recordingLabel ? (
        <View style={styles.timer}>
          <View style={styles.dot} />
          <Text style={styles.timerText}>{recordingLabel}</Text>
        </View>
      ) : null}
      <View style={[styles.side, styles.right]}>
        <IconButton
          icon="settings-outline"
          onPress={onSettings}
          disabled={disabled}
          accessibilityLabel="Camera settings"
          iconRotation={iconRotation}
        />
        <IconButton
          icon="close"
          size={28}
          onPress={onClose}
          disabled={disabled}
          accessibilityLabel="Close camera"
        />
      </View>
    </GlassView>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  side: { flexDirection: "row", alignItems: "center", gap: 6, minWidth: 90 },
  right: { justifyContent: "flex-end" },
  timer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Palette.record,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  timerText: {
    color: "#fff",
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
});
