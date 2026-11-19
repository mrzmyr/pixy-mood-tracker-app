import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { useState } from "react";
import { KLARA_RATINGS, STORY_TODAY } from "../stories/fixtures";
import { useStoryScale } from "../stories/use-story-scale";
import { WeekRow } from "./week-day";

const meta = { title: "Home/WeekRow" } satisfies Meta;
export default meta;

const Row = ({ weekStart }: { weekStart: string }) => {
  const scale = useStoryScale();
  const [selected, setSelected] = useState(STORY_TODAY);
  return (
    <WeekRow
      weekStart={weekStart}
      ratings={KLARA_RATINGS}
      scale={scale}
      selectedDate={selected}
      today={STORY_TODAY}
      onSelectDate={setSelected}
    />
  );
};

/** This week: Wednesday missed, Sunday upcoming, Saturday selected. */
export const ThisWeek: StoryObj = {
  render: () => <Row weekStart="2026-11-02" />,
};

/** Last week: every day logged. */
export const LastWeek: StoryObj = {
  render: () => <Row weekStart="2026-10-26" />,
};
