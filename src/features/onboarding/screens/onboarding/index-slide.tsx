import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Button from "@/components/button";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { SkyFlightZone } from "./sky-flight-zone";

/**
 * First onboarding slide: only the tagline on the sky, then Start. Both fade
 * in slowly, one after the other.
 */
export const IndexSlide = ({ onPress }: { onPress: () => void }) => {
  const colors = useColors();

  return (
    <View style={{ flex: 1 }}>
      <View style={{ flex: 1, paddingHorizontal: 32 }}>
        <SkyFlightZone style={{ flex: 1 }} />
        <Animated.Text
          testID="onboarding-welcome"
          accessibilityRole="header"
          entering={FadeIn.delay(400).duration(1600)}
          style={{
            color: colors.onboardingTitle,
            fontSize: 34,
            lineHeight: 41,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {t("onboarding_tagline")}
        </Animated.Text>
        {/* Keeps the tagline a little above the middle, in the clear sky. */}
        <View style={{ flex: 1, paddingBottom: 96 }} />
      </View>
      <Animated.View
        entering={FadeIn.delay(1600).duration(900)}
        style={{ padding: 32 }}
      >
        <Button testID="onboarding-start" onPress={onPress}>
          {t("onboarding_start")}
        </Button>
      </Animated.View>
    </View>
  );
};
