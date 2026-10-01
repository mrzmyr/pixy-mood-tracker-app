import * as ImagePicker from "expo-image-picker";
import { createStructuredError } from "@/lib/errors";

/** Image the user picked or took, before {@link importPhoto} stores it. */
export interface PickedPhoto {
  /** Temporary local URI. The system may delete it after the app closes. */
  uri: string;
  width: number;
  height: number;
}

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
}

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
};

let override: PhotoSource | null = null;

/** Replaces the system picker and camera until the app restarts. */
export const setPhotoSourceOverride = (source: PhotoSource | null) => {
  override = source;
};

/** Returns the active photo source: the override, else the system one. */
export const getPhotoSource = () => override ?? systemPhotoSource;
