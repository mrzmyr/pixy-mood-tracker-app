import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { setFileTransferOverride } from "../fileTransfer";
import { exportRawStorage } from "../rawExport";
import { STORAGE_KEY as STORAGE_KEY_LOGS } from "@/features/logs";
import { STORAGE_KEY as STORAGE_KEY_PEOPLE } from "@/features/people";
import { STORAGE_KEY as STORAGE_KEY_TAGS } from "@/features/tags";
import { INTERVENTIONS_STORAGE_KEY } from "@/features/interventions";
import { STORAGE_KEY as STORAGE_KEY_SETTINGS } from "@/state/settings";

describe("exportRawStorage()", () => {
  const share = jest.fn();

  beforeEach(async () => {
    await AsyncStorage.clear();
    share.mockReset().mockResolvedValue(true);
    setFileTransferOverride({ share, pickJson: jest.fn() });
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
  });

  afterEach(() => {
    setFileTransferOverride(null);
    jest.restoreAllMocks();
  });

  test("should share stored values unparsed and keep storage unchanged", async () => {
    await AsyncStorage.setItem(STORAGE_KEY_LOGS, "🐇");
    await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, '{"loaded":true}');
    await AsyncStorage.setItem(INTERVENTIONS_STORAGE_KEY, '{"date":"x"}');
    const setItemSpy = jest.spyOn(AsyncStorage, "setItem");
    setItemSpy.mockClear();

    await exportRawStorage();

    const [[uri, contents]] = jest.mocked(FileSystem.writeAsStringAsync).mock
      .calls;
    expect(JSON.parse(contents).storage).toEqual({
      [STORAGE_KEY_LOGS]: "🐇",
      [STORAGE_KEY_SETTINGS]: '{"loaded":true}',
      [STORAGE_KEY_TAGS]: null,
      [STORAGE_KEY_PEOPLE]: null,
      [INTERVENTIONS_STORAGE_KEY]: '{"date":"x"}',
    });
    expect(share).toHaveBeenCalledWith(uri);
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEY_LOGS)).toBe("🐇");
  });

  test("should throw a structured error when sharing is unavailable", async () => {
    share.mockResolvedValue(false);

    await expect(exportRawStorage()).rejects.toMatchObject({
      status: "raw_export_unavailable",
      message: "Stored data could not be exported",
      why: expect.any(String),
      fix: expect.any(String),
    });
  });

  test("should throw a structured error when the file cannot be written", async () => {
    jest
      .spyOn(FileSystem, "writeAsStringAsync")
      .mockRejectedValue(new Error("disk full"));

    await expect(exportRawStorage()).rejects.toMatchObject({
      status: "raw_export_failed",
      why: expect.stringContaining("disk full"),
      fix: expect.any(String),
    });
    expect(share).not.toHaveBeenCalled();
  });
});
