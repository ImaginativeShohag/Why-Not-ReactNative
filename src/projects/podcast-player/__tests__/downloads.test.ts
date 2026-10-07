import {
  extensionFromUrl,
  isRelativePath,
  relativePathFor,
  resolveRelativePath,
  safeSegment,
  toRelativePath,
} from "@/src/projects/podcast-player/downloads/paths";
import {
  autoDeleteCandidates,
  backoffDelayMs,
  chooseEvictions,
  estimateBytes,
  MAX_ATTEMPTS,
  networkDecision,
  pickDownloadsToStart,
  shouldRetry,
  type StoredFile,
} from "@/src/projects/podcast-player/downloads/policy";
import type { DownloadRecord } from "@/src/projects/podcast-player/models/Episode";

const OLD_DOCS =
  "file:///var/mobile/Containers/Data/Application/AAAA-1111/Documents/";
const NEW_DOCS =
  "file:///var/mobile/Containers/Data/Application/BBBB-2222/Documents/";

describe("relative download paths (the container-UUID trap)", () => {
  it("builds documents/podcasts/<show>/<episode>.<ext> as a relative path", () => {
    expect(
      relativePathFor(
        "itunes-123",
        "ep/../abc?x",
        "https://cdn.x/ep.m4a?token=1",
      ),
    ).toBe("podcasts/itunes-123/ep_abc_x.m4a");
    expect(extensionFromUrl("https://cdn.x/stream")).toBe("mp3");
    expect(safeSegment("///")).toBe("x");
  });

  it("resolves against whatever the CURRENT documents dir is", () => {
    const rel = "podcasts/s/e.mp3";
    expect(resolveRelativePath(rel, NEW_DOCS)).toBe(`${NEW_DOCS}${rel}`);
    expect(resolveRelativePath(rel, NEW_DOCS.slice(0, -1))).toBe(
      `${NEW_DOCS}${rel}`,
    );
  });

  it("recovers a relative path from an absolute URI of a previous install", () => {
    expect(toRelativePath(`${OLD_DOCS}podcasts/s/e.mp3`, NEW_DOCS)).toBe(
      "podcasts/s/e.mp3",
    );
    expect(toRelativePath(`${NEW_DOCS}podcasts/s/e.mp3`, NEW_DOCS)).toBe(
      "podcasts/s/e.mp3",
    );
    expect(toRelativePath("file:///tmp/other.mp3", NEW_DOCS)).toBeNull();
  });

  it("refuses absolute, scheme-ful or escaping paths", () => {
    expect(isRelativePath("podcasts/s/e.mp3")).toBe(true);
    expect(isRelativePath("/etc/passwd")).toBe(false);
    expect(isRelativePath("file:///x")).toBe(false);
    expect(isRelativePath("podcasts/../../x")).toBe(false);
    expect(() => resolveRelativePath("../x", NEW_DOCS)).toThrow();
  });
});

const record = (patch: Partial<DownloadRecord>): DownloadRecord => ({
  episodeId: "e",
  podcastId: "p",
  url: "https://x/e.mp3",
  state: "queued",
  relativePath: "podcasts/p/e.mp3",
  bytesWritten: 0,
  totalBytes: 0,
  attempts: 0,
  nextAttemptAt: 0,
  snapshot: null,
  priority: 0,
  createdAt: 0,
  completedAt: null,
  error: null,
  ...patch,
});

describe("download scheduling", () => {
  it("fills free slots by priority, then FIFO, skipping backoff and non-queued", () => {
    const records = [
      record({ episodeId: "old", createdAt: 1 }),
      record({ episodeId: "new", createdAt: 2 }),
      record({ episodeId: "bumped", createdAt: 3, priority: 1 }),
      record({ episodeId: "backoff", createdAt: 0, nextAttemptAt: 5_000 }),
      record({ episodeId: "running", state: "downloading" }),
    ];
    const picked = pickDownloadsToStart(records, 1, 3, 1_000);
    expect(picked.map((r) => r.episodeId)).toEqual(["bumped", "old"]);
    expect(pickDownloadsToStart(records, 3, 3, 1_000)).toEqual([]);
  });

  it("backs off exponentially with jitter, capped, and gives up", () => {
    expect(backoffDelayMs(1, () => 0)).toBe(1_000);
    expect(backoffDelayMs(1, () => 1)).toBe(2_000);
    expect(backoffDelayMs(4, () => 0)).toBe(8_000);
    expect(backoffDelayMs(50, () => 1)).toBe(5 * 60_000);
    expect(shouldRetry(MAX_ATTEMPTS - 1)).toBe(true);
    expect(shouldRetry(MAX_ATTEMPTS)).toBe(false);
  });

  it("applies the Wi-Fi-only rule", () => {
    expect(networkDecision(true, { type: "CELLULAR", isConnected: true })).toBe(
      "waitingForWifi",
    );
    expect(networkDecision(true, { type: "WIFI", isConnected: true })).toBe(
      "ok",
    );
    expect(
      networkDecision(false, { type: "CELLULAR", isConnected: true }),
    ).toBe("ok");
    expect(networkDecision(false, { isConnected: false })).toBe("offline");
    expect(
      networkDecision(true, {
        type: "WIFI",
        isConnected: true,
        isInternetReachable: false,
      }),
    ).toBe("offline");
  });
});

const MB = 1024 * 1024;
const file = (
  episodeId: string,
  patch: Partial<StoredFile> = {},
): StoredFile => ({
  episodeId,
  bytes: 50 * MB,
  played: true,
  playedAt: 0,
  completedAt: 0,
  ...patch,
});

describe("storage policy", () => {
  it("evicts oldest-played first, only as much as needed", () => {
    const files = [
      file("recent", { playedAt: 300 }),
      file("oldest", { playedAt: 100 }),
      file("middle", { playedAt: 200 }),
    ];
    expect(chooseEvictions(files, 150 * MB, 60 * MB)).toEqual({
      evict: ["oldest", "middle"],
      fits: true,
    });
    expect(chooseEvictions(files, 500 * MB, 60 * MB)).toEqual({
      evict: [],
      fits: true,
    });
  });

  it("never evicts unplayed or protected (playing) episodes", () => {
    const files = [
      file("unplayed", { played: false }),
      file("playing", { playedAt: 1 }),
    ];
    const result = chooseEvictions(
      files,
      60 * MB,
      60 * MB,
      new Set(["playing"]),
    );
    expect(result).toEqual({ evict: [], fits: false });
  });

  it("auto-deletes played episodes past retention", () => {
    const day = 86_400_000;
    const files = [
      file("old", { playedAt: 0 }),
      file("fresh", { playedAt: 6 * day }),
      file("unplayed", { played: false }),
    ];
    const now = 8 * day;
    expect(
      autoDeleteCandidates(
        files,
        { autoDeleteDays: 7, deleteWhenPlayed: false },
        now,
      ),
    ).toEqual(["old"]);
    expect(
      autoDeleteCandidates(
        files,
        { autoDeleteDays: 0, deleteWhenPlayed: true },
        now,
      ),
    ).toEqual(["old", "fresh"]);
    expect(
      autoDeleteCandidates(
        files,
        { autoDeleteDays: 0, deleteWhenPlayed: false },
        now,
      ),
    ).toEqual([]);
  });

  it("budgets a sane size when the enclosure length lies", () => {
    expect(estimateBytes(84 * MB, 3600)).toBe(84 * MB);
    expect(estimateBytes(0, 3600)).toBe(3600 * 16_000);
    expect(estimateBytes(null, null)).toBe(60 * MB);
  });
});
