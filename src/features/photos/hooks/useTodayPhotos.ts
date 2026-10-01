import * as Sentry from "@sentry/react-native";
import { useEffect, useEffectEvent, useState } from "react";
import { Alert } from "react-native";
import { createStructuredError } from "@/lib/errors";
import { t } from "@/lib/translation";
import { useAnalytics } from "@/state/analytics";
import type { LogPhoto } from "@/types";
import { getPhotoSource } from "../photoSource";
import type { LibraryPermission, LibraryPhoto } from "../photoSource";
import { MAX_PHOTOS_PER_ENTRY, importPhoto } from "../storage";
import { usePhotoActions } from "./usePhotoActions";

/** Wait after the last strip tap before the selected photos import. */
export const SELECTION_DEBOUNCE_MS = 300;

// A denial hides the permission card in every logger until the app
// restarts. Android reports one refusal as `undetermined`, so the stored
// permission alone would show the card again.
let wasDeniedThisSession = false;

const getCause = (cause: unknown) =>
  cause instanceof Error ? cause.message : String(cause);

const reportError = (cause: unknown) => {
  console.error(cause);
  Sentry.captureException(cause);
};

// Module functions, not hook code: React Compiler does not support
// try/finally or throw inside try/catch.
const readPermission = async (): Promise<LibraryPermission> => {
  try {
    const permission = await getPhotoSource().getLibraryPermission();
    if (wasDeniedThisSession && permission === "undetermined") {
      return "denied";
    }
    return permission;
  } catch (error) {
    reportError(
      createStructuredError({
        status: "photo_library_failed",
        message: "Photo library permission could not be read",
        why: `Reading the photo library permission failed: ${getCause(error)}`,
        fix: "Restart Pixy. The photo picker still works without it",
      })
    );
    return "denied";
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

const getFileUri = async ({ photo }: { photo: LibraryPhoto }) => {
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

const importLibraryPhotos = async ({ photos }: { photos: LibraryPhoto[] }) => {
  const added: { libraryId: string; photo: LogPhoto }[] = [];
  let hasFailed = false;
  for (const libraryPhoto of photos) {
    try {
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- one full-size image in memory at a time; six 12 MP images in parallel need hundreds of MB.
      const uri = await getFileUri({ photo: libraryPhoto });
      // oxlint-disable-next-line eslint/no-await-in-loop, react-doctor/async-await-in-loop -- see above.
      const photo = await importPhoto({ uri });
      added.push({ libraryId: libraryPhoto.id, photo });
    } catch (error) {
      hasFailed = true;
      reportError(error);
    }
  }
  return { added, hasFailed };
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

/**
 * Photos of the entry's day from the device library, and the selection
 * that adds them to the draft.
 *
 * Reads the permission on mount but never asks: only {@link allow} shows
 * the system dialog. A tap selects at once; selected photos import
 * {@link SELECTION_DEBOUNCE_MS} after the last tap, then `onChange` gets the
 * full new list. Selected and imported photos count toward
 * {@link MAX_PHOTOS_PER_ENTRY}. Selection lives in memory: photos imported
 * in an earlier session show as not selected.
 */
export const useTodayPhotos = ({
  date,
  photos,
  onChange,
  mode,
}: {
  /** Local day of the entry, `YYYY-MM-DD`. */
  date: string;
  photos: LogPhoto[];
  onChange: (photos: LogPhoto[]) => void;
  mode: "create" | "edit";
}) => {
  const analytics = useAnalytics();
  const { remove } = usePhotoActions({ photos, onChange, mode });
  const [permission, setPermission] = useState<LibraryPermission | null>(null);
  const [libraryPhotos, setLibraryPhotos] = useState<LibraryPhoto[]>([]);
  // Library ids in tap order, selected but not imported yet.
  const [pending, setPending] = useState<string[]>([]);
  // Library id to the draft photo it was imported as.
  const [imported, setImported] = useState<Record<string, string>>({});
  const [isImporting, setIsImporting] = useState(false);
  const canRead = permission === "granted" || permission === "limited";

  useEffect(() => {
    let isActive = true;
    const load = async () => {
      const next = await readPermission();
      if (isActive) {
        setPermission(next);
      }
    };
    void load();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!canRead) {
      return;
    }
    let isActive = true;
    const load = async () => {
      const next = await loadDayPhotos({ date });
      if (isActive) {
        setLibraryPhotos(next);
      }
    };
    void load();
    // Reloads after the user changes limited access in the system picker.
    const unsubscribe = getPhotoSource().addLibraryListener(() => {
      void load();
    });
    return () => {
      isActive = false;
      unsubscribe();
    };
  }, [canRead, date]);

  // Effect events read the latest draft and selection when the debounced
  // import starts and ends, without restarting the timer.
  const getPendingPhotos = useEffectEvent(() =>
    pending.flatMap((id) => libraryPhotos.filter((photo) => photo.id === id))
  );
  const commitImported = useEffectEvent(
    ({
      requested,
      added,
      hasFailed,
    }: {
      requested: string[];
      added: { libraryId: string; photo: LogPhoto }[];
      hasFailed: boolean;
    }) => {
      // Photos deselected during the import stay out of the draft. Their
      // files are orphans for the photo sweep.
      const stillPending = new Set(pending);
      const kept = added
        .filter(({ libraryId }) => stillPending.has(libraryId))
        .slice(0, Math.max(MAX_PHOTOS_PER_ENTRY - photos.length, 0));
      if (kept.length > 0) {
        const next = [...photos, ...kept.map(({ photo }) => photo)];
        onChange(next);
        analytics.track("logger:photo_added", {
          source: "today",
          photos_count: next.length,
          mode,
        });
      }
      setImported((current) => ({
        ...current,
        ...Object.fromEntries(
          kept.map(({ libraryId, photo }) => [libraryId, photo.id])
        ),
      }));
      const done = new Set(requested);
      setPending((current) => current.filter((id) => !done.has(id)));
      setIsImporting(false);
      if (hasFailed) {
        Alert.alert(t("photos_add_failed"));
      }
    }
  );

  useEffect(() => {
    if (pending.length === 0 || isImporting) {
      return;
    }
    const timer = setTimeout(async () => {
      const selected = getPendingPhotos();
      setIsImporting(true);
      const result = await importLibraryPhotos({ photos: selected });
      commitImported({
        requested: selected.map(({ id }) => id),
        ...result,
      });
    }, SELECTION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [pending, isImporting]);

  const draftIds = new Set(photos.map(({ id }) => id));
  const selectedIds = new Set(pending);
  for (const [libraryId, photoId] of Object.entries(imported)) {
    if (draftIds.has(photoId)) {
      selectedIds.add(libraryId);
    }
  }

  const toggle = (photo: LibraryPhoto) => {
    if (pending.includes(photo.id)) {
      setPending((current) => current.filter((id) => id !== photo.id));
      return;
    }
    const photoId = imported[photo.id];
    if (photoId && draftIds.has(photoId)) {
      remove({ id: photoId });
      return;
    }
    if (photos.length + pending.length >= MAX_PHOTOS_PER_ENTRY) {
      analytics.track("logger:photo_limit_reached");
      Alert.alert(t("photos_limit_reached", { max: MAX_PHOTOS_PER_ENTRY }));
      return;
    }
    setPending((current) => [...current, photo.id]);
  };

  const allow = async () => {
    const next = await requestPermission();
    const answered = next === "granted" || next === "limited" ? next : "denied";
    analytics.track("logger:library_permission_answered", {
      status: answered,
    });
    if (answered === "denied") {
      wasDeniedThisSession = true;
    }
    setPermission(answered);
  };

  return {
    /** `null` until the stored permission is read. */
    permission,
    photos: libraryPhotos,
    selectedIds,
    isImporting,
    toggle,
    allow,
    manage: () => {
      void manageAccess();
    },
  };
};
