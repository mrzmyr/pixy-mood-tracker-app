import dayjs from "dayjs";
import { v5 as uuidv5 } from "uuid";
import { z } from "zod";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";
import { LogItemSchema } from "@/types";
import type { CheckInTap } from "./widgetProps";

/** uuid v5 namespace for entries created from check-in widget taps. */
const CHECK_IN_TAP_NAMESPACE = "5d0e8f3c-6b1a-4c55-9a0e-3f1f6d2b8c47";

/** Stable entry id per tap: importing the same tap twice finds the entry. */
export const getCheckInTapId = (tap: CheckInTap) =>
  uuidv5(`${tap.at}:${tap.rating}`, CHECK_IN_TAP_NAMESPACE);

const CheckInTapSchema = z.object({
  rating: LogItemSchema.shape.rating,
  at: z.number(),
});

/** Widget props as stored; only `taps` matters here. */
const StoredPropsSchema = z.object({ taps: z.array(z.unknown()) });

/**
 * Taps from every timeline entry, oldest first, without duplicates. Each
 * entry may hold the same tap: the app writes pending taps into all entries.
 * Malformed values are dropped.
 */
export const collectCheckInTaps = (entries: { props: object }[]) => {
  const byId = new Map<string, CheckInTap>();
  for (const entry of entries) {
    const stored = StoredPropsSchema.safeParse(entry.props);
    if (!stored.success) {
      continue;
    }
    for (const value of stored.data.taps) {
      const tap = CheckInTapSchema.safeParse(value);
      if (tap.success) {
        byId.set(getCheckInTapId(tap.data), tap.data);
      }
    }
  }
  return [...byId.values()].sort((a, b) => a.at - b.at);
};

/** Taps without an entry yet. */
export const getUnimportedTaps = (taps: CheckInTap[], items: LogItem[]) => {
  const ids = new Set(items.map((item) => item.id));
  return taps.filter((tap) => !ids.has(getCheckInTapId(tap)));
};

/** Entry without a sleep answer, as the logger saves it. */
type EntryWithoutSleep = Omit<LogItem, "sleep"> & {
  sleep: { quality: LogItem["sleep"]["quality"] | null };
};

/** Entry for one tap: rating only, dated at the tap. */
export const getCheckInLogItem = (tap: CheckInTap): LogItem => {
  const at = dayjs(tap.at);
  const item: EntryWithoutSleep = {
    id: getCheckInTapId(tap),
    date: at.format(DATE_FORMAT),
    dateTime: at.toISOString(),
    createdAt: at.toISOString(),
    rating: tap.rating,
    message: "",
    tags: [],
    emotions: [],
    sleep: { quality: null },
  };
  // SAFETY: the logger stores a null sleep quality the same way; statistics treat it as missing.
  return item as LogItem;
};
