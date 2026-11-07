import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { useState } from "react";
import { View } from "react-native";
import {
  KLARA_RATINGS,
  STORY_TODAY,
  STORY_WEEK_LOCALE,
} from "../stories/fixtures";
import { useStoryScale } from "../stories/use-story-scale";
import { moveToWeek } from "../week";
import { WeekStrip } from "./week-strip";

const meta = { title: "Home/WeekStrip" } satisfies Meta;
export default meta;

const Strip = () => {
  const scale = useStoryScale();
  const [selected, setSelected] = useState(STORY_TODAY);
  return (
    <View style={{ width: 378 }}>
      <WeekStrip
        firstWeekStart="2026-10-12"
        weekLocale={STORY_WEEK_LOCALE}
        ratings={KLARA_RATINGS}
        scale={scale}
        selectedDate={selected}
        today={STORY_TODAY}
        onSelectDate={setSelected}
        onWeekChange={(weekStart) =>
          setSelected((date) =>
            moveToWeek(date, weekStart, STORY_TODAY, STORY_WEEK_LOCALE)
          )
        }
      />
    </View>
  );
};

/** Swipe for older weeks. The weekday stays selected. */
export const Default: StoryObj = {
  render: () => <Strip />,
};
