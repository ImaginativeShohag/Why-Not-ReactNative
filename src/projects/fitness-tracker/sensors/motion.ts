import { DeviceMotion } from "expo-sensors";

/**
 * Device-motion "is the user moving?" signal for auto-pause. Uses the
 * variance of user acceleration (gravity removed) over a short window:
 * walking/running produces rhythmic ~0.5–3 m/s² swings, a phone held at a
 * traffic light produces almost none. Foreground only — sensors are not
 * delivered to JS while suspended, so the background path uses GPS speed.
 */
export const MOVING_VARIANCE = 0.25;

export function watchMovement(
  onSample: (sample: { t: number; moving: boolean }) => void,
  intervalMs = 200,
) {
  DeviceMotion.setUpdateInterval(intervalMs);
  const window: number[] = [];
  const size = Math.max(5, Math.round(2000 / intervalMs));
  return DeviceMotion.addListener(({ acceleration }) => {
    if (!acceleration) return;
    const magnitude = Math.hypot(
      acceleration.x,
      acceleration.y,
      acceleration.z,
    );
    window.push(magnitude);
    if (window.length > size) window.shift();
    if (window.length < size) return;
    const mean = window.reduce((a, b) => a + b, 0) / window.length;
    const variance =
      window.reduce((a, b) => a + (b - mean) ** 2, 0) / window.length;
    onSample({ t: Date.now(), moving: variance > MOVING_VARIANCE });
  });
}
