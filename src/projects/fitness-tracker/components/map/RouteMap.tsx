import { useEffect, useMemo, useRef } from "react";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import MapView, { Marker, Polyline, type LatLng } from "react-native-maps";

import { env } from "@/src/shared/constants/env";

import type { ColoredSegment } from "../../utils/paceColor";
import { regionForCoordinates } from "../../utils/region";

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

/**
 * Android renders Google Maps, which throws natively (and takes the app down)
 * when the build has no API key. iOS uses Apple Maps and needs none.
 */
export function RouteMap(props: Props) {
  if (Platform.OS === "android" && !env.googleMapsConfigured) {
    return <MapUnavailable style={props.style} />;
  }
  return <RouteMapView {...props} />;
}

function MapUnavailable({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.map, styles.unavailable, style]}>
      <Text style={styles.unavailableTitle}>Map unavailable</Text>
      <Text style={styles.unavailableBody}>
        This build has no Google Maps API key. Set GOOGLE_MAPS_API_KEY and
        rebuild to see the route.
      </Text>
    </View>
  );
}

function RouteMapView({
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
  const ready = useRef(false);

  useEffect(() => {
    if (!follow) return;
    ref.current?.animateCamera({ center: follow, zoom: 16 }, { duration: 600 });
  }, [follow]);

  // fitToCoordinates is silently ignored before the map is ready (and before
  // it has a size), so fit on ready and on layout, and again if the route
  // changes after that. The bounds-based initial region covers the first frame.
  const fit = () => {
    if (!ready.current || !fitTo || fitTo.length < 2) return;
    ref.current?.fitToCoordinates(fitTo, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: false,
    });
  };
  const fitKey = fitTo?.length ?? 0;
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey]);

  const fitRegion = useMemo(
    () => (fitTo && fitTo.length > 1 ? regionForCoordinates(fitTo) : null),
    [fitTo],
  );
  const initial = follow ?? start ?? fitTo?.[0];

  return (
    <MapView
      ref={ref}
      style={[styles.map, style]}
      initialRegion={
        fitRegion ??
        (initial
          ? { ...initial, latitudeDelta: 0.01, longitudeDelta: 0.01 }
          : undefined)
      }
      onMapReady={() => {
        ready.current = true;
        fit();
      }}
      onLayout={fit}
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
  unavailable: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#E5E7EB",
  },
  unavailableTitle: { color: "#111827", fontSize: 17, fontWeight: "700" },
  unavailableBody: {
    color: "#4B5563",
    fontSize: 14,
    textAlign: "center",
    marginTop: 6,
  },
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
