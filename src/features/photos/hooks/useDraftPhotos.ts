import * as Sentry from "@sentry/react-native";
import dayjs from "dayjs";
import omit from "lodash/omit";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { AccessibilityInfo, Alert } from "react-native";
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

/** Where the user asked for library access, for analytics. */
export type DayAccessSource = "card" | "button";

/** Photo attached to the draft entry: stored, or still importing. */
export interface DraftPhoto {
  /** Stable React key. Stays the same when the import finishes. */
  key: string;
  source: PhotoSourceKind;
  /** Stored file once imported, else the picked file or library asset. */
  uri: string;
  /** Stored photo. `null` while the file imports. */
  photo: LogPhoto | null;
  /** Library asset id, when known. Matches {@link LibraryPhoto.id}. */
  libraryId?: string;
  isImporting: boolean;
}

/**
 * Tile of the photos step grid: a photo the user picked from the library,
 * or a library photo of the entry's day. Tiles keep their place when
 * checked or unchecked.
 */
export interface PickItem {
  key: string;
  uri: string;
  /** `library`: picked in the library picker. `day`: photo of the entry's day. */
  kind: "library" | "day";
  /** Position in the entry, from 1. `null` when unchecked. */
  order: number | null;
  isImporting: boolean;
}

type ImportTarget =
  | { source: "library"; uri: string; libraryId?: string }
  | { source: "day"; libraryPhoto: LibraryPhoto };

/** Photo added to the draft whose file still imports. */
interface PendingPhoto {
  key: string;
  target: ImportTarget;
}

type ImportResult =
  | { status: "imported"; photo: LogPhoto }
  | { status: "failed"; errorStatus: string };

type PickResult =
  | { status: "picked"; photos: PickedPhoto[] }
  | { status: "failed"; errorStatus: string };

const isStructuredError = (error: unknown): error is StructuredError =>
  error instanceof Error && "status" in error;

const getCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const reportError = (cause: unknown) => {
  console.error(cause);
  Sentry.captureException(cause);
};

const getPreviewUri = (target: ImportTarget) =>
  target.source === "day" ? target.libraryPhoto.uri : target.uri;

const getTargetLibraryId = (target: ImportTarget) =>
  target.source === "day" ? target.libraryPhoto.id : target.libraryId;

