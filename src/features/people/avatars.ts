import * as FileSystem from "expo-file-system/legacy";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { createStructuredError } from "@/lib/errors";

/** Folder under the app documents directory that holds every avatar file. */
export const AVATAR_DIRECTORY = "people/";

/** Longest edge of a stored avatar, in pixels. */
export const AVATAR_SIZE = 256;

/** JPEG quality of a stored avatar; ~15 KB per file at {@link AVATAR_SIZE}. */
export const AVATAR_QUALITY = 0.8;

const getDirectoryUri = () => {
  const root = FileSystem.documentDirectory;
  if (!root) {
    throw createStructuredError({
      status: "avatar_directory_unavailable",
      message: "Avatar folder is unavailable",
      why: "The platform exposes no document directory",
      fix: "Avatars need a native build; the web build has no file storage",
    });
  }
  return `${root}${AVATAR_DIRECTORY}`;
};

const ensureDirectory = async () => {
  const uri = getDirectoryUri();
  const info = await FileSystem.getInfoAsync(uri);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(uri, { intermediates: true });
  }
  return uri;
};

/** Relative storage path of the avatar file for `id`. */
export const getAvatarPath = (id: string) => `${AVATAR_DIRECTORY}${id}.jpg`;

/**
 * Absolute file URI for a stored relative avatar path. Stored paths stay
 * relative because the iOS container path changes with every app update.
 */
export const getAvatarUri = (path: string) =>
  `${FileSystem.documentDirectory}${path}`;

const deleteQuietly = async (uri: string) => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best effort: a leftover file costs ~15 KB and the next sweep retries.
  }
};

/**
 * Center-crops `sourceUri` to a square, scales it to {@link AVATAR_SIZE},
 * and stores it as JPEG under `people/<id>.jpg`. Replaces an existing file.
 *
 * @returns the relative path to store on the person.
 */
export const saveAvatar = async ({
  id,
  sourceUri,
}: {
  id: string;
  sourceUri: string;
}): Promise<string> => {
  let resultUri: string;
  try {
    const original = await ImageManipulator.manipulate(sourceUri).renderAsync();
    const size = Math.min(original.width, original.height);
    const rendered = await ImageManipulator.manipulate(original)
      .crop({
        originX: Math.floor((original.width - size) / 2),
        originY: Math.floor((original.height - size) / 2),
        width: size,
        height: size,
      })
      .resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
      .renderAsync();
    const saved = await rendered.saveAsync({
      compress: AVATAR_QUALITY,
      format: SaveFormat.JPEG,
    });
    resultUri = saved.uri;
  } catch (error) {
    throw createStructuredError({
      status: "avatar_resize_failed",
      message: "Photo could not be processed",
      why: `Cropping or resizing the picked image failed: ${String(error)}`,
      fix: "Pick a different photo, or remove the photo for this person",
    });
  }

  const path = getAvatarPath(id);
  const target = getAvatarUri(path);
  try {
    await ensureDirectory();
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.moveAsync({ from: resultUri, to: target });
  } catch (error) {
    await deleteQuietly(resultUri);
    throw createStructuredError({
      status: "avatar_write_failed",
      message: "Photo could not be saved",
      why: `Writing ${path} failed: ${String(error)}`,
      fix: "Check free storage on the device, then pick the photo again",
    });
  }
  return path;
};

/**
 * Decodes a base64 JPEG from an import file into `people/<id>.jpg`.
 *
 * @returns the relative path, or `null` when the data cannot be written. A
 *   corrupt avatar must not block the import of the person.
 */
export const writeAvatarFromBase64 = async ({
  id,
  base64,
}: {
  id: string;
  base64: string;
}): Promise<string | null> => {
  const path = getAvatarPath(id);
  try {
    await ensureDirectory();
    await FileSystem.writeAsStringAsync(getAvatarUri(path), base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return path;
  } catch {
    return null;
  }
};

/** Reads a stored avatar as base64 for export; `null` when the file is missing. */
export const readAvatarBase64 = async (
  path: string
): Promise<string | null> => {
  try {
    return await FileSystem.readAsStringAsync(getAvatarUri(path), {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch {
    return null;
  }
};

/** Deletes one avatar file. Missing files are not an error. */
export const deleteAvatar = async (path: string) => {
  await deleteQuietly(getAvatarUri(path));
};

/** Deletes the whole avatar folder, for example on a data reset. */
export const deleteAllAvatars = async () => {
  await deleteQuietly(getDirectoryUri());
};

/**
 * Deletes avatar files that no person in `avatarPaths` references, for
 * example after a crash between a file write and the store update.
 */
export const removeOrphanAvatars = async (avatarPaths: (string | null)[]) => {
  const keep = new Set(
    avatarPaths.flatMap((path) => (path ? [getAvatarUri(path)] : []))
  );
  let names: string[];
  try {
    const directory = getDirectoryUri();
    const info = await FileSystem.getInfoAsync(directory);
    if (!info.exists) {
      return;
    }
    names = await FileSystem.readDirectoryAsync(directory);
  } catch {
    return;
  }
  await Promise.all(
    names.flatMap((name) => {
      const uri = `${getDirectoryUri()}${name}`;
      return keep.has(uri) ? [] : [deleteQuietly(uri)];
    })
  );
};
