import dayjs from "dayjs";
import { Pressable, View } from "react-native";
import { Label } from "@/components/typography";
import type { IScale } from "@/constants/colors/scales";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { t, tDynamic } from "@/lib/translation";
import { HOME_LAYOUT, HOME_TEXT } from "../layout";
import { MoodUnderline } from "./mood-underline";

/**
 * One day of the week strip: day number, short weekday, and a mood underline.
 * The selected day sits on a light pill in full text color. Future days
 * cannot be selected.
 */
export const WeekDay = ({
  date,
  rating,
  scale,
  isSelected,
  isToday,
  isFuture,
  onPress,
}: {
  /** `DATE_FORMAT` date. */
  date: string;
  rating: LogItem["rating"] | null;
  scale: IScale;
  isSelected: boolean;
  isToday: boolean;
  isFuture: boolean;
  onPress: (date: string) => void;
}) => {
  const colors = useColors();
  const day = dayjs(date);
  const moodLabel = rating ? tDynamic(rating) : undefined;

  return (
    <Pressable
      testID={`home-week-day-${date}`}
      accessibilityRole="button"
      accessibilityLabel={[
        day.format("dddd, LL"),
        isToday ? t("a11y_today") : undefined,
        moodLabel,
      ]
        .filter(Boolean)
        .join(", ")}
      accessibilityState={{ selected: isSelected, disabled: isFuture }}
      disabled={isFuture}
      onPress={() => onPress(date)}
      style={({ pressed }) => ({
        flex: 1,
        height: HOME_LAYOUT.dayHeight,
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        borderRadius: HOME_LAYOUT.dayRadius,
        borderCurve: "continuous",
        backgroundColor: isSelected ? colors.homeSelectedDay : undefined,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Label
        size={20}
        style={{
          ...HOME_TEXT.dayNumber,
          color: isSelected ? colors.text : colors.homeTextMuted,
          fontWeight: isSelected ? "600" : "400",
          fontVariant: ["tabular-nums"],
        }}
      >
        {day.format("D")}
      </Label>
      <Label
        size={12}
        strong
        style={{
          color: isSelected ? colors.text : colors.textSecondary,
          opacity: isFuture ? 0.6 : 1,
          ...HOME_TEXT.dayLabel,
          textTransform: "uppercase",
        }}
      >
        {day.format("ddd")}
      </Label>
      <View style={{ marginTop: HOME_LAYOUT.dayBarGap }}>
        <MoodUnderline
          rating={rating}
          scale={scale}
          empty={isFuture ? "upcoming" : "missed"}
        />
      </View>
    </Pressable>
  );
};

/** Week strip row of seven days, from the locale's first weekday. */
export const WeekRow = ({
  weekStart,
  ratings,
  scale,
  selectedDate,
  today,
  onSelectDate,
}: {
  /** `DATE_FORMAT` date of the first day. */
  weekStart: string;
  /** Average rating per `DATE_FORMAT` date. Missing dates have no entry. */
  ratings: Record<string, LogItem["rating"]>;
  scale: IScale;
  selectedDate: string;
  today: string;
  onSelectDate: (date: string) => void;
}) => (
  <View style={{ flexDirection: "row" }}>
    {Array.from({ length: 7 }, (_, index) => {
      const date = dayjs(weekStart).add(index, "day").format("YYYY-MM-DD");
      return (
        <WeekDay
          key={date}
          date={date}
          rating={ratings[date] ?? null}
          scale={scale}
          isSelected={date === selectedDate}
          isToday={date === today}
          isFuture={date > today}
          onPress={onSelectDate}
        />
      );
    })}
  </View>
);
