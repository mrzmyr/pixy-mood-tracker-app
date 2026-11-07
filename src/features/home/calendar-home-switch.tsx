import { useRouter } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SPACE } from "@/constants/space";
import { useFeatureFlag } from "@/state/feature-flags";
import { ViewSwitchButton } from "./components/home-bottom-bar";
import { getHasOpenedHome, markHomeOpened } from "./home-session";

/**
 * Calendar part of flag `home-week`: a switch to Home at the bottom left,
 * opposite the add button. Opens Home once when the flag turns on in this
 * session. Renders nothing with the flag off.
 */
export const CalendarHomeSwitch = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isEnabled = useFeatureFlag("home-week");

  useEffect(() => {
    if (isEnabled && !getHasOpenedHome()) {
      markHomeOpened();
      router.replace("/home");
    }
  }, [isEnabled, router]);

  if (!isEnabled) {
    return null;
  }

  return (
    <View
      style={{
        position: "absolute",
        left: SPACE.xl,
        bottom: SPACE.xl + insets.bottom,
        zIndex: 100,
      }}
    >
      <ViewSwitchButton target="day" onPress={() => router.replace("/home")} />
    </View>
  );
};
