import Ionicons from "@expo/vector-icons/Ionicons";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Palette } from "@/src/projects/camera-social/constants/theme";
import type { LibraryAlbum } from "@/src/projects/camera-social/models/Asset";

type Props = {
  visible: boolean;
  albums: LibraryAlbum[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onClose: () => void;
};

/** "Recents ▼" album picker. `null` = all photos. */
export function AlbumPickerSheet({
  visible,
  albums,
  selectedId,
  onSelect,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const rows: { id: string | null; title: string }[] = [
    { id: null, title: "Recents" },
    ...albums,
  ];
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.scrim}
        onPress={onClose}
        accessibilityLabel="Close albums"
      />
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <Text style={styles.title}>Albums</Text>
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id ?? "__recents"}
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            return (
              <Pressable
                onPress={() => onSelect(item.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.row,
                  pressed && { backgroundColor: Palette.surfaceRaised },
                ]}
              >
                <Text
                  style={[
                    styles.rowText,
                    selected && { color: Palette.accent },
                  ]}
                >
                  {item.title}
                </Text>
                {selected ? (
                  <Ionicons name="checkmark" size={20} color={Palette.accent} />
                ) : null}
              </Pressable>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: Palette.scrim },
  sheet: {
    maxHeight: "65%",
    backgroundColor: Palette.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Palette.border,
    marginBottom: 8,
  },
  title: {
    color: Palette.text,
    fontSize: 17,
    fontWeight: "700",
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowText: { color: Palette.text, fontSize: 16 },
});
