import { z } from "zod";

/** Missing or invalid stored choices use the device calendar. */
export const weekStartSchema = z
  .enum(["system", "monday", "sunday"])
  // oxlint-disable-next-line promise/prefer-await-to-then -- Zod catch sets a synchronous validation default, not a Promise handler.
  .catch("system");

/** Persisted week-start choice. System preserves any device-selected weekday. */
export type WeekStart = z.infer<typeof weekStartSchema>;

/**
 * Day.js uses Sunday=0; Expo uses Sunday=1. Browsers without calendar
 * preferences use Monday. https://docs.expo.dev/versions/latest/sdk/localization/#calendar
 */
export const getWeekStart = ({
  preference,
  firstWeekday,
}: {
  preference: WeekStart;
  firstWeekday: number | null;
}): number => {
  if (preference === "monday") {
    return 1;
  }
  if (preference === "sunday") {
    return 0;
  }
  return firstWeekday === null ? 1 : firstWeekday - 1;
};
