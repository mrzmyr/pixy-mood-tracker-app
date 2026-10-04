import dayjs from "dayjs";
import { memo, useMemo, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { ChevronLeft, ChevronRight } from "react-native-feather";
import LinkButton from "@/components/LinkButton";
import { DATE_FORMAT } from "@/constants/Config";
import useColors from "@/hooks/useColors";
import useHaptics from "@/hooks/useHaptics";
import { useWeekLocale } from "@/hooks/useWeekLocale";
import type { LayoutChangeEvent } from "react-native";
import type { LogItem } from "@/features/logs";
import { getAverageMood } from "@/lib/utils";
import { t } from "@/lib/translation";
import { useSetting } from "@/state/settings";
import { useCalendarNavigation } from "../../navigation";
import { useFilteredItemIds, useItemsByDate } from "./itemsByDate";
import { getWeekDays, layoutDayEntries } from "./layout";

const HOUR_HEIGHT = 56;
const GUTTER_WIDTH = 56;
/** Minutes one entry block covers. Entries are moments, so this is visual only. */
const ENTRY_SPAN = 60;
const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
const TIMELINE_HEIGHT = 24 * HOUR_HEIGHT + 16;
const EMPTY_ITEMS: LogItem[] = [];

const styles = StyleSheet.create({
  navigation: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    height: 48,
  },
  navigationTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
  },
  chevron: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  dayHeaders: {
    flexDirection: "row",
    paddingLeft: GUTTER_WIDTH,
    paddingBottom: 8,
  },
  dayHeader: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: 4,
  },
  dayName: {
    fontSize: 12,
    fontWeight: "600",
  },
  dayNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberText: {
    fontSize: 17,
    fontVariant: ["tabular-nums"],
  },
  moodBar: {
    width: "60%",
    height: 4,
    borderRadius: 2,
  },
  hourLabel: {
    position: "absolute",
    left: 0,
    width: GUTTER_WIDTH - 6,
    fontSize: 11,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  hourLine: {
    position: "absolute",
    left: GUTTER_WIDTH,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  columns: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: GUTTER_WIDTH,
    right: 0,
    flexDirection: "row",
  },
  column: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
  },
  entry: {
    position: "absolute",
    borderRadius: 4,
    borderLeftWidth: 3,
    paddingHorizontal: 3,
    paddingVertical: 2,
    overflow: "hidden",
  },
  entryLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  nowLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
  },
});

const getMinutes = (item: LogItem) => {
  const time = dayjs(item.dateTime);
  return time.hour() * 60 + time.minute();
};

const DayColumnComponent = ({
  date,
  items,
  filteredIds,
  isFiltering,
  isToday,
  onPress,
}: {
  date: string;
  items: LogItem[];
  filteredIds: Set<string>;
  isFiltering: boolean;
  isToday: boolean;
  onPress: (date: string) => void;
}) => {
  const colors = useColors();
  const scaleType = useSetting("scaleType");
  const entries = useMemo(
    () =>
      layoutDayEntries(
        items.map((item) => ({ item, minutes: getMinutes(item) })),
        ENTRY_SPAN
      ),
    [items]
  );
  const now = dayjs();
  const nowMinutes = now.hour() * 60 + now.minute();

  return (
    <View style={[styles.column, { borderLeftColor: colors.headerBorder }]}>
      {entries.map(({ item, minutes, lane, lanes }) => {
        const scale = colors.scales[scaleType][item.rating];
        const isDimmed = isFiltering && !filteredIds.has(item.id);
        return (
          <Pressable
            key={item.id}
            testID={`calendar-week-entry-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${dayjs(item.dateTime).format("LLLL")}, ${t(item.rating)}`}
            onPress={() => onPress(date)}
            style={({ pressed }) => [
              styles.entry,
              {
                // Late entries end at midnight instead of overflowing the day.
                top:
                  (Math.min(minutes, 24 * 60 - ENTRY_SPAN) / 60) * HOUR_HEIGHT +
                  1,
                height: (ENTRY_SPAN / 60) * HOUR_HEIGHT - 2,
                left: `${(lane / lanes) * 100}%`,
                width: `${100 / lanes}%`,
                backgroundColor: scale.background,
                borderLeftColor: scale.text,
                opacity: (isDimmed ? 0.25 : 1) * (pressed ? 0.7 : 1),
              },
            ]}
          >
            <Text
              numberOfLines={2}
              style={[styles.entryLabel, { color: scale.text }]}
            >
              {t(item.rating)}
            </Text>
          </Pressable>
        );
      })}
      {isToday && (
        <View
          pointerEvents="none"
          style={[
            styles.nowLine,
            {
              top: (nowMinutes / 60) * HOUR_HEIGHT - 1,
              backgroundColor: colors.tint,
            },
          ]}
        />
      )}
    </View>
  );
};
const DayColumn = memo(DayColumnComponent);

