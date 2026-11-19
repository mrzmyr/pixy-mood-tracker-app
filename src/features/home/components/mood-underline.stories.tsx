import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { View } from "react-native";
import { Label } from "@/components/typography";
import { RATING_KEYS } from "@/constants/ratings";
import { useStoryScale } from "../stories/use-story-scale";
import { MoodUnderline } from "./mood-underline";

const meta = { title: "Home/MoodUnderline" } satisfies Meta;
export default meta;

const AllStates = () => {
  const scale = useStoryScale();
  return (
    <View style={{ gap: 12 }}>
      {RATING_KEYS.map((rating) => (
        <View
          key={rating}
          style={{ flexDirection: "row", gap: 12, alignItems: "center" }}
        >
          <MoodUnderline rating={rating} scale={scale} />
          <Label size={14}>{rating}</Label>
        </View>
      ))}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <MoodUnderline rating={null} scale={scale} empty="missed" />
        <Label size={14}>missed</Label>
      </View>
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <MoodUnderline rating={null} scale={scale} empty="upcoming" />
        <Label size={14}>upcoming (invisible spacer)</Label>
      </View>
    </View>
  );
};

/** Every rating plus the two empty states. */
export const States: StoryObj = {
  render: () => <AllStates />,
};