const getDayItemKey = (id: string) => `day:${id}`;

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
  limit,
}: {
  limit: number;
}): Promise<PickResult> => {
  try {
    return {
      status: "picked",
      photos: await getPhotoSource().pickFromLibrary({ limit }),
    };
  } catch (error) {
    const failure = createStructuredError({
      status: "photo_import_failed",
      message: "Photo could not be added",
      why: `Opening the photo library picker failed: ${getCause(error)}`,
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
      fix: "Check that the photo is still in the library, then add it again",
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
      photo: await importPhoto({
        uri: target.uri,
        source: "library",
        libraryId: target.libraryId,
      }),
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
 * Photos of the draft entry in the photos step, as one grid of checkable
 * tiles.
 *
 * `photos` lists the attached photos: stored ones first, then added ones
 * whose file still imports. A photo counts from the moment it is added,
 * so the count and the 6 photo limit never wait for an import. Files
 * import one at a time, in add order (memory: one full-size image at
 * once). `onChange` gets the stored photo list after each import or
 * removal. A failed import removes its photo and shows an alert.
 *
 * `items` lists the grid: library picks first, then library photos of the
 * entry's day. A tile checks and unchecks in place, so nothing moves.
 * Unchecked library picks stay in the grid until the step unmounts, so the
 * user can swap photos at the limit without the picker. Library picks that
 * match a photo of the day (by `libraryId`) check that day tile instead.
 * At the limit, a check shows the limit notice, not an alert.
 *
 * Reads library permission once the step shows, never asks: only
 * {@link allowDayAccess} shows the system dialog. Removed photo files stay
 * until the photo sweep after the logger closes.
 */
export const useDraftPhotos = ({
  date,
  photos: storedPhotos,
  onChange,
  mode,
  isActive,
}: {
  /** Local day of the entry, `YYYY-MM-DD`. */
  date: string;
  /** Stored photos of the draft. */
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
  const [pending, setPending] = useState<PendingPhoto[]>([]);
  const [importingKey, setImportingKey] = useState<string | null>(null);
  const [isPicking, setIsPicking] = useState(false);
  // Key of each imported photo, so its tile keeps its key after import.
  const [keysByPhotoId, setKeysByPhotoId] = useState<Record<string, string>>(
    {}
  );
  // Removed day photos by library id. Adding one again needs no import:
  // its file stays until the sweep after the logger closes.
  const [removedDayPhotos, setRemovedDayPhotos] = useState<
    Record<string, LogPhoto>
  >({});
  // Unchecked stored photos by tile key: they stay in the grid, and a check
  // attaches them again without an import.
  const [detached, setDetached] = useState<Record<string, LogPhoto>>({});
  // Library tile keys in first-seen order, so tiles keep their place.
  const [libraryKeys, setLibraryKeys] = useState<string[]>(() =>
    storedPhotos.map((photo) => `photo:${photo.id}`)
  );
  const [isLimitNoticeVisible, setIsLimitNoticeVisible] = useState(false);
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

  const photos: DraftPhoto[] = [
    ...storedPhotos.map((photo) => ({
      key: keysByPhotoId[photo.id] ?? `photo:${photo.id}`,
      source: photo.source,
      uri: getPhotoFile(photo).uri,
      photo,
      libraryId: photo.libraryId,
      isImporting: false,
    })),
    ...pending.map(({ key, target }) => ({
      key,
      source: target.source,
      uri: getPreviewUri(target),
      photo: null,
      libraryId: getTargetLibraryId(target),
      isImporting: true,
    })),
  ];
  const count = photos.length;
  const isFull = count >= MAX_PHOTOS_PER_ENTRY;

  // Grid: library picks (checked or detached) first, then the day photos.
  const dayPhotoIds = new Set(dayPhotos.map(({ id }) => id));
  const isDayMatch = (libraryId: string | undefined) =>
    libraryId !== undefined && dayPhotoIds.has(libraryId);
  const picksByItemKey = new Map<string, DraftPhoto>();
  const libraryItems = new Map<string, PickItem>();
  for (const [index, photo] of photos.entries()) {
    const itemKey = isDayMatch(photo.libraryId)
      ? getDayItemKey(photo.libraryId ?? "")
      : photo.key;
    picksByItemKey.set(itemKey, photo);
    if (itemKey === photo.key) {
      libraryItems.set(photo.key, {
        key: photo.key,
        uri: photo.uri,
        kind: "library",
        order: index + 1,
        isImporting: photo.isImporting,
      });
    }
  }
  for (const [key, photo] of Object.entries(detached)) {
    if (!libraryItems.has(key) && !isDayMatch(photo.libraryId)) {
      libraryItems.set(key, {
        key,
        uri: getPhotoFile(photo).uri,
        kind: "library",
        order: null,
        isImporting: false,
      });
    }
  }
  const knownKeys = new Set(libraryKeys);
  const libraryOrder = [
    ...libraryKeys.filter((key) => libraryItems.has(key)),
    ...[...libraryItems.keys()].filter((key) => !knownKeys.has(key)),
  ];
  const items: PickItem[] = [
    ...libraryOrder.flatMap((key) => libraryItems.get(key) ?? []),
    ...dayPhotos.map((dayPhoto) => {
      const key = getDayItemKey(dayPhoto.id);
      const pick = picksByItemKey.get(key);
      return {
        key,
        uri: dayPhoto.uri,
        kind: "day" as const,
        order: pick ? photos.indexOf(pick) + 1 : null,
        isImporting: pick?.isImporting ?? false,
      };
    }),
  ];

  // Effect events read the latest draft when an import ends, without
  // restarting the queue effect.
  const commitImport = useEffectEvent(
    ({ item, result }: { item: PendingPhoto; result: ImportResult }) => {
      setImportingKey(null);
      if (!isMounted.current) {
        return;
      }
      // Removed during the import: drop the result. The sweep after the
      // logger closes deletes the file.
      if (!pending.some(({ key }) => key === item.key)) {
        return;
      }
      setPending((current) => current.filter(({ key }) => key !== item.key));
      if (result.status === "failed") {
        analytics.track("photos:import_failed", {
          source: item.target.source,
          status: result.errorStatus,
        });
        Alert.alert(t("photos_add_failed"));
        return;
      }
      const { photo } = result;
      setKeysByPhotoId((current) => ({ ...current, [photo.id]: item.key }));
      onChange([...storedPhotos, photo]);
    }
  );

  // Imports the first pending photo. The next one starts after it ends.
  useEffect(() => {
    const [item] = pending;
    if (importingKey !== null || item === undefined) {
      return;
    }
    const run = async () => {
      setImportingKey(item.key);
      const result = await importTarget(item.target);
      commitImport({ item, result });
    };
    // oxlint-disable-next-line react-doctor/no-pass-live-state-to-parent -- import completion is async file I/O, not derived state: the draft learns about the stored file once it exists.
    void run();
  }, [pending, importingKey]);

  const trackAdded = ({
    source,
    nextCount,
  }: {
    source: PhotoSourceKind;
    nextCount: number;
  }) => {
    analytics.track("photos:photo_added", { source, count: nextCount, mode });
  };

  const showLimit = () => {
    analytics.track("photos:limit_reached", { mode });
    setIsLimitNoticeVisible(true);
    AccessibilityInfo.announceForAccessibility(
      t("photos_limit_reached", { max: MAX_PHOTOS_PER_ENTRY })
    );
  };

  const addSuggestion = (libraryPhoto: LibraryPhoto) => {
    if (isFull) {
      showLimit();
      return;
    }
    const removed = removedDayPhotos[libraryPhoto.id];
    if (removed) {
      onChange([...storedPhotos, removed]);
    } else {
      setPending((current) => [
        ...current,
        {
          key: `draft:${uuidv4()}`,
          target: { source: "day", libraryPhoto },
        },
      ]);
    }
    trackAdded({ source: "day", nextCount: count + 1 });
  };

  const remove = (draftPhoto: DraftPhoto) => {
    const { photo } = draftPhoto;
    setIsLimitNoticeVisible(false);
    if (photo) {
      onChange(storedPhotos.filter(({ id }) => id !== photo.id));
      setDetached((current) => ({ ...current, [draftPhoto.key]: photo }));
      if (photo.libraryId !== undefined) {
        const { libraryId } = photo;
        setRemovedDayPhotos((current) => ({ ...current, [libraryId]: photo }));
      }
    } else {
      setPending((current) =>
        current.filter(({ key }) => key !== draftPhoto.key)
      );
    }
    analytics.track("photos:photo_removed", {
      source: draftPhoto.source,
      count: count - 1,
      mode,
    });
  };

  const addFromLibrary = async () => {
    if (isPicking) {
      return;
    }
    if (isFull) {
      showLimit();
      return;
    }
    const remaining = MAX_PHOTOS_PER_ENTRY - count;
    setIsPicking(true);
    analytics.track("photos:picker_opened", { remaining });
    const result = await pickPhotos({ limit: remaining });
    setIsPicking(false);

    if (result.status === "failed") {
      analytics.track("photos:picker_closed", {
        picked_count: 0,
        is_cancelled: false,
      });
      analytics.track("photos:import_failed", {
        source: "library",
        status: result.errorStatus,
      });
      Alert.alert(t("photos_add_failed"));
      return;
    }

    const added: PendingPhoto[] = result.photos
      .slice(0, remaining)
      .map(({ uri, libraryId }) => ({
        key: `draft:${uuidv4()}`,
        target: { source: "library", uri, libraryId },
      }));
    analytics.track("photos:picker_closed", {
      picked_count: added.length,
      is_cancelled: added.length === 0,
    });
    if (added.length === 0) {
      return;
    }
    setPending((current) => [...current, ...added]);
    setLibraryKeys((current) => [...current, ...added.map(({ key }) => key)]);
    for (const [index] of added.entries()) {
      trackAdded({ source: "library", nextCount: count + index + 1 });
    }
  };

  /** Attaches an unchecked library pick again. Its file is stored already. */
  const reattach = ({ key, photo }: { key: string; photo: LogPhoto }) => {
    setKeysByPhotoId((current) => ({ ...current, [photo.id]: key }));
    setDetached((current) => omit(current, key));
    onChange([...storedPhotos, photo]);
    trackAdded({ source: photo.source, nextCount: count + 1 });
  };

  const toggle = (itemKey: string) => {
    const pick = picksByItemKey.get(itemKey);
    if (pick) {
      remove(pick);
      return;
    }
    if (isFull) {
      showLimit();
      return;
    }
    const dayPhoto = dayPhotos.find(({ id }) => getDayItemKey(id) === itemKey);
    if (dayPhoto) {
      addSuggestion(dayPhoto);
      return;
    }
    const photo = detached[itemKey];
    if (photo) {
      reattach({ key: itemKey, photo });
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
    photos,
    items,
    count,
    isFull,
    /** Day photos the library returned, checked or not. */
    dayPhotoCount: dayPhotos.length,
    /** Library picker open or a file importing: the add tile waits. */
    isAddDisabled: isPicking || pending.length > 0 || importingKey !== null,
    /** `null` until the stored permission is read. */
    permission,
    /** Show the "See your photos from …" row. */
    isDayAccessPromptVisible: isPromptVisible,
    /**
     * Offer the "Show Photos from …" button: access still undetermined and
     * the row dismissed, so photos of the day stay reachable after "Not
     * Now".
     */
    isDayAccessButtonVisible: permission === "undetermined" && isDismissed,
    /** Opens the system library picker. Picked photos are attached. */
    addFromLibrary,
    /**
     * Checks or unchecks a grid tile by {@link PickItem.key}. A check at the
     * limit shows the limit notice.
     */
    toggle,
    /** Detaches a photo at once, also while its file imports. */
    remove,
    /** A check at the photo limit was refused. */
    isLimitNoticeVisible,
    hideLimitNotice: () => setIsLimitNoticeVisible(false),
    allowDayAccess,
    dismissDayAccess,
    manageDayAccess: () => {
      void manageAccess();
    },
  };
};
