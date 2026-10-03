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

/** Fake file-transfer deep link is reachable only in development and preview builds. */
export const DevFakeFilesLinkScreen = () => {
  const Screen = DEV_TOOLS?.DevFakeFilesLinkScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Type guide overview. Reachable only in development and preview builds. */
export const TypeOverviewScreen = () => {
  const Screen = DEV_TOOLS?.TypeOverviewScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Type guide roles. Reachable only in development and preview builds. */
export const TypeRolesScreen = () => {
  const Screen = DEV_TOOLS?.TypeRolesScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Type guide gaps. Reachable only in development and preview builds. */
export const TypeGapsScreen = () => {
  const Screen = DEV_TOOLS?.TypeGapsScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Type guide lists. Reachable only in development and preview builds. */
export const TypeListsScreen = () => {
  const Screen = DEV_TOOLS?.TypeListsScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};

/** Type guide screens. Reachable only in development and preview builds. */
export const TypeScreensScreen = () => {
  const Screen = DEV_TOOLS?.TypeScreensScreen;
  return Screen ? <Screen /> : <Redirect href="/calendar" />;
};
