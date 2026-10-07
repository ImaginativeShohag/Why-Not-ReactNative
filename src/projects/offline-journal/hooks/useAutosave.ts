import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

/**
 * Debounced autosave. Returns the last saved time for the quiet "Saved 07:13 ✓"
 * hint — never a spinner, the write is local and instant.
 */
export function useAutosave<T>(
  value: T,
  save: (value: T) => Promise<void>,
  delay = 800,
) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const latest = useRef({ value, save });
  const skipFirst = useRef(true);
  const dirty = useRef(false);

  useEffect(() => {
    latest.current = { value, save };
  }, [value, save]);

  const flush = useCallback(async () => {
    if (!dirty.current) return; // nothing typed since the last save
    dirty.current = false;
    await latest.current.save(latest.current.value);
    setSavedAt(new Date());
  }, []);

  useEffect(() => {
    if (skipFirst.current) {
      skipFirst.current = false; // don't write a draft the user never touched
      return;
    }
    dirty.current = true;
    const timer = setTimeout(() => void flush(), delay);
    return () => clearTimeout(timer);
  }, [value, delay, flush]);

  // The keystroke inside the debounce window must survive an app switch.
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") void flush();
    });
    return () => subscription.remove();
  }, [flush]);

  // ...and closing the modal with the swipe gesture instead of "Done".
  useEffect(() => () => void flush(), [flush]);

  return { savedAt, flush };
}