const WeekViewComponent = ({
  date,
  onChangeDate,
  header,
}: {
  /** Any day of the week to show. `null` shows the current week. */
  date: string | null;
  onChangeDate: (
    date: string | null,
    direction: "previous" | "next" | "today"
  ) => void;
  header: React.ReactElement | null;
}) => {
  const colors = useColors();
  const haptics = useHaptics();
  const locale = useWeekLocale();
  const scaleType = useSetting("scaleType");
  const calendarNavigation = useCalendarNavigation();
  const itemsByDate = useItemsByDate();
  const { ids: filteredIds, isFiltering } = useFilteredItemIds();
  const today = dayjs().format(DATE_FORMAT);
  // "10 PM" or "22 Uhr": hour only, so labels fit the gutter.
  const hourFormat = useMemo(
    () => new Intl.DateTimeFormat(dayjs.locale(), { hour: "numeric" }),
    []
  );
  const days = useMemo(
    () => getWeekDays({ date: date ?? today, locale }),
    [date, today, locale]
  );
  const isCurrentWeek = days.includes(today);
  const [firstDay] = days;

  // Open each week one hour before its first entry, or at 8:00 when it has none.
  const firstMinutes = useMemo(() => {
    let first: number | null = null;
    for (const day of days) {
      for (const item of itemsByDate[day] ?? []) {
        first = Math.min(first ?? Infinity, getMinutes(item));
      }
    }
    return first ?? 9 * 60;
  }, [days, itemsByDate]);
  const scrollRef = useRef<ScrollView>(null);
  // The timeline remounts per week, so this runs once per week. Clamp, so a
  // late first entry does not scroll past the end of the day.
  const onTimelineLayout = (event: LayoutChangeEvent) => {
    const maxOffset = TIMELINE_HEIGHT - event.nativeEvent.layout.height;
    const offset = Math.max(firstMinutes / 60 - 1, 0) * HOUR_HEIGHT;
    scrollRef.current?.scrollTo({
      y: Math.max(Math.min(offset, maxOffset), 0),
      animated: false,
    });
  };

  const openDay = (day: string) => {
    calendarNavigation.openDay({ date: day, source: "calendar" });
  };

  const goTo = (offset: number, direction: "previous" | "next") => {
    haptics.selection();
    const next = dayjs(firstDay).add(offset, "week").format(DATE_FORMAT);
    onChangeDate(next > today ? null : next, direction);
  };

  return (
    <View style={{ flex: 1 }} testID="calendar-week-view">
      {header}
      <View
        style={[
          styles.navigation,
          { backgroundColor: colors.calendarBackground },
        ]}
      >
        <Pressable
          testID="calendar-week-previous"
          accessibilityRole="button"
          accessibilityLabel={t("calendar_week_previous")}
          onPress={() => goTo(-1, "previous")}
          style={styles.chevron}
        >
          <ChevronLeft
            width={24}
            height={24}
            color={colors.linkButtonTextPrimary}
          />
        </Pressable>
        <Text
          accessibilityRole="header"
          style={[styles.navigationTitle, { color: colors.text }]}
        >
          {dayjs(days[3]).format("MMMM YYYY")}
        </Text>
        {!isCurrentWeek && (
          <LinkButton
            testID="calendar-week-today"
            onPress={() => onChangeDate(null, "today")}
          >
            {t("today")}
          </LinkButton>
        )}
        <Pressable
          testID="calendar-week-next"
          accessibilityRole="button"
          accessibilityLabel={t("calendar_week_next")}
          accessibilityState={{ disabled: isCurrentWeek }}
          disabled={isCurrentWeek}
          onPress={() => goTo(1, "next")}
          style={[styles.chevron, { opacity: isCurrentWeek ? 0.3 : 1 }]}
        >
          <ChevronRight
            width={24}
            height={24}
            color={colors.linkButtonTextPrimary}
          />
        </Pressable>
      </View>
      <View
        style={[
          styles.dayHeaders,
          {
            backgroundColor: colors.calendarBackground,
            borderBottomColor: colors.headerBorder,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        {days.map((day) => {
          const items = itemsByDate[day] ?? [];
          const rating = getAverageMood(items);
          const isToday = day === today;
          const isFuture = day > today;
          return (
            <Pressable
              key={day}
              testID={`calendar-week-day-${day}`}
              accessibilityRole="button"
              accessibilityLabel={dayjs(day).format("dddd, LL")}
              accessibilityState={{ disabled: isFuture }}
              disabled={isFuture}
              onPress={() => {
                haptics.selection();
                openDay(day);
              }}
              style={({ pressed }) => [
                styles.dayHeader,
                { opacity: (isFuture ? 0.4 : 1) * (pressed ? 0.6 : 1) },
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  { color: isToday ? colors.tint : colors.textSecondary },
                ]}
              >
                {dayjs(day).locale(locale).format("ddd")}
              </Text>
              <View
                style={[
                  styles.dayNumber,
                  isToday && { backgroundColor: colors.tint },
                ]}
              >
                <Text
                  style={[
                    styles.dayNumberText,
                    {
                      color: isToday ? colors.background : colors.text,
                      fontWeight: isToday ? "700" : "400",
                    },
                  ]}
                >
                  {dayjs(day).date()}
                </Text>
              </View>
              <View
                style={[
                  styles.moodBar,
                  {
                    backgroundColor: rating
                      ? colors.scales[scaleType][rating].background
                      : "transparent",
                  },
                ]}
              />
            </Pressable>
          );
        })}
      </View>
      <ScrollView
        // A new week remounts the timeline at its first entry.
        key={firstDay}
        ref={scrollRef}
        onLayout={onTimelineLayout}
        testID="calendar-week-timeline"
        style={{ flex: 1, backgroundColor: colors.calendarBackground }}
        contentContainerStyle={{ height: TIMELINE_HEIGHT, paddingTop: 8 }}
      >
        <View style={{ flex: 1 }}>
          {HOURS.map((hour) => (
            <View key={hour} pointerEvents="none">
              <View
                style={[
                  styles.hourLine,
                  {
                    top: hour * HOUR_HEIGHT,
                    backgroundColor: colors.headerBorder,
                  },
                ]}
              />
              <Text
                style={[
                  styles.hourLabel,
                  { top: hour * HOUR_HEIGHT - 7, color: colors.textSecondary },
                ]}
              >
                {hourFormat.format(dayjs().hour(hour).minute(0).toDate())}
              </Text>
            </View>
          ))}
          <View style={styles.columns}>
            {days.map((day) => (
              <DayColumn
                key={day}
                date={day}
                items={itemsByDate[day] ?? EMPTY_ITEMS}
                filteredIds={filteredIds}
                isFiltering={isFiltering}
                isToday={day === today}
                onPress={openDay}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * Week view: seven day columns on a 24-hour timeline. Each entry is a block
 * at its time, colored by mood. Day headers show the day's average mood.
 * Tapping a day or an entry opens that day.
 */
export const WeekView = memo(WeekViewComponent);
