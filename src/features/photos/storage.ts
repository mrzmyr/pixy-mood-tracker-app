import dayjs from "dayjs";
import { Directory, File, Paths } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { v4 as uuidv4 } from "uuid";
import { createStructuredError } from "@/lib/errors";
import type { LogPhoto } from "@/types";

/** Most photos one entry holds. Pickers get the remaining count as limit. */
export const MAX_PHOTOS_PER_ENTRY = 6;

/** Longest edge in pixels of an imported photo. Larger photos are scaled down. */
export const MAX_PHOTO_EDGE = 2048;

/** JPEG quality of imported photos, from 0 to 1. */
export const PHOTO_JPEG_QUALITY = 0.82;

const DIRECTORY_NAME = "photos";

const getCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

/**
 * Directory that holds every photo file: `<document>/photos/`.
 *
 * May not exist yet. {@link importPhoto} creates it on first write.
 */
export const getPhotosDirectory = () =>
  new Directory(Paths.document, DIRECTORY_NAME);

/**
 * File of a stored photo. Resolve at render time: the document directory
 * path changes between iOS installs and updates, so entries store
 * `fileName` only. The file can be missing, for example after an import
 * from a backup made on another device.
 */
export const getPhotoFile = ({ fileName }: Pick<LogPhoto, "fileName">) =>
  new File(getPhotosDirectory(), fileName);

/**
 * File names referenced by entries. Use as input of
 * {@link deleteUnreferencedPhotos}.
 */
export const getReferencedFileNames = ({
  items,
}: {
  items: { photos?: LogPhoto[] }[];
}) => {
  const fileNames = new Set<string>();
  for (const item of items) {
    for (const photo of item.photos ?? []) {
      fileNames.add(photo.fileName);
    }
  }
  return fileNames;
};

const createDirectory = () => {
  const directory = getPhotosDirectory();
  try {
    directory.create({ idempotent: true, intermediates: true });
  } catch (error) {
    throw createStructuredError({
      status: "photo_directory_failed",
      message: "Photos directory could not be created",
      why: `Creating the photos directory failed: ${getCause(error)}`,
      fix: "Free up device storage, then add the photo again",
    });
  }
  return directory;
};

const getResizeTarget = ({
  width,
  height,
}: {
  width: number;
  height: number;
}) => {
  if (Math.max(width, height) <= MAX_PHOTO_EDGE) {
    return null;
  }
  if (width >= height) {
    return { width: MAX_PHOTO_EDGE };
  }
  return { height: MAX_PHOTO_EDGE };
};

/**
 * Copies a picked image into the photos directory as JPEG and returns its
 * entry reference. Scales the image down to {@link MAX_PHOTO_EDGE} on the
 * longest edge; smaller images keep their size.
 *
 * The file exists before any entry references it. Draft photos that are
 * never saved stay until {@link deleteUnreferencedPhotos} runs.
 *
 * @returns The stored photo. Rejects with a structured error, status
 *   `photo_directory_failed` or `photo_import_failed`.
 */
export const importPhoto = async ({
  uri,
}: {
  uri: string;
}): Promise<LogPhoto> => {
  const directory = createDirectory();
  const id = uuidv4();
  const fileName = `${id}.jpg`;

  try {
    const context = ImageManipulator.manipulate(uri);
    const original = await context.renderAsync();
    const resizeTarget = getResizeTarget(original);
    const image = resizeTarget
      ? await context.resize(resizeTarget).renderAsync()
      : original;
    const result = await image.saveAsync({
      compress: PHOTO_JPEG_QUALITY,
      format: SaveFormat.JPEG,
    });
    // Frees native image memory now instead of at garbage collection.
    context.release();
    original.release();
    if (image !== original) {
      image.release();
    }

    // Move, not copy: the manipulator writes to the cache directory, and a
    // copy would leave a second file there.
    await new File(result.uri).move(new File(directory, fileName));

    return {
      id,
      fileName,
      width: result.width,
      height: result.height,
      createdAt: dayjs().toISOString(),
    };
  } catch (error) {
    throw createStructuredError({
      status: "photo_import_failed",
      message: "Photo could not be added",
      why: `Converting or storing the picked image failed: ${getCause(error)}`,
      fix: "Pick the photo again, or pick another photo",
    });
  }
};

/**
 * Deletes every file in the photos directory that no entry references.
 *
 * One cleanup for every path that drops a photo: entry delete, photo
 * removed in edit, cancel after adding, import, and reset. Callers pass
 * file names of stored entries only after storage loaded. A failed load
 * must never lead to a sweep, or it deletes every photo.
 *
 * Never run while a draft holds imported photos that are not saved yet:
 * the sweep deletes them.
 *
 * @returns Number of deleted files. Throws a structured error, status
 *   `photo_sweep_failed`, when the directory cannot be read or a file
 *   cannot be deleted.
 */
export const deleteUnreferencedPhotos = ({
  referencedFileNames,
}: {
  referencedFileNames: Set<string>;
}): number => {
  const directory = getPhotosDirectory();
  try {
    if (!directory.exists) {
      return 0;
    }
    let deletedCount = 0;
    for (const entry of directory.list()) {
      if (entry instanceof File && !referencedFileNames.has(entry.name)) {
        entry.delete();
        deletedCount += 1;
      }
    }
    return deletedCount;
  } catch (error) {
    throw createStructuredError({
      status: "photo_sweep_failed",
      message: "Unused photo files could not be deleted",
      why: `Listing or deleting files in the photos directory failed: ${getCause(error)}`,
      fix: "Restart Pixy. The cleanup runs again after entries load",
    });
  }
};
