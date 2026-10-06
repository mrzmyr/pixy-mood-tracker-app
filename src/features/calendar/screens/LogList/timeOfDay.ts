import dayjs from "dayjs";

/** Part of the day an entry belongs to, also its translation key. */
export type TimeOfDay =
  | "morning"
  | "midday"
  | "afternoon"
  | "evening"
  | "night";

/**
 * Part of the day for a local ISO `dateTime`: morning 5 to 11, midday 11 to
 * 14, afternoon 14 to 18, evening 18 to 22, night 22 to 5. Each start hour
 * belongs to its own part.
 */
export const getTimeOfDay = (dateTime: string): TimeOfDay => {
  const hour = dayjs(dateTime).hour();
  if (hour >= 5 && hour < 11) {
    return "morning";
  }
  if (hour >= 11 && hour < 14) {
    return "midday";
  }
  if (hour >= 14 && hour < 18) {
    return "afternoon";
  }
  if (hour >= 18 && hour < 22) {
    return "evening";
  }
  return "night";
};
