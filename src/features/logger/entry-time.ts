import dayjs from "dayjs";

/** Minute steps of the entry date and time picker. */
export const ENTRY_TIME_MINUTE_INTERVAL = 10;

/** Time-of-day shortcuts of the entry time menu, also their translation keys. */
export type EntryTimePreset = "morning" | "afternoon" | "evening";

/** Hour each preset sets, in menu order. */
export const ENTRY_TIME_PRESETS: readonly (readonly [
  EntryTimePreset,
  number,
])[] = [
  ["morning", 8],
  ["afternoon", 13],
  ["evening", 20],
];

/**
 * Preset `hour` on the local day of `dateTime`, at minute 0. `null` when that
 * time lies after `now`: an entry never moves into the future.
 */
export const getPresetDateTime = ({
  dateTime,
  hour,
  now = new Date(),
}: {
  dateTime: string;
  hour: number;
  now?: Date;
}): string | null => {
  const preset = dayjs(dateTime).hour(hour).startOf("hour");
  return preset.isAfter(now) ? null : preset.toISOString();
};

/** `date`, or `now` when `date` lies in the future. */
export const clampToNow = (date: Date, now = new Date()): Date =>
  date.getTime() > now.getTime() ? now : date;
