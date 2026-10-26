import AsyncStorage from "@react-native-async-storage/async-storage";
import { _generateItem } from "@/testing/log-item";
import {
  LOGGER_RECOVERY_KEY,
  clearLoggerRecovery,
  loadLoggerRecovery,
  loadRecoveryPhotoFileNames,
  saveLoggerRecovery,
} from "..";
import type { LoggerRecovery } from "..";

const createRecovery = (): LoggerRecovery => ({
  version: 1,
  mode: "create",
  step: "message",
  savedAt: "2026-10-19T09:41:00.000Z",
  draft: {
    ..._generateItem({ message: "half a thought" }),
    rating: null,
    sleep: { quality: null },
    photos: [
      {
        id: "8f3a1f7e-2a4b-4c1d-9e8f-0a1b2c3d4e5f",
        fileName: "photo-1.jpg",
        width: 10,
        height: 10,
        createdAt: "2026-10-19T09:40:00.000Z",
        source: "library",
      },
    ],
  },
});

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

describe("logger recovery", () => {
  test("round-trips a snapshot and clears it", async () => {
    const recovery = createRecovery();

    await saveLoggerRecovery(recovery);
    expect(await loadLoggerRecovery()).toEqual(recovery);

    await clearLoggerRecovery();
    expect(await loadLoggerRecovery()).toBeNull();
  });

  test("rejects an invalid snapshot and keeps it stored", async () => {
    const stored = JSON.stringify({ version: 1, mode: "create" });
    await AsyncStorage.setItem(LOGGER_RECOVERY_KEY, stored);

    await expect(loadLoggerRecovery()).rejects.toMatchObject({
      status: "logger_recovery_invalid",
    });
    expect(await AsyncStorage.getItem(LOGGER_RECOVERY_KEY)).toBe(stored);
  });

  test("lists snapshot photos for the photo sweep", async () => {
    expect(await loadRecoveryPhotoFileNames()).toEqual([]);

    await saveLoggerRecovery(createRecovery());

    expect(await loadRecoveryPhotoFileNames()).toEqual(["photo-1.jpg"]);
  });

  test("blocks the photo sweep when the snapshot cannot be parsed", async () => {
    await AsyncStorage.setItem(LOGGER_RECOVERY_KEY, "{broken");

    expect(await loadRecoveryPhotoFileNames()).toBeNull();
  });
});
