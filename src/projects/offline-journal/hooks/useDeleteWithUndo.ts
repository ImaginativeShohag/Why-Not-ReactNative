import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Optimistic delete: the row disappears from the list immediately, the DB write
 * happens when the undo window closes. Filter `pendingId` out of your list data.
 *
 * Takes the commit function instead of a db handle, so it stays agnostic about
 * what "delete" means (soft delete + outbox, here).
 */
export function useDeleteWithUndo(
  commitDelete: (id: string) => Promise<void>,
  windowMs = 4000,
) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<string | null>(null);
  const commitRef = useRef(commitDelete);

  useEffect(() => {
    commitRef.current = commitDelete;
  }, [commitDelete]);

  const commit = useCallback(async (id: string) => {
    timer.current = null;
    pending.current = null;
    setPendingId(null);
    await commitRef.current(id);
  }, []);

  // Commit whatever is still waiting in the undo window, right now.
  const flushPending = useCallback(() => {
    if (timer.current && pending.current) {
      clearTimeout(timer.current);
      void commitRef.current(pending.current);
    }
  }, []);

  const remove = useCallback(
    (id: string) => {
      // A second swipe commits the first immediately rather than dropping it.
      flushPending();
      pending.current = id;
      setPendingId(id);
      timer.current = setTimeout(() => void commit(id), windowMs);
    },
    [commit, flushPending, windowMs],
  );

  const undo = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pending.current = null;
    setPendingId(null);
  }, []);

  // Leaving the screen must not silently cancel the delete the user asked for.
  // Refs, not state, so this runs once on unmount rather than on every change.
  useEffect(() => flushPending, [flushPending]);

  return { pendingId, remove, undo };
}
