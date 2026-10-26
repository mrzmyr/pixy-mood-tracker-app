import * as FileSystem from "expo-file-system/legacy";
import * as squareImage from "@/lib/square-image";
import { deleteProfilePhotos, saveProfilePhoto } from "../photo";

const DIRECTORY = `${FileSystem.documentDirectory}profile/`;

describe("profile photo", () => {
  beforeEach(() => {
    jest.spyOn(FileSystem, "deleteAsync").mockResolvedValue();
    jest.spyOn(FileSystem, "moveAsync").mockResolvedValue();
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

  test("stores a new file per save and deletes older photos", async () => {
    jest
      .spyOn(squareImage, "renderSquareJpeg")
      .mockResolvedValue("file:///cache/rendered.jpg");
    jest
      .spyOn(FileSystem, "readDirectoryAsync")
      .mockResolvedValue(["photo-1.jpg", "photo-2.jpg"]);

    const path = await saveProfilePhoto({
      sourceUri: "file:///picked.jpg",
      now: 2,
    });

    expect(path).toBe("profile/photo-2.jpg");
    expect(FileSystem.moveAsync).toHaveBeenCalledWith({
      from: "file:///cache/rendered.jpg",
      to: `${DIRECTORY}photo-2.jpg`,
    });
    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(1);
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      `${DIRECTORY}photo-1.jpg`,
      { idempotent: true }
    );
  });

  test("a failed resize keeps the stored photo and reports a fix", async () => {
    jest
      .spyOn(squareImage, "renderSquareJpeg")
      .mockRejectedValue(new Error("bad image"));
    jest.spyOn(FileSystem, "readDirectoryAsync").mockResolvedValue(["a.jpg"]);

    await expect(
      saveProfilePhoto({ sourceUri: "file:///picked.jpg" })
    ).rejects.toMatchObject({
      status: "profile_photo_resize_failed",
      fix: expect.any(String),
    });
    expect(FileSystem.deleteAsync).not.toHaveBeenCalled();
  });

  test("delete removes every profile photo", async () => {
    jest
      .spyOn(FileSystem, "readDirectoryAsync")
      .mockResolvedValue(["photo-1.jpg", "photo-2.jpg"]);

    await deleteProfilePhotos();

    expect(FileSystem.deleteAsync).toHaveBeenCalledTimes(2);
  });
});
