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
    const tick = () => setNow(Date.now());
    // Refresh right away on resume instead of waiting up to a second.
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [running]);
  // `now` is stale for the first render after a resume (it stopped ticking at
  // the pause); never measure before the resume moment, or the clock flickers
  // back by the length of the pause.
  const at = Math.max(now, session?.resumedAt ?? 0);
  return { elapsed: session ? activeElapsedMs(session, at) : 0, now: at };
}
