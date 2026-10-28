import dayjs from "dayjs";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Body, Secondary } from "@/components/type";
import { RADIUS } from "@/constants/radius";
import { RATING_KEYS, RATING_MAPPING } from "@/constants/ratings";
import type { LogItem } from "@/features/logs";
import { getAverageMood } from "@/features/logs";
import type { Tag } from "@/features/tags";
import useColors from "@/hooks/use-colors";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { t } from "@/lib/translation";
import type { TranslationKey } from "@/lib/translation";
import { useSettings } from "@/state/settings";
import { CHIP } from "../chip-marker";
import { addDays, daysBetween } from "../days";
import type {
  DateKey,
  Period,
  PeriodKind,
  RecapDay,
  SummaryCard,
} from "../types";
import type { Content, Context } from "./card-content";
import { ChipText, RowTagChip, TagChip } from "./title-chip";

type StatCard = Extract<
  SummaryCard,
  {
    type:
      | "mood-chart"
      | "mood-count"
      | "mood-days"
      | "sleep-chart"
      | "tags"
      | "tag-days"
      | "year-pixels"
      | "best-month";
  }
>;

/** Fill and text color of a calendar day, `null` for the empty look. */
interface DayFill {
  background: string;
  text: string;
}

const RATING_BY_VALUE = new Map(
  RATING_KEYS.map((key) => [RATING_MAPPING[key], key])
);

/** Rating key of a mean rating, rounded to a step as in the calendar. */
const toRating = (value: number): LogItem["rating"] =>
  RATING_BY_VALUE.get(Math.round(value)) ?? "neutral";

const useScale = () => {
  const colors = useColors();
  const { settings } = useSettings();
  return colors.scales[settings.scaleType];
};

/**
 * Mood pixel: filled in the mood color, or an outline without a check-in.
 * A gray fill would read as the neutral mood.
 */
const pixelStyle = (
  rating: LogItem["rating"] | undefined,
  scale: ReturnType<typeof useScale>,
  border: string
) =>
  rating
    ? { backgroundColor: scale[rating].background }
    : { borderWidth: 1, borderColor: border };

/** Rounded mood of each day of `history`, by date. */
const getDayRatings = (history: RecapDay[]) => {
  const map = new Map<DateKey, LogItem["rating"]>();
  for (const day of history) {
    const rating = getAverageMood(day.items);
    if (rating) {
      map.set(day.date, rating);
    }
  }
  return map;
};

const CELL = { flex: 1, padding: 2 } as const;

/**
 * `cells` in rows of 7, the last row padded with `null`. Rows of flex
 * cells, not wrapping percent widths: rounding wraps those at 6.
 */
const toWeeks = <T,>(cells: T[]): (T | null)[][] =>
  Array.from({ length: Math.ceil(cells.length / 7) }, (_, week) =>
    Array.from({ length: 7 }, (__, day) => cells[week * 7 + day] ?? null)
  );

/**
 * The period as a calendar: one row per week, weekday initials on top.
 * Days with a check-in open the day view. Future days fade.
 */
