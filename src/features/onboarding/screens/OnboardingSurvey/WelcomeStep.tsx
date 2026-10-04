import { useMemo } from "react";
import { Text, View } from "react-native";
import Animated, { useReducedMotion } from "react-native-reanimated";
import Button from "@/components/Button";
import { PixyMascot } from "@/components/Pixy/PixyMascot";
import useColors from "@/hooks/useColors";
import { t } from "@/lib/translation";
import { createRise } from "./motion";

/** First survey screen: Pixy says hi and explains the questions. */
export const WelcomeStep = ({ onStart }: { onStart: () => void }) => {
  const colors = useColors();
  const isReducedMotion = useReducedMotion();
  const [title, body, button] = useMemo(
    () =>
      [150, 300, 450].map((delay) => createRise({ delay, isReducedMotion })),
    [isReducedMotion]
  );

  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <PixyMascot size={128} />
        <Animated.Text
          entering={title}
          accessibilityRole="header"
          style={{
            marginTop: 28,
            fontSize: 30,
            fontWeight: "700",
            textAlign: "center",
            color: colors.onboardingTitle,
          }}
        >
          {t("onboarding_survey_welcome_title")}
        </Animated.Text>
        <Animated.View entering={body}>
          <Text
            style={{
              marginTop: 8,
              maxWidth: 300,
              fontSize: 17,
              lineHeight: 24,
              textAlign: "center",
              color: colors.onboardingBody,
            }}
          >
            {t("onboarding_survey_welcome_body")}
          </Text>
        </Animated.View>
      </View>
      <Animated.View entering={button} style={{ paddingBottom: 16 }}>
        <Button onPress={onStart} testID="onboarding-survey-start">
          {t("onboarding_survey_welcome_button")}
        </Button>
      </Animated.View>
    </View>
  );
};
