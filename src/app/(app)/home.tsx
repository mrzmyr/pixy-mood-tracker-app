import { Redirect } from "expo-router";
import { HomeScreen } from "@/features/home/routes";
import { useFeatureFlag } from "@/state/feature-flags";

/** Home with week strip. Flag `home-week` off: Calendar. */
const HomeRoute = () =>
  useFeatureFlag("home-week") ? <HomeScreen /> : <Redirect href="/calendar" />;

export default HomeRoute;
