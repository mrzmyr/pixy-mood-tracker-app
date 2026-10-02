import type {
  ContextProperties,
  SessionSource,
  Weekday,
} from "@/state/analytics/events";

const WEEKDAYS: Weekday[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

/** Context properties for an event captured at `now` (device local time). */
export const getContextProperties = (
  now: Date,
  sessionSource: SessionSource
): ContextProperties => ({
  local_hour: now.getHours(),
  local_weekday: WEEKDAYS[now.getDay()],
  session_source: sessionSource,
});
