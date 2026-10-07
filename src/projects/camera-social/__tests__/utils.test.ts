import {
  buildColorMatrix,
  FILTERS,
  IDENTITY,
  isIdentity,
  multiply,
} from "@/src/projects/camera-social/editor/colorMatrix";
import {
  summarizeExif,
  formatShutter,
  parseExifDate,
} from "@/src/projects/camera-social/media/exif";
import {
  extensionOf,
  mimeForExtension,
  resolveRelativePath,
  toRelativePath,
} from "@/src/projects/camera-social/media/paths";
import {
  formatBytes,
  formatDuration,
} from "@/src/projects/camera-social/utils/format";
import {
  factorToZoom,
  formatFactor,
  pinchToZoom,
  zoomToFactor,
} from "@/src/projects/camera-social/utils/zoom";

describe("relative paths", () => {
  const base = "file:///var/mobile/Containers/Data/Application/ABC/Documents/";

  it("strips the document base", () => {
    expect(toRelativePath(`${base}camera-social/originals/a.jpg`, base)).toBe(
      "camera-social/originals/a.jpg",
    );
  });

  it("tolerates file:/ vs file:/// and a missing trailing slash", () => {
    expect(
      toRelativePath(
        "file:/var/mobile/Containers/Data/Application/ABC/Documents/x.jpg",
        base.slice(0, -1),
      ),
    ).toBe("x.jpg");
  });

  it("throws for paths outside the base", () => {
    expect(() => toRelativePath("file:///tmp/x.jpg", base)).toThrow();
  });

  it("resolves against a *new* container path", () => {
    const moved =
      "file:///var/mobile/Containers/Data/Application/XYZ/Documents";
    expect(resolveRelativePath("camera-social/a.jpg", moved)).toBe(
      `${moved}/camera-social/a.jpg`,
    );
    expect(resolveRelativePath("content://media/1", moved)).toBe(
      "content://media/1",
    );
  });

  it("reads extensions and mime types", () => {
    expect(extensionOf("file:///a/b/IMG_1.HEIC")).toBe("heic");
    expect(extensionOf("file:///a/b/noext")).toBe("jpg");
    expect(extensionOf("file:///a/b.mov?x=1", "mp4")).toBe("mov");
    expect(mimeForExtension("mov")).toBe("video/quicktime");
  });
});

describe("zoom curve", () => {
  it("is logarithmic and invertible", () => {
    expect(factorToZoom(1)).toBe(0);
    expect(factorToZoom(10)).toBe(1);
    expect(zoomToFactor(0.5)).toBeCloseTo(Math.sqrt(10));
    expect(zoomToFactor(factorToZoom(3))).toBeCloseTo(3);
  });

  it("the same pinch doubles the factor anywhere in the range", () => {
    const fromWide = zoomToFactor(pinchToZoom(factorToZoom(1), 2));
    const fromTele = zoomToFactor(pinchToZoom(factorToZoom(4), 2));
    expect(fromWide).toBeCloseTo(2);
    expect(fromTele).toBeCloseTo(8);
  });

  it("clamps to the range", () => {
    expect(pinchToZoom(0, 0.1)).toBe(0);
    expect(pinchToZoom(1, 5)).toBe(1);
  });

  it("formats like the system camera", () => {
    expect(formatFactor(1)).toBe("1×");
    expect(formatFactor(2.44)).toBe("2.4×");
    expect(formatFactor(0.5)).toBe(".5×");
  });
});

describe("colour matrices", () => {
  it("neutral edit is the identity", () => {
    expect(
      isIdentity(
        buildColorMatrix("none", 1, {
          brightness: 0,
          contrast: 0,
          saturation: 0,
        }),
      ),
    ).toBe(true);
  });

  it("zero intensity disables a filter", () => {
    expect(
      isIdentity(
        buildColorMatrix("mono", 0, {
          brightness: 0,
          contrast: 0,
          saturation: 0,
        }),
      ),
    ).toBe(true);
  });

  it("multiply by identity is a no-op", () => {
    expect(multiply(IDENTITY, FILTERS.warm)).toEqual(FILTERS.warm);
    expect(multiply(FILTERS.warm, IDENTITY)).toEqual(FILTERS.warm);
  });
});

describe("exif", () => {
  it("summarizes nested iOS exif", () => {
    const s = summarizeExif({
      "{TIFF}": { Make: "Apple", Model: "iPhone 17 Pro" },
      "{Exif}": {
        FNumber: 1.78,
        ExposureTime: 1 / 120,
        ISOSpeedRatings: [64],
        DateTimeOriginal: "2026:08:06 18:42:11",
      },
      Orientation: 6,
    });
    expect(s.camera).toBe("Apple iPhone 17 Pro");
    expect(s.exposure).toBe("f/1.8 · 1/120 · ISO 64");
    expect(s.orientation).toBe(6);
    expect(new Date(s.takenAt!).getHours()).toBe(18);
  });

  it("handles missing data", () => {
    expect(summarizeExif(null)).toEqual({
      camera: null,
      lens: null,
      exposure: null,
      takenAt: null,
      orientation: 1,
    });
    expect(parseExifDate("nope")).toBeNull();
    expect(formatShutter(2)).toBe("2s");
  });
});

describe("format", () => {
  it("formats bytes and durations", () => {
    expect(formatBytes(0)).toBe("0 B");
    expect(formatBytes(3.2 * 1024 * 1024)).toBe("3.2 MB");
    expect(formatDuration(72.4)).toBe("1:12");
  });
});
