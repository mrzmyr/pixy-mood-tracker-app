import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { getFileTransfer } from "../fileTransfer";

// oxlint-disable-next-line anti-slop/no-module-mocking -- expo-sharing is a native module unavailable in Jest; the system adapter calls it directly.
jest.mock("expo-sharing", () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn(() => Promise.resolve()),
}));

describe("system file transfer", () => {
  beforeEach(() => {
    jest.spyOn(FileSystem, "writeAsStringAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue([]);
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.mocked(Sharing.shareAsync).mockClear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test.each([
    ["pixy-mood-tracker-2026-10-04.json", "application/json", "public.json"],
    [
      "pixy-mood-tracker-2026-10-04.csv",
      "text/csv",
      "public.comma-separated-values-text",
    ],
  ])("shares %s as %s", async (filename, mimeType, UTI) => {
    await expect(getFileTransfer().share(filename, "{}")).resolves.toBe(true);

    expect(Sharing.shareAsync).toHaveBeenCalledWith(
      `${FileSystem.cacheDirectory}${filename}`,
      { mimeType, UTI }
    );
  });

  test("returns the text of the picked file", async () => {
    jest.spyOn(DocumentPicker, "getDocumentAsync").mockResolvedValueOnce({
      canceled: false,
      assets: [
        { uri: "file:///picked.json", name: "picked.json", lastModified: 0 },
      ],
    });
    jest.spyOn(FileSystem, "readAsStringAsync").mockResolvedValueOnce("{}");

    await expect(getFileTransfer().pickJsonText()).resolves.toBe("{}");
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith(
      "file:///picked.json"
    );
  });

  test("returns null when the user cancels the picker", async () => {
    jest.spyOn(DocumentPicker, "getDocumentAsync").mockResolvedValueOnce({
      canceled: true,
      assets: null,
    });

    await expect(getFileTransfer().pickJsonText()).resolves.toBeNull();
  });
});
