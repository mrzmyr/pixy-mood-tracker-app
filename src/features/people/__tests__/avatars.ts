import * as FileSystem from "expo-file-system/legacy";
import {
  readAvatarBase64,
  removeOrphanAvatars,
  writeAvatarFromBase64,
} from "../avatars";

const DIRECTORY = `${FileSystem.documentDirectory}people/`;

describe("avatars", () => {
  beforeEach(() => {
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "makeDirectoryAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: true,
      isDirectory: true,
      uri: "",
      size: 0,
      modificationTime: 0,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("writes base64 avatars and resolves null when writing fails", async () => {
    const write = jest
      .spyOn(FileSystem, "writeAsStringAsync")
      .mockResolvedValueOnce()
      .mockRejectedValueOnce(new Error("disk full"));

    expect(await writeAvatarFromBase64({ id: "a", base64: "AAAA" })).toBe(
      "people/a.jpg"
    );
    expect(write).toHaveBeenCalledWith(`${DIRECTORY}a.jpg`, "AAAA", {
      encoding: FileSystem.EncodingType.Base64,
    });
    expect(await writeAvatarFromBase64({ id: "b", base64: "AAAA" })).toBeNull();
  });

  test("reads base64 and resolves null for a missing file", async () => {
    jest
      .spyOn(FileSystem, "readAsStringAsync")
      .mockResolvedValueOnce("QUJD")
      .mockRejectedValueOnce(new Error("missing"));

    expect(await readAvatarBase64("people/a.jpg")).toBe("QUJD");
    expect(await readAvatarBase64("people/gone.jpg")).toBeNull();
  });

  test("removes only files no person references", async () => {
    jest
      .spyOn(FileSystem, "readDirectoryAsync")
      .mockResolvedValue(["a.jpg", "b.jpg", "stray.jpg"]);

    await removeOrphanAvatars(["people/a.jpg", null, "people/b.jpg"]);

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${DIRECTORY}stray.jpg`,
      {
        idempotent: true,
      }
    );
  });

  test("does nothing when the folder does not exist", async () => {
    jest.spyOn(FileSystem, "getInfoAsync").mockResolvedValue({
      exists: false,
      isDirectory: false,
      uri: "",
    });
    const read = jest.spyOn(FileSystem, "readDirectoryAsync");

    await removeOrphanAvatars([]);

    expect(read).not.toHaveBeenCalled();
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });
});
