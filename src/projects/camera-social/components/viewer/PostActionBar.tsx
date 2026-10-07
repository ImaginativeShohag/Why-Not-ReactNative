import { StyleSheet, View } from "react-native";

import { IconButton } from "@/src/projects/camera-social/components/common/IconButton";
import { Palette, Spacing } from "@/src/projects/camera-social/constants/theme";

type Props = {
  favorite: boolean;
  editLabel: string;
  onFavorite: () => void;
  onEdit: () => void;
  onShare: () => void;
  onMore: () => void;
};

/** ♡ · Edit · Share · ⋯ row at the bottom of the viewer. */
export function PostActionBar({
  favorite,
  editLabel,
  onFavorite,
  onEdit,
  onShare,
  onMore,
}: Props) {
  return (
    <View style={styles.row}>
      <IconButton
        icon={favorite ? "heart" : "heart-outline"}
        color={favorite ? Palette.danger : Palette.text}
        label={favorite ? "Liked" : "Like"}
        onPress={onFavorite}
        accessibilityLabel={favorite ? "Remove favourite" : "Add favourite"}
      />
      <IconButton
        icon="options-outline"
        label={editLabel}
        onPress={onEdit}
        accessibilityLabel={editLabel}
      />
      <IconButton
        icon="share-outline"
        label="Share"
        onPress={onShare}
        accessibilityLabel="Share"
      />
      <IconButton
        icon="ellipsis-horizontal"
        label="More"
        onPress={onMore}
        accessibilityLabel="More actions"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
});
