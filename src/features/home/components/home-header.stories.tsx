import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { STORY_TODAY } from "../stories/fixtures";
import { HomeHeader } from "./home-header";

const meta = { title: "Home/HomeHeader" } satisfies Meta;
export default meta;

/** Weekday over the date of the selected day. */
export const Default: StoryObj = {
  render: () => <HomeHeader date={STORY_TODAY} />,
};

/** Long weekday and month. */
export const LongNames: StoryObj = {
  render: () => <HomeHeader date="2026-09-30" />,
};
