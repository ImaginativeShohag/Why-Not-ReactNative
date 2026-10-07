import { Barometer } from "expo-sensors";

const SEA_LEVEL_HPA = 1013.25;

/**
 * International barometric formula. Absolute altitude from pressure drifts
 * with weather, but the *relative* change over a workout is far less noisy
 * than GPS altitude — which is why it's the better source for elevation gain.
 */
export function pressureToAltitude(hPa: number, seaLevel = SEA_LEVEL_HPA) {
  return 44330 * (1 - Math.pow(hPa / seaLevel, 1 / 5.255));
}

export async function isBarometerAvailable() {
  return Barometer.isAvailableAsync().catch(() => false);
}

/**
 * Emits relative altitude (m) since subscription. iOS provides
 * `relativeAltitude` from CMAltimeter directly; Android derives it from
 * pressure against the first reading.
 */
export function watchRelativeAltitude(
  onAltitude: (meters: number) => void,
  intervalMs = 1000,
) {
  Barometer.setUpdateInterval(intervalMs);
  let base: number | null = null;
  return Barometer.addListener(({ pressure, relativeAltitude }) => {
    if (relativeAltitude != null) {
      onAltitude(relativeAltitude);
      return;
    }
    const alt = pressureToAltitude(pressure);
    base ??= alt;
    onAltitude(alt - base);
  });
}
