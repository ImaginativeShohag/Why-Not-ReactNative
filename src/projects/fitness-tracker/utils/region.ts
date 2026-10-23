export type Coordinate = { latitude: number; longitude: number };
export type Region = Coordinate & {
  latitudeDelta: number;
  longitudeDelta: number;
};

/**
 * A map region that contains every coordinate, grown by `padding` (0.25 =
 * 25 % extra on each axis) so start/finish pins aren't on the edge. Used as
 * the initial region: right on the first frame, before `fitToCoordinates`
 * can run (it is ignored until the map is ready).
 */
export function regionForCoordinates(
  coords: readonly Coordinate[],
  padding = 0.25,
  minDelta = 0.005,
): Region | null {
  if (!coords.length) return null;
  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;
  for (const c of coords) {
    minLat = Math.min(minLat, c.latitude);
    maxLat = Math.max(maxLat, c.latitude);
    minLng = Math.min(minLng, c.longitude);
    maxLng = Math.max(maxLng, c.longitude);
  }
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(minDelta, (maxLat - minLat) * (1 + 2 * padding)),
    longitudeDelta: Math.max(minDelta, (maxLng - minLng) * (1 + 2 * padding)),
  };
}
