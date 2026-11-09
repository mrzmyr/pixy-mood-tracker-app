import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import { View } from "react-native";
import { Label } from "@/components/typography";
import { PERSONA_ENTRIES } from "../stories/fixtures";
import { useStoryScale } from "../stories/use-story-scale";
import { EntryPreview } from "./entry-preview";

const meta = {
  title: "Home/EntryPreview",
} satisfies Meta;
export default meta;

const Personas = () => {
  const scale = useStoryScale();
  return (
    <View style={{ width: 354, gap: 8 }}>
      {Object.entries(PERSONA_ENTRIES).map(([persona, entry]) => (
        <View key={persona}>
          <Label size={12} style={{ opacity: 0.5 }}>
            {persona}
          </Label>
          <EntryPreview entry={entry} scale={scale} onPress={fn()} />
        </View>
      ))}
    </View>
  );
};

/** One preview per persona: mood only up to max load. */
export const AllPersonas: StoryObj = {
  render: () => <Personas />,
};
