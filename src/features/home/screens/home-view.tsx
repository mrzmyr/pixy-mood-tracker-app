import { ScrollView, View } from "react-native";
import type { IScale } from "@/constants/colors/scales";
import { SPACE } from "@/constants/space";
import { CalendarFloatButton } from "@/features/calendar/routes";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { DayEntries } from "../components/day-entries";
import type { EntryPreviewData } from "../components/entry-preview";
import { HomeHeader } from "../components/home-header";
import { WeekStrip } from "../components/week-strip";
import { HOME_LAYOUT } from "../layout";

/**
 * Home layout without data access: header, week strip, entries of the
 * selected day, and Calendar's float button as add button. `HomeScreen`
 * feeds it. The native bar and tab bar set the scroll insets.
 */
export const HomeView = ({
  today,
  selectedDate,
  firstWeekStart,
  weekLocale,
  ratings,
  entries,
  sleepQuality,
  scale,
  onSelectDate,
  onWeekChange,
  onPressEntry,
  onAdd,
}: {
  today: string;
  selectedDate: string;
  firstWeekStart: string;
  weekLocale: string;
  ratings: Record<string, LogItem["rating"]>;
  entries: EntryPreviewData[];
  /** Average sleep quality of the selected day, 0 to 4, or `null`. */
  sleepQuality: number | null;
  scale: IScale;
  onSelectDate: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
  onPressEntry: (entry: EntryPreviewData) => void;
  onAdd: () => void;
}) => {
  const colors = useColors();

  return (
    <View
      testID="home"
      style={{ flex: 1, backgroundColor: colors.calendarBackground }}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingTop: SPACE.sm,
          paddingBottom: HOME_LAYOUT.addClearance,
        }}
      >
        <View
          style={{
            paddingHorizontal: HOME_LAYOUT.headerInset,
            marginBottom: HOME_LAYOUT.headerGap,
          }}
        >
          <HomeHeader date={selectedDate} />
        </View>
        <View style={{ paddingHorizontal: HOME_LAYOUT.listInset }}>
          <WeekStrip
            firstWeekStart={firstWeekStart}
            weekLocale={weekLocale}
            ratings={ratings}
            scale={scale}
            selectedDate={selectedDate}
            today={today}
            onSelectDate={onSelectDate}
            onWeekChange={onWeekChange}
          />
        </View>
        <View
          style={{
            paddingHorizontal: HOME_LAYOUT.listInset,
            marginTop: SPACE.sm,
          }}
        >
          <DayEntries
            entries={entries}
            sleepQuality={sleepQuality}
            scale={scale}
            onPressEntry={onPressEntry}
          />
        </View>
      </ScrollView>
      <CalendarFloatButton
        isAtBottom
        hasTodayEntry={false}
        addLabel={t("add_entry")}
        addTestID="home-add-entry"
        onAdd={onAdd}
        onScrollToBottom={onAdd}
      />
    </View>
  );
};
