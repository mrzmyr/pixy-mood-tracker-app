import * as Sentry from "@sentry/react-native";
import dayjs from "dayjs";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert, Linking } from "react-native";
import { v4 as uuidv4 } from "uuid";
import { createStructuredError } from "@/lib/errors";
import type { StructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import { useSettings } from "@/state/settings";
import type { LogPhoto, PhotoSourceKind } from "@/types";
import { getPhotoSource } from "../photoSource";
import type {
  LibraryPermission,
  LibraryPhoto,
  PickedPhoto,
} from "../photoSource";
import { MAX_PHOTOS_PER_ENTRY, getPhotoFile, importPhoto } from "../storage";

type PickerSource = "library" | "camera";

/** Where the user asked for library access, for analytics. */
export type DayAccessSource = "row" | "menu";

/** One cell of the photos step grid, after the add tile. */
export interface PhotoTile {
  /** Stable React key: `picked:<uuid>`, `photo:<id>`, or `day:<library id>`. */
  key: string;
  source: PhotoSourceKind;
  /** Image to render: stored file once imported, else picked file or library asset. */
  uri: string;
  /** Imported photo. Kept after deselect, so a second tap adds it back without import. */
  photo: LogPhoto | null;
  isSelected: boolean;
  /** Selected, file import still running or queued. */
  isImporting: boolean;
}

interface PickedItem {
  key: string;
  source: PickerSource;
  uri: string;
  photo: LogPhoto | null;
}

type ImportTarget =
  | { source: PickerSource; uri: string }
  | { source: "day"; libraryPhoto: LibraryPhoto };

type ImportResult =
  | { status: "imported"; photo: LogPhoto }
  | { status: "failed"; errorStatus: string };

type PickResult =
  | { status: "picked"; photos: PickedPhoto[] }
  | { status: "camera_denied" }
  | { status: "failed"; errorStatus: string };

const isStructuredError = (error: unknown): error is StructuredError =>
  error instanceof Error && "status" in error;

const findByLibraryId = (list: LogPhoto[], libraryId: string) =>
  list.find((photo) => photo.libraryId === libraryId) ?? null;

const getCause = (cause: unknown) =>
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

const showLimitAlert = () => {
  Alert.alert(t("photos_limit_reached", { max: MAX_PHOTOS_PER_ENTRY }));
};

// Module functions, not hook code: React Compiler does not support
// try/finally or throw inside try/catch.
const readPermission = async (): Promise<LibraryPermission> => {
  try {
    return await getPhotoSource().getLibraryPermission();
  } catch (error) {
    reportError(
      createStructuredError({
        status: "photo_library_failed",
        message: "Photo library permission could not be read",
        why: `Reading the photo library permission failed: ${getCause(error)}`,
        fix: "Restart Pixy. The photo picker still works without it",
      })
    );
    return "unavailable";
  }
};

const requestPermission = async (): Promise<LibraryPermission> => {
  try {
    return await getPhotoSource().requestLibraryPermission();
  } catch (error) {
    reportError(
      createStructuredError({
        status: "photo_library_failed",
        message: "Photo library permission could not be requested",
        why: `Showing the photo library permission dialog failed: ${getCause(error)}`,
        fix: "Allow photo access for Pixy in the system settings",
      })
    );
    return "denied";
  }
};

const loadDayPhotos = async ({ date }: { date: string }) => {
  try {
    return await getPhotoSource().listPhotosOnDate({ date });
  } catch (error) {
    reportError(
      createStructuredError({
        status: "photo_library_failed",
        message: "Photos of the day could not be loaded",
        why: `Querying the photo library for ${date} failed: ${getCause(error)}`,
        fix: "Add photos with the photo picker instead",
      })
    );
    return [];
  }
};

const manageAccess = async () => {
  try {
    await getPhotoSource().manageLibraryAccess();
  } catch (error) {
    reportError(
      createStructuredError({
        status: "photo_library_failed",
        message: "Photo access picker could not open",
        why: `Opening the limited photo access picker failed: ${getCause(error)}`,
        fix: "Change photo access for Pixy in the system settings",
      })
    );
  }
};

const pickPhotos = async ({
  source,
  limit,
}: {
  source: PickerSource;
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
    if (isStructuredError(error) && error.status === "photo_camera_denied") {
      return { status: "camera_denied" };
    }
    const failure = createStructuredError({
      status: "photo_import_failed",
      message: "Photo could not be added",
      why: `Opening the photo ${source} failed: ${getCause(error)}`,
      fix: "Try again. Restart Pixy when it keeps failing",
    });
    reportError(failure);
    return { status: "failed", errorStatus: failure.status };
  }
};

const getLibraryFileUri = async ({ photo }: { photo: LibraryPhoto }) => {
  try {
    return await getPhotoSource().getLibraryPhotoUri({ photo });
  } catch (error) {
    throw createStructuredError({
      status: "photo_import_failed",
      message: "Photo could not be added",
      why: `Reading the library photo file failed: ${getCause(error)}`,
      fix: "Check that the photo is still in the library, then select it again",
    });
  }
};

const importTarget = async (target: ImportTarget): Promise<ImportResult> => {
  try {
    if (target.source === "day") {
      const uri = await getLibraryFileUri({ photo: target.libraryPhoto });
      return {
        status: "imported",
        photo: await importPhoto({
          uri,
          source: "day",
          libraryId: target.libraryPhoto.id,
        }),
      };
    }
    return {
      status: "imported",
      photo: await importPhoto({ uri: target.uri, source: target.source }),
    };
  } catch (error) {
    reportError(error);
    return {
      status: "failed",
      errorStatus: isStructuredError(error) ? String(error.status) : "unknown",
    };
  }
};

const isReadable = (
  permission: LibraryPermission | null
): permission is "granted" | "limited" =>
  permission === "granted" || permission === "limited";

/**
 * Selection state of the photos step: one grid, one mechanism. A selected
 * tile is attached to the entry, an unselected one is not; a tap toggles.
 *
 * Tiles: photos added through the picker or camera (newest first), photos
 * the entry already had, then library photos of the entry's day (newest
 * first). A day photo the entry already holds (same `libraryId`) shows as
 * selected instead of twice.
 *
 * Selection is the source of truth for the count and updates at tap time.
 * Selected tiles import one at a time (memory: one full-size image at once);
 * `onChange` gets the full photo list after each import or deselect. A
 * failed import deselects its tile and shows an alert.
 *
 * Reads library permission on mount, never asks: only {@link allowDayAccess}
 * shows the system dialog. Deselected photo files stay until the photo
 * sweep after the logger closes.
 */
export const usePhotoSelection = ({
  date,
  photos,
  onChange,
  mode,
  isActive,
}: {
  /** Local day of the entry, `YYYY-MM-DD`. */
  date: string;
  /** Photos attached to the draft. */
  photos: LogPhoto[];
  onChange: (photos: LogPhoto[]) => void;
  mode: "create" | "edit";
  /** The step is on screen. Library reads and the prompt event wait for it. */
  isActive: boolean;
}) => {
  const analytics = useAnalytics();
  const { settings, setSettings } = useSettings();
  const isDismissed = settings.photosDayAccessDismissed;
  const [hasBeenActive, setHasBeenActive] = useState(isActive);
  const [permission, setPermission] = useState<LibraryPermission | null>(null);
  const [dayPhotos, setDayPhotos] = useState<LibraryPhoto[]>([]);
  const [picked, setPicked] = useState<PickedItem[]>([]);
  // Photos the draft held when the step mounted. They stay as tiles after
  // a deselect, so a second tap adds them back.
  // oxlint-disable-next-line react/hook-use-state -- snapshot at mount, never set again.
  const [initialPhotos] = useState(photos);
  const [dayImported, setDayImported] = useState<Record<string, LogPhoto>>({});
  // Tile keys in tap order: selected, file not imported yet.
  const [pending, setPending] = useState<string[]>([]);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  const wasPromptTracked = useRef(false);
  const isMounted = useRef(true);
  const entryDaysAgo = dayjs().startOf("day").diff(dayjs(date), "day");

  if (isActive && !hasBeenActive) {
    setHasBeenActive(true);
  }

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!hasBeenActive) {
      return;
    }
    let isCurrent = true;
    const load = async () => {
      const next = await readPermission();
      if (isCurrent) {
        setPermission(next);
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [hasBeenActive]);

  const trackDayPhotosLoaded = useEffectEvent((count: number) => {
    if (isReadable(permission)) {
      analytics.track("photos:day_photos_loaded", {
        count,
        access: permission === "limited" ? "limited" : "granted",
        entry_days_ago: entryDaysAgo,
      });
    }
  });

  const canRead = isReadable(permission);
  useEffect(() => {
    if (!canRead) {
      return;
    }
    let isCurrent = true;
    const load = async () => {
      const next = await loadDayPhotos({ date });
      if (isCurrent) {
        setDayPhotos(next);
        trackDayPhotosLoaded(next.length);
      }
    };
    void load();
    // Reloads after the user changes limited access in the system picker.
    const unsubscribe = getPhotoSource().addLibraryListener(() => {
      void load();
    });
    return () => {
      isCurrent = false;
      unsubscribe();
    };
  }, [canRead, date]);

  const isPromptVisible = permission === "undetermined" && !isDismissed;
  const trackPromptShown = useEffectEvent(() => {
    analytics.track("photos:day_access_prompt_shown", {
      mode,
      entry_days_ago: entryDaysAgo,
    });
  });
  useEffect(() => {
    if (isPromptVisible && isActive && !wasPromptTracked.current) {
      wasPromptTracked.current = true;
      trackPromptShown();
    }
  }, [isPromptVisible, isActive]);

  // Tiles, derived on every render from the draft and local state.
  const draftIds = new Set(photos.map(({ id }) => id));
  const dayIds = new Set(dayPhotos.map(({ id }) => id));
  const toTile = ({
    key,
    source,
    uri,
    photo,
  }: Omit<PhotoTile, "isSelected" | "isImporting">): PhotoTile => {
    const isPending = pending.includes(key);
    return {
      key,
      source,
      uri: photo ? getPhotoFile(photo).uri : uri,
      photo,
      isSelected: photo ? draftIds.has(photo.id) : isPending,
      isImporting: isPending,
    };
  };
  const tiles: PhotoTile[] = [
    ...picked.map((item) => toTile(item)),
    ...initialPhotos.flatMap((photo) =>
      photo.libraryId && dayIds.has(photo.libraryId)
        ? []
        : [
            toTile({
              key: `photo:${photo.id}`,
              source: photo.source,
              uri: "",
              photo,
            }),
          ]
    ),
    ...dayPhotos.map((libraryPhoto) =>
      toTile({
        key: `day:${libraryPhoto.id}`,
        source: "day",
        uri: libraryPhoto.uri,
        photo:
          findByLibraryId(photos, libraryPhoto.id) ??
          dayImported[libraryPhoto.id] ??
          findByLibraryId(initialPhotos, libraryPhoto.id),
      })
    ),
  ];
  const selectedCount = photos.length + pending.length;
  const isFull = selectedCount >= MAX_PHOTOS_PER_ENTRY;

  // Effect events read the latest draft and selection when an import
  // starts and ends, without restarting the queue effect.
  const getImportTarget = useEffectEvent((key: string): ImportTarget | null => {
    const item = picked.find((candidate) => candidate.key === key);
    if (item) {
      return { source: item.source, uri: item.uri };
    }
    const libraryPhoto = dayPhotos.find(({ id }) => `day:${id}` === key);
    return libraryPhoto ? { source: "day", libraryPhoto } : null;
  });

  const commitImport = useEffectEvent(
    ({
      key,
      target,
      result,
    }: {
      key: string;
      target: ImportTarget;
      result: ImportResult;
    }) => {
      setImportingKey(null);
      if (!isMounted.current) {
        return;
      }
      if (result.status === "failed") {
        setPending((current) =>
          current.filter((pendingKey) => pendingKey !== key)
        );
        analytics.track("photos:import_failed", {
          source: target.source,
          status: result.errorStatus,
        });
        Alert.alert(t("photos_add_failed"));
        return;
      }
      const { photo } = result;
      if (target.source === "day") {
        setDayImported((current) => ({
          ...current,
          [target.libraryPhoto.id]: photo,
        }));
      } else {
        setPicked((current) =>
          current.map((item) => (item.key === key ? { ...item, photo } : item))
        );
      }
      // Deselected during the import: the file stays for a second tap.
      if (pending.includes(key)) {
        setPending((current) =>
          current.filter((pendingKey) => pendingKey !== key)
        );
        onChange([...photos, photo]);
      }
    }
  );

  // Imports one selected tile at a time, in tap order.
  useEffect(() => {
    const [key] = pending;
    if (importingKey !== null || key === undefined) {
      return;
    }
    const target = getImportTarget(key);
    const run = async () => {
      if (!target) {
        // The library photo left the day list, for example after a change
        // of limited access. Nothing to import: deselect it.
        setPending((current) =>
          current.filter((pendingKey) => pendingKey !== key)
        );
        return;
      }
      setImportingKey(key);
      const result = await importTarget(target);
      commitImport({ key, target, result });
    };
    // oxlint-disable-next-line react-doctor/no-pass-live-state-to-parent -- import completion is async file I/O, not derived state: the draft learns about the stored file once it exists.
    void run();
  }, [pending, importingKey]);

  const toggle = (tile: PhotoTile) => {
    if (tile.isSelected) {
      if (tile.photo && draftIds.has(tile.photo.id)) {
        const removedId = tile.photo.id;
        onChange(photos.filter(({ id }) => id !== removedId));
      } else {
        setPending((current) => current.filter((key) => key !== tile.key));
      }
      analytics.track("photos:photo_deselected", {
        source: tile.source,
        selected_count: selectedCount - 1,
        mode,
      });
      return;
    }
    if (isFull) {
      analytics.track("photos:limit_reached", { mode });
      showLimitAlert();
      return;
    }
    if (tile.photo) {
      onChange([...photos, tile.photo]);
    } else {
      setPending((current) => [...current, tile.key]);
    }
    analytics.track("photos:photo_selected", {
      source: tile.source,
      selected_count: selectedCount + 1,
      mode,
    });
  };

  const pick = async (source: PickerSource) => {
    if (isPicking) {
      return;
    }
    if (isFull) {
      analytics.track("photos:limit_reached", { mode });
      showLimitAlert();
      return;
    }
    const remaining = MAX_PHOTOS_PER_ENTRY - selectedCount;
    setIsPicking(true);
    analytics.track("photos:picker_opened", { source, remaining });
    const result = await pickPhotos({ source, limit: remaining });
    setIsPicking(false);

    if (result.status === "camera_denied") {
      analytics.track("photos:camera_access_denied");
      showCameraDeniedAlert();
      return;
    }
    if (result.status === "failed") {
      analytics.track("photos:picker_closed", {
        source,
        picked_count: 0,
        is_cancelled: false,
      });
      analytics.track("photos:import_failed", {
        source,
        status: result.errorStatus,
      });
      Alert.alert(t("photos_add_failed"));
      return;
    }

    const items: PickedItem[] = result.photos
      .slice(0, remaining)
      .map(({ uri }) => ({
        key: `picked:${uuidv4()}`,
        source,
        uri,
        photo: null,
      }));
    analytics.track("photos:picker_closed", {
      source,
      picked_count: items.length,
      is_cancelled: items.length === 0,
    });
    if (items.length === 0) {
      return;
    }
    setPicked((current) => [...items, ...current]);
    setPending((current) => [...current, ...items.map(({ key }) => key)]);
    for (const [index] of items.entries()) {
      analytics.track("photos:photo_selected", {
        source,
        selected_count: selectedCount + index + 1,
        mode,
      });
    }
  };

  const dismissDayAccess = () => {
    setSettings((current) => ({ ...current, photosDayAccessDismissed: true }));
    analytics.track("photos:day_access_prompt_dismissed", { mode });
  };

  const allowDayAccess = async ({ source }: { source: DayAccessSource }) => {
    const next = await requestPermission();
    const status = isReadable(next) ? next : "denied";
    analytics.track("photos:day_access_answered", { status, source });
    if (status === "denied") {
      // A denial hides the row for good: asking again shows no dialog.
      setSettings((current) => ({
        ...current,
        photosDayAccessDismissed: true,
      }));
    }
    setPermission(next === "undetermined" ? "denied" : next);
  };

  return {
    tiles,
    selectedCount,
    isFull,
    /** Picker or camera open: further adds are ignored. */
    isPicking,
    /** `null` until the stored permission is read. */
    permission,
    /** Show the "See your photos from …" row. */
    isDayAccessPromptVisible: isPromptVisible,
    /** Offer "Show photos from …" in the add menu, after the row was dismissed. */
    isDayAccessMenuVisible: permission === "undetermined" && isDismissed,
    toggle,
    addFromLibrary: () => pick("library"),
    addFromCamera: () => pick("camera"),
    allowDayAccess,
    dismissDayAccess,
    manageDayAccess: () => {
      void manageAccess();
    },
  };
};
