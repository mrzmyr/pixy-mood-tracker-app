import { File, Paths } from "expo-file-system";
import * as ExpoImageManipulator from "expo-image-manipulator";
import {
  MAX_PHOTO_EDGE,
  PHOTO_JPEG_QUALITY,
  deleteUnreferencedPhotos,
  getPhotoFile,
  getPhotosDirectory,
  getReferencedFileNames,
  importPhoto,
} from "../storage";

// Helpers of the manual mock in src/__mocks__/expo-image-manipulator.js.
const { ImageManipulator, SaveFormat, __setImageSize, __resetImageSizes } =
  // SAFETY: Jest resolves this import to the manual mock, which adds the helpers.
  ExpoImageManipulator as typeof ExpoImageManipulator & {
    __setImageSize: (image: {
      uri: string;
      width: number;
      height: number;
    }) => void;
    __resetImageSizes: () => void;
  };

const writePhotoFile = (fileName: string) => {
  const directory = getPhotosDirectory();
  directory.create({ idempotent: true, intermediates: true });
  const file = new File(directory, fileName);
  file.create();
  return file;
};

beforeEach(() => {
  __resetImageSizes();
  jest.mocked(ImageManipulator.manipulate).mockClear();
  const directory = getPhotosDirectory();
  if (directory.exists) {
    directory.delete();
  }
});

describe("importPhoto", () => {
  test("stores photos at 1600 px and JPEG quality 0.75", () => {
    expect(MAX_PHOTO_EDGE).toBe(1600);
    expect(PHOTO_JPEG_QUALITY).toBe(0.75);
  });

  test("keeps the library id of a day photo", async () => {
    const uri = `${Paths.cache.uri}day-photo.jpg`;
    __setImageSize({ uri, width: 900, height: 1200 });

    const photo = await importPhoto({
      uri,
      source: "day",
      libraryId: "ABC-123/L0/001",
    });

    expect(photo).toMatchObject({ source: "day", libraryId: "ABC-123/L0/001" });
  });

  test("scales a large photo down to the longest edge limit", async () => {
    const uri = `${Paths.cache.uri}picked-large.heic`;
    __setImageSize({ uri, width: 4032, height: 3024 });

    const photo = await importPhoto({ uri, source: "library" });

    expect(photo).toEqual({
      id: expect.any(String),
      fileName: `${photo.id}.jpg`,
      width: MAX_PHOTO_EDGE,
      height: 1200,
      createdAt: expect.any(String),
      source: "library",
    });
    const context = jest.mocked(ImageManipulator.manipulate).mock.results[0]
      .value;
    expect(context.resize).toHaveBeenCalledWith({ width: MAX_PHOTO_EDGE });
    const image = await context.renderAsync.mock.results[1].value;
    expect(image.saveAsync).toHaveBeenCalledWith({
      compress: PHOTO_JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    expect(getPhotoFile(photo).exists).toBe(true);
  });

  test("scales a tall photo by height", async () => {
    const uri = `${Paths.cache.uri}picked-tall.jpg`;
    __setImageSize({ uri, width: 3000, height: 4000 });

    const photo = await importPhoto({ uri, source: "camera" });

    expect(photo.width).toBe(1200);
    expect(photo.height).toBe(MAX_PHOTO_EDGE);
  });

  test("keeps the size of a photo under the limit", async () => {
    const uri = `${Paths.cache.uri}picked-small.jpg`;
    __setImageSize({ uri, width: 900, height: 1200 });

    const photo = await importPhoto({ uri, source: "library" });

    const context = jest.mocked(ImageManipulator.manipulate).mock.results[0]
      .value;
    expect(context.resize).not.toHaveBeenCalled();
    expect(photo.width).toBe(900);
    expect(photo.height).toBe(1200);
    expect(getPhotoFile(photo).exists).toBe(true);
  });

  test("rejects with a structured error when the image cannot be read", async () => {
    await expect(
      importPhoto({ uri: `${Paths.cache.uri}missing.jpg`, source: "day" })
    ).rejects.toMatchObject({
      status: "photo_import_failed",
      message: expect.any(String),
      why: expect.stringContaining("Could not load image"),
      fix: expect.any(String),
    });
  });
});

describe("deleteUnreferencedPhotos", () => {
  test("deletes only files no entry references", () => {
    const kept = writePhotoFile("kept.jpg");
    const orphan = writePhotoFile("orphan.jpg");

    const deletedCount = deleteUnreferencedPhotos({
      referencedFileNames: new Set(["kept.jpg", "missing-on-disk.jpg"]),
    });

    expect(deletedCount).toBe(1);
    expect(kept.exists).toBe(true);
    expect(orphan.exists).toBe(false);
  });

  test("does nothing before the photos directory exists", () => {
    expect(deleteUnreferencedPhotos({ referencedFileNames: new Set() })).toBe(
      0
    );
  });
});

describe("getReferencedFileNames", () => {
  test("collects file names of every entry", () => {
    const photo = {
      id: "1",
      fileName: "1.jpg",
      width: 1,
      height: 1,
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "library" as const,
    };

    expect(
      getReferencedFileNames({
        items: [
          { photos: [photo, { ...photo, id: "2", fileName: "2.jpg" }] },
          { photos: [] },
          {},
        ],
      })
    ).toEqual(new Set(["1.jpg", "2.jpg"]));
  });
});
