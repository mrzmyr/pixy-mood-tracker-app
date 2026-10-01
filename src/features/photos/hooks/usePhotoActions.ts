import * as Sentry from "@sentry/react-native";
import { useState } from "react";
import { Alert, Linking } from "react-native";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { LogPhoto } from "@/types";
import { getPhotoSource } from "../photoSource";
import type { PickedPhoto } from "../photoSource";
import { MAX_PHOTOS_PER_ENTRY, importPhoto } from "../storage";

type PhotoSourceKind = "library" | "camera";

type PickResult =
  | { status: "picked"; photos: PickedPhoto[] }
  | { status: "camera_denied" };

const isCameraDenied = (error: unknown): error is StructuredError =>
  error instanceof Error &&
  "status" in error &&
  error.status === "photo_camera_denied";

const getCauseMessage = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const reportError = (cause: unknown) => {
  console.error(cause);
  Sentry.captureException(cause);
};

const showCameraDeniedAlert = () => {
  Alert.alert(
    t("photos_camera_permission_title"),
    t("photos_camera_permission_body"),
    [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("photos_open_settings"),
        onPress: () => {
          void Linking.openSettings();
        },
      },
    ]
  );
};

// Module functions, not hook code: React Compiler does not support
// try/finally or throw inside try/catch.
const pickPhotos = async ({
  source,
  limit,
}: {
  source: PhotoSourceKind;
  limit: number;
}): Promise<PickResult> => {
  try {
    if (source === "library") {
      return {
        status: "picked",
        photos: await getPhotoSource().pickFromLibrary({ limit }),
      };
    }
    const photo = await getPhotoSource().takePhoto();
    return { status: "picked", photos: photo ? [photo] : [] };
  } catch (error) {
    if (isCameraDenied(error)) {
      return { status: "camera_denied" };
    }
    throw createStructuredError({
      status: "photo_import_failed",
      message: "Photo could not be added",
      why: `Opening the photo ${source} failed: ${getCauseMessage(error)}`,
      fix: "Try again. Restart Pixy when it keeps failing",
    });
  }
};

const importPhotos = async ({ picked }: { picked: PickedPhoto[] }) => {
  const added: LogPhoto[] = [];
  let hasFailed = false;
  for (const photo of picked) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- one full-size image in memory at a time; six 12 MP images in parallel need hundreds of MB.
      added.push(await importPhoto({ uri: photo.uri }));
    } catch (error) {
      hasFailed = true;
      reportError(error);
    }
  }
  return { added, hasFailed };
};

const addPhotos = async ({
  source,
  photos,
  onAdded,
}: {
  source: PhotoSourceKind;
  photos: LogPhoto[];
  onAdded: (photos: LogPhoto[]) => void;
}): Promise<"added" | "camera_denied" | "failed"> => {
  try {
    const remaining = MAX_PHOTOS_PER_ENTRY - photos.length;
    const result = await pickPhotos({ source, limit: remaining });
    if (result.status === "camera_denied") {
      return "camera_denied";
    }
    const { added, hasFailed } = await importPhotos({
      picked: result.photos.slice(0, remaining),
    });
    if (added.length > 0) {
      onAdded([...photos, ...added]);
    }
    return hasFailed ? "failed" : "added";
  } catch (error) {
    reportError(error);
    return "failed";
  }
};

/**
 * Add and remove photos of one entry or draft. Every photo entry point uses
 * it, so limit, import, analytics, and errors behave the same everywhere.
 *
 * `onChange` receives the full new list. Imported files exist before the
 * caller saves them; an unsaved draft leaves orphans for the photo sweep.
 * Adds run one at a time: a second add while `isAdding` is ignored.
 */
export const usePhotoActions = ({
  photos,
  onChange,
  mode,
}: {
  photos: LogPhoto[];
  onChange: (photos: LogPhoto[]) => void;
  /** Logger mode for analytics. Day view edits stored entries: `edit`. */
  mode: "create" | "edit";
}) => {
  const analytics = useAnalytics();
  const [isAdding, setIsAdding] = useState(false);
  const isFull = photos.length >= MAX_PHOTOS_PER_ENTRY;

  const add = async (source: PhotoSourceKind) => {
    if (isAdding) {
      return;
    }
    if (isFull) {
      analytics.track("logger:photo_limit_reached");
      Alert.alert(t("photos_limit_reached", { max: MAX_PHOTOS_PER_ENTRY }));
      return;
    }

    setIsAdding(true);
    const result = await addPhotos({
      source,
      photos,
      onAdded: (next) => {
        onChange(next);
        analytics.track("logger:photo_added", {
          source,
          photos_count: next.length,
          mode,
        });
      },
    });
    setIsAdding(false);

    if (result === "camera_denied") {
      analytics.track("logger:camera_permission_denied");
      showCameraDeniedAlert();
    } else if (result === "failed") {
      Alert.alert(t("photos_add_failed"));
    }
  };

  const remove = ({ id }: Pick<LogPhoto, "id">) => {
    const next = photos.filter((photo) => photo.id !== id);
    if (next.length === photos.length) {
      return;
    }
    onChange(next);
    analytics.track("logger:photo_removed", {
      photos_count: next.length,
      mode,
    });
  };

  return {
    addFromLibrary: () => add("library"),
    addFromCamera: () => add("camera"),
    remove,
    isAdding,
    isFull,
  };
};
