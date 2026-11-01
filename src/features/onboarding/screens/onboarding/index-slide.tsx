import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Button from "@/components/button";
import { TextReveal } from "@/components/text-reveal";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";
import { useIsLaunchSplashVisible } from "@/shell/launch-splash-state";
import { SkyFlightZone } from "@/components/sky-flight-zone";

/**
 * First onboarding slide: only the tagline on the sky, then Start. The tagline
 * writes itself in, then Start fades in. Both wait for the launch splash.
 */
export const IndexSlide = ({ onPress }: { onPress: () => void }) => {
  const colors = useColors();
  const isSplashVisible = useIsLaunchSplashVisible();

  // On first launch the splash covers this slide. Hide it until the splash
  // leaves, then remount so the tagline and Start play in view.
  return (
    <View
      key={isSplashVisible ? "waiting" : "shown"}
      style={{ flex: 1, opacity: isSplashVisible ? 0 : 1 }}
    >
      <View style={{ flex: 1, paddingHorizontal: 32 }}>
        <SkyFlightZone style={{ flex: 1 }} />
        <TextReveal
          testID="onboarding-welcome"
          accessibilityRole="header"
          delay={400}
          style={{
            color: colors.onboardingTitle,
            fontSize: 34,
            lineHeight: 41,
            fontWeight: "bold",
            textAlign: "center",
          }}
        >
          {t("onboarding_tagline")}
        </TextReveal>
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
