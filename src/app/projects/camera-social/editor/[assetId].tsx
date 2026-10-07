import { useImage } from "@shopify/react-native-skia";
import { router, useLocalSearchParams } from "expo-router";
import { useSQLiteContext } from "expo-sqlite";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/src/projects/camera-social/components/common/IconButton";
import { AdjustSlider } from "@/src/projects/camera-social/components/editor/AdjustSlider";
import { AspectPresets } from "@/src/projects/camera-social/components/editor/AspectPresets";
import { CropOverlay } from "@/src/projects/camera-social/components/editor/CropOverlay";
import {
  EditPreview,
  previewHeight,
} from "@/src/projects/camera-social/components/editor/EditPreview";
import {
  EditorToolbar,
  type EditorTool,
} from "@/src/projects/camera-social/components/editor/EditorToolbar";
import { FilterStrip } from "@/src/projects/camera-social/components/editor/FilterStrip";
import { VideoTrimEditor } from "@/src/projects/camera-social/components/editor/VideoTrimEditor";
import { Palette, Spacing } from "@/src/projects/camera-social/constants/theme";
import { getCapture, setTrim } from "@/src/projects/camera-social/db/captures";
import { applyOperations } from "@/src/projects/camera-social/editor/applyOperations";
import {
  buildColorMatrix,
  FILTER_LABELS,
  FILTER_ORDER,
  FILTERS,
} from "@/src/projects/camera-social/editor/colorMatrix";
import { pickEditBase } from "@/src/projects/camera-social/editor/editBase";
import {
  makePreviewProxy,
  nativeApplyDeps,
} from "@/src/projects/camera-social/editor/nativeDeps";
import {
  aspectValue,
  FULL_RECT,
  isFullRect,
  orientedSize,
  sameRect,
} from "@/src/projects/camera-social/editor/operations";
import { useCaptureItem } from "@/src/projects/camera-social/hooks/useCaptures";
import { useEditorHistory } from "@/src/projects/camera-social/hooks/useEditorHistory";
import { useSettings } from "@/src/projects/camera-social/hooks/useSettings";
import { ingestPhoto } from "@/src/projects/camera-social/media/ingest";
import type {
  Adjustments,
  AspectPreset,
  Capture,
  NormRect,
  Op,
  Size,
} from "@/src/projects/camera-social/models/Asset";
import { alertError } from "@/src/projects/camera-social/utils/alertError";
import { saveToGallery } from "@/src/projects/camera-social/utils/shareOut";

type Tool = "crop" | "rotate" | "filter" | "adjust";

const TOOLS: EditorTool<Tool>[] = [
  { key: "crop", icon: "crop", label: "Crop" },
  { key: "rotate", icon: "refresh", label: "Rotate" },
  { key: "filter", icon: "color-filter-outline", label: "Filter" },
  { key: "adjust", icon: "sunny-outline", label: "Adjust" },
];

const ASPECTS: { value: AspectPreset; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "1:1", label: "1:1" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
];

const FILTER_OPTIONS = FILTER_ORDER.map((name) => ({
  name,
  label: FILTER_LABELS[name],
  matrix: FILTERS[name],
}));

const ADJUST_KEYS: { key: keyof Adjustments; label: string }[] = [
  { key: "brightness", label: "Brightness" },
  { key: "contrast", label: "Contrast" },
  { key: "saturation", label: "Saturation" },
];

export default function EditorScreen() {
  const { assetId } = useLocalSearchParams<{ assetId: string }>();
  const { capture, loading } = useCaptureItem(assetId);
  const { capture: original, loading: originalLoading } = useCaptureItem(
    capture?.sourceId ?? undefined,
  );

  if (loading || (capture?.sourceId && originalLoading)) {
    return <Centered>{<ActivityIndicator color={Palette.text} />}</Centered>;
  }
  if (!capture) {
    return (
      <Centered>
        <Text style={styles.muted}>This capture no longer exists.</Text>
        <Pressable onPress={() => router.back()} style={styles.pill}>
          <Text style={styles.pillText}>Close</Text>
        </Pressable>
      </Centered>
    );
  }
  if (capture.kind === "video") return <VideoTrimScreen capture={capture} />;

  const base = pickEditBase(capture, original);
  return (
    <PhotoEditor
      key={`${base.source.id}:${capture.id}`}
      source={base.source}
      initialOps={base.operations}
    />
  );
}

