import dayjs from "dayjs";
import { useEffect, useRef, useState } from "react";
import pkg from "../../package.json";
import { DATE_FORMAT, STATISTIC_MIN_LOGS } from "@/constants/Config";
import { createStructuredError } from "@/lib/errors";
import { getItemDate } from "@/lib/logDates";
import { useAnalytics } from "@/state/analytics";
import { useFeatureFlag } from "@/state/featureFlags";
import type { UsageSummary } from "@/state/analytics/events";
import { useSettings } from "@/state/settings";
import type { SettingsState } from "@/state/settings";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { countPhotosBySource, getPhotoSource } from "@/features/photos";
import type { LibraryPermission } from "@/features/photos";
import { getCurrentStreak, getLongestStreak } from "@/features/statistics";
import { useTagsState } from "@/features/tags";
import type { Tag } from "@/features/tags";

const QUESTION_ACTION_PREFIX = "question_slide_";

// Module function, not hook code: React Compiler does not support
// try/catch around await in hooks.
const readPhotoLibraryAccess = async (): Promise<LibraryPermission> => {
  try {
    return await getPhotoSource().getLibraryPermission();
  } catch (error) {
    console.error(
      createStructuredError({
        status: "photo_library_failed",
        message: "Photo library permission could not be read",
        why: `Reading the permission for the usage summary failed: ${error instanceof Error ? error.message : String(error)}`,
        fix: "Restart Pixy. The summary reports unavailable until then",
      })
    );
    return "unavailable";
  }
};

const getPercent = (count: number, total: number) =>
  total === 0 ? null : Math.round((count / total) * 100);

const getReminderHour = (time: string) => {
  const hour = Number(time.split(":")[0]);
  return Number.isInteger(hour) ? hour : null;
};

/**
 * Usage profile of this install from local data, at `now`.
 *
 * Counts, shares, and booleans only: never ratings, emotions, text, tag
 * titles, or photo metadata. Day windows include today, in device local time.
 */
export const getUsageSummary = ({
  items,
  tags,
  settings,
  isPhotosEnabled,
  photoLibraryAccess,
  now,
}: {
  items: LogItem[];
  tags: Tag[];
  settings: Pick<
    SettingsState,
    "reminderEnabled" | "reminderTime" | "scaleType" | "steps" | "actionsDone"
  >;
  /** Value of the `photos` feature flag. */
  isPhotosEnabled: boolean;
  photoLibraryAccess: LibraryPermission;
  now: Date;
}): UsageSummary => {
  const photos = items.flatMap((item) => item.photos);
  const photoCounts = countPhotosBySource({ photos });

  const today = dayjs(now).format(DATE_FORMAT);
  const start7d = dayjs(now).subtract(6, "day").format(DATE_FORMAT);
  const start14d = dayjs(now).subtract(13, "day").format(DATE_FORMAT);
  const start30d = dayjs(now).subtract(29, "day").format(DATE_FORMAT);

  const days = new Set<string>();
  const items30d: LogItem[] = [];
  let entries14d = 0;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const item of items) {
    const date = getItemDate(item);
    days.add(date);
    if (firstDate === null || date < firstDate) {
      firstDate = date;
    }
    if (lastDate === null || date > lastDate) {
      lastDate = date;
    }
    if (date >= start30d && date <= today) {
      items30d.push(item);
    }
    if (date >= start14d && date <= today) {
      entries14d += 1;
    }
  }

  let loggedDays7d = 0;
  let loggedDays30d = 0;
  for (const date of days) {
    if (date > today) {
      continue;
    }
    if (date >= start7d) {
      loggedDays7d += 1;
    }
    if (date >= start30d) {
      loggedDays30d += 1;
    }
  }

  const daysSince = (date: string | null) =>
    date === null ? null : dayjs(today).diff(dayjs(date), "day");

  return {
    entries_count: items.length,
    entries_30d: items30d.length,
    logged_days_7d: loggedDays7d,
    logged_days_30d: loggedDays30d,
    days_since_first_entry: daysSince(firstDate),
    days_since_last_entry: daysSince(lastDate),
    current_streak: getCurrentStreak(items),
    longest_streak: getLongestStreak(items),
    notes_pct_30d: getPercent(
      items30d.filter((item) => item.message.length > 0).length,
      items30d.length
    ),
    tags_pct_30d: getPercent(
      items30d.filter((item) => item.tags.length > 0).length,
      items30d.length
    ),
    emotions_pct_30d: getPercent(
      items30d.filter((item) => item.emotions.length > 0).length,
      items30d.length
    ),
    statistics_unlocked: entries14d >= STATISTIC_MIN_LOGS,
    tags_count: tags.filter((tag) => !tag.isArchived).length,
    archived_tags_count: tags.filter((tag) => tag.isArchived).length,
    reminder_enabled: settings.reminderEnabled,
    reminder_hour: settings.reminderEnabled
      ? getReminderHour(settings.reminderTime)
      : null,
    scale_type: settings.scaleType,
    steps: settings.steps,
    onboarding_done: settings.actionsDone.some(
      (action) => action.title === "onboarding"
    ),
    questions_answered_count: settings.actionsDone.filter((action) =>
      action.title.startsWith(QUESTION_ACTION_PREFIX)
    ).length,
    photos_enabled: isPhotosEnabled,
    photos_pct_30d: getPercent(
      items30d.filter((item) => item.photos.length > 0).length,
      items30d.length
    ),
    photos_count: photos.length,
    photos_day_pct: getPercent(photoCounts.day, photos.length),
    photo_library_access: photoLibraryAccess,
  };
};

