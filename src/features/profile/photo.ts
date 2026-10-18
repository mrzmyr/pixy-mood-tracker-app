import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import { createStructuredError } from "@/lib/errors";
import { renderSquareJpeg } from "@/lib/square-image";

/**
 * Folder under the documents directory for the profile photo. Separate from
 * `people/`: the people store deletes every file there that no person uses.
 */
export const PROFILE_DIRECTORY = "profile/";

/** Edge of the stored profile photo, in pixels. */
export const PROFILE_PHOTO_SIZE = 256;

/** JPEG quality of the stored profile photo; ~15 KB at {@link PROFILE_PHOTO_SIZE}. */
const PROFILE_PHOTO_QUALITY = 0.8;

const getDirectoryUri = () => {
  const root = FileSystem.documentDirectory;
  if (!root) {
    throw createStructuredError({
      status: "profile_directory_unavailable",
      message: "Profile photo folder is unavailable",
      why: "The platform exposes no document directory",
      fix: "Profile photos need a native build; the web build has no file storage",
    });
  }
  return `${root}${PROFILE_DIRECTORY}`;
};

/**
 * Absolute file URI for a stored relative photo path. Stored paths stay
 * relative because the iOS container path changes with every app update.
 */
export const getProfilePhotoUri = (path: string) =>
  `${FileSystem.documentDirectory}${path}`;

const deleteQuietly = async (uri: string) => {
  try {
    await FileSystem.deleteAsync(uri, { idempotent: true });
  } catch {
    // Best effort: a leftover file costs ~15 KB and the next save retries.
  }
};

/** Deletes every file in the profile folder except `keepPath`. */
const removeOtherPhotos = async (keepPath: string | null) => {
  let names: string[];
  try {
    const info = await FileSystem.getInfoAsync(getDirectoryUri());
    if (!info.exists) {
      return;
    }
    names = await FileSystem.readDirectoryAsync(getDirectoryUri());
  } catch {
    return;
  }
  await Promise.all(
    names.flatMap((name) =>
      `${PROFILE_DIRECTORY}${name}` === keepPath
        ? []
        : [deleteQuietly(`${getDirectoryUri()}${name}`)]
    )
  );
};

/**
 * Center-crops `sourceUri` to a square, scales it, and stores it as
 * `profile/photo-<time>.jpg`. Each save gets a new name, so image caches
 * never show the previous photo. Older profile photos are deleted.
 *
 * @returns the relative path to store in settings.
 */
export const saveProfilePhoto = async ({
  sourceUri,
  now = Date.now(),
}: {
  sourceUri: string;
  now?: number;
}): Promise<string> => {
  let resultUri: string;
  try {
    resultUri = await renderSquareJpeg({
      sourceUri,
      size: PROFILE_PHOTO_SIZE,
      quality: PROFILE_PHOTO_QUALITY,
    });
  } catch (error) {
    throw createStructuredError({
      status: "profile_photo_resize_failed",
      message: "Photo could not be processed",
      why: `Cropping or resizing the picked image failed: ${String(error)}`,
      fix: "Pick a different photo, or keep the profile without a photo",
    });
  }

  const path = `${PROFILE_DIRECTORY}photo-${now}.jpg`;
  try {
    const directory = getDirectoryUri();
    const info = await FileSystem.getInfoAsync(directory);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
    }
    await FileSystem.moveAsync({
      from: resultUri,
      to: getProfilePhotoUri(path),
    });
  } catch (error) {
    await deleteQuietly(resultUri);
    throw createStructuredError({
      status: "profile_photo_write_failed",
      message: "Photo could not be saved",
      why: `Writing ${path} failed: ${String(error)}`,
      fix: "Check free storage on the device, then pick the photo again",
    });
  }
  await removeOtherPhotos(path);
  return path;
};

/** Deletes every profile photo, for example on remove or a data reset. */
export const deleteProfilePhotos = async () => {
  await removeOtherPhotos(null);
};

/**
 * Opens the photo library with a square crop. No camera choice in between.
 *
 * @returns the picked image URI, or `null` on cancel.
 */
export const pickProfileImage = async (): Promise<string | null> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.9,
  });
  return result.canceled ? null : result.assets[0].uri;
};
