import {
  Platform,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useState } from "react";
import { useReducedMotion } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { ActionBar } from "@/src/projects/tic-tac-toe/components/ActionBar";
import { Board } from "@/src/projects/tic-tac-toe/components/Board";
import { DifficultyBars } from "@/src/projects/tic-tac-toe/components/DifficultyBars";
import { HeaderIconButton } from "@/src/projects/tic-tac-toe/components/HeaderIconButton";
import { MoveTimeline } from "@/src/projects/tic-tac-toe/components/MoveTimeline";
import { Scoreboard } from "@/src/projects/tic-tac-toe/components/Scoreboard";
import { StatusBanner } from "@/src/projects/tic-tac-toe/components/StatusBanner";
import { useCpuTurn } from "@/src/projects/tic-tac-toe/hooks/useCpuTurn";
import { useGameHaptics } from "@/src/projects/tic-tac-toe/hooks/useGameHaptics";
import {
  useGameHydrated,
  useGameStore,
} from "@/src/projects/tic-tac-toe/stores/gameStore";
import {
  canJumpTo,
  CPU,
  deriveGame,
  difficultyLevel,
  nextDifficulty,
  nextMode,
  statusText,
  type Difficulty,
  type Mode,
} from "@/src/projects/tic-tac-toe/utils/game";
import { IconSymbol } from "@/src/shared/components/ui/icon-symbol";
import { useTicTacToePalette } from "@/src/projects/tic-tac-toe/utils/palette";

const MIN_BOARD = 240;

const MODE_LABELS: Record<Mode, string> = {
  pvp: "2 players",
  cpu: "vs CPU",
};

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

export default function TicTacToeScreen() {
  const history = useGameStore((state) => state.history);
  const currentMove = useGameStore((state) => state.currentMove);
  const mode = useGameStore((state) => state.mode);
  const difficulty = useGameStore((state) => state.difficulty);
  const scores = useGameStore((state) => state.scores);
  const hapticsEnabled = useGameStore((state) => state.hapticsEnabled);
  const play = useGameStore((state) => state.play);
  const undo = useGameStore((state) => state.undo);
  const jumpTo = useGameStore((state) => state.jumpTo);
  const newRound = useGameStore((state) => state.newRound);
  const setMode = useGameStore((state) => state.setMode);
  const setDifficulty = useGameStore((state) => state.setDifficulty);
  const setHapticsEnabled = useGameStore((state) => state.setHapticsEnabled);
  const resetScores = useGameStore((state) => state.resetScores);

  const hydrated = useGameHydrated();
  const view = deriveGame(history, currentMove);
  const thinking = useCpuTurn(view, mode, difficulty, play);
  // Muted until the saved game loads, so restoring it doesn't buzz.
  useGameHaptics(hapticsEnabled && hydrated, currentMove, view);

  const palette = useTicTacToePalette();
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const columnWidth = Math.min(width - SCREEN_PADDING * 2, 380);
  // The board takes whatever height is left between the controls above and
  // below it, so a whole round fits on one screen. Only when that is too small
  // (a short phone, landscape) does it keep MIN_BOARD and let the page scroll.
  const [boardArea, setBoardArea] = useState(0);
  const boardSize = Math.max(MIN_BOARD, Math.min(columnWidth, boardArea));

  const cpuTurn = mode === "cpu" && (thinking || view.next === CPU);
  const boardDisabled = !hydrated || view.isOver || cpuTurn;
  const bannerMark = view.win
    ? view.win.winner
    : view.isDraw
      ? null
      : view.next;

  return (
    <ScrollView
      style={{ backgroundColor: palette.background }}
      contentContainerStyle={[
        styles.content,
        // Keep the timeline clear of the home indicator.
        { paddingBottom: insets.bottom + 16 },
      ]}
    >
      <Stack.Screen
        options={{
          headerStyle: { backgroundColor: palette.background },
          headerShadowVisible: false,
          headerTintColor: palette.text,
          // Mode and difficulty live up here as one-tap cycling icons, which
          // leaves the whole page below for the board.
          headerRight: () => (
            <View style={styles.headerButtons}>
              {mode === "cpu" && (
                <HeaderIconButton
                  onPress={() => setDifficulty(nextDifficulty(difficulty))}
                  popKey={difficulty}
                  accessibilityLabel={`Difficulty: ${DIFFICULTY_LABELS[difficulty]}`}
                  accessibilityHint="Changes the difficulty and starts a new round"
                  reduceMotion={reduceMotion}
                >
                  <DifficultyBars
                    level={difficultyLevel(difficulty)}
                    color={palette.o}
                    emptyColor={palette.grid}
                  />
                </HeaderIconButton>
              )}
              <HeaderIconButton
                onPress={() => setMode(nextMode(mode))}
                popKey={mode}
                accessibilityLabel={`Mode: ${MODE_LABELS[mode]}`}
                accessibilityHint="Switches between two players and the computer, and starts a new round"
                reduceMotion={reduceMotion}
              >
                <IconSymbol
                  name={mode === "cpu" ? "desktopcomputer" : "person.2.fill"}
                  size={mode === "cpu" ? 22 : 28}
                  color={palette.text}
                />
              </HeaderIconButton>
            </View>
          ),
        }}
      />
      <View style={[styles.column, styles.fill, { width: columnWidth }]}>
        <View style={[styles.column, styles.fill]}>
          <Scoreboard
            scores={scores[mode]}
            mode={mode}
            active={view.isOver ? null : view.next}
            onReset={resetScores}
            palette={palette}
            reduceMotion={reduceMotion}
          />

          <StatusBanner
            text={statusText(view, mode)}
            mark={bannerMark}
            thinking={thinking}
            palette={palette}
            reduceMotion={reduceMotion}
          />

          <View
            style={styles.boardArea}
            onLayout={(event) =>
              setBoardArea(Math.floor(event.nativeEvent.layout.height))
            }
          >
            {/* Measured first, so the board never renders at a wrong size. It
                sits in an overlay so it never props the area open: the area's
                height comes from the free space alone and can shrink again. */}
            {boardArea > 0 && (
              <View style={styles.boardOverlay}>
                <Board
                  squares={view.squares}
                  win={view.win}
                  disabled={boardDisabled}
                  onPress={play}
                  size={boardSize}
                  palette={palette}
                  reduceMotion={reduceMotion}
                />
              </View>
            )}
          </View>

          <ActionBar
            canUndo={currentMove > 0 && !view.isOver}
            onUndo={undo}
            onNewRound={newRound}
            roundOver={view.isOver}
            hapticsEnabled={hapticsEnabled}
            onToggleHaptics={
              Platform.OS === "web" ? undefined : setHapticsEnabled
            }
            palette={palette}
            reduceMotion={reduceMotion}
          />

          <MoveTimeline
            history={history}
            currentMove={currentMove}
            onSelect={jumpTo}
            disabled={view.isOver}
            isSelectable={(move) => canJumpTo(move, mode)}
            palette={palette}
            reduceMotion={reduceMotion}
            bleed={SCREEN_PADDING}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const SCREEN_PADDING = 16;

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    alignItems: "center",
    paddingTop: 12,
    paddingHorizontal: SCREEN_PADDING,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  fill: {
    flexGrow: 1,
  },
  // Grows into the free height; the board inside is sized from it.
  boardArea: {
    flexGrow: 1,
    minHeight: MIN_BOARD,
  },
  boardOverlay: {
    ...StyleSheet.absoluteFill,
    pointerEvents: "box-none",
    alignItems: "center",
    justifyContent: "center",
  },
  column: {
    gap: 12,
  },
});
