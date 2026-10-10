import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { removeLeftoverExportFiles, shareExportFile } from "../exportFile";

// oxlint-disable-next-line anti-slop/no-module-mocking -- Jest has no native file system, so the directory constants are undefined; the tests assert on the paths built from them.
jest.mock("expo-file-system/legacy", () => ({
  ...jest.requireActual("expo-file-system/legacy"),
  cacheDirectory: "file:///cache/",
  documentDirectory: "file:///documents/",
}));

describe("shareExportFile()", () => {
  const share = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    share.mockReset().mockResolvedValue(true);
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("writes into the cache folder, not the documents folder", async () => {
    await shareExportFile("pixy-mood-tracker-2026-10-02.json", "{}", share);

    const [[uri, contents]] = jest.mocked(FileSystem.writeAsStringAsync).mock
      .calls;
    expect(uri).toBe(
      `${FileSystem.cacheDirectory}pixy-mood-tracker-2026-10-02.json`
    );
    expect(contents).toBe("{}");
    expect(share).toHaveBeenCalledWith(uri);
  });

  test("deletes the file after the iOS share sheet closes", async () => {
    jest.replaceProperty(Platform, "OS", "ios");

    await shareExportFile("pixy-mood-tracker-2026-10-02.json", "{}", share);

    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${FileSystem.cacheDirectory}pixy-mood-tracker-2026-10-02.json`,
      { idempotent: true }
    );
  });

  test("keeps the file on Android for apps that read it later", async () => {
    jest.replaceProperty(Platform, "OS", "android");

    await shareExportFile("pixy-mood-tracker-2026-10-02.json", "{}", share);

    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  test("deletes leftover exports but leaves other files alone", async () => {
    jest
      .mocked(FileSystem.readDirectoryAsync)
      .mockResolvedValueOnce([
        "pixy-mood-tracker-2025-01-01.json",
        "pixy-mood-tracker-2025-01-02.csv",
        "unrelated.csv",
      ])
      .mockResolvedValueOnce([
        "pixy-mood-tracker-2024-12-24.json",
        "pixy-mood-tracker-raw-2024-12-24.json",
        "fake-file-transfer.json",
        "RCTAsyncLocalStorage_V1",
      ]);

    await removeLeftoverExportFiles();

    const deleted = jest
      .mocked(FileSystem.deleteAsync)
      .mock.calls.map(([uri]) => uri);
    expect(deleted).toEqual([
      `${FileSystem.cacheDirectory}pixy-mood-tracker-2025-01-01.json`,
      `${FileSystem.cacheDirectory}pixy-mood-tracker-2025-01-02.csv`,
      `${FileSystem.documentDirectory}pixy-mood-tracker-2024-12-24.json`,
      `${FileSystem.documentDirectory}pixy-mood-tracker-raw-2024-12-24.json`,
    ]);
  });

  test("still shares when the cleanup fails", async () => {
    jest
      .mocked(FileSystem.readDirectoryAsync)
      .mockRejectedValue(new Error("no such directory"));

    await expect(
      shareExportFile("pixy-mood-tracker-2026-10-02.json", "{}", share)
    ).resolves.toBe(true);
    expect(share).toHaveBeenCalled();
  });
});
