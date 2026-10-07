import { useEffect, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";

import type { ColoredSegment } from "../../utils/paceColor";

export type SplitMarker = { coordinate: LatLng; label: string };

type Props = {
  /** Already simplified + pace-bucketed by the caller — never raw points. */
  segments: ColoredSegment[];
  splitMarkers?: SplitMarker[];
  start?: LatLng | null;
  end?: LatLng | null;
  /** When set, the camera follows this coordinate (active workout). */
  follow?: LatLng | null;
  /** When set, the camera fits these once (detail screen). */
  fitTo?: LatLng[];
  dark?: boolean;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function RouteMap({
  segments,
  splitMarkers = [],
  start,
  end,
  follow,
  fitTo,
  dark,
  interactive = true,
  style,
}: Props) {
  const ref = useRef<MapView>(null);
  const fitted = useRef(false);

  useEffect(() => {
    if (!follow) return;
    ref.current?.animateCamera({ center: follow, zoom: 16 }, { duration: 600 });
  }, [follow]);

  const fitKey = fitTo?.length ?? 0;
  useEffect(() => {
    if (!fitTo || fitTo.length < 2 || fitted.current) return;
    fitted.current = true;
    ref.current?.fitToCoordinates(fitTo, {
      edgePadding: { top: 40, right: 40, bottom: 40, left: 40 },
      animated: false,
    });
  }, [fitKey, fitTo]);

  const initial = follow ?? start ?? fitTo?.[0];

  return (
    <MapView
      ref={ref}
      style={[styles.map, style]}
      initialRegion={
        initial
          ? { ...initial, latitudeDelta: 0.01, longitudeDelta: 0.01 }
          : undefined
      }
      showsUserLocation={follow != null}
      userInterfaceStyle={dark ? "dark" : "light"}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      pitchEnabled={false}
      rotateEnabled={false}
      toolbarEnabled={false}
    >
      {segments.map((s, i) => (
        <Polyline
          key={i}
          coordinates={s.coordinates}
          strokeColor={s.color}
          strokeWidth={5}
          lineCap="round"
          lineJoin="round"
        />
      ))}
      {start ? (
        <Marker coordinate={start} pinColor="green" title="Start" />
      ) : null}
      {end ? <Marker coordinate={end} pinColor="red" title="Finish" /> : null}
      {splitMarkers.map((m) => (
        <Marker
          key={m.label}
          coordinate={m.coordinate}
          anchor={{ x: 0.5, y: 0.5 }}
          tracksViewChanges={false}
        >
          <View style={styles.split}>
            <Text style={styles.splitText}>{m.label}</Text>
          </View>
        </Marker>
      ))}
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
  split: {
    backgroundColor: "#111827",
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: "#fff",
  },
  splitText: { color: "#fff", fontSize: 11, fontWeight: "800" },
});
