import { Redirect, Stack } from "expo-router";
import { useViewSwitch } from "@/features/home";
import { HomeScreen } from "@/features/home/routes";
import { ProfileHeaderButton } from "@/features/profile";

/**
 * Home with week strip (flag `home-week`, else Calendar). Buttons render
 * here, not in the layout: `Stack.Toolbar` targets the current route.
 */
const HomeRoute = () => {
  const viewSwitch = useViewSwitch("calendar");

  if (!viewSwitch) {
    return <Redirect href="/calendar" />;
  }

  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.Button {...viewSwitch} />
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <ProfileHeaderButton />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <HomeScreen />
    </>
  );
};

export default HomeRoute;
