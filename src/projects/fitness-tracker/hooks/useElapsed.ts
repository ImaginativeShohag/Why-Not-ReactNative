import { useEffect, useState } from "react";

import { activeElapsedMs, type Session } from "../tracking/state";

/**
 * Ticks once a second from persisted session timestamps — no in-memory stopwatch to lose.
 * `now` is exposed so callers can do other wall-clock checks off the same tick.
 */
export function useElapsed(session: Session | null) {
  const [now, setNow] = useState(() => Date.now());
  const running = session?.status === "active";
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [running]);
  return { elapsed: session ? activeElapsedMs(session, now) : 0, now };
}
