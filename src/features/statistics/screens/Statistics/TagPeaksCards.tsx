import { useWeekLocale } from "@/hooks/useWeekLocale";
import dayjs from "dayjs";
import type { Dayjs } from "dayjs";

import { Pressable, Text, View } from "react-native";
import { Card } from "../../components/Card";
import { DATE_FORMAT } from "@/constants/Config";
import { t } from "@/lib/translation";
import useColors from "@/hooks/useColors";
import type { LogItem } from "@/features/logs";
import type { TagsPeakData } from "../../TagsPeaks";
import type { Tag as ITag } from "@/features/tags";
import { HeaderWeek } from "./HeaderWeek";
import groupBy from "lodash/groupBy";
import keys from "lodash/keys";
import range from "lodash/range";
import { useCalendarNavigation } from "@/features/calendar";
import { getItemDate } from "@/lib/logDates";
import { RADIUS } from "@/constants/Radius";

const DayDot = ({
  date,
  isHighlighted,
  colorName,
  item,
}: {
  date: Dayjs;
  isHighlighted: boolean;
  colorName: string;
  item: LogItem | undefined;
}) => {
  const colors = useColors();
  const calendarNavigation = useCalendarNavigation();

  const color = isHighlighted
    ? colors.tags[colorName]
    : {
        background: colors.statisticsCalendarDotBackground,
        text: colors.statisticsCalendarDotText,
        border: colors.statisticsCalendarDotBorder,
      };

  return (
    <Pressable
      style={({ pressed }) => ({
        width: "100%",
        aspectRatio: 1,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: RADIUS.full,
        backgroundColor: color?.background,
        maxWidth: 32,
        maxHeight: 32,
        borderColor: color?.border,
        borderWidth: date.isSame(dayjs(), "day") ? 2 : 0,
        opacity: pressed ? 0.8 : 1,
      })}
      onPress={() => {
        if (!item) {
          return;
        }

        calendarNavigation.openDay({
          date: dayjs(date).format(DATE_FORMAT),
          source: "tag_peaks",
        });
      }}
    >
      <Text
        style={{
          color: color?.text,
          fontWeight: "600",
        }}
      >
        {date.format("DD")}
      </Text>
    </Pressable>
  );
};

const WEEK_DAY_OFFSETS = [0, 1, 2, 3, 4, 5, 6];

const BodyWeek = ({
  items,
  tag,
  start,
}: {
  items: LogItem[];
  tag: ITag;
  start: Dayjs;
}) => (
  <View
    style={{
      width: "100%",
      flexDirection: "row",
      justifyContent: "space-between",
      marginTop: 16,
    }}
  >
    {WEEK_DAY_OFFSETS.map((day) => {
      const date = dayjs(start).add(day, "day");
      const item = items.find((logItem) =>
        dayjs(logItem.dateTime).isSame(date, "day")
      );
      const isHighlighted =
        item?.tags?.map((d) => d.id).includes(tag?.id) ?? false;

      return (
        <View
          key={day}
          style={{
            flex: 7,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <DayDot
            date={date}
            isHighlighted={isHighlighted}
            item={item}
            colorName={tag?.color}
          />
        </View>
      );
    })}
  </View>
);

/**
 * Highlight card for a frequently used tag, marking its days in the weeks
 * covering `startDate` to `endDate` (`YYYY-MM-DD`).
 */
export const TagPeaksCard = ({
  tag,
  startDate: start,
  endDate: end,
}: {
  tag: TagsPeakData["tags"][0];
  startDate: string;
  endDate: string;
}) => {
  const colors = useColors();

  const locale = useWeekLocale();
  const startDate = dayjs(start).locale(locale).startOf("week");
  const endDate = dayjs(end).locale(locale).endOf("week");
  const weekCount = dayjs(endDate).diff(dayjs(startDate), "week") + 1;

  const daysCount = keys(groupBy(tag.items, getItemDate)).length;

  return (
    <Card
      subtitle={t("tags")}
      title={
        <Text
          style={{
            fontSize: 17,
            color: colors.text,
            fontWeight: "bold",
          }}
        >
          <Text
            style={{
              fontSize: 17,
              color: colors.tags[tag?.color]?.text,
            }}
          >
            {tag?.title}&nbsp;
          </Text>
          {t("statistics_tag_peaks_title", {
            title: tag?.title,
            count: daysCount,
          })}
        </Text>
      }
    >
      <View
        style={{
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          marginBottom: 8,
        }}
      >
        <HeaderWeek date={startDate.format(DATE_FORMAT)} />
        {range(weekCount).map((week) => {
          const weekStart = dayjs(startDate).add(week, "week");

          return (
            <BodyWeek
              key={`tag-peaks-card-week-${week}`}
              start={weekStart}
              items={tag.items}
              tag={tag}
            />
          );
        })}
      </View>
    </Card>
  );
};
