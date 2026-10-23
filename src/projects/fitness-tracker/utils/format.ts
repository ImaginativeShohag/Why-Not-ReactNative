const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");

/** 00:24:17 — always H:MM:SS once past an hour, MM:SS below. */
export function formatDuration(ms: number, alwaysHours = false) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0 || alwaysHours) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

/** 5'42" — minutes and seconds per km. Returns an em dash when unknown. */
export function formatPace(secPerKm: number | null | undefined) {
  if (secPerKm == null || !Number.isFinite(secPerKm) || secPerKm <= 0)
    return "—";
  // Slower than 60'/km is standing around, not a pace.
  if (secPerKm >= 3600) return "—";
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm - m * 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}'${pad(s)}"`;
}

export function formatKm(meters: number, digits = 2) {
  return (meters / 1000).toFixed(digits);
}

/** Chart label for a value already in km: "4.2 km". */
export function formatKmLabel(km: number) {
  return `${km.toFixed(1)} km`;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${formatKm(meters)} km`;
}

export function formatDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Locale-ordered short date for chart labels: "Mar 3" / "3 Mar". */
export function formatShortDate(ms: number) {
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "Morning Run" style default titles. */
export function defaultTitle(startedAt: number, label: string) {
  const h = new Date(startedAt).getHours();
  const part =
    h < 5
      ? "Night"
      : h < 12
        ? "Morning"
        : h < 17
          ? "Afternoon"
          : h < 21
            ? "Evening"
            : "Night";
  return `${part} ${label}`;
}
