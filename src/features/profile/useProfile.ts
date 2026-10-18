import dayjs from "dayjs";
import { useMemo } from "react";
import { useLogState } from "@/features/logs";
import type { LogItem } from "@/features/logs";
import { useSettings } from "@/state/settings";
import { getProfilePhotoUri } from "./photo";

/** Up to two capital letters from the first two words of `name`. */
export const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/u)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toLocaleUpperCase();

/** Local day (`YYYY-MM-DD`) of the oldest entry, or `null` without entries. */
export const getFirstEntryDate = (items: LogItem[]) => {
  let first: string | null = null;
  for (const item of items) {
    if (first === null || item.date < first) {
      first = item.date;
    }
  }
  return first;
};

/**
 * The user's profile from settings: name, photo, initials, and the month of
 * the first entry for the "Logging since" line.
 */
export const useProfile = () => {
  const { settings } = useSettings();
  const { items } = useLogState();
  const firstEntryDate = useMemo(() => getFirstEntryDate(items), [items]);
  const name = settings.profileName.trim();

  return {
    name,
    initials: getInitials(name),
    photoPath: settings.profileAvatar,
    photoUri: settings.profileAvatar
      ? getProfilePhotoUri(settings.profileAvatar)
      : null,
    loggingSince: firstEntryDate ? dayjs(firstEntryDate) : null,
  };
};
