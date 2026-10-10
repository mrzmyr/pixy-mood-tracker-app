import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createMemoryFileTransfer,
  setFileTransferOverride,
} from "../fileTransfer";
import { exportRawStorage } from "../rawExport";
import { STORAGE_KEY as STORAGE_KEY_LOGS } from "@/features/logs";
import { STORAGE_KEY as STORAGE_KEY_PEOPLE } from "@/features/people";
import { STORAGE_KEY as STORAGE_KEY_TAGS } from "@/features/tags";
import { INTERVENTIONS_STORAGE_KEY } from "@/features/interventions";
import { STORAGE_KEY as STORAGE_KEY_SETTINGS } from "@/state/settings";

describe("exportRawStorage()", () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  afterEach(() => {
    setFileTransferOverride(null);
    jest.restoreAllMocks();
  });

  test("should share stored values unparsed and keep storage unchanged", async () => {
    const fileTransfer = createMemoryFileTransfer();
    setFileTransferOverride(fileTransfer);
    await AsyncStorage.setItem(STORAGE_KEY_LOGS, "🐇");
    await AsyncStorage.setItem(STORAGE_KEY_SETTINGS, '{"loaded":true}');
    await AsyncStorage.setItem(INTERVENTIONS_STORAGE_KEY, '{"date":"x"}');
    const setItemSpy = jest.spyOn(AsyncStorage, "setItem");
    setItemSpy.mockClear();

    await exportRawStorage();

    expect(fileTransfer.shared).toHaveLength(1);
    expect(fileTransfer.shared[0].filename).toMatch(/\.json$/u);
    expect(JSON.parse(fileTransfer.shared[0].contents).storage).toEqual({
      [STORAGE_KEY_LOGS]: "🐇",
      [STORAGE_KEY_SETTINGS]: '{"loaded":true}',
      [STORAGE_KEY_TAGS]: null,
      [STORAGE_KEY_PEOPLE]: null,
      [INTERVENTIONS_STORAGE_KEY]: '{"date":"x"}',
    });
    expect(setItemSpy).not.toHaveBeenCalled();
    expect(await AsyncStorage.getItem(STORAGE_KEY_LOGS)).toBe("🐇");
  });

  test("should throw a structured error when sharing is unavailable", async () => {
    setFileTransferOverride(
      createMemoryFileTransfer({ isShareAvailable: false })
    );

    await expect(exportRawStorage()).rejects.toMatchObject({
      status: "raw_export_unavailable",
      why: expect.any(String),
      fix: expect.any(String),
    });
  });

  test("should throw a structured error when the file cannot be shared", async () => {
    setFileTransferOverride({
      share: () => Promise.reject(new Error("disk full")),
      pickJsonText: () => Promise.resolve(null),
    });

    await expect(exportRawStorage()).rejects.toMatchObject({
      status: "raw_export_failed",
      why: expect.stringContaining("disk full"),
      fix: expect.any(String),
    });
  });
});
