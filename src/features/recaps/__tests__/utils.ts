import { _generateItem } from "@/__tests__/utils";
import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";
import { getWeekLocale } from "@/lib/translation";
import { getPeriodDays } from "../days";
import { getPeriod } from "../period";
import type { PeriodKind, RecapInput } from "../types";

/** Weeks from Monday. Importing translation registers the week locales. */
export const WEEK_LOCALE = getWeekLocale({ weekStart: 1 });

/**
 * Recap input for the period around `today`, all steps on by default. The
 * first entry defaults to long before the period.
 */
export const makeInput = ({
  kind = "week",
  today = "2026-10-07",
  date = today,
  firstEntryDate = "2020-01-01",
  items = [],
  steps = ["rating", "tags", "emotions", "people", "photos"],
  availableSteps = ["rating", "tags", "emotions", "people", "photos"],
  reminderEnabled = false,
  tags = [],
}: {
  kind?: PeriodKind;
  today?: string;
  /** Any day of the period. Defaults to `today`. */
  date?: string;
  firstEntryDate?: string | null;
  items?: Partial<LogItem>[];
  steps?: ConfigurableLoggerStep[];
  availableSteps?: ConfigurableLoggerStep[];
  reminderEnabled?: boolean;
  tags?: Tag[];
} = {}): RecapInput => {
  const period = getPeriod(kind, date, WEEK_LOCALE);
  return {
    period,
    today,
    firstEntryDate,
    days: getPeriodDays(items.map(_generateItem), period),
    steps: new Set(steps),
    availableSteps: new Set(availableSteps),
    reminderEnabled,
    tags,
  };
};

/** `count` tags named "Tag 0", "Tag 1", …, with `extra` on each. */
export const makeTags = (count: number, extra: Partial<Tag> = {}): Tag[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `tag-${index}`,
    title: `Tag ${index}`,
    color: "slate",
    ...extra,
  }));
