import dayjs from "dayjs";
import { useSyncExternalStore } from "react";
import { DATE_FORMAT } from "@/constants/config";

/**
 * First calendar visit after onboarding: the empty pixels assemble one by
 * one in reading order, from the top-left pixel on screen. Each rises a
 * little while it fades in. Then the month names, weekday row, header
 * buttons, and add button fade in.
 *
 * Phases:
 * - `off`: no intro.
 * - `hidden`: onboarding finished. The calendar renders with pixels and
 *   chrome hidden until the list knows its first visible row.
 * - `playing`: pixels assemble from `origin`, the first day on screen.
 */
export type CalendarIntro =
  | { phase: "off" }
  | { phase: "hidden" }
  | { phase: "playing"; origin: string; chromeDelay: number };

/** Wait before the first pixel. */
const LEAD_MS = 0;
/** Gap between two pixels that follow each other. */
const PIXEL_STAGGER_MS = 22;
const PIXEL_DURATION_MS = 500;
const CHROME_DURATION_MS = 500;

const OFF: CalendarIntro = { phase: "off" };
const HIDDEN: CalendarIntro = { phase: "hidden" };

let intro: CalendarIntro = OFF;
let endTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();

const setIntro = (next: CalendarIntro) => {
  intro = next;
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getIntro = () => intro;

/** Longest wait for the list layout; then the calendar shows without intro. */
const HIDDEN_TIMEOUT_MS = 3000;

/** Onboarding calls this right before it opens the calendar. */
export const queueCalendarIntro = () => {
  setIntro(HIDDEN);
  if (endTimer) {
    clearTimeout(endTimer);
  }
  endTimer = setTimeout(() => {
    endTimer = null;
    if (intro.phase === "hidden") {
      setIntro(OFF);
    }
  }, HIDDEN_TIMEOUT_MS);
};

/** True while the calendar waits for its layout to start the intro. */
export const isCalendarIntroHidden = () => intro.phase === "hidden";

/**
 * The calendar calls this once its list has laid out. `origin` is the first
 * day in the top row on screen; `lastDate` is the last day of the calendar.
 */
export const playCalendarIntro = ({
  origin,
  lastDate,
}: {
  origin: string;
  lastDate: string;
}) => {
  if (intro.phase !== "hidden") {
    return;
  }
  const pixelCount = Math.max(0, dayjs(lastDate).diff(origin, "day"));
  const chromeDelay =
    LEAD_MS + pixelCount * PIXEL_STAGGER_MS + PIXEL_DURATION_MS;
  setIntro({ phase: "playing", origin, chromeDelay });
  if (endTimer) {
    clearTimeout(endTimer);
  }
  endTimer = setTimeout(() => {
    endTimer = null;
    setIntro(OFF);
  }, chromeDelay + CHROME_DURATION_MS);
};

/** Current intro phase; components re-render when it changes. */
export const useCalendarIntro = () =>
  useSyncExternalStore(subscribe, getIntro, getIntro);

/** True until the intro ends, so callers can hold back their UI. */
export const useIsCalendarIntroActive = () =>
  useCalendarIntro().phase !== "off";

const PIXEL_KEYFRAMES = {
  from: { opacity: 0, transform: [{ translateY: 10 }] },
  to: { opacity: 1, transform: [{ translateY: 0 }] },
};

const FADE_KEYFRAMES = {
  from: { opacity: 0 },
  to: { opacity: 1 },
};

const HIDDEN_STYLE = { opacity: 0 };

/**
 * Pixel style for `date` during the intro, or null without one. Pixels go
 * in reading order from `origin`; days above the screen show at once.
 */
export const getPixelIntroStyle = (state: CalendarIntro, date: string) => {
  if (state.phase === "off") {
    return null;
  }
  if (state.phase === "hidden") {
    return HIDDEN_STYLE;
  }
  const order = dayjs(date).diff(state.origin, "day");
  if (order < 0) {
    return null;
  }
  return {
    animationName: PIXEL_KEYFRAMES,
    animationDuration: PIXEL_DURATION_MS,
    animationDelay: LEAD_MS + order * PIXEL_STAGGER_MS,
    animationFillMode: "backwards" as const,
    animationTimingFunction: "ease-out" as const,
  };
};

/** Style for everything around the pixels: it fades in after them. */
export const getChromeIntroStyle = (state: CalendarIntro) => {
  if (state.phase === "off") {
    return null;
  }
  if (state.phase === "hidden") {
    return HIDDEN_STYLE;
  }
  return {
    animationName: FADE_KEYFRAMES,
    animationDuration: CHROME_DURATION_MS,
    animationDelay: state.chromeDelay,
    animationFillMode: "backwards" as const,
    animationTimingFunction: "ease-out" as const,
  };
};

/**
 * First day of the top calendar row on screen. `hiddenHeight` is how far
 * the first visible month starts above the list top.
 */
export const getIntroOrigin = ({
  monthDate,
  weeks,
  hiddenHeight,
  titleHeight,
  weekHeight,
  locale,
}: {
  monthDate: string;
  weeks: number;
  hiddenHeight: number;
  titleHeight: number;
  weekHeight: number;
  locale: string;
}) => {
  const month = dayjs(monthDate).locale(locale).startOf("month");
  const hiddenRows = Math.max(
    0,
    Math.floor((hiddenHeight - titleHeight) / weekHeight)
  );
  if (hiddenRows >= weeks) {
    return month.add(1, "month").format(DATE_FORMAT);
  }
  const rowStart = month.startOf("week").add(hiddenRows, "week");
  return (rowStart.isBefore(month) ? month : rowStart).format(DATE_FORMAT);
};
