import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-screens/experimental";
import type { IScale } from "@/constants/colors/scales";
import { SPACE } from "@/constants/space";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { DayEntries } from "../components/day-entries";
import type { EntryPreviewData } from "../components/entry-preview";
import { HomeAddButton } from "../components/home-add-button";
import { HomeHeader } from "../components/home-header";
import { WeekStrip } from "../components/week-strip";
import { HOME_LAYOUT } from "../layout";

/**
 * Home layout without data access: header, week strip, entries of the
 * selected day, and the add button above the tab bar. `HomeScreen` feeds
 * it. The native bar and tab bar set the scroll insets.
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
          paddingBottom: HOME_LAYOUT.buttonSize + SPACE.xxxl,
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
      {/* Native safe area: includes the tab bar, unlike the JS insets. */}
      <SafeAreaView
        edges={{ bottom: true }}
        pointerEvents="box-none"
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          alignItems: "center",
        }}
      >
        <View style={{ marginBottom: HOME_LAYOUT.buttonBottom }}>
          <HomeAddButton onPress={onAdd} />
        </View>
      </SafeAreaView>
    </View>
  );
};
