/**
 * Serialization of the controller's entry points. SQLite, expo-location and
 * the Live Activity bridge are replaced by an in-memory fake: one set of
 * workout rows plus the single session row.
 */
import type { Session } from "../tracking/state";

// `mock` prefix: the only outer names jest.mock factories may reference.
const mockStore = {
  rows: new Set<string>(),
  session: null as Session | null,
  /** Lets a test hold `startWorkout` between `insertWorkout` and `saveSession`. */
  saveGate: null as Promise<void> | null,
};

jest.mock("expo-battery", () => ({
  getBatteryLevelAsync: jest.fn(async () => 0.8),
  isLowPowerModeEnabledAsync: jest.fn(async () => false),
}));
jest.mock("expo-task-manager", () => ({
  isTaskRegisteredAsync: jest.fn(async () => false),
}));
jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3, BestForNavigation: 6 },
  LocationActivityType: { Fitness: 3 },
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  getBackgroundPermissionsAsync: jest.fn(async () => ({ granted: true })),
  hasStartedLocationUpdatesAsync: jest.fn(async () => false),
  startLocationUpdatesAsync: jest.fn(async () => {}),
  stopLocationUpdatesAsync: jest.fn(async () => {}),
  watchPositionAsync: jest.fn(async () => ({ remove: jest.fn() })),
}));
jest.mock("../db/client", () => ({ getDb: jest.fn(async () => ({})) }));
jest.mock("../db/queries/points", () => ({
  getPoints: jest.fn(async () => []),
}));
jest.mock("../db/queries/splits", () => ({ replaceSplits: jest.fn() }));
jest.mock("../db/queries/workouts", () => ({
  insertWorkout: jest.fn(async (_db: unknown, w: { id: string }) => {
    mockStore.rows.add(w.id);
  }),
  updateWorkout: jest.fn(async () => {}),
  getWorkout: jest.fn(async () => null),
  listUnfinished: jest.fn(async () =>
    [...mockStore.rows].map((id) => ({ id })),
  ),
  deleteWorkout: jest.fn(async (_db: unknown, id: string) => {
    mockStore.rows.delete(id);
  }),
}));
jest.mock("../tracking/state", () => ({
  ...jest.requireActual("../tracking/state"),
  getSession: jest.fn(async () => mockStore.session),
  saveSession: jest.fn(async (_db: unknown, s: Session) => {
    if (mockStore.saveGate) await mockStore.saveGate;
    mockStore.session = s;
  }),
  clearSession: jest.fn(async () => {
    mockStore.session = null;
  }),
}));
jest.mock("../liveactivity", () => ({
  start: jest.fn(async () => {}),
  update: jest.fn(),
  end: jest.fn(async () => {}),
  buildState: jest.fn(() => ({})),
}));
jest.mock("../tracking/pipeline", () => ({ ingest: jest.fn() }));
jest.mock("../tracking/widget", () => ({
  syncWidget: jest.fn(async () => {}),
}));

/* eslint-disable import/first -- jest.mock calls above are hoisted anyway */
import { deleteWorkout, insertWorkout } from "../db/queries/workouts";
import {
  findRecoverable,
  reattach,
  startWorkout,
  type StartOptions,
} from "../tracking/controller";
/* eslint-enable import/first */

const options: StartOptions = {
  activity: "run",
  mode: "accurate",
  goalType: "open",
  goalValue: 0,
  autoPause: true,
  voiceCues: false,
};

/** Starts a workout and parks it right after `insertWorkout`. */
async function startAndHoldBeforeSaveSession() {
  let release!: () => void;
  mockStore.saveGate = new Promise<void>((resolve) => (release = resolve));
  const started = startWorkout(options);
  // Let the job run up to the gated saveSession.
  while ((insertWorkout as jest.Mock).mock.calls.length === 0) {
    await new Promise((r) => setImmediate(r));
  }
  return { started, release };
}

beforeEach(() => {
  mockStore.rows.clear();
  mockStore.session = null;
  mockStore.saveGate = null;
  jest.clearAllMocks();
});

describe("controller serialization", () => {
  it("findRecoverable waits for an in-flight start instead of deleting its row as an orphan", async () => {
    const { started, release } = await startAndHoldBeforeSaveSession();
    const recovered = findRecoverable();
    release();

    const id = await started;
    const result = await recovered;

    expect(deleteWorkout).not.toHaveBeenCalled();
    expect(mockStore.rows.has(id)).toBe(true);
    expect(result?.session.workoutId).toBe(id);
  });

  it("still discards a real orphan (row inserted, process killed before saveSession)", async () => {
    mockStore.rows.add("orphan");
    expect(await findRecoverable()).toBeNull();
    expect(deleteWorkout).toHaveBeenCalledWith(expect.anything(), "orphan");
  });

  it("reattach waits for an in-flight start and sees its session", async () => {
    const { started, release } = await startAndHoldBeforeSaveSession();
    const reattached = reattach();
    release();

    const id = await started;
    expect((await reattached)?.workoutId).toBe(id);
  });
});
