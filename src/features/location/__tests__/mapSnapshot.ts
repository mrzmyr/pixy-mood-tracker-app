import * as Sentry from "@sentry/react-native";
import type { SnapshotRequest } from "../mapSnapshot";
import { getSnapshot, getSnapshotFileName, loadSnapshot } from "../mapSnapshot";

// oxlint-disable-next-line anti-slop/no-module-mocking -- mapSnapshot imports the Sentry SDK directly without an injection seam; the test asserts on captureException
jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

const nativeModules = globalThis.expo.modules;

const setNativeModule = (createAsync?: jest.Mock) => {
  if (createAsync === undefined) {
    delete nativeModules.MapSnapshot;
  } else {
    nativeModules.MapSnapshot = { createAsync };
  }
};

// Results stay cached per session (module state), so every test uses its
// own place.
const request = (latitude: number): SnapshotRequest => ({
  latitude,
  longitude: 13.405,
  width: 160,
  height: 120,
  scale: 3,
  colorScheme: "light",
});

describe("getSnapshotFileName", () => {
  it("shares one file between places closer than the rounding", () => {
    expect(getSnapshotFileName(request(52.52001))).toBe(
      getSnapshotFileName(request(52.52004))
    );
  });

  it("gives each place, color scheme, and tile size its own file", () => {
    const base = request(52.52);
    const names = new Set([
      getSnapshotFileName(base),
      getSnapshotFileName(request(52.521)),
      getSnapshotFileName({ ...base, colorScheme: "dark" }),
      getSnapshotFileName({ ...base, width: 200 }),
      getSnapshotFileName({ ...base, scale: 2 }),
    ]);
    expect(names.size).toBe(5);
  });

  it("keeps coordinates out of the file name", () => {
    expect(getSnapshotFileName(request(52.52))).not.toMatch(/52|13/u);
  });
});

describe("loadSnapshot", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    setNativeModule();
  });

  it("renders a place once for tiles that ask at the same time", async () => {
    const createAsync = jest.fn().mockResolvedValue(null);
    setNativeModule(createAsync);

    const [first, second] = await Promise.all([
      loadSnapshot(request(48.1)),
      loadSnapshot(request(48.1)),
    ]);

    expect(createAsync).toHaveBeenCalledTimes(1);
    expect(first).toMatch(/^file:.*\.png$/u);
    expect(second).toBe(first);
    expect(getSnapshot(request(48.1))).toBe(first);
  });

  it("falls back to the placeholder when the build lacks the native module", async () => {
    setNativeModule();

    await expect(loadSnapshot(request(47.1))).resolves.toBeNull();

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "map_snapshot_unavailable",
        why: expect.any(String),
        fix: expect.any(String),
      })
    );
  });

  it("falls back to the placeholder without a retry when MapKit fails", async () => {
    const createAsync = jest
      .fn()
      .mockRejectedValue(new Error("MKMapSnapshotter failed: offline"));
    setNativeModule(createAsync);

    await expect(loadSnapshot(request(46.1))).resolves.toBeNull();
    await expect(loadSnapshot(request(46.1))).resolves.toBeNull();

    expect(createAsync).toHaveBeenCalledTimes(1);
    expect(getSnapshot(request(46.1))).toBeNull();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "map_snapshot_failed",
        why: "MKMapSnapshotter failed: offline",
      })
    );
  });
});
