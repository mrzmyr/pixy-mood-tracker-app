import { Redirect } from "expo-router";
import { DEV_TOOLS } from "@/dev";

/** Fixture list is reachable only in development and preview builds. */
export const DevFixturesScreen = () => {
  const Screen = DEV_TOOLS?.DevFixturesScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Fixture deep link is reachable only in development and preview builds. */
export const DevFixtureLinkScreen = () => {
  const Screen = DEV_TOOLS?.DevFixtureLinkScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Feature flag override list is reachable only in development and preview builds. */
export const DevFeatureFlagsScreen = () => {
  const Screen = DEV_TOOLS?.DevFeatureFlagsScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Feature flag override deep link is reachable only in development and preview builds. */
export const DevFeatureFlagLinkScreen = () => {
  const Screen = DEV_TOOLS?.DevFeatureFlagLinkScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Fake file-transfer deep link is reachable only in development and preview builds. */
export const DevFakeFilesLinkScreen = () => {
  const Screen = DEV_TOOLS?.DevFakeFilesLinkScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};