function PhotoEditor({
  source,
  initialOps,
}: {
  source: Capture;
  initialOps: Op[];
}) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const { settings } = useSettings();
  const history = useEditorHistory(source.uri, initialOps);
  const { edit, operations } = history;

  // A ≤1600px proxy drives the preview; crop is normalized so it maps 1:1
  // onto the full-resolution export.
  const [proxy, setProxy] = useState<({ uri: string } & Size) | null>(null);
  useEffect(() => {
    let cancelled = false;
    makePreviewProxy(source.uri, source.width, source.height)
      .then((p) => !cancelled && setProxy(p))
      .catch(
        () =>
          !cancelled &&
          setProxy({
            uri: source.uri,
            width: source.width,
            height: source.height,
          }),
      );
    return () => {
      cancelled = true;
    };
  }, [source.uri, source.width, source.height]);
  const image = useImage(proxy?.uri ?? null);
  const proxySize: Size = proxy
    ? { width: proxy.width, height: proxy.height }
    : { width: source.width, height: source.height };

  const [tool, setTool] = useState<Tool | null>("filter");
  const [area, setArea] = useState<Size | null>(null);
  const [saving, setSaving] = useState(false);

  // Slider drags preview live without pushing forty undo steps.
  const [draftAdjust, setDraftAdjust] = useState<Adjustments | null>(null);
  const [draftIntensity, setDraftIntensity] = useState<number | null>(null);

  // Crop session state: the preset and the rect the overlay last reported.
  const [cropAspect, setCropAspect] = useState<AspectPreset>(edit.aspect);
  const draftRect = useRef<NormRect>(edit.crop);

  const previewEdit = useMemo(
    () => ({
      ...edit,
      adjust: draftAdjust ?? edit.adjust,
      intensity: draftIntensity ?? edit.intensity,
    }),
    [edit, draftAdjust, draftIntensity],
  );
  const matrix = useMemo(
    () =>
      buildColorMatrix(
        previewEdit.filter,
        previewEdit.intensity,
        previewEdit.adjust,
      ),
    [previewEdit],
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setArea({ width, height });
  };

  const selectTool = (next: Tool) => {
    if (next === "crop") {
      setCropAspect(edit.aspect);
      draftRect.current = edit.crop;
    }
    setTool((current) => (current === next ? null : next));
  };

  /** Push the crop session as one op; returns it so Save can include it. */
  const commitCrop = (): Op | null => {
    const rect = draftRect.current;
    setTool(null);
    if (sameRect(rect, edit.crop) && cropAspect === edit.aspect) return null;
    const op: Op = { type: "crop", rect, aspect: cropAspect };
    history.push(op);
    return op;
  };

  const cancel = () => {
    if (operations.length === initialOps.length && !saving) {
      router.back();
      return;
    }
    Alert.alert("Discard edits?", undefined, [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  };

  const save = async () => {
    // `operations` is this render's snapshot — add a crop committed just now.
    const pending = tool === "crop" ? commitCrop() : null;
    const ops = pending ? [...operations, pending] : operations;
    if (ops.length === 0) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const result = await applyOperations(
        { uri: source.uri, width: source.width, height: source.height },
        ops,
        nativeApplyDeps,
      );
      if (result.uri === source.uri) {
        // Every op cancelled out (e.g. rotate left + right) — nothing to write.
        router.back();
        return;
      }
      const id = await ingestPhoto(db, {
        uri: result.uri,
        width: result.width,
        height: result.height,
        mime: "image/jpeg",
        exif: settings.keepExif ? source.exif : null,
        origin: "edit",
        sourceId: source.id,
        operations: ops,
        ownsFile: true,
      });
      if (settings.saveToGallery) {
        // Ingest moved the temp file into Documents (`ownsFile`), so
        // `result.uri` is gone — save from the stored capture instead.
        const saved = await getCapture(db, id);
        if (saved) {
          await saveToGallery(saved.uri).catch((e: unknown) =>
            alertError("Saved, but not to your gallery", e),
          );
        }
      }
      router.replace(`/projects/camera-social/post/${id}`);
    } catch (e) {
      setSaving(false);
      alertError("Couldn't save", e);
    }
  };

  const renderStage = () => {
    if (!area || !proxy) {
      return <ActivityIndicator color={Palette.text} />;
    }
    if (tool === "crop") {
      const oriented = orientedSize(proxySize, edit.rotation);
      return (
        <CropOverlay
          // Remount on rotation/preset change — the overlay re-centres itself.
          key={`${edit.rotation}:${cropAspect}:${history.state.cursor}`}
          area={area}
          oriented={oriented}
          aspect={aspectValue(cropAspect)}
          initialRect={cropAspect === edit.aspect ? edit.crop : FULL_RECT}
          renderImage={(display) => (
            <EditPreview
              image={image}
              source={proxySize}
              edit={{ ...previewEdit, crop: FULL_RECT }}
              matrix={matrix}
              width={display.width}
            />
          )}
          onChange={(rect) => {
            draftRect.current = rect;
          }}
          onRotate={(degrees) => history.push({ type: "rotate", degrees })}
        />
      );
    }
    // Fit the cropped output inside the stage in both dimensions.
    const aspect =
      proxySize.width / previewHeight(proxySize, previewEdit, proxySize.width);
    const width = Math.min(
      area.width - Spacing.lg * 2,
      (area.height - 16) * aspect,
    );
    return (
      <EditPreview
        image={image}
        source={proxySize}
        edit={previewEdit}
        matrix={matrix}
        width={Math.max(1, Math.floor(width))}
      />
    );
  };

  const renderToolPanel = () => {
    switch (tool) {
      case "crop":
        return (
          <View style={styles.panel}>
            <AspectPresets
              options={ASPECTS}
              value={cropAspect}
              onChange={setCropAspect}
            />
            <View style={styles.panelRow}>
              <Pressable
                onPress={() => {
                  setCropAspect("free");
                  draftRect.current = FULL_RECT;
                  if (!isFullRect(edit.crop)) {
                    history.push({
                      type: "crop",
                      rect: FULL_RECT,
                      aspect: "free",
                    });
                  }
                }}
                style={styles.pill}
                accessibilityRole="button"
              >
                <Text style={styles.pillText}>Reset</Text>
              </Pressable>
              <Pressable
                onPress={() => commitCrop()}
                style={[styles.pill, styles.pillPrimary]}
                accessibilityRole="button"
              >
                <Text style={[styles.pillText, styles.pillPrimaryText]}>
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        );
      case "rotate":
        return (
          <View style={[styles.panel, styles.panelRow]}>
            <IconButton
              icon="arrow-undo-outline"
              label="Left"
              onPress={() => history.push({ type: "rotate", degrees: -90 })}
              accessibilityLabel="Rotate left"
            />
            <IconButton
              icon="arrow-redo-outline"
              label="Right"
              onPress={() => history.push({ type: "rotate", degrees: 90 })}
              accessibilityLabel="Rotate right"
            />
            <IconButton
              icon="swap-horizontal"
              label="Flip H"
              onPress={() => history.push({ type: "flip", axis: "horizontal" })}
              accessibilityLabel="Flip horizontally"
            />
            <IconButton
              icon="swap-vertical"
              label="Flip V"
              onPress={() => history.push({ type: "flip", axis: "vertical" })}
              accessibilityLabel="Flip vertically"
            />
          </View>
        );
      case "filter":
        return (
          <View style={styles.panel}>
            <FilterStrip
              image={image}
              options={FILTER_OPTIONS}
              selected={edit.filter}
              onSelect={(name) =>
                history.push({
                  type: "filter",
                  name,
                  intensity: name === edit.filter ? edit.intensity : 1,
                })
              }
            />
            {edit.filter !== "none" ? (
              <AdjustSlider
                label="Intensity"
                value={draftIntensity ?? edit.intensity}
                min={0}
                max={1}
                onChange={setDraftIntensity}
                onCommit={(intensity) => {
                  setDraftIntensity(null);
                  history.push({
                    type: "filter",
                    name: edit.filter,
                    intensity,
                  });
                }}
              />
            ) : null}
          </View>
        );
      case "adjust": {
        const current = draftAdjust ?? edit.adjust;
        return (
          <View style={styles.panel}>
            {ADJUST_KEYS.map(({ key, label }) => (
              <AdjustSlider
                key={key}
                label={label}
                value={current[key]}
                onChange={(v) => setDraftAdjust({ ...current, [key]: v })}
                onCommit={(v) => {
                  setDraftAdjust(null);
                  history.push({
                    type: "adjust",
                    values: { ...current, [key]: v },
                  });
                }}
              />
            ))}
          </View>
        );
      }
      default:
        return <View style={styles.panel} />;
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar
        title="Editor"
        onCancel={cancel}
        onSave={save}
        saving={saving}
        saveDisabled={operations.length === 0 && tool !== "crop"}
      />
      <View style={styles.stage} onLayout={onLayout}>
        {renderStage()}
      </View>
      {renderToolPanel()}
      <View style={{ paddingBottom: insets.bottom + Spacing.sm }}>
        <EditorToolbar
          tools={TOOLS}
          active={tool}
          onTool={selectTool}
          canUndo={history.canUndo}
          canRedo={history.canRedo}
          onUndo={history.undo}
          onRedo={history.redo}
        />
      </View>
      {saving ? (
        <View style={styles.savingOverlay} pointerEvents="auto">
          <ActivityIndicator color={Palette.text} size="large" />
          <Text style={styles.muted}>Rendering…</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Trim is metadata on the capture — the file itself is never re-encoded. */
function VideoTrimScreen({ capture }: { capture: Capture }) {
  const db = useSQLiteContext();
  const insets = useSafeAreaInsets();
  const [range, setRange] = useState<{ start: number; end: number } | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!range) {
      router.back();
      return;
    }
    setSaving(true);
    try {
      const durationMs = capture.durationMs ?? range.end;
      await setTrim(
        db,
        capture.id,
        range.start > 0 ? range.start : null,
        range.end < durationMs ? range.end : null,
      );
      router.back();
    } catch (e) {
      setSaving(false);
      alertError("Couldn't save", e);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <TopBar
        title="Trim"
        onCancel={() => router.back()}
        onSave={save}
        saving={saving}
        saveDisabled={!range}
      />
      <View
        style={[styles.fill, { paddingBottom: insets.bottom + Spacing.lg }]}
      >
        <VideoTrimEditor
          uri={capture.uri}
          durationMs={capture.durationMs}
          initialStartMs={capture.trimStartMs}
          initialEndMs={capture.trimEndMs}
          onRangeChange={(start, end) => setRange({ start, end })}
        />
      </View>
    </View>
  );
}

function TopBar({
  title,
  onCancel,
  onSave,
  saving,
  saveDisabled,
}: {
  title: string;
  onCancel: () => void;
  onSave: () => void;
  saving: boolean;
  saveDisabled: boolean;
}) {
  return (
    <View style={styles.topBar}>
      <IconButton icon="close" onPress={onCancel} accessibilityLabel="Cancel" />
      <Text style={styles.title}>{title}</Text>
      <Pressable
        onPress={onSave}
        disabled={saving || saveDisabled}
        accessibilityRole="button"
        accessibilityLabel="Save"
        style={styles.saveButton}
      >
        <Text
          style={[
            styles.save,
            (saving || saveDisabled) && { color: Palette.textFaint },
          ]}
        >
          Save
        </Text>
      </Pressable>
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <View style={[styles.screen, styles.centered]}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Palette.background },
  fill: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center", gap: Spacing.lg },
  topBar: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.sm,
  },
  title: { color: Palette.text, fontSize: 17, fontWeight: "700" },
  saveButton: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  save: { color: Palette.accent, fontSize: 17, fontWeight: "700" },
  stage: { flex: 1, alignItems: "center", justifyContent: "center" },
  panel: { minHeight: 132, justifyContent: "center", gap: Spacing.sm },
  panelRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "center",
  },
  pill: {
    backgroundColor: Palette.surfaceRaised,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
  },
  pillText: { color: Palette.text, fontWeight: "700" },
  pillPrimary: { backgroundColor: Palette.accent },
  pillPrimaryText: { color: "#000" },
  muted: { color: Palette.textMuted },
  savingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Palette.scrim,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
});
