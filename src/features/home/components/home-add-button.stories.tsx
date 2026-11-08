import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { fn } from "storybook/test";
import { HomeAddButton } from "./home-add-button";

const meta = {
  title: "Home/HomeAddButton",
  component: HomeAddButton,
  args: { onPress: fn() },
} satisfies Meta<typeof HomeAddButton>;
export default meta;

/** Add entry for the selected day. */
export const Default: StoryObj<typeof meta> = {};
