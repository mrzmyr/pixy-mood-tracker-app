import chroma from "chroma-js";
import { LinearGradient } from "expo-linear-gradient";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { IScale } from "@/constants/colors/scales";
import { SPACE } from "@/constants/space";
import type { LogItem } from "@/features/logs";
import useColors from "@/hooks/use-colors";
import { DayEntries } from "../components/day-entries";
import type { EntryPreviewData } from "../components/entry-preview";
import { HomeBottomBar } from "../components/home-bottom-bar";
import { HomeHeader } from "../components/home-header";
import { WeekStrip } from "../components/week-strip";
import { HOME_LAYOUT } from "../layout";

/**
 * Home layout without data access: header, week strip, entries of the
 * selected day, and the floating bottom bar. `HomeScreen` feeds it.
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
  profileButton,
  onSelectDate,
  onWeekChange,
  onPressEntry,
  onAdd,
  onSwitchView,
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
  profileButton?: ReactNode;
  onSelectDate: (date: string) => void;
  onWeekChange: (weekStart: string) => void;
  onPressEntry: (entry: EntryPreviewData) => void;
  onAdd: () => void;
  onSwitchView: () => void;
}) => {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View
      testID="home"
      style={{ flex: 1, backgroundColor: colors.calendarBackground }}
    >
      {/* Starts below the status bar: rows never scroll under the clock. */}
      <ScrollView
        style={{ marginTop: insets.top }}
        contentContainerStyle={{
          paddingTop: SPACE.xxxl,
          paddingBottom: insets.bottom + HOME_LAYOUT.buttonSize + SPACE.xxxl,
        }}
      >
        <View
          style={{
            paddingHorizontal: HOME_LAYOUT.headerInset,
            marginBottom: HOME_LAYOUT.headerGap,
          }}
        >
          <HomeHeader date={selectedDate} trailing={profileButton} />
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
      <LinearGradient
        pointerEvents="none"
        colors={[
          chroma(colors.calendarBackground).alpha(0).css(),
          colors.calendarBackground,
        ]}
        locations={[0, 0.42]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: HOME_LAYOUT.fadeHeight,
        }}
      />
      <HomeBottomBar onAdd={onAdd} onSwitchView={onSwitchView} />
    </View>
  );
};
