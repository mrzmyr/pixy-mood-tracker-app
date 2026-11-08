import { Stack } from "expo-router";
import { HomeScreen } from "@/features/home/routes";
import { ProfileHeaderButton } from "@/features/profile";

/** Buttons render here, not in the layout: `Stack.Toolbar` targets the current route. */
const HomeRoute = () => (
  <>
    <Stack.Toolbar placement="right">
      <Stack.Toolbar.View>
        <ProfileHeaderButton />
      </Stack.Toolbar.View>
    </Stack.Toolbar>
    <HomeScreen />
  </>
);

export default HomeRoute;
