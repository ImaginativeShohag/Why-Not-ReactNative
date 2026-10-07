import { FlashList } from "@shopify/flash-list";
import {
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";

import { AssetCell } from "@/src/projects/camera-social/components/library/AssetCell";
import { Palette } from "@/src/projects/camera-social/constants/theme";
import type { LibraryAsset } from "@/src/projects/camera-social/models/Asset";

type Props = {
  assets: LibraryAsset[];
  selectedIds: ReadonlySet<string>;
  selecting: boolean;
  loadingMore: boolean;
  onEndReached: () => void;
  onPressAsset: (id: string) => void;
  onLongPressAsset: (id: string) => void;
  bottomInset?: number;
  columns?: number;
};

/** Virtualized, recycled 4-column grid — flat memory on a 5,000-photo library. */
export function AssetGrid({
  assets,
  selectedIds,
  selecting,
  loadingMore,
  onEndReached,
  onPressAsset,
  onLongPressAsset,
  bottomInset = 0,
  columns = 4,
}: Props) {
  const { width } = useWindowDimensions();
  const size = Math.floor(width / columns);

  return (
    <FlashList
      data={assets}
      numColumns={columns}
      keyExtractor={(a) => a.id}
      extraData={{ selectedIds, selecting }}
      renderItem={({ item }) => (
        <AssetCell
          id={item.id}
          uri={item.uri}
          size={size}
          isVideo={item.mediaType === "video"}
          durationSec={item.durationSec}
          selected={selectedIds.has(item.id)}
          selecting={selecting}
          onPress={onPressAsset}
          onLongPress={onLongPressAsset}
        />
      )}
      onEndReached={onEndReached}
      onEndReachedThreshold={1.5}
      contentContainerStyle={{ paddingBottom: bottomInset }}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footer}>
            <ActivityIndicator color={Palette.textMuted} />
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  footer: { paddingVertical: 24, alignItems: "center" },
});
