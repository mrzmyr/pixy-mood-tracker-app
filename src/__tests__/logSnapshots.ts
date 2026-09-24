import * as FileSystem from "expo-file-system/legacy";
import * as Sentry from "@sentry/react-native";
import dayjs from "dayjs";
import {
  MAX_LOG_SNAPSHOTS,
  listLogSnapshots,
  readLogSnapshot,
  snapshotLogs,
} from "../helpers/logSnapshots";

jest.mock("@sentry/react-native", () => ({
  captureException: jest.fn(),
}));

jest.mock("expo-file-system/legacy", () => {
  const files = new Map<string, string>();
  const directories = new Set<string>();
  return {
    __files: files,
    __directories: directories,
    documentDirectory: "file:///documents/",
    makeDirectoryAsync: jest.fn(async (uri: string) => {
      directories.add(uri);
    }),
    getInfoAsync: jest.fn(async (uri: string) => ({
      exists: files.has(uri) || directories.has(uri),
    })),
    readDirectoryAsync: jest.fn(async (uri: string) =>
      [...files.keys()]
        .filter((key) => key.startsWith(uri))
        .map((key) => key.slice(uri.length))
    ),
    writeAsStringAsync: jest.fn(async (uri: string, contents: string) => {
      files.set(uri, contents);
    }),
    readAsStringAsync: jest.fn(async (uri: string) => {
      if (!files.has(uri)) throw new Error(`File ${uri} does not exist`);
      return files.get(uri);
    }),
    deleteAsync: jest.fn(async (uri: string) => {
      files.delete(uri);
    }),
  };
});

const fs = FileSystem as unknown as typeof FileSystem & {
  __files: Map<string, string>;
  __directories: Set<string>;
};

const DIRECTORY = "file:///documents/snapshots/";

describe("logSnapshots", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    fs.__files.clear();
    fs.__directories.clear();
    jest.clearAllMocks();
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  it("should write one snapshot per day", async () => {
    await snapshotLogs({ items: [{ id: "1" }] }, dayjs("2024-12-01"));
    await snapshotLogs({ items: [] as unknown[] }, dayjs("2024-12-01"));
    await snapshotLogs({ items: [{ id: "changed" }] }, dayjs("2024-12-01"));

    expect(await listLogSnapshots()).toEqual([
      { date: "2024-12-01", uri: `${DIRECTORY}logs-2024-12-01.json` },
    ]);
    expect(fs.__files.get(`${DIRECTORY}logs-2024-12-01.json`)).toBe(
      JSON.stringify({ items: [{ id: "1" }] })
    );
  });

  it("should skip empty logs", async () => {
    await snapshotLogs({ items: [] }, dayjs("2024-12-01"));
    expect(await listLogSnapshots()).toEqual([]);
  });

  it(`should keep only the newest ${MAX_LOG_SNAPSHOTS} snapshots`, async () => {
    for (let day = 1; day <= MAX_LOG_SNAPSHOTS + 3; day++) {
      await snapshotLogs(
        { items: [{ id: String(day) }] },
        dayjs("2024-11-30").add(day, "day")
      );
    }

    const snapshots = await listLogSnapshots();
    expect(snapshots).toHaveLength(MAX_LOG_SNAPSHOTS);
    expect(snapshots[0].date).toBe("2024-12-10");
    expect(snapshots[MAX_LOG_SNAPSHOTS - 1].date).toBe("2024-12-04");
  });

  it("should ignore unrelated files", async () => {
    fs.__directories.add(DIRECTORY);
    fs.__files.set(`${DIRECTORY}notes.json`, "{}");
    fs.__files.set(`${DIRECTORY}logs-latest.json`, "{}");

    expect(await listLogSnapshots()).toEqual([]);
  });

  it("should report instead of throwing when writing fails", async () => {
    (FileSystem.writeAsStringAsync as jest.Mock).mockRejectedValueOnce(
      new Error("disk full")
    );

    await expect(
      snapshotLogs({ items: [{ id: "1" }] }, dayjs("2024-12-01"))
    ).resolves.toBeUndefined();

    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "log_snapshot_failed",
        message: "Automatic backup could not be saved",
        why: "Writing the daily log snapshot failed: disk full",
        fix: "Export your data manually and check available device storage",
      })
    );
  });

  it("should read a snapshot", async () => {
    await snapshotLogs({ items: [{ id: "1" }] }, dayjs("2024-12-01"));
    const [snapshot] = await listLogSnapshots();

    expect(await readLogSnapshot(snapshot)).toEqual({ items: [{ id: "1" }] });
  });

  it("should reject a snapshot without entries", async () => {
    fs.__files.set(`${DIRECTORY}logs-2024-12-01.json`, JSON.stringify({ foo: 1 }));

    await expect(
      readLogSnapshot({ date: "2024-12-01", uri: `${DIRECTORY}logs-2024-12-01.json` })
    ).rejects.toMatchObject({
      status: "log_snapshot_invalid",
      message: "Automatic backup is invalid",
      why: "The snapshot from 2024-12-01 has no list of entries",
      fix: "Choose another backup or import an exported file",
    });
  });

  it("should reject an unreadable snapshot", async () => {
    fs.__files.set(`${DIRECTORY}logs-2024-12-01.json`, "{\"items\": [trunc");

    await expect(
      readLogSnapshot({ date: "2024-12-01", uri: `${DIRECTORY}logs-2024-12-01.json` })
    ).rejects.toMatchObject({
      status: "log_snapshot_unreadable",
      fix: "Choose another backup or import an exported file",
    });
  });
});
