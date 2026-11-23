import { Redirect } from "expo-router";
import { HomeScreen } from "@/features/home/routes";
import { useFeatureFlag } from "@/state/feature-flags";
import { HomeHeaderButtons } from "@/shell/home-header-buttons";

/**
 * Home with week strip (flag `day-view`, else Calendar). Buttons render
 * here, not in the layout: `Stack.Toolbar` targets the current route.
 */
const HomeRoute = () => {
  const isEnabled = useFeatureFlag("day-view");

  if (!isEnabled) {
    return <Redirect href="/calendar" />;
  }

  return (
    <>
      <HomeHeaderButtons />
      <HomeScreen />
    </>
  );
};

export default HomeRoute;