/**
 * Send the usage summary after stores load and whenever it changes.
 *
 * Skips sends with unchanged values. Values reflect the last app open:
 * day counts do not age while the app stays closed.
 */
export const useUsageSummarySync = () => {
  const analytics = useAnalytics();
  const { settings } = useSettings();
  const logState = useLogState();
  const { tags, loaded: tagsLoaded } = useTagsState();
  const lastSent = useRef<string | null>(null);
  const isPhotosEnabled = useFeatureFlag("photos");
  const [libraryAccess, setLibraryAccess] = useState<LibraryPermission | null>(
    null
  );
  const photoLibraryAccess = isPhotosEnabled ? libraryAccess : "unavailable";

  // Read once when the photos flag turns on. Never reads the library with
  // photos off.
  useEffect(() => {
    if (!isPhotosEnabled) {
      return;
    }
    let isCurrent = true;
    const load = async () => {
      const access = await readPhotoLibraryAccess();
      if (isCurrent) {
        setLibraryAccess(access);
      }
    };
    void load();
    return () => {
      isCurrent = false;
    };
  }, [isPhotosEnabled]);

  const { reminderEnabled, reminderTime, scaleType, steps, actionsDone } =
    settings;
  const isReady =
    settings.loaded &&
    logState.loaded &&
    tagsLoaded === true &&
    photoLibraryAccess !== null;

  useEffect(() => {
    if (!isReady || !analytics.isEnabled || photoLibraryAccess === null) {
      return;
    }

    const properties = getUsageSummary({
      items: logState.items,
      tags,
      settings: {
        reminderEnabled,
        reminderTime,
        scaleType,
        steps,
        actionsDone,
      },
      isPhotosEnabled,
      photoLibraryAccess,
      now: new Date(),
    });
    const serialized = JSON.stringify(properties);
    if (serialized === lastSent.current) {
      return;
    }

    lastSent.current = serialized;
    analytics.sendUsageSummary(properties, {
      first_app_version: pkg.version,
    });
  }, [
    isReady,
    analytics,
    logState.items,
    tags,
    reminderEnabled,
    reminderTime,
    scaleType,
    steps,
    actionsDone,
    isPhotosEnabled,
    photoLibraryAccess,
  ]);
};
