import { useRef, type ReactNode } from "react";
import { Pressable, StyleSheet } from "react-native";
import ReanimatedSwipeable, {
  SwipeDirection,
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";

import { usePalette } from "@/src/projects/offline-journal/hooks/usePalette";
import { ThemedText } from "@/src/shared/components/themed-text";

export type SwipeToDeleteProps = {
  children: ReactNode;
  onDelete: () => void;
};

export function SwipeToDelete({ children, onDelete }: SwipeToDeleteProps) {
  const palette = usePalette();
  const swipeableRef = useRef<SwipeableMethods>(null);
  // The Delete button is tappable while the open animation is still running,
  // so one gesture can reach both paths below. A second onDelete would flush
  // the first delete past its undo window, so commit once per open.
  const committedRef = useRef(false);

  const commit = () => {
    if (committedRef.current) return;
    committedRef.current = true;
    onDelete();
    // Close it, or a recycled list cell (or the row an undo brings back)
    // shows up already open with the guard still set.
    swipeableRef.current?.close();
  };

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2}
      rightThreshold={40}
      // Direction is the way the ROW moved: revealing the right-hand actions
      // drags the row left, so a full swipe reports LEFT, not RIGHT.
      onSwipeableOpen={(direction) => {
        if (direction === SwipeDirection.LEFT) commit();
      }}
      onSwipeableClose={() => {
        committedRef.current = false;
      }}
      renderRightActions={() => (
        <Pressable
          style={[styles.action, { backgroundColor: palette.danger }]}
          onPress={commit}
          accessibilityLabel="Delete entry"
        >
          <ThemedText style={styles.label}>Delete</ThemedText>
        </Pressable>
      )}
    >
      {children}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  action: {
    justifyContent: "center",
    paddingHorizontal: 24,
    marginBottom: 10,
    marginRight: 16,
    borderRadius: 12,
  },
  label: { color: "#fff", fontWeight: "600" },
});
