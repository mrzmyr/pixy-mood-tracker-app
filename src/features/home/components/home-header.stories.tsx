import type { Meta, StoryObj } from "@storybook/react-native-web-vite";
import { ProfileAvatar } from "@/features/profile";
import { STORY_TODAY } from "../stories/fixtures";
import { HomeHeader } from "./home-header";

const meta = { title: "Home/HomeHeader" } satisfies Meta;
export default meta;

/** Profile photo on the right opens Settings. */
export const WithPhoto: StoryObj = {
  render: () => (
    <HomeHeader
      date={STORY_TODAY}
      trailing={
        <ProfileAvatar size={32} photoUri="/demo/klara-jen.jpg" initials="K" />
      }
    />
  ),
};

/** No photo: initials. */
export const WithInitials: StoryObj = {
  render: () => (
    <HomeHeader
      date="2026-11-04"
      trailing={<ProfileAvatar size={32} photoUri={null} initials="K" />}
    />
  ),
};

/** No name, no photo: silhouette. Long weekday and month. */
export const Silhouette: StoryObj = {
  render: () => (
    <HomeHeader
      date="2026-09-30"
      trailing={<ProfileAvatar size={32} photoUri={null} initials="" />}
    />
  ),
};
