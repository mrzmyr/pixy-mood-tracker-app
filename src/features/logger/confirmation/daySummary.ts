import dayjs from "dayjs";
import { DATE_FORMAT } from "@/constants/Config";
import type { LogItem } from "@/features/logs";
import { getItemDate, getItemTime } from "@/lib/logDates";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { getAverageMood } from "@/lib/utils";

/** Mood group that picks the tone of the confirmation. */
export type MoodTone = "good" | "neutral" | "bad";

const TONES: Record<LogItem["rating"], MoodTone> = {
  extremely_good: "good",
  very_good: "good",
  good: "good",
  neutral: "neutral",
  bad: "bad",
  very_bad: "bad",
  extremely_bad: "bad",
};

/** Tone of the confirmation: celebrate good days, comfort hard days. */
export const getMoodTone = (rating: LogItem["rating"]) => TONES[rating];

/** Emotions named in the sentence; the rest collapse into "N more". */
export const SUMMARY_EMOTIONS_MAX = 3;

/** Up to this many tags show as chips; more show as a count. */
export const SUMMARY_TAGS_MAX = 3;

/** Everything logged on the saved entry's day, merged over its entries. */
export interface DaySummary {
  /** Local day in `DATE_FORMAT`. */
  date: string;
  /** Day average, like the calendar pixel. */
  rating: LogItem["rating"];
  tone: MoodTone;
  /** Entries on this day, including the saved one. */
  entriesCount: number;
  /** The saved entry is the user's first entry ever. */
  isFirstEntry: boolean;
  /** Unique emotion keys: saved entry first, then newer entries first. */
  emotions: string[];
  /** Unique tag ids in the same order. */
  tagIds: string[];
}

const unique = <T>(values: T[]) => [...new Set(values)];

/**
 * Summary of the saved entry's day. `items` may or may not contain `item`
 * yet; the saved entry always counts once.
 */
export const getDaySummary = ({
  items,
  item,
}: {
  items: LogItem[];
  item: LogItem;
}): DaySummary => {
  const date = getItemDate(item);
  const others = items
    .filter((entry) => entry.id !== item.id && getItemDate(entry) === date)
    .sort((a, b) => getItemTime(b) - getItemTime(a));
  const dayItems = [item, ...others];
  const otherDays = items.filter((entry) => entry.id !== item.id).length;
  const rating = getAverageMood(dayItems) ?? item.rating;

  return {
    date,
    rating,
    tone: getMoodTone(rating),
    entriesCount: dayItems.length,
    isFirstEntry: otherDays === 0,
    emotions: unique(dayItems.flatMap((entry) => entry.emotions)),
    tagIds: unique(
      dayItems.flatMap((entry) => entry.tags.map((tag) => tag.id))
    ),
  };
};

/** Piece of the summary sentence. `mark` pieces render highlighted. */
export interface SummarySegment {
  text: string;
  mark?: "mood" | "emotion";
}

// Placeholder boundary for splitting translated templates into segments.
const SPLIT = "⁣";

/** Translate `key` and replace each `{{name}}` with its segments. */
const template = (
  key: TranslationKey,
  values: Record<string, SummarySegment[]>
): SummarySegment[] => {
  const markers = Object.fromEntries(
    Object.keys(values).map((name) => [name, `${SPLIT}${name}${SPLIT}`])
  );

  // Odd parts are placeholder names, even parts are plain text.
  return t(key, markers)
    .split(SPLIT)
    .flatMap((part, index) => {
      if (index % 2 === 1) {
        return values[part] ?? [];
      }
      return part ? [{ text: part }] : [];
    });
};

/** "a, b and c" as segments; only the items carry `mark`. */
const joinList = (items: SummarySegment[]): SummarySegment[] =>
  items.flatMap((segment, index) => {
    if (index === 0) {
      return [segment];
    }
    // Translations carry their own spacing: Japanese and Chinese use none.
    const separator =
      index === items.length - 1
        ? t("log_summary_and")
        : t("log_summary_list_comma");
    return [{ text: separator }, segment];
  });

/** Title above the sentence. */
export const getSummaryTitle = (summary: DaySummary) =>
  t(
    summary.isFirstEntry
      ? `log_summary_title_first_${summary.tone}`
      : `log_summary_title_${summary.tone}`
  );

/**
 * The day as one or more sentences.
 *
 * Hard days never repeat the rating back and use "named" instead of "felt":
 * naming feelings helps, judging them does not. Tags count only above
 * {@link SUMMARY_TAGS_MAX}; fewer show as chips under the sentence.
 */
export const getSummarySentence = ({
  summary,
  emotionLabel,
  today = dayjs().format(DATE_FORMAT),
}: {
  summary: DaySummary;
  emotionLabel: (key: string) => string;
  /** Today in `DATE_FORMAT`; injectable for tests. */
  today?: string;
}): SummarySegment[] => {
  const segments: SummarySegment[] = [];
  const space = () => segments.length > 0 && segments.push({ text: " " });

  if (summary.tone === "bad") {
    segments.push({
      text: t(
        summary.isFirstEntry
          ? "log_summary_hard_day_first"
          : "log_summary_hard_day"
      ),
    });
  } else {
    const mood = [
      { text: t(summary.rating).toLocaleLowerCase(), mark: "mood" as const },
    ];
    segments.push(
      ...(summary.date === today
        ? template("log_summary_mood_today", { mood })
        : template("log_summary_mood_date", {
            mood,
            // Weekday within the last week, else the localized date.
            date: [
              {
                text: dayjs(summary.date).format(
                  dayjs(today).diff(summary.date, "day") < 7 ? "dddd" : "LL"
                ),
              },
            ],
          }))
    );
  }

  if (summary.emotions.length > 0) {
    const shown = summary.emotions.slice(0, SUMMARY_EMOTIONS_MAX);
    const rest = summary.emotions.length - shown.length;
    const items: SummarySegment[] = shown.map((key) => ({
      text: emotionLabel(key).toLocaleLowerCase(),
      mark: "emotion",
    }));
    if (rest > 0) {
      items.push({ text: t("log_summary_more", { count: rest }) });
    }
    space();
    segments.push(
      ...template(
        summary.tone === "bad" ? "log_summary_named" : "log_summary_felt",
        { emotions: joinList(items) }
      )
    );
  }

  if (summary.tagIds.length > SUMMARY_TAGS_MAX) {
    space();
    segments.push({
      text: t("log_summary_tags_count", { count: summary.tagIds.length }),
    });
  }

  const isRatingOnly =
    summary.emotions.length === 0 && summary.tagIds.length === 0;
  if (isRatingOnly && summary.tone !== "bad" && summary.entriesCount > 1) {
    space();
    segments.push({
      text: t("log_summary_check_in", { count: summary.entriesCount }),
    });
  }

  return segments;
};
