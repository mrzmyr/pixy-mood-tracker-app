import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import { View } from "react-native";
import { HomeBottomBar, ViewSwitchButton } from "./home-bottom-bar";

const meta = {
  title: "Home/HomeBottomBar",
} satisfies Meta;
export default meta;

/** Add entry in the middle, switch to Calendar on the right. */
export const Default: StoryObj = {
  render: () => (
    <View style={{ width: 402, height: 100 }}>
      <HomeBottomBar onAdd={fn()} onSwitchView={fn()} />
    </View>
  ),
};

/** Switch on Calendar, back to Home. */
export const SwitchOnCalendar: StoryObj = {
  render: () => <ViewSwitchButton target="day" onPress={fn()} />,
};
