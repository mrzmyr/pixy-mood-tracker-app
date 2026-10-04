import dayjs from "dayjs";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback } from "react";
import { z } from "zod";
import { DATE_FORMAT } from "@/constants/Config";
import { useFeatureFlag } from "@/state/featureFlags";

/** Calendar layouts the View menu switches between. */
export const CALENDAR_VIEWS = ["year", "month", "week"] as const;

/** One of {@link CALENDAR_VIEWS}. */
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

/** Check an untrusted value, for example a native menu selection. */
export const isCalendarView = (value: unknown): value is CalendarView =>
  CALENDAR_VIEWS.some((view) => view === value);

/** Calendar tab state. `date: null` means today. */
export interface CalendarParams {
  view: CalendarView;
  date: string | null;
}

const ViewSchema = z.enum(CALENDAR_VIEWS);
const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/u);

/**
 * Read the calendar tab's route params. Unknown views fall back to month.
 * Invalid or future dates fall back to `null`, which means today.
 */
export const parseCalendarParams = ({
  params,
  isEnabled,
  today,
}: {
  params: { view?: string | string[]; date?: string | string[] };
  isEnabled: boolean;
  today: string;
}): CalendarParams => {
  const view = ViewSchema.safeParse(params.view);
  const date = DateSchema.safeParse(params.date);
  const isValidDate =
    date.success &&
    dayjs(date.data).format(DATE_FORMAT) === date.data &&
    date.data <= today;
  return {
    view: isEnabled && view.success ? view.data : "month",
    date: isValidDate ? date.data : null,
  };
};

/**
 * View and focus date of the calendar tab, kept in route params
 * (`/calendar?view=week&date=2026-10-04`) so deep links restore them.
 * Works in the calendar screen and its header. Behind the `calendar-views`
 * flag: off, the calendar always shows months.
 */
export const useCalendarView = () => {
  const params = useLocalSearchParams<{ view?: string; date?: string }>();
  const router = useRouter();
  const isEnabled = useFeatureFlag("calendar-views");
  const { view, date } = parseCalendarParams({
    params,
    isEnabled,
    today: dayjs().format(DATE_FORMAT),
  });

  const show = useCallback(
    (next: { view: CalendarView; date?: string | null }) => {
      router.setParams({ view: next.view, date: next.date ?? undefined });
    },
    [router]
  );

  return { isEnabled, view, date, show };
};
