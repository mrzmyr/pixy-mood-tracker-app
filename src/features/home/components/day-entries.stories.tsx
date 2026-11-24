import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import { View } from "react-native";
import { KLARA_ENTRIES, STORY_TODAY } from "../stories/fixtures";
import { useStoryScale } from "../stories/use-story-scale";
import type { EntryPreviewData } from "./entry-preview";
import { DayEntries } from "./day-entries";

const meta = {
  title: "Home/DayEntries",
} satisfies Meta;
export default meta;

const List = ({ entries }: { entries: EntryPreviewData[] }) => {
  const scale = useStoryScale();
  return (
    <View style={{ width: 354 }}>
      <DayEntries entries={entries} scale={scale} onPressEntry={fn()} />
    </View>
  );
};

/** Klara's swim day: three entries. */
export const SwimDay: StoryObj = {
  render: () => <List entries={KLARA_ENTRIES[STORY_TODAY]} />,
};

/** Day without entries. */
export const Empty: StoryObj = {
  render: () => <List entries={[]} />,
};
