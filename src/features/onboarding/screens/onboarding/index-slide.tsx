import { View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import Button from "@/components/button";
import { t } from "@/lib/translation";
import useColors from "@/hooks/use-colors";

/**
 * First onboarding slide: only the tagline on the sky, then Start. Both fade
 * in slowly, one after the other.
 */
export const IndexSlide = ({ onPress }: { onPress: () => void }) => {
  const colors = useColors();

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          paddingHorizontal: 32,
          // Sits a little above the middle, in the clear part of the sky.
          paddingBottom: 96,
        }}
      >
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
