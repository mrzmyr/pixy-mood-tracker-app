import chroma from "chroma-js";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollView, View } from "react-native";
import type { IScale } from "@/constants/colors/scales";
import { SPACE } from "@/constants/space";
import { CalendarFloatButton } from "@/features/calendar/routes";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { t } from "@/lib/translation";
import { DayEntries } from "../components/day-entries";
import { DayPager } from "../components/day-pager";
import type { EntryPreviewData } from "../components/entry-preview";
import { HomeHeader } from "../components/home-header";
import { WeekStrip } from "../components/week-strip";
import { HOME_LAYOUT } from "../layout";
import { getWeekStart } from "../week";

/** Rows of one day on Home. */
export interface HomeDay {
  entries: EntryPreviewData[];
  /** Average sleep quality of the day, 0 to 4, or `null`. */
  sleepQuality: number | null;
}

/**
 * Home layout without data access: header, week strip, entries of the
 * selected day, and Calendar's float button as add button. `HomeScreen`
 * feeds it. The native bar is transparent: the date sits in its row, level
 * with the menu and profile buttons. Date and week strip stay put; the
 * entries scroll below them and fade out under the strip. Swipe the
 * entries sideways for the previous or next day.
 */
export const HomeView = ({
  today,
  selectedDate,
  firstDate,
  weekLocale,
  ratings,
  getDay,
  scale,
  onSelectDate,
  onWeekChange,
  onPressEntry,
  onAdd,
  topInset,
  bottomInset,
}: {
  /** Space above the date: centers it on the native bar's buttons. */
  topInset: number;
  /** Bottom safe area. */
  bottomInset: number;
  today: string;
  selectedDate: string;
  /** `DATE_FORMAT` day of the oldest entry, or today. */
  firstDate: string;
  weekLocale: string;
  ratings: Record<string, LogItem["rating"]>;
  /** Rows of one day; called for the selected day and its neighbours. */
  getDay: (date: string) => HomeDay;
  scale: IScale;
  onSelectDate: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
  onPressEntry: (entry: EntryPreviewData) => void;
  onAdd: () => void;
}) => {
  const colors = useColors();
  const page = chroma(colors.calendarBackground);

  return (
    <View
      testID="home"
      style={{ flex: 1, backgroundColor: colors.calendarBackground }}
    >
      {/* Date and week strip stay put; only the entries scroll. */}
      <View
        style={{
          paddingTop: topInset,
          paddingHorizontal: HOME_LAYOUT.listInset,
        }}
      >
        <View
          style={{
            paddingHorizontal: HOME_LAYOUT.headerInset - HOME_LAYOUT.listInset,
            marginBottom: HOME_LAYOUT.headerGap,
          }}
        >
          <HomeHeader date={selectedDate} />
        </View>
        <WeekStrip
          firstWeekStart={getWeekStart(firstDate, weekLocale)}
          weekLocale={weekLocale}
          ratings={ratings}
          scale={scale}
          selectedDate={selectedDate}
          today={today}
          onSelectDate={onSelectDate}
          onWeekChange={onWeekChange}
        />
      </View>
      <View style={{ flex: 1 }}>
        <DayPager
          selectedDate={selectedDate}
          firstDate={firstDate}
          today={today}
          onDayChange={onSelectDate}
          renderDay={(date) => {
            const day = getDay(date);
            return (
              <ScrollView
                contentInsetAdjustmentBehavior="never"
                contentContainerStyle={{
                  paddingTop: SPACE.sm,
                  paddingHorizontal: HOME_LAYOUT.listInset,
                  paddingBottom: HOME_LAYOUT.addClearance + bottomInset,
                }}
              >
                <DayEntries
                  entries={day.entries}
                  sleepQuality={day.sleepQuality}
                  scale={scale}
                  onPressEntry={onPressEntry}
                />
              </ScrollView>
            );
          }}
        />
        {/* Entries fade out under the week strip. */}
        <LinearGradient
          pointerEvents="none"
          colors={[page.alpha(1).css(), page.alpha(0).css()]}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: HOME_LAYOUT.listFade,
          }}
        />
      </View>
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
