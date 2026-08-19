import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

export function useComponentHeight() {
  const [height, setHeight] = useState(0);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setHeight(e.nativeEvent.layout.height);
  }, []);

  return { height, onLayout };
}
