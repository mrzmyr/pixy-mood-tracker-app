import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import { useState } from "react";
import { View } from "react-native";
import { ProfileAvatar } from "@/features/profile";
import type { EntryPreviewData } from "../components/entry-preview";
import {
  KLARA_ENTRIES,
  KLARA_RATINGS,
  STORY_TODAY,
  STORY_WEEK_LOCALE,
} from "../stories/fixtures";
import { useStoryScale } from "../stories/use-story-scale";
import { moveToWeek } from "../week";
import { HomeView } from "./home-view";

const meta = {
  title: "Home/HomeView",
  parameters: { layout: "fullscreen" },
} satisfies Meta;
export default meta;

const Screen = ({
  entries,
  ratings,
}: {
  entries: Record<string, EntryPreviewData[]>;
  ratings: Record<string, EntryPreviewData["rating"]>;
}) => {
  const scale = useStoryScale();
  const [selected, setSelected] = useState(STORY_TODAY);
  return (
    <View style={{ width: 402, height: 874, margin: -16 }}>
      <HomeView
        today={STORY_TODAY}
        selectedDate={selected}
        firstWeekStart="2026-10-12"
        weekLocale={STORY_WEEK_LOCALE}
        ratings={ratings}
        entries={entries[selected] ?? []}
        sleepQuality={selected === STORY_TODAY ? 3 : null}
        scale={scale}
        profileButton={
          <ProfileAvatar
            size={40}
            photoUri="/demo/klara-jen.jpg"
            initials="K"
          />
        }
        onSelectDate={setSelected}
        onWeekChange={(weekStart) =>
          setSelected((date) =>
            moveToWeek(date, weekStart, STORY_TODAY, STORY_WEEK_LOCALE)
          )
        }
        onPressEntry={fn()}
        onAdd={fn()}
        onSwitchView={fn()}
      />
    </View>
  );
};

/** Klara, Saturday swim day. Tap days and swipe weeks. */
export const Klara: StoryObj = {
  render: () => <Screen entries={KLARA_ENTRIES} ratings={KLARA_RATINGS} />,
};

/** Persona Mia: first entry today, on a hard day. */
export const FirstEntry: StoryObj = {
  render: () => (
    <Screen
      entries={{
        [STORY_TODAY]: [
          {
            ...KLARA_ENTRIES["2026-11-02"][0],
            date: STORY_TODAY,
            people: [],
            tags: [],
          },
        ],
      }}
      ratings={{ [STORY_TODAY]: "bad" }}
    />
  ),
};

/** No entries yet. */
export const Empty: StoryObj = {
  render: () => <Screen entries={{}} ratings={{}} />,
};
