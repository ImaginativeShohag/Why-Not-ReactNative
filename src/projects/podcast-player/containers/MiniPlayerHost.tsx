import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useSegments } from "expo-router";
import { useEffect, useState, type ReactNode } from "react";
import { StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { scheduleOnRN } from "react-native-worklets";

import { ProgressBar } from "@/src/projects/podcast-player/components/episode/ProgressBar";
import { Artwork } from "@/src/projects/podcast-player/components/podcast/Artwork";
import { MiniPlayer } from "@/src/projects/podcast-player/components/player/MiniPlayer";
import {
  MINI_PLAYER_GAP,
  MINI_PLAYER_HEIGHT,
  TAB_BAR_HEIGHT,
} from "@/src/projects/podcast-player/constants/layout";
import { playbackService } from "@/src/projects/podcast-player/playback/service";
import { usePlayerStore } from "@/src/projects/podcast-player/stores/playerStore";
import {
  accentFromSeed,
  PodcastTheme,
  shade,
} from "@/src/projects/podcast-player/utils/color";

const SPRING = { damping: 22, stiffness: 220, mass: 0.9 };

/**
 * Wraps the PROJECT stack (not the root) so the mini-player persists across
 * every podcast screen and disappears when the user backs out to the
 * launcher. A container, so it lives in containers/ rather than components/:
 * it bridges the player store + service to the dumb <MiniPlayer>.
 *
 * Drag-to-expand: one shared value `expand` (0 → 1) drives the rising sheet,
 * the growing artwork, the gradient fade and the mini-player fade. Past the
 * threshold it settles at 1 and hands over to the /player modal route
 * (pushed with no animation, so the handover is invisible).
 */
export function MiniPlayerHost({ children }: { children: ReactNode }) {
  const router = useRouter();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const nowPlaying = usePlayerStore((s) => s.nowPlaying);
  const playing = usePlayerStore((s) => s.status.playing);
  const buffering = usePlayerStore((s) => s.status.buffering);
  const hasNext = usePlayerStore((s) => s.queue.length > 0);

  const [dragging, setDragging] = useState(false);
  const expand = useSharedValue(0);

  const onTabs = segments.includes("(tab)");
  const onPlayer = segments[segments.length - 1] === "player";
  const dockBottom =
    (onTabs ? TAB_BAR_HEIGHT + insets.bottom : insets.bottom) + MINI_PLAYER_GAP;
  const travel = Math.max(1, height - dockBottom - MINI_PLAYER_HEIGHT);
  const accent = accentFromSeed(
    nowPlaying?.artworkUrl ?? nowPlaying?.podcastId,
  );

  // Reset the drag preview once the player route is on top of it (instead of
  // guessing how long the push takes). State is adjusted during render; the
  // shared value is written from the effect below the gesture.
  const [prevOnPlayer, setPrevOnPlayer] = useState(onPlayer);
  if (onPlayer !== prevOnPlayer) {
    setPrevOnPlayer(onPlayer);
    if (onPlayer) setDragging(false);
  }

  const openPlayer = (from: "tap" | "drag") => {
    router.push({
      pathname: "/projects/podcast-player/player",
      params: { from },
    });
  };

  const pan = Gesture.Pan()
    .activeOffsetY([-8, 8])
    .failOffsetX([-20, 20])
    .onStart(() => {
      scheduleOnRN(setDragging, true);
    })
    .onUpdate((e) => {
      expand.value = Math.max(0, Math.min(1, -e.translationY / travel));
    })
    .onEnd((e) => {
      const open = expand.value > 0.35 || e.velocityY < -900;
      if (open) {
        expand.value = withSpring(
          1,
          { ...SPRING, velocity: -e.velocityY / travel },
          (done) => {
            if (done) scheduleOnRN(openPlayer, "drag");
          },
        );
      } else {
        expand.value = withSpring(0, SPRING, (done) => {
          if (done) scheduleOnRN(setDragging, false);
        });
      }
    });

  useEffect(() => {
    if (onPlayer) expand.set(0);
  }, [onPlayer, expand]);

  const miniStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.value, [0, 0.25], [1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: -expand.value * travel }],
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - expand.value) * travel }],
    borderTopLeftRadius: interpolate(expand.value, [0, 1], [14, 0]),
    borderTopRightRadius: interpolate(expand.value, [0, 1], [14, 0]),
  }));
  const gradientStyle = useAnimatedStyle(() => ({ opacity: expand.value }));
  const artSize = Math.min(width - 64, 340);
  const artStyle = useAnimatedStyle(() => {
    const scale = interpolate(
      expand.value,
      [0, 1],
      [44 / artSize, 1],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        {
          translateX: interpolate(expand.value, [0, 1], [-(width / 2 - 32), 0]),
        },
        {
          translateY: interpolate(
            expand.value,
            [0, 1],
            [-(artSize / 2) + 10, 0],
          ),
        },
        { scale },
      ],
    };
  });

  const showMini = !!nowPlaying && !onPlayer;

  return (
    <View style={styles.root}>
      {children}
      {showMini && dragging ? (
        <Animated.View
          pointerEvents="none"
          style={[styles.sheet, { height }, sheetStyle]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, gradientStyle]}>
            <LinearGradient
              colors={[
                shade(accent, 0.15),
                shade(accent, 0.6),
                PodcastTheme.background,
              ]}
              locations={[0, 0.45, 1]}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
          <View
            style={[
              styles.previewContent,
              { paddingTop: insets.top + 8 + 44 + 16 },
            ]}
          >
            <Animated.View style={artStyle}>
              <Artwork
                uri={nowPlaying.artworkUrl}
                size={artSize}
                title={nowPlaying.podcastTitle}
                radius={16}
              />
            </Animated.View>
            <Animated.View style={[styles.previewTitles, gradientStyle]}>
              <Text style={styles.previewTitle} numberOfLines={2}>
                {nowPlaying.title}
              </Text>
              <Text style={styles.previewPodcast}>
                {nowPlaying.podcastTitle}
              </Text>
            </Animated.View>
          </View>
        </Animated.View>
      ) : null}
      {showMini ? (
        <GestureDetector gesture={pan}>
          <Animated.View
            style={[styles.dock, { bottom: dockBottom }, miniStyle]}
          >
            <MiniPlayer
              title={nowPlaying.title}
              subtitle={nowPlaying.podcastTitle}
              artworkUrl={nowPlaying.artworkUrl}
              accent={accent}
              playing={playing}
              buffering={buffering}
              progressBar={<NowPlayingProgress />}
              hasNext={hasNext}
              onPress={() => openPlayer("tap")}
              onTogglePlay={() => playbackService.toggle()}
              onNext={() => void playbackService.next()}
            />
          </Animated.View>
        </GestureDetector>
      ) : null}
    </View>
  );
}

/** Subscribes to the position on its own, so only the bar re-renders 2×/s. */
function NowPlayingProgress() {
  const position = usePlayerStore((s) => s.status.position);
  const duration = usePlayerStore((s) => s.status.duration);
  return (
    <ProgressBar
      progress={duration > 0 ? position / duration : 0}
      color={PodcastTheme.text}
      trackColor="rgba(255,255,255,0.2)"
      height={2}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  dock: { position: "absolute", left: 8, right: 8 },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    overflow: "hidden",
    backgroundColor: PodcastTheme.surface,
  },
  previewContent: { alignItems: "center", paddingHorizontal: 24 },
  previewTitles: { alignSelf: "stretch", marginTop: 32, gap: 4 },
  previewTitle: { color: PodcastTheme.text, fontSize: 21, fontWeight: "700" },
  previewPodcast: { color: "rgba(255,255,255,0.7)", fontSize: 15 },
});
