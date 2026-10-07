import {
  Canvas,
  ColorMatrix,
  Group,
  Image as SkiaImage,
  type SkImage,
  type Transforms3d,
} from "@shopify/react-native-skia";
import { useMemo } from "react";

import {
  outputSize,
  previewSteps,
  type TransformStep,
} from "@/src/projects/camera-social/editor/operations";
import type {
  ResolvedEdit,
  Size,
} from "@/src/projects/camera-social/models/Asset";

type Props = {
  image: SkImage | null;
  /** Pixel size of `image` (the preview proxy). */
  source: Size;
  edit: ResolvedEdit;
  matrix: number[];
  width: number;
};

function toSkia(steps: TransformStep[]): Transforms3d {
  // Same outermost-first convention as the pure steps.
  return steps.flatMap((s): Transforms3d => {
    if (s.kind === "translate")
      return [{ translateX: s.x }, { translateY: s.y }];
    if (s.kind === "scale") return [{ scaleX: s.x }, { scaleY: s.y }];
    return [{ rotate: (s.degrees * Math.PI) / 180 }];
  });
}

/**
 * GPU preview of the resolved edit. Geometry comes from `previewSteps` — the
 * same canonical rotate → flip → crop the export runs — and colour from one
 * Skia color matrix. Nothing is re-encoded while you edit.
 */
export function EditPreview({ image, source, edit, matrix, width }: Props) {
  const out = outputSize(source, edit);
  const height = Math.round((width * out.height) / out.width);
  const transform = useMemo(
    () => toSkia(previewSteps(source, edit, width)),
    [source, edit, width],
  );

  return (
    <Canvas style={{ width, height }}>
      <Group transform={transform}>
        <SkiaImage
          image={image}
          x={0}
          y={0}
          width={source.width}
          height={source.height}
          fit="fill"
        >
          <ColorMatrix matrix={matrix} />
        </SkiaImage>
      </Group>
    </Canvas>
  );
}

/** Height EditPreview will take for a given width (for layout math). */
export function previewHeight(source: Size, edit: ResolvedEdit, width: number) {
  const out = outputSize(source, edit);
  return Math.round((width * out.height) / out.width);
}
