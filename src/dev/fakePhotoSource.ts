import { File, Paths } from "expo-file-system";
import noop from "lodash/noop";
import type { LibraryPermission, PhotoSource } from "@/features/photos";
import { createStructuredError } from "@/lib/errors";

// Solid-color 3x4 PNGs, one color per fake photo. The app writes them to the
// cache at runtime, so the repository and production bundles hold no image
// files.
const PICKER_IMAGES = {
  coral:
    "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mP4lB0NQQx4WQCjyxShaSq6oQAAAABJRU5ErkJggg==",
  teal: "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mPQmtsPQQx4WQA8GxAJ8ETtNQAAAABJRU5ErkJggg==",
  amber:
    "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mP4sigRghjwsgDeqxeVn1MZHgAAAABJRU5ErkJggg==",
};
const DAY_IMAGES = {
  indigo:
    "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mOIyT4AQQx4WQBqFxJV+NYD+gAAAABJRU5ErkJggg==",
  green:
    "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mPo2lgLQQx4WQCdUxShTYrbpQAAAABJRU5ErkJggg==",
  pink: "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mN4nr8CghjwsgDhSxfpRq5xDAAAAABJRU5ErkJggg==",
  sky: "iVBORw0KGgoAAAANSUhEUgAAAAMAAAAECAIAAADETxJQAAAAEElEQVR42mPw3/wCghjwsgDEaxb586Y7zgAAAABJRU5ErkJggg==",
};

const IMAGE_WIDTH = 3;
const IMAGE_HEIGHT = 4;

const PICKER_ENTRIES = Object.entries(PICKER_IMAGES);
const DAY_ENTRIES = Object.entries(DAY_IMAGES);

// Writes the image to the cache and returns it as a picked photo.
const writeImage = ({ name, base64 }: { name: string; base64: string }) => {
  const file = new File(Paths.cache, `fake-photo-${name}.png`);
  try {
    file.create({ overwrite: true });
    file.write(base64, { encoding: "base64" });
  } catch (error) {
    throw createStructuredError({
      status: "fake_photo_unavailable",
      message: "Fake photo could not be written",
      why: `Writing ${file.name} to the cache failed: ${error instanceof Error ? error.message : String(error)}`,
      fix: "Free up device storage, then add the photo again",
    });
  }
  return { uri: file.uri, width: IMAGE_WIDTH, height: IMAGE_HEIGHT };
};

// Library access starts `undetermined`, like a fresh install, so the
// permission row and its Allow flow show. Allow grants it until restart.
let permission: LibraryPermission = "undetermined";
let nextPickerImage = 0;

/**
 * Stands in for the library picker and photo library in preview builds:
 * returns solid-color images without system screens or permission dialogs.
 * Each picker open returns the next of 3 colors, and every day holds 4
 * other colors.
 */
export const fakePhotoSource: PhotoSource = {
  pickFromLibrary: ({ limit }) => {
    if (limit <= 0) {
      return Promise.resolve([]);
    }
    const [name, base64] =
      PICKER_ENTRIES[nextPickerImage % PICKER_ENTRIES.length];
    nextPickerImage += 1;
    return Promise.resolve([writeImage({ name, base64 })]);
  },
  getLibraryPermission: () => Promise.resolve(permission),
  requestLibraryPermission: () => {
    permission = "granted";
    return Promise.resolve(permission);
  },
  manageLibraryAccess: () => Promise.resolve(),
  // The fake library never changes.
  addLibraryListener: () => noop,
  listPhotosOnDate: () =>
    Promise.resolve(
      DAY_ENTRIES.map(([name, base64]) => ({
        id: `fake-day-photo-${name}`,
        uri: writeImage({ name, base64 }).uri,
      }))
    ),
  // Fake files sit in the cache already, so the preview URI imports as is.
  getLibraryPhotoUri: ({ photo }) => Promise.resolve(photo.uri),
};
