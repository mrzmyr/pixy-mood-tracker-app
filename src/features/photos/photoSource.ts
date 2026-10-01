import dayjs from "dayjs";
import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { createStructuredError } from "@/lib/errors";

/** Most photos {@link PhotoSource.listPhotosOnDate} returns. */
export const DAY_PHOTOS_LIMIT = 20;

/** Image the user picked or took, before {@link importPhoto} stores it. */
export interface PickedPhoto {
  /** Temporary local URI. The system may delete it after the app closes. */
  uri: string;
  width: number;
  height: number;
}

/** Photo in the device library, before {@link importPhoto} stores it. */
export interface LibraryPhoto {
  /** Library asset id, stable while the asset exists. */
  id: string;
  /**
   * Preview URI for `expo-image`. iOS: `ph://` asset URI, which
   * {@link importPhoto} cannot read. Use
   * {@link PhotoSource.getLibraryPhotoUri} before import.
   */
  uri: string;
}

/**
 * Photo library read access. `undetermined`: the app can still ask.
 * `limited`: the user picked which photos Pixy sees (iOS 14+, Android 14+).
 * `denied`: asking again shows no system dialog.
 */
export type LibraryPermission =
  | "undetermined"
  | "granted"
  | "limited"
  | "denied";

/**
 * OS boundary for photos: library picker and camera. Preview builds swap it
 * for a fake (`src/dev/fakePhotoSource.ts`), because tests cannot drive the
 * system screens.
 */
export interface PhotoSource {
  /**
   * Opens the library picker with multiple selection up to `limit`.
   * Resolves `[]` on cancel.
   */
  pickFromLibrary: (options: { limit: number }) => Promise<PickedPhoto[]>;
  /**
   * Asks for camera permission, then opens the camera. Resolves `null` on
   * cancel. Rejects with a structured error, status `photo_camera_denied`,
   * when the user denies camera access.
   */
  takePhoto: () => Promise<PickedPhoto | null>;
  /** Reads library permission. Never shows a system dialog. */
  getLibraryPermission: () => Promise<LibraryPermission>;
  /** Shows the system library permission dialog when the app can still ask. */
  requestLibraryPermission: () => Promise<LibraryPermission>;
  /**
   * Lets the user change which photos Pixy sees under `limited` access.
   * Resolves when the picker opens, not when it closes: listen with
   * {@link PhotoSource.addLibraryListener} for the result.
   */
  manageLibraryAccess: () => Promise<void>;
  /**
   * Calls `listener` when library contents or accessible photos change.
   * Returns the unsubscribe function.
   */
  addLibraryListener: (listener: () => void) => () => void;
  /**
   * Library photos created on `date` (local `YYYY-MM-DD`), newest first, at
   * most {@link DAY_PHOTOS_LIMIT}. Needs `granted` or `limited` permission.
   */
  listPhotosOnDate: (options: { date: string }) => Promise<LibraryPhoto[]>;
  /**
   * Local file URI of a library photo for {@link importPhoto}. iOS may
   * download the original from iCloud first.
   */
  getLibraryPhotoUri: (options: { photo: LibraryPhoto }) => Promise<string>;
}

/**
 * Creation time bounds of local day `date` (`YYYY-MM-DD`) in epoch ms:
 * `start` inclusive, `end` exclusive. Days with a DST change are 23 or 25
 * hours long.
 */
export const getDayBounds = ({ date }: { date: string }) => {
  const start = dayjs(date).startOf("day");
  return {
    start: start.valueOf(),
    end: start.add(1, "day").valueOf(),
  };
};

// Pixy reads photos only. Android 13+ then asks for images, not video or
// audio. https://docs.expo.dev/versions/latest/sdk/media-library/
const GRANULAR_PERMISSIONS: MediaLibrary.GranularPermission[] = ["photo"];

const toLibraryPermission = (
  response: MediaLibrary.PermissionResponse
): LibraryPermission => {
  if (response.granted) {
    return response.accessPrivileges === "limited" ? "limited" : "granted";
  }
  // Android reports `denied` with `canAskAgain` after one refusal; the
  // dialog still shows there.
  return response.canAskAgain ? "undetermined" : "denied";
};

const toPickedPhotos = (result: ImagePicker.ImagePickerResult) =>
  result.canceled
    ? []
    : result.assets.map(({ uri, width, height }) => ({ uri, width, height }));

const systemPhotoSource: PhotoSource = {
  // The system library picker (PHPicker, Android Photo Picker) runs out of
  // process and needs no photo library permission.
  // https://docs.expo.dev/versions/latest/sdk/imagepicker/
  pickFromLibrary: async ({ limit }) =>
    toPickedPhotos(
      await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        selectionLimit: limit,
        quality: 1,
        exif: false,
      })
    ),
  takePhoto: async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw createStructuredError({
        status: "photo_camera_denied",
        message: "Camera is not available",
        why: "The user denied camera access for Pixy",
        fix: "Allow camera access for Pixy in the system settings",
      });
    }
    const [photo] = toPickedPhotos(
      await ImagePicker.launchCameraAsync({ quality: 1, exif: false })
    );
    return photo ?? null;
  },
  getLibraryPermission: async () =>
    toLibraryPermission(
      await MediaLibrary.getPermissionsAsync(false, GRANULAR_PERMISSIONS)
    ),
  requestLibraryPermission: async () =>
    toLibraryPermission(
      await MediaLibrary.requestPermissionsAsync(false, GRANULAR_PERMISSIONS)
    ),
  manageLibraryAccess: () => MediaLibrary.presentPermissionsPicker(["photo"]),
  addLibraryListener: (listener) => {
    const subscription = MediaLibrary.addListener(listener);
    return () => subscription.remove();
  },
  listPhotosOnDate: async ({ date }) => {
    const { start, end } = getDayBounds({ date });
    const assets = await new MediaLibrary.Query()
      .eq(MediaLibrary.AssetField.MEDIA_TYPE, MediaLibrary.MediaType.IMAGE)
      .gte(MediaLibrary.AssetField.CREATION_TIME, start)
      .lt(MediaLibrary.AssetField.CREATION_TIME, end)
      .orderBy({
        key: MediaLibrary.AssetField.CREATION_TIME,
        ascending: false,
      })
      .limit(DAY_PHOTOS_LIMIT)
      .exeForMetadata();
    // The asset id is a URI expo-image renders: `ph://` on iOS,
    // `content://` on Android.
    return assets.map(({ id }) => ({ id, uri: id }));
  },
  getLibraryPhotoUri: ({ photo }) => new MediaLibrary.Asset(photo.id).getUri(),
};

let override: PhotoSource | null = null;

/**
 * Replaces the system picker, camera, and library until the app restarts.
 */
export const setPhotoSourceOverride = (source: PhotoSource | null) => {
  override = source;
};

/** Returns the active photo source: the override, else the system one. */
export const getPhotoSource = () => override ?? systemPhotoSource;
