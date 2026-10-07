import { StyleSheet, View } from "react-native";

import {
  IconButton,
  type IconName,
} from "@/src/projects/camera-social/components/common/IconButton";
import { Palette } from "@/src/projects/camera-social/constants/theme";

export type EditorTool<T extends string> = {
  key: T;
  icon: IconName;
  label: string;
};

type Props<T extends string> = {
  tools: EditorTool<T>[];
  active: T | null;
  onTool: (key: T) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
};

/** "↶ Undo   ✂ Crop  ⟳ Rotate  ☀ Adjust   ↷ Redo". */
export function EditorToolbar<T extends string>({
  tools,
  active,
  onTool,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: Props<T>) {
  return (
    <View style={styles.row}>
      <IconButton
        icon="arrow-undo"
        label="Undo"
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityLabel="Undo"
      />
      <View style={styles.tools}>
        {tools.map((t) => (
          <IconButton
            key={t.key}
            icon={t.icon}
            label={t.label}
            color={active === t.key ? Palette.accent : Palette.text}
            onPress={() => onTool(t.key)}
            accessibilityLabel={t.label}
          />
        ))}
      </View>
      <IconButton
        icon="arrow-redo"
        label="Redo"
        onPress={onRedo}
        disabled={!canRedo}
        accessibilityLabel="Redo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tools: { flexDirection: "row", gap: 14 },
});