const PeriodCalendar = ({
  period,
  today,
  checkedIn,
  fill,
  testID,
}: {
  period: Period;
  today: DateKey;
  checkedIn: ReadonlySet<DateKey>;
  fill: (date: DateKey) => DayFill | null;
  testID: string;
}) => {
  const colors = useColors();
  const router = useRouter();
  const weekLocale = useWeekLocale();
  const weekStart = dayjs(period.start)
    .locale(weekLocale)
    .startOf("week")
    .format("YYYY-MM-DD");
  const lead = daysBetween(weekStart, period.start);
  const count = daysBetween(period.start, period.end) + 1;
  const cells = Array.from({ length: lead + count }, (_, index) =>
    addDays(period.start, index - lead)
  );
  return (
    <View testID={testID}>
      <View style={{ flexDirection: "row" }}>
        {cells.slice(0, 7).map((date) => (
          <View key={`weekday-${date}`} style={[CELL, { paddingBottom: 4 }]}>
            <Secondary style={{ textAlign: "center", fontSize: 13 }}>
              {dayjs(date).format("dd").slice(0, 2)}
            </Secondary>
          </View>
        ))}
      </View>
      {toWeeks(cells).map((week) => (
        <View key={week[0]} style={{ flexDirection: "row" }}>
          {week.map((date, day) => {
            if (date === null || date < period.start) {
              // Day of the week is the identity of an empty cell in its row.
              // oxlint-disable-next-line react/no-array-index-key -- see comment above.
              return <View key={date ?? `empty-${day}`} style={CELL} />;
            }
            const colorsOfDay = fill(date);
            const hasEntry = checkedIn.has(date);
            return (
              <View key={date} style={CELL}>
                <Pressable
                  accessibilityRole={hasEntry ? "button" : undefined}
                  accessibilityLabel={dayjs(date).format("dddd, D MMMM")}
                  disabled={!hasEntry}
                  onPress={() =>
                    router.push({ pathname: "/days/[date]", params: { date } })
                  }
                  style={({ pressed }) => ({
                    aspectRatio: 1,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: RADIUS.sm,
                    borderCurve: "continuous",
                    backgroundColor:
                      colorsOfDay?.background ??
                      (hasEntry ? colors.recapMutedBackground : "transparent"),
                    borderWidth: date === today ? 2 : 0,
                    borderColor: colors.text,
                    opacity: (date > today ? 0.4 : 1) * (pressed ? 0.7 : 1),
                  })}
                >
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      fontVariant: ["tabular-nums"],
                      color: colorsOfDay?.text ?? colors.textSecondary,
                    }}
                  >
                    {dayjs(date).format("D")}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
};

/** Day labels under a bar chart: weekdays in a week, a few dates in a month. */
const barLabel = (date: DateKey, index: number, periodKind: PeriodKind) => {
  if (periodKind === "week") {
    return dayjs(date).format("dd").slice(0, 2);
  }
  return index % 7 === 0 ? dayjs(date).format("D") : "";
};

const BAR_HEIGHT = 112;

/**
 * One bar per day. Height and color come from the day's value; days
 * without one show a short muted stub, never an empty bar.
 */
const DayBars = ({
  days,
  max,
  colorOf,
  periodKind,
  testID,
}: {
  days: { date: DateKey; value: number | null }[];
  max: number;
  colorOf: (value: number) => string;
  periodKind: PeriodKind;
  testID: string;
}) => {
  const colors = useColors();
  const gap = periodKind === "week" ? 8 : 2;
  return (
    <View
      testID={testID}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ gap: 8 }}
    >
      <View
        style={{
          height: BAR_HEIGHT,
          flexDirection: "row",
          alignItems: "flex-end",
          gap,
          borderBottomWidth: 1,
          borderBottomColor: colors.recapCardBorder,
        }}
      >
        {days.map((day) => (
          <View
            key={day.date}
            style={{
              flex: 1,
              height:
                day.value === null
                  ? 4
                  : ((day.value + 1) / (max + 1)) * BAR_HEIGHT,
              borderTopLeftRadius: RADIUS.xs,
              borderTopRightRadius: RADIUS.xs,
              backgroundColor:
                day.value === null
                  ? colors.recapMutedBackground
                  : colorOf(day.value),
            }}
          />
        ))}
      </View>
      <View style={{ flexDirection: "row", gap, height: 16 }}>
        {days.map((day, index) => (
          // Month labels spill over their narrow column to the right.
          <View key={day.date} style={{ flex: 1, overflow: "visible" }}>
            <Text
              numberOfLines={1}
              style={{
                position: "absolute",
                left: 0,
                width: periodKind === "week" ? "100%" : 24,
                textAlign: periodKind === "week" ? "center" : "left",
                fontSize: 12,
                fontVariant: ["tabular-nums"],
                color: colors.textSecondary,
              }}
            >
              {barLabel(day.date, index, periodKind)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const MoodChartBody = ({
  card,
  periodKind,
}: {
  card: Extract<StatCard, { type: "mood-chart" }>;
  periodKind: PeriodKind;
}) => {
  const scale = useScale();
  return (
    <DayBars
      testID="recap-mood-chart"
      days={card.days.map((day) => ({ date: day.date, value: day.rating }))}
      max={6}
      colorOf={(value) => scale[toRating(value)].background}
      periodKind={periodKind}
    />
  );
};

const SleepChartBody = ({
  card,
  periodKind,
}: {
  card: Extract<StatCard, { type: "sleep-chart" }>;
  periodKind: PeriodKind;
}) => {
  const colors = useColors();
  return (
    <DayBars
      testID="recap-sleep-chart"
      days={card.nights.map((night) => ({
        date: night.date,
        value: night.sleep,
      }))}
      max={4}
      colorOf={() => colors.sleepQualityFull}
      periodKind={periodKind}
    />
  );
};

/** Days per mood, worst to best: a column each, count below. */
const MoodCountBody = ({
  card,
}: {
  card: Extract<StatCard, { type: "mood-count" }>;
}) => {
  const colors = useColors();
  const scale = useScale();
  const top = Math.max(...card.counts.map((count) => count.days), 1);
  return (
    <View
      testID="recap-mood-count"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 8 }}
    >
      {card.counts.map((count) => (
        <View key={count.rating} style={{ flex: 1, gap: 8 }}>
          <View
            style={{
              height: 96,
              justifyContent: "flex-end",
              borderBottomWidth: 1,
              borderBottomColor: colors.recapCardBorder,
            }}
          >
            <View
              style={{
                height: count.days === 0 ? 0 : (count.days / top) * 96,
                borderTopLeftRadius: RADIUS.xs,
                borderTopRightRadius: RADIUS.xs,
                backgroundColor: scale[count.rating].background,
              }}
            />
          </View>
          <Secondary
            style={{
              textAlign: "center",
              fontVariant: ["tabular-nums"],
              opacity: count.days === 0 ? 0.4 : 1,
            }}
          >
            {count.days}
          </Secondary>
        </View>
      ))}
    </View>
  );
};

/** Ranked tags with a bar each in the tag color, scaled to the top one. */
const TagsBody = ({
  card,
  tags,
}: {
  card: Extract<StatCard, { type: "tags" }>;
  tags: Tag[];
}) => {
  const colors = useColors();
  const top = card.counts[0]?.days ?? 1;
  return (
    <View style={{ gap: 8 }}>
      {card.counts.map((count, index) => {
        const tag = tags.find((item) => item.id === count.tagId);
        return tag ? (
          <View
            key={count.tagId}
            style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
          >
            <Secondary style={{ minWidth: 24, fontVariant: ["tabular-nums"] }}>
              {index + 1}
            </Secondary>
            <View style={{ flexBasis: "35%", flexShrink: 1 }}>
              <RowTagChip tag={tag} />
            </View>
            <View
              style={{
                flex: 1,
                height: 8,
                borderRadius: RADIUS.full,
                backgroundColor: colors.recapMutedBackground,
              }}
            >
              <View
                style={{
                  width: `${Math.round((count.days / top) * 100)}%`,
                  height: 8,
                  borderRadius: RADIUS.full,
                  backgroundColor: colors.tags[tag.color]?.dot,
                }}
              />
            </View>
            <Secondary
              style={{
                minWidth: 32,
                textAlign: "right",
                fontVariant: ["tabular-nums"],
              }}
            >
              {count.days}
            </Secondary>
          </View>
        ) : null;
      })}
    </View>
  );
};

const TagDaysBody = ({
  card,
  tag,
  context,
}: {
  card: Extract<StatCard, { type: "tag-days" }>;
  tag: Tag;
  context: Context;
}) => {
  const colors = useColors();
  const dates = new Set(card.dates);
  const tagColor = colors.tags[tag.color];
  return (
    <PeriodCalendar
      testID={`recap-tag-days-${tag.id}`}
      period={context.period}
      today={context.today}
      checkedIn={new Set(context.history.map((day) => day.date))}
      fill={(date) =>
        dates.has(date) && tagColor
          ? { background: tagColor.background, text: tagColor.text }
          : null
      }
    />
  );
};

/**
 * Good days in their mood color. Harder days in a calm gray, never in
 * their mood color: the card thanks, it does not mirror the rating.
 */
const MoodDaysBody = ({
  card,
  context,
}: {
  card: Extract<StatCard, { type: "mood-days" }>;
  context: Context;
}) => {
  const colors = useColors();
  const scale = useScale();
  const dates = new Set(card.dates);
  const ratings = getDayRatings(context.history);
  return (
    <PeriodCalendar
      testID={`recap-mood-days-${card.mode}`}
      period={context.period}
      today={context.today}
      checkedIn={new Set(ratings.keys())}
      fill={(date) => {
        const rating = ratings.get(date);
        if (!dates.has(date) || !rating) {
          return null;
        }
        return card.mode === "good"
          ? { background: scale[rating].background, text: scale[rating].text }
          : { background: colors.textSecondary, text: colors.cardBackground };
      }}
    />
  );
};

const MONTHS = Array.from({ length: 12 }, (_, index) => index);
const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, index) => index + 1);

/** One column per month, one row per day of the month. */
const YearPixelsBody = ({ context }: { context: Context }) => {
  const colors = useColors();
  const scale = useScale();
  const ratings = getDayRatings(context.history);
  const year = dayjs(context.period.start);
  return (
    <View
      testID="recap-year-pixels"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{ flexDirection: "row", gap: 3 }}
    >
      {MONTHS.map((month) => {
        const start = year.month(month).startOf("month");
        return (
          <View key={month} style={{ flex: 1, gap: 3 }}>
            <Secondary
              style={{ textAlign: "center", fontSize: 12, marginBottom: 2 }}
            >
              {start.format("MMM").slice(0, 1)}
            </Secondary>
            {DAYS_OF_MONTH.map((day) => {
              if (day > start.daysInMonth()) {
                return <View key={day} style={{ aspectRatio: 1 }} />;
              }
              const rating = ratings.get(start.date(day).format("YYYY-MM-DD"));
              return (
                <View
                  key={day}
                  style={{
                    aspectRatio: 1,
                    borderRadius: 3,
                    ...pixelStyle(rating, scale, colors.recapCardBorder),
                  }}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
};

/** Month name and its days as small mood pixels. */
const MonthPixels = ({
  month,
  label,
  context,
}: {
  month: DateKey;
  label: string;
  context: Context;
}) => {
  const colors = useColors();
  const scale = useScale();
  const weekLocale = useWeekLocale();
  const ratings = getDayRatings(context.history);
  const start = dayjs(month);
  const lead = daysBetween(
    start.locale(weekLocale).startOf("week").format("YYYY-MM-DD"),
    month
  );
  const cells = Array.from(
    { length: lead + start.daysInMonth() },
    (_, index) => index - lead
  );
  return (
    <View style={{ flex: 1, gap: 8 }}>
      <View>
        <Secondary>{label}</Secondary>
        <Body style={{ fontWeight: "600" }}>{start.format("MMMM")}</Body>
      </View>
      <View accessible={false} importantForAccessibility="no-hide-descendants">
        {toWeeks(cells).map((week) => (
          <View key={week[0]} style={{ flexDirection: "row" }}>
            {week.map((offset, day) => {
              const rating =
                offset !== null && offset >= 0
                  ? ratings.get(addDays(month, offset))
                  : undefined;
              return (
                // Day of the week is the identity of a cell in its row.
                // oxlint-disable-next-line react/no-array-index-key -- see comment above.
                <View key={day} style={{ flex: 1, padding: 1.5 }}>
                  {offset !== null && offset >= 0 && (
                    <View
                      style={{
                        aspectRatio: 1,
                        borderRadius: 3,
                        ...pixelStyle(rating, scale, colors.recapCardBorder),
                      }}
                    />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
};

const PERIOD_TITLES: Record<
  "mood-chart" | "sleep-chart",
  Partial<Record<PeriodKind, TranslationKey>>
> = {
  "mood-chart": {
    week: "recaps_mood_chart_title_week",
    month: "recaps_mood_chart_title_month",
  },
  "sleep-chart": {
    week: "recaps_sleep_chart_title_week",
    month: "recaps_sleep_chart_title_month",
  },
};

const plain = (title: string, rest: Omit<Content, "title" | "titleLabel">) => ({
  title,
  titleLabel: title,
  ...rest,
});

/**
 * Cards that came from Statistics: mood and sleep charts, mood count, good
 * and harder days, tags, year in pixels, best month.
 */
export const getStatContent = (
  card: StatCard,
  context: Context
): Content | null => {
  const periodKind = context.period.kind;
  switch (card.type) {
    case "mood-chart":
    case "sleep-chart": {
      const key = PERIOD_TITLES[card.type][periodKind];
      if (!key) {
        return null;
      }
      return plain(t(key), {
        body:
          card.type === "mood-chart" ? (
            <MoodChartBody card={card} periodKind={periodKind} />
          ) : (
            <SleepChartBody card={card} periodKind={periodKind} />
          ),
      });
    }
    case "mood-count": {
      const percent = Math.round(card.goodShare * 100);
      return plain(
        percent >= 50
          ? t("recaps_mood_count_title", { percent })
          : t("recaps_mood_count_title_mixed"),
        { body: <MoodCountBody card={card} /> }
      );
    }
    case "mood-days": {
      const count = card.dates.length;
      return plain(
        card.mode === "good"
          ? t("recaps_good_days_title", { count })
          : t("recaps_hard_days_title", { count }),
        {
          text: card.mode === "hard" ? t("recaps_day_hard_text") : undefined,
          body: <MoodDaysBody card={card} context={context} />,
        }
      );
    }
    case "tags": {
      return plain(t("recaps_tags_title"), {
        body: <TagsBody card={card} tags={context.tags} />,
      });
    }
    case "tag-days": {
      const tag = context.tags.find((item) => item.id === card.tagId);
      if (!tag) {
        return null;
      }
      const title = t("recaps_tag_days_title", {
        count: card.dates.length,
        tag: CHIP,
      });
      return {
        title: <ChipText text={title} chip={<TagChip tag={tag} />} />,
        titleLabel: title.replace(CHIP, tag.title),
        body: <TagDaysBody card={card} tag={tag} context={context} />,
      };
    }
    case "year-pixels": {
      return plain(t("recaps_year_pixels_title"), {
        text: t("recaps_year_pixels_text", { count: card.days }),
        body: <YearPixelsBody context={context} />,
      });
    }
    case "best-month": {
      return plain(
        t("recaps_best_month_title", {
          month: dayjs(card.best).format("MMMM"),
        }),
        {
          body: (
            <View style={{ flexDirection: "row", gap: 24 }}>
              <MonthPixels
                month={card.best}
                label={t("recaps_best_month_label")}
                context={context}
              />
              {card.hardest ? (
                <MonthPixels
                  month={card.hardest}
                  label={t("recaps_hardest_month_label")}
                  context={context}
                />
              ) : (
                <View style={{ flex: 1 }} />
              )}
            </View>
          ),
        }
      );
    }
    default: {
      const unknown: never = card;
      return unknown;
    }
  }
};
