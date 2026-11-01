import { View } from "react-native";
import { useWeekLocale } from "@/hooks/use-week-locale";
import { useFeatureFlag } from "@/state/feature-flags";
import { getPeriod } from "../period";
import type { DateKey } from "../types";
import { getCalendarStoryMonth } from "./calendar-month";
import { useToday } from "@/hooks/use-today";
import { useRecapInput } from "../use-recap-input";
import { buildMonthStory } from "./deck";
import { StoryBanner } from "./story-banner";

const Card = ({ month }: { month: DateKey }) => {
  const weekLocale = useWeekLocale();
  const period = getPeriod("month", month, weekLocale);
  const input = useRecapInput(period);
  if (!buildMonthStory(input)) {
    return null;
  }
  return (
    // The calendar list already insets its content: the card lines up with
    // the day grid.
    <View style={{ paddingTop: 24 }}>
      <StoryBanner period={period} source="calendar" />
    </View>
  );
};

/**
 * "September Recap / Watch" under the calendar, from the month's last day
 * to the 2nd of the next month, when the month has a story. Flag `recaps`.
 */
export const CalendarStoryCard = () => {
  const isOn = useFeatureFlag("recaps");
  const month = getCalendarStoryMonth(useToday());
  return isOn && month ? <Card month={month} /> : null;
};
