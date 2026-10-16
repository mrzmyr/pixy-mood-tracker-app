import dayjs from "dayjs";
import noop from "lodash/noop";
import * as ImagePicker from "expo-image-picker";
import type * as MediaLibrary from "expo-media-library";
import { createStructuredError } from "@/lib/errors";
import { Platform } from "react-native";

/** Most photos {@link PhotoSource.listPhotosOnDate} returns. */
export const DAY_PHOTOS_LIMIT = 20;

/** Image the user picked or took, before {@link importPhoto} stores it. */
export interface PickedPhoto {
  /** Temporary local URI. The system may delete it after the app closes. */
  uri: string;
  width: number;
  height: number;
  /**
   * Library asset id, when the picker reports it (iOS). Matches
   * {@link LibraryPhoto.id}, so the photos step does not suggest the photo
   * again.
   */
  libraryId?: string;
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
 * `limited`: the user picked which photos Pixy sees (iOS 14+).
 * `denied`: asking again shows no system dialog. `unavailable`: this
 * platform has no photos of a day (Android).
 */
export type LibraryPermission =
  | "undetermined"
  | "granted"
  | "limited"
  | "denied"
  | "unavailable";

/**
 * OS boundary for photos: library picker and photo library. Preview builds
 * swap it for a fake (`src/dev/fakePhotoSource.ts`), because tests cannot
 * drive the system screens.
 */
export interface PhotoSource {
  /**
   * Opens the library picker with multiple selection up to `limit`.
   * Resolves `[]` on cancel.
   */
  pickFromLibrary: (options: { limit: number }) => Promise<PickedPhoto[]>;
  /**
   * Reads library permission. Never shows a system dialog. `unavailable` on
   * Android.
   */
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

// Photos of a day need broad library read access. Google Play allows
// READ_MEDIA_IMAGES only for apps whose core purpose needs it, which a mood
// tracker does not meet, so `app.json` blocks it and Android never queries
// the library. Android adds photos through the system Photo Picker only.
// https://support.google.com/googleplay/android-developer/answer/14115180
const IS_LIBRARY_SUPPORTED = Platform.OS === "ios";

/** The SDK's native Query module cannot load on web. */
// SAFETY: require returns this installed SDK's exports; type-only import keeps web startup native-free.
const loadMediaLibrary = (): typeof MediaLibrary =>
  // oxlint-disable-next-line typescript/no-require-imports -- library is loaded only inside supported native operations.
  require("expo-media-library") as typeof MediaLibrary;

const toLibraryPermission = (
  response: MediaLibrary.PermissionResponse
): LibraryPermission => {
  if (response.granted) {
    return response.accessPrivileges === "limited" ? "limited" : "granted";
  }
  // Before the first answer iOS reports `granted: false` with `canAskAgain`.
  return response.canAskAgain ? "undetermined" : "denied";
};

const toPickedPhotos = (result: ImagePicker.ImagePickerResult) => {
  if (result.canceled) {
    return [];
  }
  return result.assets.map(({ uri, width, height, assetId }) => {
    const photo: PickedPhoto = { uri, width, height };
    if (assetId) {
      photo.libraryId = assetId;
    }
    return photo;
  });
};

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
  getLibraryPermission: async () => {
    if (!IS_LIBRARY_SUPPORTED) {
      return "unavailable";
    }
    return toLibraryPermission(
      await loadMediaLibrary().getPermissionsAsync(false)
    );
  },
  requestLibraryPermission: async () => {
    if (!IS_LIBRARY_SUPPORTED) {
      return "unavailable";
    }
    return toLibraryPermission(
      await loadMediaLibrary().requestPermissionsAsync(false)
    );
  },
  manageLibraryAccess: async () => {
    if (IS_LIBRARY_SUPPORTED) {
      await loadMediaLibrary().presentPermissionsPicker(["photo"]);
    }
  },
  addLibraryListener: (listener) => {
    if (!IS_LIBRARY_SUPPORTED) {
      return noop;
    }
    const subscription = loadMediaLibrary().addListener(listener);
    return () => subscription.remove();
  },
  listPhotosOnDate: async ({ date }) => {
    if (!IS_LIBRARY_SUPPORTED) {
      return [];
    }
    const MediaLibrary = loadMediaLibrary();
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
  getLibraryPhotoUri: ({ photo }) => {
    if (!IS_LIBRARY_SUPPORTED) {
      throw createStructuredError({
        status: "photo_library_unavailable",
        message: "Library photo could not be opened",
        why: "This platform does not support direct photo library access",
        fix: "Add the photo through the system photo picker",
      });
    }
    const MediaLibrary = loadMediaLibrary();
    return new MediaLibrary.Asset(photo.id).getUri();
  },
};

let override: PhotoSource | null = null;

/**
 * Replaces the system picker and library until the app restarts.
 */
export const setPhotoSourceOverride = (source: PhotoSource | null) => {
  override = source;
};

/** Returns the active photo source: the override, else the system one. */
export const getPhotoSource = () => override ?? systemPhotoSource;
