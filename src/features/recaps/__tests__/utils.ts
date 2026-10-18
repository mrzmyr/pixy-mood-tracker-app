import { _generateItem } from "@/testing/logItem";
import type { ConfigurableLoggerStep } from "@/constants/LoggerSteps";
import type { LogItem } from "@/features/logs";
import type { Tag } from "@/features/tags";
import { getWeekLocale } from "@/lib/translation";
import { getDays, getPeriodDays } from "../days";
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
  locationEnabled = false,
  personIds,
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
  locationEnabled?: boolean;
  /** Existing people. Defaults to everyone on `items`. */
  personIds?: string[];
} = {}): RecapInput => {
  const period = getPeriod(kind, date, WEEK_LOCALE);
  const history = getDays(items.map(_generateItem));
  return {
    period,
    today,
    firstEntryDate,
    days: getPeriodDays(history, period),
    history,
    locationEnabled,
    steps: new Set(steps),
    availableSteps: new Set(availableSteps),
    reminderEnabled,
    tags,
    tagCategories: [{ id: "general", title: "General" }],
    personIds: new Set(
      personIds ??
        items.flatMap((item) => (item.people ?? []).map((person) => person.id))
    ),
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
